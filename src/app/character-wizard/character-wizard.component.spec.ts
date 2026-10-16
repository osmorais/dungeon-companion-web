import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CharacterWizardComponent } from './character-wizard.component';
import { CharacterService } from '../services/character.service';
import { LoadingOverlayService } from '../loading-overlay/loading-overlay.service';
import { Background, CharacterOptions, Skill } from '../models/character-options.interface';

const SKILL_NAMES = [
  'Atletismo',
  'Acrobacia',
  'Furtividade',
  'Prestidigitação',
  'Arcanismo',
  'História',
  'Investigação',
  'Natureza',
  'Religião',
  'Adestrar Animais',
  'Intuição',
  'Medicina',
  'Percepção',
  'Sobrevivência',
  'Atuação',
  'Enganação',
  'Intimidação',
  'Persuasão',
];

const skills: Skill[] = SKILL_NAMES.map((name, i) => ({
  id_skill: i + 1,
  name,
  id_attribute: 1,
  attribute_name: 'FOR',
  description: '',
  is_trained: false,
  is_expert: false,
  level_value: 0,
  total_skill_value: 0,
}));

function background(id: number, name: string, skillIds: number[]): Background {
  return {
    id_background: id,
    name,
    starting_gold_po: 10,
    languages_number: 0,
    skills: skillIds.map((sid) => SKILL_NAMES[sid - 1]),
    skill_ids: skillIds,
    tools: [],
    feature: { name: '', description: '' },
  };
}

const options = {
  attributes: [],
  skills,
  races: [],
  classes: [],
  backgrounds: [
    background(13, 'Soldado', [1, 17]), // Atletismo, Intimidação
    background(1, 'Acólito', [11, 9]), // Intuição, Religião
  ],
  alignments: [],
  spells: [],
  armours: [],
  weapons: [],
} as unknown as CharacterOptions;

/** Perícias do antecedente no passo de perícias do wizard (só a lógica, sem renderizar). */
describe('CharacterWizardComponent — perícias do antecedente', () => {
  let wizard: CharacterWizardComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CharacterService, useValue: { cachedOptions: () => options } },
        {
          provide: LoadingOverlayService,
          useValue: { show: vi.fn(), hide: vi.fn(), visible: () => false },
        },
      ],
    });
    wizard = TestBed.createComponent(CharacterWizardComponent).componentInstance;
    wizard.ngOnInit();
    wizard.characterData.core_build.id_class = 7; // Guerreiro: 2 de Acrobacia, Adestrar, Atletismo, História, Intuição, Intimidação, Percepção, Sobrevivência
  });

  const syncSkills = () => (wizard as unknown as { syncGrantedSkills(): void }).syncGrantedSkills();
  const selectedIds = () =>
    wizard.characterData.choices.skills.map((s) => s.id_skill).sort((a, b) => a - b);

  it('perícias do antecedente já vêm marcadas, travadas e com o selo "Antecedente"', () => {
    wizard.characterData.core_build.id_race = 9; // Humano
    wizard.characterData.core_build.id_background = 13;
    syncSkills();
    expect(selectedIds()).toEqual([1, 17]);
    expect(wizard.isSkillGranted(skills[0])).toBe(true);
    expect(wizard.isSkillCheckboxDisabled(skills[0])).toBe(true);
    expect(wizard.grantedSkillSource(skills[0])).toBe('Antecedente');
  });

  it('não contam na escolha da classe e não podem ser escolhidas de novo', () => {
    wizard.characterData.core_build.id_race = 9;
    wizard.characterData.core_build.id_background = 13;
    syncSkills();
    expect(wizard.selectedChoicesCount).toBe(0);
    expect(wizard.isSkillChoosable(skills[0])).toBe(false); // Atletismo é da lista do Guerreiro, mas já vem do antecedente
    expect(wizard.isSkillChoosable(skills[1])).toBe(true); // Acrobacia
  });

  it('perícia da raça mantém o selo "Raça" (Elfo: Percepção)', () => {
    wizard.characterData.core_build.id_race = 2;
    wizard.characterData.core_build.id_background = 13;
    syncSkills();
    expect(selectedIds()).toEqual([1, 13, 17]);
    expect(wizard.grantedSkillSource(skills[12])).toBe('Raça');
  });

  it('trocar o antecedente tira as perícias antigas (e a especialização nelas) e põe as novas', () => {
    wizard.characterData.core_build.id_race = 9;
    wizard.characterData.core_build.id_background = 13;
    syncSkills();
    wizard.characterData.choices.skills.push(skills[1]); // escolheu Acrobacia pela classe
    wizard.characterData.choices.expertise_skill_ids = [1, 2];

    wizard.characterData.core_build.id_background = 1; // Acólito
    syncSkills();
    expect(selectedIds()).toEqual([2, 9, 11]);
    expect(wizard.characterData.choices.expertise_skill_ids).toEqual([2]);
  });
});

