import {
  castStagePayload,
  castVerb,
  monsterCastVerb,
  monsterSequenceStamp,
  SpellCastContext,
} from './spell-cast-context';

const base: SpellCastContext = {
  castId: 'cast-1234',
  idSpell: 9,
  weapon: null,
  spellName: 'Raio de Fogo',
  actor: { name: 'Elora', imageUrl: null, avatarPreset: null, character: null },
  card: {
    title: '',
    badge: '',
    art: null,
    fallbackIcon: '',
    artBackground: null,
    ribbon: '',
    stats: [],
    text: null,
    tags: [],
  },
  saveDc: null,
  saveAbility: null,
  saveNote: null,
};

describe('castStagePayload', () => {
  it('magia manda id_spell; ataque com arma manda a carta da arma (sem id_spell)', () => {
    expect(castStagePayload(base, 7, 'Elora', 'open', [])).toMatchObject({ id_spell: 9 });
    const weapon = {
      id_weapon: 20,
      name: 'Espada Longa',
      attack_bonus: 5,
      damage_modifier: 3,
      damage_die: '1d8',
      damage_type: 'cortante',
      properties: null,
      weight: 1.5,
      is_ranged: false,
    };
    const payload = castStagePayload({ ...base, idSpell: null, weapon }, 7, 'Thorin', 'done', []);
    expect(payload.weapon).toEqual(weapon);
    expect(payload).not.toHaveProperty('id_spell');
  });

  it('verbo do aviso', () => {
    expect(castVerb(false)).toBe('LANÇOU');
    expect(castVerb(true)).toBe('ATACOU COM');
  });
});

describe('ação de monstro na tela de lançamento (1.13.0)', () => {
  const action = {
    name: 'Cimitarra',
    kind: 'attack' as const,
    stats: [{ label: 'ATAQUE', value: '+4' }],
  };

  it('manda a carta da ação e o monstro, sem personagem nem magia', () => {
    const payload = castStagePayload(
      { ...base, idSpell: null, monsterAction: action, idMonsterSession: 'm1' },
      null,
      'Goblin',
      'open',
      [],
    );
    expect(payload).toMatchObject({
      id_character: null,
      monster_action: action,
      id_monster_session: 'm1',
    });
    expect(payload).not.toHaveProperty('id_spell');
    expect(payload).not.toHaveProperty('weapon');
  });

  it('verbo: ATACOU COM no ataque, USOU no resto', () => {
    expect(monsterCastVerb(action)).toBe('ATACOU COM');
    expect(monsterCastVerb({ ...action, kind: 'save' })).toBe('USOU');
    expect(monsterCastVerb({ ...action, kind: 'damage' })).toBe('USOU');
  });

  it('multiataque: selo "MULTIATAQUE k/N" só com a sequência (1.15.1)', () => {
    expect(monsterSequenceStamp({ ...action, sequence: { index: 1, total: 2 } })).toBe(
      'MULTIATAQUE 1/2',
    );
    expect(monsterSequenceStamp(action)).toBeNull();
    expect(monsterSequenceStamp(null)).toBeNull();
  });
});
