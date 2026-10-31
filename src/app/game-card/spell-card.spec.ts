import { Spell, SpellRoll } from '../models/character-options.interface';
import {
  formatSpellDice,
  schoolSlug,
  spellCardState,
  spellRangeLabel,
  spellSeal,
  spellToCard,
} from './spell-card';

const spell = (extra: Partial<Spell> = {}): Spell => ({
  id_spell: 1,
  name: 'Bola de Fogo',
  description: 'Uma explosão de chamas.',
  casting_time: '1 ação',
  range_distance: 45,
  duration: 'Instantânea',
  is_verbal: true,
  is_somatic: true,
  is_material: true,
  spellLevel: 3,
  school: 'Evocação',
  ...extra,
});

describe('schoolSlug', () => {
  it('tira acento e caixa: "Evocação" → evocacao, "ADIVINHAÇÃO" → adivinhacao', () => {
    expect(schoolSlug('Evocação')).toBe('evocacao');
    expect(schoolSlug('ADIVINHAÇÃO')).toBe('adivinhacao');
    expect(schoolSlug(' Ilusão ')).toBe('ilusao');
  });

  it('escola vazia ou desconhecida → null (carta usa o ícone de reserva)', () => {
    expect(schoolSlug(null)).toBeNull();
    expect(schoolSlug('')).toBeNull();
    expect(schoolSlug('Cronomancia')).toBeNull();
  });
});

describe('spellToCard', () => {
  it('monta medalhão, arte da escola, faixa e os 4 números', () => {
    const card = spellToCard(spell());
    expect(card.badge).toBe('3');
    expect(card.art).toBe('assets/cards/spell-school-evocacao.webp');
    expect(card.ribbon).toBe('EVOCAÇÃO · 3º CÍRCULO');
    expect(card.stats).toEqual([
      { label: 'TEMPO', value: '1 ação' },
      { label: 'ALCANCE', value: '45 m' },
      { label: 'DURAÇÃO', value: 'Instantânea' },
      { label: 'COMP.', value: 'V, S, M' },
    ]);
    expect(card.text).toBe('Uma explosão de chamas.');
  });

  it('truque: medalhão T e faixa TRUQUE; sem alcance/componentes vira "—"', () => {
    const card = spellToCard(
      spell({
        spellLevel: 0,
        range_distance: null,
        is_verbal: false,
        is_somatic: false,
        is_material: false,
      }),
    );
    expect(card.badge).toBe('T');
    expect(card.ribbon).toBe('EVOCAÇÃO · TRUQUE');
    expect(card.stats[1].value).toBe('—');
    expect(card.stats[3].value).toBe('—');
  });

  it('sem escola: arte nula (ícone de reserva) e faixa MAGIA', () => {
    const card = spellToCard(spell({ school: null }));
    expect(card.art).toBeNull();
    expect(card.fallbackIcon).toBe('assets/icons/spellbook.png');
    expect(card.ribbon).toBe('MAGIA · 3º CÍRCULO');
  });

  it('etiqueta PREPARADA só em magia de círculo preparada', () => {
    expect(spellToCard(spell({ is_prepared: true })).tags).toEqual(['PREPARADA']);
    expect(spellToCard(spell({ is_prepared: false })).tags).toEqual([]);
    expect(spellToCard(spell({ spellLevel: 0, is_prepared: true })).tags).toEqual([]);
  });
});

describe('spellCardState', () => {
  it('pronta: truque, preparada ou de quem não prepara', () => {
    expect(spellCardState(spell({ spellLevel: 0 }), true, false, true)).toBe('ready');
    expect(spellCardState(spell({ is_prepared: true }), true, false, true)).toBe('ready');
    expect(spellCardState(spell(), false, false, true)).toBe('ready');
  });

  it('não preparada: dá pra preparar com vaga fora de combate; senão bloqueada', () => {
    expect(spellCardState(spell(), true, true, false)).toBe('preparable');
    expect(spellCardState(spell(), true, false, false)).toBe('locked');
    expect(spellCardState(spell(), true, true, true)).toBe('locked');
  });
});