/** Regras de criação que o backend também confere (Meio-Elfo, armadura, perícias livres). */
describe('CharacterWizardComponent — regras de criação', () => {
  let wizard: CharacterWizardComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CharacterService, useValue: { cachedOptions: () => options } },
        {
          provide: LoadingOverlayService,
          useValue: { show: vi.fn(), hide: vi.fn(), visible: () => false },
        },
      ],
    });
    wizard = TestBed.createComponent(CharacterWizardComponent).componentInstance;
    wizard.ngOnInit();
  });

  it('Meio-Elfo escolhe +1 em dois atributos diferentes, sem Carisma', () => {
    wizard.characterData.core_build.id_race = 6;
    wizard.onRaceChange();
    expect(wizard.abilityBonusChoice).toEqual({ count: 2, amount: 1, exclude: ['CHA'] });
    expect(wizard.abilityBonusOptions.map((o) => o.key)).toEqual([
      'STR',
      'DEX',
      'CON',
      'INT',
      'WIS',
    ]);
    wizard.toggleAbilityBonus('STR');
    wizard.toggleAbilityBonus('CON');
    expect(wizard.isAbilityBonusDisabled('DEX')).toBe(true);
    wizard.toggleAbilityBonus('DEX'); // terceiro não entra
    expect(wizard.characterData.choices.ability_bonus_choices).toEqual(['STR', 'CON']);
    wizard.toggleAbilityBonus('STR'); // desmarca
    expect(wizard.characterData.choices.ability_bonus_choices).toEqual(['CON']);

    wizard.characterData.core_build.id_race = 9;
    wizard.onRaceChange();
    expect(wizard.abilityBonusChoice).toBeNull();
    expect(wizard.characterData.choices.ability_bonus_choices).toBeUndefined();
  });

  it('armadura: Anão da Montanha e domínios de armadura pesada ampliam a classe', () => {
    wizard.characterData.core_build.id_class = 9; // Mago: nenhuma
    expect([...wizard.allowedArmourTypes]).toEqual([]);
    wizard.characterData.core_build.subrace = 'anao-da-montanha';
    expect([...wizard.allowedArmourTypes].sort()).toEqual(['Armadura Leve', 'Armadura Média']);

    wizard.characterData.core_build.subrace = undefined;
    wizard.characterData.core_build.id_class = 4; // Clérigo: leve e média
    wizard.characterData.core_build.id_subclass = 'luz';
    expect(wizard.allowedArmourTypes.has('Armadura Pesada')).toBe(false);
    wizard.characterData.core_build.id_subclass = 'vida';
    expect(wizard.allowedArmourTypes.has('Armadura Pesada')).toBe(true);

    // Trocar pra um domínio sem pesada tira a armadura escolhida
    wizard.characterData.equipment.armour = { armour_type: 'Armadura Pesada' } as never;
    wizard.characterData.core_build.id_subclass = 'luz';
    wizard.onSubclassChange();
    expect(wizard.characterData.equipment.armour).toBeNull();
  });

  it('Meio-Elfo: só 2 perícias fora da lista da classe', () => {
    wizard.characterData.core_build.id_class = 7; // Guerreiro: 2 da lista
    wizard.characterData.core_build.id_race = 6;
    wizard.characterData.core_build.id_background = 13; // Atletismo, Intimidação
    wizard.onRaceChange();
    expect(wizard.maxSkillChoices).toBe(4);
    wizard.characterData.choices.skills.push(skills[4], skills[5]); // Arcanismo (fora da lista), História (da lista)
    // Arcanismo (fora) + História (dentro): ainda cabe mais uma fora
    expect(wizard.isSkillCheckboxDisabled(skills[6])).toBe(false); // Investigação
    wizard.characterData.choices.skills.push(skills[6]);
    // Duas fora já escolhidas: outra fora fica travada, uma da classe continua livre
    expect(wizard.isSkillCheckboxDisabled(skills[7])).toBe(true); // Natureza
    expect(wizard.isSkillCheckboxDisabled(skills[1])).toBe(false); // Acrobacia
  });
});

describe('CharacterWizardComponent — armas do equipamento inicial', () => {
  it('armas do kit da classe e do antecedente aparecem marcadas e travadas', () => {
    const kitOptions = {
      ...options,
      classes: [{ id_class: 1, name: 'Bárbaro', starting_weapons: ['Machado Grande', 'Azagaia'] }],
      backgrounds: [
        { ...background(7, 'Forasteiro', [1, 14]), starting_weapons: ['Bordão', 'Azagaia'] },
      ],
    } as unknown as CharacterOptions;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CharacterService, useValue: { cachedOptions: () => kitOptions } },
        {
          provide: LoadingOverlayService,
          useValue: { show: vi.fn(), hide: vi.fn(), visible: () => false },
        },
      ],
    });
    const wizard = TestBed.createComponent(CharacterWizardComponent).componentInstance;
    wizard.ngOnInit();
    wizard.characterData.core_build.id_class = 1;
    wizard.characterData.core_build.id_background = 7;
    expect(wizard.kitWeaponNames).toEqual(['Machado Grande', 'Azagaia', 'Bordão']);
    const axe = { id_weapon: 138, name: 'Machado Grande' } as never;
    const dagger = { id_weapon: 110, name: 'Adaga' } as never;
    expect(wizard.isKitWeapon(axe)).toBe(true);
    expect(wizard.isWeaponSelected(axe)).toBe(true);
    expect(wizard.isKitWeapon(dagger)).toBe(false);
    expect(wizard.isWeaponSelected(dagger)).toBe(false);
    // não vai no payload: a API acrescenta as armas do kit sozinha
    expect(wizard.characterData.equipment.weapons).toEqual([]);
  });
});
