import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { LevelUpModalComponent } from './level-up-modal.component';
import { CharacterService } from '../services/character.service';
import { LevelUpPreview } from '../models/level-up.interface';

const preview: LevelUpPreview = {
  id_class: 7,
  current_level: 3,
  next_level: 4,
  hit_die: 10,
  con_modifier: 2,
  hp_bonus_per_level: 0,
  proficiency_bonus: 2,
  is_asi_level: true,
  new_features: [],
  resources: null,
  spell_slots_total: null,
  feat_options: [
    {
      id_feat: 'afiar-habilidades',
      display_name: 'Habilidoso',
      description: '',
      proficiency_choice: {
        count: 3,
        tool_options: ['Ferramentas de Ladrão', 'Kit de Herbalismo'],
      },
    },
    { id_feat: 'duro', display_name: 'Vigoroso', description: '', proficiency_choice: null },
  ],
  spell_choices: null,
  subclass_options: null,
  subclass_spellcasting: null,
  expertise_choice: null,
  fighting_style_options: null,
  spell_pool_any_class: false,
};

const skill = (id_skill: number, name: string, is_trained: boolean) => ({
  id_skill,
  name,
  attribute_name: 'FOR',
  is_trained,
  is_expert: false,
});

/** Talento Habilidoso no modal de subir de nível: página de escolha e o que vai pra API. */
describe('LevelUpModalComponent — Habilidoso', () => {
  let confirmLevelUp: ReturnType<typeof vi.fn>;
  let modal: LevelUpModalComponent;

  beforeEach(() => {
    confirmLevelUp = vi.fn(() => of({}));
    TestBed.configureTestingModule({
      providers: [
        {
          provide: CharacterService,
          useValue: {
            previewLevelUp: vi.fn(() => of(preview)),
            getCharacterOptions: vi.fn(() => of({ spells: [] })),
            getCharacterById: vi.fn(() =>
              of({
                character_sheet: {
                  skills: [
                    skill(1, 'Atletismo', true),
                    skill(2, 'Acrobacia', false),
                    skill(3, 'Furtividade', false),
                  ],
                },
              }),
            ),
            confirmLevelUp,
          },
        },
      ],
    });
    modal = TestBed.runInInjectionContext(() => new LevelUpModalComponent());
    modal.idCharacter = 9;
    modal.ngOnInit();
    modal.hitDieRoll.set(6);
    modal.selectAsiMode('feat');
  });

  it('a página de proficiências só aparece pro talento que escolhe', () => {
    modal.selectFeat('duro');
    expect(modal.steps()).not.toContain('feat_proficiencies');
    modal.selectFeat('afiar-habilidades');
    expect(modal.steps()).toContain('feat_proficiencies');
    expect(modal.untrainedSkills().map((s) => s.id_skill)).toEqual([2, 3]);
  });

  it('exige exatamente 3 entre perícias e ferramentas; o 4º não entra', () => {
    modal.selectFeat('afiar-habilidades');
    modal.toggleFeatSkill(2);
    modal.toggleFeatTool('Ferramentas de Ladrão');
    expect(modal.readyToConfirm()).toBe(false);
    modal.toggleFeatSkill(3);
    modal.toggleFeatTool('Kit de Herbalismo'); // passou do limite
    expect(modal.featProficiencyCount()).toBe(3);
    expect(modal.readyToConfirm()).toBe(true);
    expect(modal.featProficiencyNames()).toEqual([
      'Acrobacia',
      'Furtividade',
      'Ferramentas de Ladrão',
    ]);
  });

  it('confirmar manda as perícias e ferramentas junto do talento', () => {
    modal.selectFeat('afiar-habilidades');
    modal.toggleFeatSkill(2);
    modal.toggleFeatSkill(3);
    modal.toggleFeatTool('Kit de Herbalismo');
    modal.confirm();
    expect(confirmLevelUp.mock.calls[0][1].asi_or_feat).toEqual({
      type: 'feat',
      feat_id: 'afiar-habilidades',
      skill_ids: [2, 3],
      tools: ['Kit de Herbalismo'],
    });
  });

  it('trocar de talento limpa as escolhas e outro talento vai sem perícias', () => {
    modal.selectFeat('afiar-habilidades');
    modal.toggleFeatSkill(2);
    modal.selectFeat('duro');
    expect(modal.featProficiencyCount()).toBe(0);
    modal.confirm();
    expect(confirmLevelUp.mock.calls[0][1].asi_or_feat).toEqual({ type: 'feat', feat_id: 'duro' });
  });
});
