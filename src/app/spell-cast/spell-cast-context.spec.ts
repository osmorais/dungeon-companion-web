import { castStagePayload, castVerb, SpellCastContext } from './spell-cast-context';

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
