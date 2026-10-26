import { MonsterAbility, MonsterStatBlock } from '../models/monster-catalog.interface';
import {
  actionAvailability,
  isMechanicalStatBlock,
  legendaryTotal,
  monsterActions,
  monsterChecks,
  parseDice,
  splitAttackDamage,
} from './monster-actions';

/** Ficha mínima do bestiário com as ações dadas (atributos de um goblin). */
function block(
  actions: Partial<MonsterAbility>[],
  extra: Partial<MonsterStatBlock> = {},
): MonsterStatBlock {
  return {
    index: 'x',
    name: 'X',
    size: 'Médio',
    type: 'humanoide',
    alignment: 'neutro',
    armor_class: [{ type: 'natural', value: 15 }],
    hit_points: 7,
    hit_dice: '2d6',
    speed: { terrestre: '9 m' },
    strength: 8,
    dexterity: 14,
    constitution: 10,
    intelligence: 10,
    wisdom: 8,
    charisma: 8,
    challenge_rating: 0.25,
    xp: 50,
    special_abilities: [],
    actions: actions.map((a) => ({
      name: 'Ação',
      desc: '',
      usage: null,
      attack: null,
      damage: [],
      dc: null,
      multiattack: null,
      ...a,
    })),
    reactions: [],
    legendary_actions: [],
    ...extra,
  };
}

// Textos e números do bestiário (seed da tabela `monster`).
const CIMITARRA: Partial<MonsterAbility> = {
  name: 'Cimitarra',
  desc: 'Ataque Corpo-a-Corpo com Arma: +4 para atingir, alcance 1,5 m, um alvo. Acerto: 5 (1d6 + 2) de dano cortante.',
  attack: { kind: 'melee_weapon', bonus: 4, reach_m: 1.5, range_m: null, target: 'um alvo' },
  damage: [{ dice: '1d6+2', average: 5, type: 'cortante' }],
};
const MORDIDA_ARANHA: Partial<MonsterAbility> = {
  name: 'Mordida',
  desc: 'Ataque Corpo-a-Corpo com Arma: +5 para atingir, alcance 1,5 m, uma criatura. Acerto: 7 (1d8 + 3) de dano perfurante e o alvo deve realizar um teste de resistência de Constituição CD 11, sofrendo 9 (2d8) de dano de veneno se falhar ou metade desse dano se obtiver sucesso.',
  attack: { kind: 'melee_weapon', bonus: 5, reach_m: 1.5, range_m: null, target: 'uma criatura' },
  damage: [
    { dice: '1d8+3', average: 7, type: 'perfurante' },
    { dice: '2d8', average: 9, type: 'veneno' },
  ],
  dc: { ability: 'CON', value: 11, success: 'metade' },
};
const CHICOTE_BALOR: Partial<MonsterAbility> = {
  name: 'Chicote',
  desc: 'Ataque Corpo-a-Corpo com Arma: +14 para atingir, alcance 6 m, um alvo. Acerto: 15 (2d6 + 8) de dano cortante mais 10 (3d6) de dano de fogo e o alvo deve ser bem sucedido num teste de resistência de Força CD 20 ou será puxado 7,5 metros.',
  attack: { kind: 'melee_weapon', bonus: 14, reach_m: 6, range_m: null, target: 'um alvo' },
  damage: [
    { dice: '2d6+8', average: 15, type: 'cortante' },
    { dice: '3d6', average: 10, type: 'fogo' },
  ],
  dc: { ability: 'FOR', value: 20, success: 'nenhum' },
};
const SOPRO: Partial<MonsterAbility> = {
  name: 'Sopro de Fogo',
  desc: 'O dragão exala fogo num cone de 9 metros. Cada criatura na área deve realizar um teste de resistência de Destreza CD 17, sofrendo 56 (16d6) de dano de fogo se falhar ou metade desse dano se obtiver sucesso.',
  usage: { type: 'recharge', min: 5 },
  damage: [{ dice: '16d6', average: 56, type: 'fogo' }],
  dc: { ability: 'DES', value: 17, success: 'metade' },
};

describe('parseDice', () => {
  it('lê dados, modificador e dano fixo', () => {
    expect(parseDice('2d6+5')).toEqual({ count: 2, sides: 6, modifier: 5 });
    expect(parseDice('1d10-1')).toEqual({ count: 1, sides: 10, modifier: -1 });
    expect(parseDice('1d8 + 3')).toEqual({ count: 1, sides: 8, modifier: 3 });
    expect(parseDice('7')).toEqual({ count: 0, sides: 0, modifier: 7 });
    expect(parseDice('muito')).toBeNull();
  });
});