describe('spellRangeLabel', () => {
  it('0 é pessoal, 1 é toque, o resto em metros, sem alcance vira traço', () => {
    expect(spellRangeLabel(0)).toBe('Pessoal');
    expect(spellRangeLabel(1)).toBe('Toque');
    expect(spellRangeLabel(2)).toBe('2 m');
    expect(spellRangeLabel(36)).toBe('36 m');
    expect(spellRangeLabel(null)).toBe('—');
  });
});

describe('selo de dano da carta', () => {
  const roll = (
    extra: Partial<SpellRoll>,
    slot: string,
    entry: Partial<SpellRoll['by_slot'][string]>,
  ): SpellRoll => ({
    kind: 'save',
    attack_type: null,
    attack_bonus: null,
    damage_type: 'fogo',
    save_ability: 'DEX',
    save_dc: 13,
    save_on_success: 'half',
    heal: null,
    maximize: false,
    rider_trigger: null,
    rider_attack: null,
    instance_label: null,
    variant: null,
    by_slot: {
      [slot]: { instances: 1, dice_count: 8, dice_sides: 6, modifier: 0, extra_dice: [], ...entry },
    },
    ...extra,
  });

  it('fora da ficha: o dano base que a API manda', () => {
    const card = spellToCard(spell({ card_damage: { dice: '8d6', type: 'fogo', kind: 'damage' } }));
    expect(card.seal).toEqual({ value: '8d6', label: 'FOGO', kind: 'damage' });
  });

  it('na ficha: o valor do personagem, lido da rolagem no círculo da magia', () => {
    // Truque no nível 11: 3d10, mesmo com o base 1d10 vindo junto.
    const cantrip = spell({
      spellLevel: 0,
      card_damage: { dice: '1d10', type: 'fogo', kind: 'damage' },
      roll: roll({ kind: 'attack' }, '0', { dice_count: 3, dice_sides: 10 }),
    });
    expect(spellSeal(cantrip)).toEqual({ value: '3d10', label: 'FOGO', kind: 'damage' });
  });

  it('cura com o modificador somado, PV temporários e "+" no que soma ao ataque', () => {
    const cure = spell({
      spellLevel: 1,
      roll: roll({ kind: 'heal', heal: 'hp', damage_type: null }, '1', {
        dice_count: 1,
        dice_sides: 8,
        modifier: 3,
      }),
    });
    expect(spellSeal(cure)).toEqual({ value: '1d8+3', label: 'CURA', kind: 'heal' });
    const temp = spell({ card_damage: { dice: '1d4+4', type: null, kind: 'temp_hp' } });
    expect(spellSeal(temp)).toEqual({ value: '1d4+4', label: 'PV TEMP.', kind: 'heal' });
    const hex = spell({
      spellLevel: 1,
      roll: roll({ kind: 'rider', damage_type: 'necrótico' }, '1', { dice_count: 1 }),
    });
    expect(spellSeal(hex)?.value).toBe('+1d6');
  });

  it('sem dano nem cura: sem selo', () => {
    expect(spellToCard(spell()).seal).toBeNull();
    expect(spellSeal(spell({ card_damage: null }))).toBeNull();
  });

  it('formatSpellDice: várias rolagens, bônus negativo e dados extras', () => {
    const entry = { instances: 3, dice_count: 1, dice_sides: 4, modifier: 1, extra_dice: [] };
    expect(formatSpellDice(entry)).toBe('3× 1d4+1');
    expect(formatSpellDice({ ...entry, instances: 1, modifier: -1 })).toBe('1d4-1');
    expect(
      formatSpellDice({
        ...entry,
        instances: 1,
        modifier: 0,
        extra_dice: [{ count: 4, sides: 6 }],
      }),
    ).toBe('1d4 + 4d6');
  });
});
