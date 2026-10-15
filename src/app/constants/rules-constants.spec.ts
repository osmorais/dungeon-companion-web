import {
  CLASS_SPELLS,
  FULL_LIST_PREPARED_CASTER_CLASS_IDS,
  KNOWN_CASTER_CLASS_IDS,
  getKnownSpellCount,
  getSpellLimits,
  getWizardSpellbookSize,
} from './spell-rules';
import { CLASS_ARMOUR_RULES } from './armour-rules';
import { CLASS_SKILL_RULES, RACE_SKILL_RULES } from './skill-rules';
import { RACE_FREE_CANTRIP, SUBRACE_FREE_CANTRIP } from './racial-cantrips';
import { LEVEL1_SUBCLASS_OPTIONS } from './level1-subclass-options';

/**
 * Várias dessas tabelas são cópias manuais do backend (`character-sheet/rules.ts` e
 * `armour-rules.ts` na API). Os valores esperados aqui são os mesmos que os testes do backend
 * conferem — se um lado mudar sem o outro, um dos dois quebra.
 */
const CLASS_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

describe('spell-rules', () => {
  it('espaços de magia: conjurador completo, meio-conjurador e Bruxo', () => {
    expect(getSpellLimits(9, 1).byCircle).toEqual([0, 2, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(getSpellLimits(9, 20).byCircle).toEqual([0, 4, 3, 3, 3, 3, 2, 2, 1, 1]);
    expect(getSpellLimits(11, 1).byCircle).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(getSpellLimits(11, 2).byCircle).toEqual([0, 2, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(getSpellLimits(3, 5).byCircle).toEqual([0, 0, 0, 2, 0, 0, 0, 0, 0, 0]);
  });

  it('classe não conjuradora não tem truque nem espaço', () => {
    expect(getSpellLimits(7, 5)).toEqual({ cantrips: 0, byCircle: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
  });

  it('nível fora de 1–20 é limitado', () => {
    expect(getSpellLimits(9, 0)).toEqual(getSpellLimits(9, 1));
    expect(getSpellLimits(9, 25)).toEqual(getSpellLimits(9, 20));
  });

  it('truques do Clérigo: 3,3,3,4… (bug corrigido antes: era cópia de outra classe)', () => {
    expect([1, 3, 4, 9, 10, 20].map((l) => getSpellLimits(4, l).cantrips)).toEqual([
      3, 3, 4, 4, 5, 5,
    ]);
  });

  it('magias conhecidas por nível (classes de lista fixa)', () => {
    expect(getKnownSpellCount(2, 1)).toBe(4);
    expect(getKnownSpellCount(2, 20)).toBe(22);
    expect(getKnownSpellCount(12, 1)).toBe(0);
    expect(getKnownSpellCount(12, 2)).toBe(2);
    expect(getKnownSpellCount(9, 5)).toBe(0);
  });

  it('grimório do Mago: 6 + 2 por nível, limitado a 1–20', () => {
    expect(getWizardSpellbookSize(1)).toBe(6);
    expect(getWizardSpellbookSize(20)).toBe(44);
    expect(getWizardSpellbookSize(0)).toBe(6);
    expect(getWizardSpellbookSize(30)).toBe(44);
  });

  it('agrupamentos de conjurador iguais ao backend', () => {
    expect([...KNOWN_CASTER_CLASS_IDS].sort((a, b) => a - b)).toEqual([2, 3, 6, 12]);
    expect([...FULL_LIST_PREPARED_CASTER_CLASS_IDS].sort((a, b) => a - b)).toEqual([4, 5, 11]);
  });

  it('toda classe conjuradora tem lista de magias', () => {
    for (const id of [2, 3, 4, 5, 6, 9, 11, 12])
      expect(CLASS_SPELLS[id]?.length).toBeGreaterThan(0);
  });
});

describe('armour-rules', () => {
  it('as 12 classes têm regra (espelho do backend)', () => {
    expect(
      Object.keys(CLASS_ARMOUR_RULES)
        .map(Number)
        .sort((a, b) => a - b),
    ).toEqual(CLASS_IDS);
    expect(CLASS_ARMOUR_RULES[7]).toEqual({
      types: ['Armadura Leve', 'Armadura Média', 'Armadura Pesada'],
      shield: true,
    });
    expect(CLASS_ARMOUR_RULES[9]).toEqual({ types: [], shield: false });
    expect(CLASS_ARMOUR_RULES[10]).toEqual({ types: [], shield: false });
  });
});

describe('skill-rules', () => {
  it('toda classe tem quantidade de escolhas e ids de perícia válidos (1–18)', () => {
    for (const id of CLASS_IDS) {
      const rule = CLASS_SKILL_RULES[id];
      expect(rule.choices).toBeGreaterThan(0);
      expect(rule.from.every((s) => s >= 1 && s <= 18)).toBe(true);
      expect(new Set(rule.from).size).toBe(rule.from.length);
      if (rule.from.length) expect(rule.from.length).toBeGreaterThanOrEqual(rule.choices);
    }
  });

  it('Bardo escolhe 3 de qualquer uma; Ladino 4', () => {
    expect(CLASS_SKILL_RULES[2]).toEqual({ choices: 3, from: [] });
    expect(CLASS_SKILL_RULES[8].choices).toBe(4);
  });

  it('raças: Elfo ganha Percepção, Meio-Orc Intimidação, Meio-Elfo escolhe 2', () => {
    expect(RACE_SKILL_RULES[2].granted).toEqual([13]);
    expect(RACE_SKILL_RULES[7].granted).toEqual([17]);
    expect(RACE_SKILL_RULES[6].extraChoices).toBe(2);
  });
});

describe('racial-cantrips', () => {
  it('Tiefling e Gnomo das Florestas têm truque fixo; Alto Elfo escolhe', () => {
    expect(RACE_FREE_CANTRIP[8].fixedSpellName).toBe('Taumaturgia');
    expect(SUBRACE_FREE_CANTRIP['gnomo-das-florestas'].fixedSpellName).toBe('Ilusão Menor');
    expect(SUBRACE_FREE_CANTRIP['alto-elfo'].fixedSpellName).toBeUndefined();
  });
});

describe('level1-subclass-options', () => {
  it('só Bruxo, Clérigo e Feiticeiro escolhem subclasse no nível 1, com os mesmos ids do backend', () => {
    expect(
      Object.keys(LEVEL1_SUBCLASS_OPTIONS)
        .map(Number)
        .sort((a, b) => a - b),
    ).toEqual([3, 4, 6]);
    const ids = (classId: number) => LEVEL1_SUBCLASS_OPTIONS[classId].map((o) => o.id_subclass);
    expect(ids(3)).toEqual(['corruptor', 'arquifada', 'grande-antigo']);
    expect(ids(4).sort()).toEqual([
      'conhecimento',
      'enganacao',
      'guerra',
      'luz',
      'natureza',
      'tempestade',
      'vida',
    ]);
    expect(ids(6)).toEqual(['linhagem-draconica', 'magia-selvagem']);
  });

  it('toda opção tem ao menos uma feature descrita', () => {
    for (const options of Object.values(LEVEL1_SUBCLASS_OPTIONS)) {
      for (const option of options) {
        expect(option.features.length).toBeGreaterThan(0);
        expect(option.features.every((f) => f.name && f.description)).toBe(true);
      }
    }
  });
});