describe('monsterActions', () => {
  it('ataque simples: d20 com o bônus e o dano do acerto', () => {
    const [a] = monsterActions(block([CIMITARRA]));
    expect(a.kind).toBe('attack');
    expect(a.tags).toEqual(['+4']);
    expect(a.config).toEqual({
      mode: 'ability',
      rollType: 'attack',
      label: 'Cimitarra',
      modifier: 4,
      damage: {
        diceCount: 1,
        diceSides: 6,
        modifier: 2,
        label: 'Dano — Cimitarra',
        damageType: 'cortante',
        extraDice: [],
      },
    });
  });

  it('ataque com dano de resistência depois do "deve": vira ataque + botão de resistência', () => {
    const [attack, save] = monsterActions(block([MORDIDA_ARANHA]));
    expect(attack.config?.damage).toMatchObject({
      diceCount: 1,
      diceSides: 8,
      modifier: 3,
      damageType: 'perfurante',
    });
    expect(save.name).toBe('Mordida — resistência');
    expect(save.kind).toBe('save');
    expect(save.tags).toEqual(['CD 11 CON']);
    expect(save.config).toMatchObject({
      autoHit: true,
      damage: { diceCount: 2, diceSides: 8, damageType: 'veneno' },
      save: { note: 'CD 11 de Constituição', onSuccess: 'half', ability: 'CON' },
    });
  });

  it('dois danos antes do "deve" são do acerto (Balor): tipo composto e CD como lembrete', () => {
    const buttons = monsterActions(block([CHICOTE_BALOR]));
    expect(buttons).toHaveLength(1);
    expect(buttons[0].config).toMatchObject({
      modifier: 14,
      damage: {
        diceCount: 2,
        diceSides: 6,
        modifier: 8,
        damageType: 'cortante + fogo',
        extraDice: [{ count: 3, sides: 6 }],
      },
      reminders: ['Se acertar: CD 20 de Força (efeito no texto)'],
    });
  });

  it('ação com CD (sopro): resistência com metade no sucesso e etiqueta de recarga', () => {
    const [a] = monsterActions(block([SOPRO]));
    expect(a.kind).toBe('save');
    expect(a.tags).toEqual(['CD 17 DES', 'Recarga 5–6']);
    expect(a.config).toMatchObject({
      rollType: 'attack',
      autoHit: true,
      damage: { diceCount: 16, diceSides: 6, damageType: 'fogo' },
      save: { onSuccess: 'half', ability: 'DEX' },
    });
  });

  it('"nenhum" no sucesso vira none; CD sem dano fica só em texto com a etiqueta', () => {
    const [none] = monsterActions(
      block([{ ...SOPRO, dc: { ability: 'DES', value: 13, success: 'nenhum' } }]),
    );
    expect(none.config?.save?.onSuccess).toBe('none');
    const [text] = monsterActions(
      block([{ name: 'Olhar', desc: 'CD 12', dc: { ability: 'SAB', value: 12, success: null } }]),
    );
    expect(text.kind).toBe('text');
    expect(text.config).toBeNull();
    expect(text.tags).toEqual(['CD 12 SAB']);
  });

  it('dano sem ataque nem CD: só rola o dano; dano condicional vira lembrete, não soma', () => {
    const [a] = monsterActions(
      block([
        {
          name: 'Investida',
          desc: 'Dano extra',
          damage: [
            { dice: '2d6', average: 7, type: 'perfurante' },
            { dice: '1d6', average: 3, type: null, note: 'só se agarrado' },
          ],
        },
      ]),
    );
    expect(a.kind).toBe('damage');
    expect(a.config).toMatchObject({
      autoHit: true,
      damage: { diceCount: 2, extraDice: [] },
      reminders: ['1d6: só se agarrado'],
    });
  });

  it('dano fixo (sem dado) e multiataque', () => {
    const [fixed] = monsterActions(
      block([{ ...CIMITARRA, damage: [{ dice: '1', average: 1, type: 'perfurante' }] }]),
    );
    expect(fixed.config?.damage).toMatchObject({ diceCount: 0, modifier: 1 });
    const [multi] = monsterActions(
      block([
        { name: 'Ataques Múltiplos', desc: '', multiattack: [{ action: 'Garra', count: 2 }] },
      ]),
    );
    expect(multi.kind).toBe('multi');
    expect(multi.tags).toEqual(['Multiataque']);
  });

  it('etiquetas de uso: por dia, descanso e custo de lendária', () => {
    const tags = monsterActions(
      block([], {
        actions: [
          { name: 'A', desc: '', usage: { type: 'per_day', times: 3 } },
          { name: 'B', desc: '', usage: { type: 'rest', rest: 'curto ou longo' } },
        ] as MonsterAbility[],
        legendary_actions: [
          { name: 'C', desc: '', usage: { type: 'cost', actions: 2 }, attack: null },
        ] as MonsterAbility[],
      }),
    ).map((b) => [b.group, b.tags]);
    expect(tags).toEqual([
      ['actions', ['3/dia']],
      ['actions', ['Descanso curto ou longo']],
      ['legendary_actions', ['Custo 2']],
    ]);
  });

  it('ficha antiga da dnd5eapi (sem campos estruturados) não vira botão', () => {
    const legacy = block([]);
    legacy.actions = [{ name: 'Scimitar', desc: 'Melee Weapon Attack: +4 to hit' }];
    expect(isMechanicalStatBlock(legacy)).toBe(false);
    expect(monsterActions(legacy)).toEqual([]);
  });
});

describe('carta da ação (tela de lançamento, 1.13.0)', () => {
  it('ataque: ATAQUE e DANO; resistência: CD, DANO, SE PASSAR e a CD pro palco', () => {
    const [attack, save] = monsterActions(block([MORDIDA_ARANHA]));
    expect(attack.card?.kind).toBe('attack');
    expect(attack.card?.stats.map((s) => s.label)).toEqual(['ATAQUE', 'DANO']);
    expect(attack.card?.stats[0].value).toBe('+5');
    expect(save.card).toMatchObject({ kind: 'save', name: MORDIDA_ARANHA.name });
    expect(save.card?.stats).toEqual([
      { label: 'CD', value: '11 CON' },
      { label: 'DANO', value: expect.stringContaining('veneno') },
      { label: 'SE PASSAR', value: 'metade' },
    ]);
    expect(save.castSave).toEqual({ dc: 11, ability: 'CON' });
  });

  it('dano extra no acerto com CD (Balor): o efeito vira SE ACERTAR na carta', () => {
    const [a] = monsterActions(block([CHICOTE_BALOR]));
    expect(a.card?.stats.map((s) => s.label)).toEqual(['ATAQUE', 'DANO', 'SE ACERTAR']);
    expect(a.card?.stats[1].value).toContain('fogo');
  });

  it('sopro (só CD) e dano puro também têm carta; texto e multiataque não', () => {
    expect(monsterActions(block([SOPRO]))[0].card?.kind).toBe('save');
    const buttons = monsterActions(
      block([
        { name: 'Ataques Múltiplos', desc: '', multiattack: [{ action: 'Cimitarra', count: 2 }] },
        CIMITARRA,
      ]),
    );
    expect(buttons[0].card).toBeUndefined();
    expect(buttons[1].card?.kind).toBe('attack');
  });
});

describe('splitAttackDamage', () => {
  it('sem cláusula de resistência, todo dano é do acerto', () => {
    const entries = [{ dice: '1d6+2', average: 5, type: 'cortante' }];
    expect(splitAttackDamage('Acerto: 5 (1d6 + 2) de dano cortante.', entries)).toEqual({
      onHit: entries,
      onSave: [],
    });
  });
});

describe('monsterChecks', () => {
  it('resistência usa o bônus da ficha quando listado, senão o modificador do atributo', () => {
    const c = monsterChecks(block([], { saving_throws: [{ ability: 'DES', bonus: 6 }] }));
    expect(c.saves.map((s) => [s.label, s.modifier])).toEqual([
      ['Resistência de Força', -1],
      ['Resistência de Destreza', 6],
      ['Resistência de Constituição', 0],
      ['Resistência de Inteligência', 0],
      ['Resistência de Sabedoria', -1],
      ['Resistência de Carisma', -1],
    ]);
    expect(c.saves[1].config).toEqual({
      mode: 'ability',
      rollType: 'save',
      label: 'Resistência de Destreza',
      modifier: 6,
    });
  });

  it('testes de atributo pelo modificador e perícias pelo bônus da ficha', () => {
    const c = monsterChecks(block([], { skills: [{ name: 'Furtividade', bonus: 6 }] }));
    expect(c.abilities[1]).toMatchObject({ label: 'Teste de Destreza', modifier: 2 });
    expect(c.abilities[1].config.rollType).toBe('skill');
    expect(c.skills).toEqual([
      {
        key: 'skill:Furtividade',
        label: 'Furtividade',
        modifier: 6,
        config: { mode: 'ability', rollType: 'skill', label: 'Furtividade', modifier: 6 },
      },
    ]);
  });
});

describe('usos (fase 2): o que gastar e se ainda dá', () => {
  const ESPIRRO = { ...SOPRO, name: 'Espirro' };
  const emptyState = {
    uses: {},
    recharge: [],
    legendary_used: 0,
    reaction_used: false,
    in_lair: false,
  };

  it('gasta só o que tem limite, e só no primeiro botão da habilidade', () => {
    const [attack, save] = monsterActions(block([MORDIDA_ARANHA]));
    expect(attack.consume).toBeNull();
    expect(save.consume).toBeNull();
    const [sopro] = monsterActions(block([SOPRO]));
    expect(sopro.consume).toEqual({ op: 'use', ability: 'Sopro de Fogo' });
    const lendaria = monsterActions(
      block([], { legendary_actions: [{ name: 'Cauda', desc: '', damage: [] } as MonsterAbility] }),
    );
    expect(lendaria[0].consume).toEqual({ op: 'legendary', ability: 'Cauda' });
    const reacao = monsterActions(
      block([], { reactions: [{ name: 'Aparar', desc: '', damage: [] } as MonsterAbility] }),
    );
    expect(reacao[0].consume).toEqual({ op: 'reaction' });
  });

  it('multiataque aponta pro botão de cada ataque (nome igual ou começando igual)', () => {
    const buttons = monsterActions(
      block([
        {
          name: 'Ataques Múltiplos',
          desc: '',
          multiattack: [
            { action: 'Garra', count: 2 },
            { action: 'Cauda', count: 1 },
          ],
        },
        { ...CIMITARRA, name: 'Garras' },
      ]),
    );
    expect(buttons[0].multi).toEqual([
      { action: 'Garra', count: 2, key: 'actions:1:attack' },
      { action: 'Cauda', count: 1, key: null },
    ]);
  });

  it('recarga gasta trava; por dia mostra quanto resta; esgotada trava', () => {
    const b = block([SOPRO, { ...ESPIRRO, usage: { type: 'per_day', times: 3 } }]);
    const [sopro, espirro] = monsterActions(b);
    expect(actionAvailability(sopro, b, { ...emptyState, recharge: ['Sopro de Fogo'] })).toEqual({
      available: false,
      status: 'RECARREGANDO',
      restorable: true,
    });
    expect(actionAvailability(espirro, b, { ...emptyState, uses: { Espirro: 1 } })).toEqual({
      available: true,
      status: 'RESTAM 2',
      restorable: true,
    });
    expect(actionAvailability(espirro, b, { ...emptyState, uses: { Espirro: 3 } }).available).toBe(
      false,
    );
    expect(actionAvailability(sopro, b, null)).toEqual({
      available: true,
      status: null,
      restorable: false,
    });
  });

  it('lendárias pelo custo e pelo total (padrão 3); reação uma por rodada', () => {
    const b = block([], {
      legendary_actions: [
        { name: 'Detectar', desc: '', damage: [] },
        { name: 'Asa', desc: '', damage: [], usage: { type: 'cost', actions: 2 } },
      ] as MonsterAbility[],
      reactions: [{ name: 'Aparar', desc: '', damage: [] }] as MonsterAbility[],
    });
    expect(legendaryTotal(b)).toBe(3);
    const [aparar, detectar, asa] = monsterActions(b);
    const used = { ...emptyState, legendary_used: 2, reaction_used: true };
    expect(actionAvailability(detectar, b, used).available).toBe(true);
    expect(actionAvailability(asa, b, used).available).toBe(false);
    expect(actionAvailability(aparar, b, used)).toEqual({
      available: false,
      status: 'USADA NESTA RODADA',
      restorable: false,
    });
  });
});
