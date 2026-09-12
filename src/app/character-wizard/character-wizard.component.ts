import { ChangeDetectorRef, Component, inject, OnInit, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CharacterSheetData } from '../models/character.interface';
import { Alignment, Armour, AttributeType, Background, CharacterClass, CharacterOptions, Race, Skill, Spell, Subrace, TraitInfo, WeaponRow } from '../models/character-options.interface';
import { DragonAnimationComponent } from '../dragon-animation/dragon-animation.component';
import { LoadingOverlayComponent } from '../loading-overlay/loading-overlay.component';
import { LoadingOverlayService } from '../loading-overlay/loading-overlay.service';
import { CharacterService } from '../services/character.service';
import { AvatarPickerModalComponent } from '../avatar-picker-modal/avatar-picker-modal.component';
import { AvatarCustomizerComponent } from '../avatar-customizer/avatar-customizer.component';
import { Avatar } from '../constants/avatars';
import {
  AvatarPreset,
  RACE_NAME_TO_AVATAR,
  CLASS_NAME_TO_AVATAR,
} from '../models/avatar-preset.interface';
import { CLASS_SKILL_RULES, RACE_SKILL_RULES } from '../constants/skill-rules';
import {
  CLASS_SPELLS,
  getKnownSpellCount,
  getSpellLimits,
  getWizardSpellbookSize,
  KNOWN_CASTER_CLASS_IDS,
  SpellLimits,
  WIZARD_CLASS_ID,
} from '../constants/spell-rules';
import { CLASS_ARMOUR_RULES } from '../constants/armour-rules';
import { LEVEL1_SUBCLASS_OPTIONS, Level1SubclassOption } from '../constants/level1-subclass-options';
import { RACE_FREE_CANTRIP, SUBRACE_FREE_CANTRIP, RacialCantripGrant } from '../constants/racial-cantrips';
import { PixelDieComponent } from '../pixel-die/pixel-die.component';
import { PixelNumericDieComponent } from '../pixel-numeric-die/pixel-numeric-die.component';
import { TomAssistantComponent } from '../tom-assistant/tom-assistant.component';

type AttributeKey = 'FOR' | 'DES' | 'CON' | 'INT' | 'SAB' | 'CAR';

/** Resultado de uma rolagem de 4d6, descartando o menor valor. */
interface DiceBreakdown {
  rolls: number[];
  dropped: number;
  total: number;
}

@Component({
  selector: 'app-character-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, DragonAnimationComponent, LoadingOverlayComponent, AvatarPickerModalComponent, AvatarCustomizerComponent, PixelDieComponent, PixelNumericDieComponent, TomAssistantComponent],
  templateUrl: './character-wizard.component.html',
  styleUrls: ['./character-wizard.component.scss']
})
export class CharacterWizardComponent implements OnInit {
  private router = inject(Router);
  private charService = inject(CharacterService);
  private loadingOverlay = inject(LoadingOverlayService);
  private cdr = inject(ChangeDetectorRef);

  currentStep = 1;
  dragonTrigger = 0;
  spellCircleStep = 0;
  showStepError = false;

  showSuccess = false;
  showAvatarPicker = signal(false);
  avatarUrl = this.charService.avatarUrl;
  isMobile = signal(typeof window !== 'undefined' && window.innerWidth < 768);

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 768);
  }

  openAvatarPicker() { this.showAvatarPicker.set(true); }

  onAvatarSelected(avatar: Avatar) {
    this.charService.avatarUrl.set(avatar.url);
    this.showAvatarPicker.set(false);
  }

  closeAvatarPicker() { this.showAvatarPicker.set(false); }

  attributesList: AttributeKey[] = ['FOR', 'DES', 'CON', 'INT', 'SAB', 'CAR'];

  /** ===== DRAG SOURCE ===== */
  pool: number[] = [];

  standardArray = [15, 14, 13, 12, 10, 8];
  availablePoints = 27;

  pointCosts: Record<number, number> = {
    8: 0, 9: 1, 10: 2, 11: 3,
    12: 4, 13: 5, 14: 7, 15: 9,
    16: 11, 17: 13, 18: 15
  };

  characterData: CharacterSheetData = {
    core_build: { level: 1, id_race: 0, race: '', id_class: 0, class: '', id_background: 0, background: '' },
    character_details: { name: '', id_alignment: 0, alignment: '', age: 20 },
    attributes: {
      generation_method: 'standard_array',
      base_values: { FOR: 8, DES: 8, CON: 8, INT: 8, SAB: 8, CAR: 8 }
    },
    choices: { skills: [], spells: [], expertise_skill_ids: [] },
    equipment: { armour: null, weapons: [], has_shield: false }
  };

  availableAttributes: AttributeType[] = [];
  availableSkills: Skill[] = [];
  availableWeapons: WeaponRow[] = [];
  availableRaces: Race[] = [];
  availableClasses: CharacterClass[] = [];
  availableBackgrounds: Background[] = [];
  availableAlignments: Alignment[] = [];
  availableSpells: Spell[] = [];
  availableArmours: Armour[] = [];
  constructor() {
      this.onMethodChange();
    }

  ngOnInit(): void {
    const options = this.charService.cachedOptions();
    if (options) {
      this.applyOptions(options);
    }
  }

  private applyOptions(options: CharacterOptions): void {
    this.availableAttributes = options.attributes;
    this.availableSkills = options.skills;
    this.availableRaces = options.races ?? [];
    this.availableClasses = options.classes ?? [];
    this.availableBackgrounds = options.backgrounds ?? [];
    this.availableAlignments = options.alignments ?? [];
    this.availableSpells = options.spells ?? [];
    this.availableArmours = (options.armours ?? []).filter(a => a.armour_type !== 'Escudo');
    this.availableWeapons = options.weapons.map(w => {
      const props = w.properties ? w.properties.split(', ') : [];
      return {
        id_weapon: w.id_weapon,
        attack_bonus: w.attack_bonus,
        damage_modifier: w.damage_modifier,
        name: w.name,
        damage_die: w.damage_die,
        damage_type: w.damage_type,
        weight: w.weight,
        price_value: w.price_value,
        properties: w.properties,
        isRanged: props.some(p => p.toLowerCase().startsWith('munição'))
      };
    });
    this.cdr.detectChanges();
  }

  get availableSubraces(): Subrace[] {
    return this.availableRaces.find(r => +r.id_race === +this.characterData.core_build.id_race)?.subraces ?? [];
  }

  get availableLevel1Subclasses(): Level1SubclassOption[] {
    return LEVEL1_SUBCLASS_OPTIONS[+this.characterData.core_build.id_class] ?? [];
  }

  /** ========================= EXPLICAÇÕES DAS ESCOLHAS (info box abaixo de cada seletor) ========================= */

  get selectedRace(): Race | undefined {
    return this.availableRaces.find(r => +r.id_race === +this.characterData.core_build.id_race);
  }

  get selectedSubrace(): Subrace | undefined {
    return this.availableSubraces.find(s => s.key === this.characterData.core_build.subrace);
  }

  get selectedClass(): CharacterClass | undefined {
    return this.availableClasses.find(c => +c.id_class === +this.characterData.core_build.id_class);
  }

  get selectedLevel1Subclass(): Level1SubclassOption | undefined {
    return this.availableLevel1Subclasses.find(s => s.id_subclass === this.characterData.core_build.id_subclass);
  }

  get selectedBackground(): Background | undefined {
    return this.availableBackgrounds.find(b => +b.id_background === +this.characterData.core_build.id_background);
  }

  get selectedAlignment(): Alignment | undefined {
    return this.availableAlignments.find(a => +a.id_alignment === +this.characterData.character_details.id_alignment);
  }

  get selectedRaceMeta(): string {
    const r = this.selectedRace;
    if (!r) return '';
    const parts = [`Deslocamento: ${r.movement}`];
    if (r.bonuses_text) parts.unshift(`Bônus: ${r.bonuses_text}`);
    if (r.languages.length) parts.push(`Idiomas: ${r.languages.join(', ')}`);
    return parts.join(' · ');
  }

  get selectedSubraceMeta(): string {
    const s = this.selectedSubrace;
    return s?.bonuses_text ? `Bônus: ${s.bonuses_text}` : '';
  }

  get selectedClassMeta(): string {
    const c = this.selectedClass;
    if (!c) return '';
    const parts = [`Dado de Vida: d${c.hit_die}`];
    if (c.saving_throws_text) parts.push(`Resistências: ${c.saving_throws_text}`);
    parts.push(`Armaduras: ${c.armor_proficiencies.join(', ') || 'nenhuma'}`);
    parts.push(`Armas: ${c.weapon_proficiencies.join(', ') || 'nenhuma'}`);
    return parts.join(' · ');
  }

  get selectedBackgroundMeta(): string {
    const b = this.selectedBackground;
    if (!b) return '';
    const parts = [`Perícias: ${b.skills.join(', ') || '—'}`];
    if (b.tools.length) parts.push(`Ferramentas: ${b.tools.join(', ')}`);
    parts.push(`Idiomas adicionais: ${b.languages_number}`);
    return parts.join(' · ');
  }

  get selectedBackgroundTraits(): TraitInfo[] {
    return this.selectedBackground ? [this.selectedBackground.feature] : [];
  }

  /** ========================= TOM, O ASSISTENTE ========================= */

  private readonly tomStepDialogue: Record<number, { image: string; message: string }> = {
    1: {
      image: 'tom-hi.png',
      message: 'Olá aventureiro, sou o Tom! Vamos criar seu herói! Escolha raça, classe e antecedente pra começar essa jornada.',
    },
    2: {
      image: 'tom-pointing.png',
      message: 'No que você é bom? Escolha seus atributos! Força, Destreza, Constituição... escolha com sabedoria (ou confie na sorte dos dados).',
    },
    3: {
      image: 'tom-casting-spell.png',
      message: 'Dracarys! Hora de escolher truques e magias. Escolha com cuidado, cada uma conta.',
    },
    4: {
      image: 'tom-reading.png',
      message: 'Todo bom aventureiro estuda antes de sair por aí. Escolha suas perícias!',
    },
    5: {
      image: 'tom-forging.png',
      message: 'Vamos pra forja! Escolha uma armadura pra não voltar pra casa cheio de buracos.',
    },
    6: {
      image: 'tom-forging.png',
      message: 'Ainda na forja: hora de escolher suas armas. Escolha com carinho, vocês vão passar bastante tempo juntos.',
    },
    7: {
      image: 'tom-like.png',
      message: 'Agora a parte boa: dinheiro! Role os dados e vamos ver quanta grana você ganhou.',
    },
    8: {
      image: 'tom-celebrating.png',
      message: 'Uhul, quase lá! Agora só precisa nos mostrar como você é e vamos partir pra aventura.',
    },
  };

  private readonly tomStopMessage =
    'You shall not pass! (Sei que não sou o Gandalf mas é sério, faltou alguma coisa)';

  private readonly tomSuccessMessage = 'Boa! Seu personagem tá pronto! Bora pra aventura!';

  get tomImage(): string {
    if (this.showSuccess) return 'tom-celebrating.png';
    if (this.showStepError) return 'tom-stop.png';
    return this.tomStepDialogue[this.currentStep]?.image ?? 'tom.png';
  }

  get tomMessage(): string {
    if (this.showSuccess) return this.tomSuccessMessage;
    if (this.showStepError) return this.tomStopMessage;
    return this.tomStepDialogue[this.currentStep]?.message ?? '';
  }

  private isCurrentStepValid(): boolean {
    switch (this.currentStep) {
      case 1:
        return (
          +this.characterData.core_build.id_race !== 0 &&
          +this.characterData.core_build.id_class !== 0 &&
          +this.characterData.core_build.id_background !== 0 &&
          this.characterData.character_details.name.trim() !== '' &&
          +this.characterData.character_details.id_alignment !== 0 &&
          (this.availableSubraces.length === 0 || !!this.characterData.core_build.subrace) &&
          (this.availableLevel1Subclasses.length === 0 || !!this.characterData.core_build.id_subclass) &&
          (this.toolProficiencyOptions.length === 0 || !!this.characterData.choices.tool_proficiency) &&
          (this.fightingStyleOptions.length === 0 || !!this.characterData.choices.fighting_style) &&
          (this.racialCantripOptions.length === 0 || this.selectedRacialCantripId !== null)
        );
      case 2:
        if (this.characterData.attributes.generation_method === 'point_buy') return true;
        return this.attributesList.every(attr => this.characterData.attributes.base_values[attr] !== 0);
      case 3: {
        const circle = this.currentSpellCircle;

        if (this.hasSharedSpellPool && circle !== 0) {
          const isLastCircle = this.spellCircleStep === this.accessibleCircles.length - 1;
          if (!isLastCircle) return true;
          const target = Math.min(this.nonCantripSpellPoolSize, this.availableNonCantripSpells);
          return this.selectedNonCantripSpellCount >= target;
        }

        const limit = this.spellLimitForCircle(circle);
        const available = (this.spellsByCircle.get(circle) ?? []).length;
        return this.selectedSpellCountByCircle(circle) >= Math.min(limit, available);
      }
      case 4:
        return (
          (this.maxSkillChoices === 0 || this.selectedChoicesCount >= this.maxSkillChoices) &&
          (this.expertiseGrantCount === 0 || (this.characterData.choices.expertise_skill_ids ?? []).length >= this.expertiseGrantCount)
        );
      case 7:
        return this.hasRolledStartingGold;
      default:
        return true;
    }
  }

  nextStep() {
    if (!this.isCurrentStepValid()) {
      this.showStepError = true;
      return;
    }
    this.showStepError = false;
    this.dragonTrigger++;

    if (this.currentStep === 2 && !this.hasMagic()) {
      this.currentStep = 4;
      this.syncGrantedSkills();
      return;
    }

    if (this.currentStep === 3) {
      if (this.spellCircleStep < this.accessibleCircles.length - 1) {
        this.spellCircleStep++;
      } else {
        this.currentStep = 4;
        this.syncGrantedSkills();
      }
      return;
    }

    if (this.currentStep < 8) {
      this.currentStep++;
      if (this.currentStep === 3) this.spellCircleStep = 0;
      if (this.currentStep === 4) this.syncGrantedSkills();
      if (this.currentStep === 8) this.initAvatarPreset();
    }
  }

  goHome() {
    this.router.navigate(['/']);
  }

  prevStep() {
    this.showStepError = false;
    if (this.currentStep === 4 && !this.hasMagic()) {
      this.currentStep = 2;
      return;
    }

    if (this.currentStep === 4 && this.hasMagic()) {
      this.currentStep = 3;
      this.spellCircleStep = this.accessibleCircles.length - 1;
      return;
    }

    if (this.currentStep === 3) {
      if (this.spellCircleStep > 0) {
        this.spellCircleStep--;
      } else {
        this.currentStep = 2;
      }
      return;
    }

    if (this.currentStep > 1) this.currentStep--;
  }

  /** ========================= CLASS / RACE CHANGE ========================= */

  onClassChange(): void {
    const cls = this.availableClasses.find(c => +c.id_class === +this.characterData.core_build.id_class);
    this.characterData.core_build.class = cls?.name ?? '';
    this.characterData.core_build.id_subclass = this.availableLevel1Subclasses.length > 0 ? '' : undefined;
    this.characterData.choices.fighting_style = undefined;
    this.resetAllChoices();
    this.applyRacialCantripGrant();
  }

  onRaceChange(): void {
    const race = this.availableRaces.find(r => +r.id_race === +this.characterData.core_build.id_race);
    this.characterData.core_build.race = race?.name ?? '';
    this.characterData.core_build.subrace = this.availableSubraces.length > 0 ? '' : undefined;
    this.characterData.choices.tool_proficiency = undefined;
    this.resetAllChoices();
    this.applyRacialCantripGrant();

    if (this.characterData.avatar_preset) {
      const raceKey = RACE_NAME_TO_AVATAR[this.characterData.core_build.race] ?? 'human';
      this.characterData.avatar_preset = { ...this.characterData.avatar_preset, race: raceKey };
    }
  }

  /** Sub-raça não muda a classe nem as escolhas de magia/perícia já feitas — só troca o truque racial. */
  onSubraceChange(): void {
    this.applyRacialCantripGrant();
  }

  private resetAllChoices(): void {
    this.resetSkillChoices();
    this.characterData.choices.spells = [];
    this.characterData.equipment.armour = null;
    this.characterData.equipment.has_shield = false;
    this.characterData.equipment.weapons = [];
    this.characterData.equipment.starting_gold = undefined;
    this.startingGoldDiceRolls = null;
    this.spellCircleStep = 0;
    this.weaponsPage = 0;
    this.showStepError = false;
  }

  private resetSkillChoices(): void {
    const granted = this.grantedSkills;
    this.characterData.choices.skills = [...granted];
    this.characterData.choices.expertise_skill_ids = [];
  }

  private syncGrantedSkills(): void {
    const granted = this.grantedSkills;
    for (const skill of granted) {
      if (!this.characterData.choices.skills.some(s => s.id_skill === skill.id_skill)) {
        this.characterData.choices.skills.push(skill);
      }
    }
  }

  /**
   * ========================= TRUQUE RACIAL (ALTO ELFO/GNOMO DAS FLORESTAS/TIEFLING) =========================
   * Independente da classe — mesmo um personagem de classe não conjuradora ganha esse truque.
   * Fixo (Gnomo/Tiefling) é injetado automaticamente; à escolha (Alto Elfo) o jogador escolhe
   * entre os truques de mago. Rastreado por id pra poder trocar/remover sem mexer nas outras
   * magias já escolhidas pelo jogador (ver toggleSpell/resetAllChoices).
   */
  private currentRacialCantripSpellId: number | null = null;

  get racialCantripGrant(): RacialCantripGrant | null {
    const subraceKey = this.characterData.core_build.subrace;
    if (subraceKey && SUBRACE_FREE_CANTRIP[subraceKey]) return SUBRACE_FREE_CANTRIP[subraceKey];
    return RACE_FREE_CANTRIP[+this.characterData.core_build.id_race] ?? null;
  }

  /** Só populado quando o truque é à escolha do jogador (Alto Elfo) — vazio pros fixos. */
  get racialCantripOptions(): Spell[] {
    const grant = this.racialCantripGrant;
    if (!grant || grant.fixedSpellName) return [];
    const classSpellIds = new Set(CLASS_SPELLS[grant.spellListClassId] ?? []);
    return this.availableSpells
      .filter(s => s.spellLevel === 0 && classSpellIds.has(s.id_spell))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  get selectedRacialCantripId(): number | null {
    return this.currentRacialCantripSpellId;
  }

  private removeCurrentRacialCantrip(): void {
    if (this.currentRacialCantripSpellId === null) return;
    const idx = this.characterData.choices.spells.findIndex(s => s.id_spell === this.currentRacialCantripSpellId);
    if (idx > -1) this.characterData.choices.spells.splice(idx, 1);
    this.currentRacialCantripSpellId = null;
  }

  /** Chamado após qualquer troca de raça/sub-raça — reaplica o truque fixo (se houver) e limpa a escolha anterior. */
  private applyRacialCantripGrant(): void {
    this.removeCurrentRacialCantrip();
    const grant = this.racialCantripGrant;
    if (!grant?.fixedSpellName) return;
    const spell = this.availableSpells.find(s => s.spellLevel === 0 && s.name === grant.fixedSpellName);
    if (!spell) return;
    this.characterData.choices.spells.push(spell);
    this.currentRacialCantripSpellId = spell.id_spell;
  }

  selectRacialCantrip(value: string): void {
    this.removeCurrentRacialCantrip();
    if (!value) return;
    const idSpell = +value;
    const spell = this.racialCantripOptions.find(s => s.id_spell === idSpell);
    if (!spell) return;
    this.characterData.choices.spells.push(spell);
    this.currentRacialCantripSpellId = idSpell;
  }

  /** ========================= FERRAMENTA / ESTILO DE COMBATE (ESCOLHAS DE RAÇA/CLASSE) ========================= */

  get toolProficiencyOptions(): string[] {
    return this.selectedRace?.tool_proficiency_options ?? [];
  }

  get fightingStyleOptions(): string[] {
    const cls = this.selectedClass;
    if (!cls?.fighting_style_options?.length) return [];
    if (cls.fighting_style_level != null && +this.characterData.core_build.level < cls.fighting_style_level) return [];
    return cls.fighting_style_options;
  }

  /** ========================= SKILL STATE ========================= */

  get grantedSkillIds(): Set<number> {
    const rule = RACE_SKILL_RULES[+this.characterData.core_build.id_race];
    return new Set(rule?.granted ?? []);
  }

  get choosableSkillIds(): Set<number> {
    const classRule = CLASS_SKILL_RULES[+this.characterData.core_build.id_class];
    const raceRule = RACE_SKILL_RULES[+this.characterData.core_build.id_race];
    const grantedIds = this.grantedSkillIds;
    const allIds = this.availableSkills.map(s => s.id_skill);

    // Race com extraChoices livres expande para todas as skills
    const raceExpandsAll = raceRule?.extraChoices && (!raceRule.extraFrom || raceRule.extraFrom.length === 0);

    let pool: number[];
    if (!classRule || classRule.from.length === 0 || raceExpandsAll) {
      pool = allIds;
    } else {
      pool = classRule.from;
    }

    return new Set(pool.filter(id => !grantedIds.has(id)));
  }

  get maxSkillChoices(): number {
    const classRule = CLASS_SKILL_RULES[+this.characterData.core_build.id_class];
    const raceRule = RACE_SKILL_RULES[+this.characterData.core_build.id_race];
    return (classRule?.choices ?? 0) + (raceRule?.extraChoices ?? 0);
  }

  get selectedChoicesCount(): number {
    const grantedIds = this.grantedSkillIds;
    return this.characterData.choices.skills.filter(s => !grantedIds.has(s.id_skill)).length;
  }

  get grantedSkills(): Skill[] {
    const ids = this.grantedSkillIds;
    return this.availableSkills.filter(s => ids.has(s.id_skill));
  }

  isSkillGranted(skill: Skill): boolean {
    return this.grantedSkillIds.has(skill.id_skill);
  }

  isSkillChoosable(skill: Skill): boolean {
    return this.choosableSkillIds.has(skill.id_skill);
  }

  isSkillSelected(skill: Skill): boolean {
    return this.characterData.choices.skills.some(s => s.id_skill === skill.id_skill);
  }

  isSkillCheckboxDisabled(skill: Skill): boolean {
    if (this.isSkillGranted(skill)) return true;
    if (!this.isSkillChoosable(skill)) return true;
    if (!this.isSkillSelected(skill) && this.selectedChoicesCount >= this.maxSkillChoices) return true;
    return false;
  }

  toggleSkill(skill: Skill, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;

    if (this.isSkillGranted(skill)) {
      (event.target as HTMLInputElement).checked = true;
      return;
    }

    if (isChecked) {
      if (this.selectedChoicesCount >= this.maxSkillChoices) {
        (event.target as HTMLInputElement).checked = false;
        return;
      }
      if (!this.characterData.choices.skills.some(s => s.id_skill === skill.id_skill)) {
        this.characterData.choices.skills.push(skill);
      }
    } else {
      const idx = this.characterData.choices.skills.findIndex(s => s.id_skill === skill.id_skill);
      if (idx > -1) this.characterData.choices.skills.splice(idx, 1);
      const expertiseIds = this.characterData.choices.expertise_skill_ids;
      const expertiseIdx = expertiseIds?.indexOf(skill.id_skill) ?? -1;
      if (expertiseIdx > -1) expertiseIds!.splice(expertiseIdx, 1);
    }
  }

  private expandedSkillIds = new Set<number>();

  isSkillExpanded(idSkill: number): boolean {
    return this.expandedSkillIds.has(idSkill);
  }

  toggleSkillDetails(idSkill: number): void {
    if (this.expandedSkillIds.has(idSkill)) this.expandedSkillIds.delete(idSkill);
    else this.expandedSkillIds.add(idSkill);
  }

  /**
   * ========================= ESPECIALIZAÇÃO / BÊNÇÃO DO CONHECIMENTO =========================
   * Ladino (Especialização, nível 1) dobra o bônus de proficiência em 2 perícias já treinadas.
   * Clérigo + Domínio do Conhecimento (Bênção do Conhecimento) concede treino novo + dobro em 2
   * perícias de uma lista fixa (Arcanismo/História/Natureza/Religião), independente das perícias
   * normais de classe/antecedente. As demais ocorrências (Ladino nível 6, Bardo nível 3/10) só
   * acontecem via level-up, nunca na criação — ver level-up-modal.
   */
  private static stripAccents(value: string): string {
    return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  get expertiseGrantCount(): number {
    if (+this.characterData.core_build.id_class === 8) return 2; // Ladino
    if (+this.characterData.core_build.id_class === 4 && this.characterData.core_build.id_subclass === 'conhecimento') return 2; // Clérigo — Domínio do Conhecimento
    return 0;
  }

  /** Perícias que o jogador pode escolher pra Especialização/Bênção do Conhecimento nesta classe. */
  get expertisePoolSkills(): Skill[] {
    if (+this.characterData.core_build.id_class === 8) {
      return this.characterData.choices.skills;
    }
    if (+this.characterData.core_build.id_class === 4 && this.characterData.core_build.id_subclass === 'conhecimento') {
      const targets = ['arcanismo', 'historia', 'natureza', 'religiao'];
      return this.availableSkills.filter(s => targets.includes(CharacterWizardComponent.stripAccents(s.name)));
    }
    return [];
  }

  get expertiseSectionTitle(): string {
    return +this.characterData.core_build.id_class === 8 ? 'ESPECIALIZAÇÃO' : 'BÊNÇÃO DO CONHECIMENTO';
  }

  isExpertiseSelected(idSkill: number): boolean {
    return (this.characterData.choices.expertise_skill_ids ?? []).includes(idSkill);
  }

  isExpertiseCheckboxDisabled(idSkill: number): boolean {
    return !this.isExpertiseSelected(idSkill) && (this.characterData.choices.expertise_skill_ids ?? []).length >= this.expertiseGrantCount;
  }

  toggleExpertise(idSkill: number, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    const ids = this.characterData.choices.expertise_skill_ids ?? (this.characterData.choices.expertise_skill_ids = []);

    if (isChecked) {
      if (ids.length >= this.expertiseGrantCount) {
        (event.target as HTMLInputElement).checked = false;
        return;
      }
      if (!ids.includes(idSkill)) ids.push(idSkill);
    } else {
      const idx = ids.indexOf(idSkill);
      if (idx > -1) ids.splice(idx, 1);
    }
  }

  /** ========================= MAGIC ========================= */

  hasMagic(): boolean {
    const magicClasses = ["2", "3", "4", "5", "6", "9", "11", "12"];
    return magicClasses.includes(this.characterData.core_build.id_class.toString());
  }

  get isWizard(): boolean {
    return +this.characterData.core_build.id_class === WIZARD_CLASS_ID;
  }

  /** Bardo, Bruxo, Feiticeiro, Patrulheiro — magias conhecidas por tabela fixa, não por espaços. */
  get isKnownCaster(): boolean {
    return KNOWN_CASTER_CLASS_IDS.has(+this.characterData.core_build.id_class);
  }

  /** Mago (grimório) e conjuradores de lista fixa compartilham um pool livre entre círculos. */
  get hasSharedSpellPool(): boolean {
    return this.isWizard || this.isKnownCaster;
  }

  /** Total de magias com nível (exclui truques) que a classe conhece, independente dos espaços de magia. */
  get nonCantripSpellPoolSize(): number {
    if (this.isWizard) return getWizardSpellbookSize(+this.characterData.core_build.level);
    if (this.isKnownCaster) {
      return getKnownSpellCount(
        +this.characterData.core_build.id_class,
        +this.characterData.core_build.level
      );
    }
    return 0;
  }

  get selectedNonCantripSpellCount(): number {
    return this.characterData.choices.spells.filter(
      s => s.spellLevel > 0 && s.id_spell !== this.currentRacialCantripSpellId,
    ).length;
  }

  get availableNonCantripSpells(): number {
    return this.accessibleCircles
      .filter(circle => circle > 0)
      .reduce((sum, circle) => sum + (this.spellsByCircle.get(circle) ?? []).length, 0);
  }

  /** ========================= SPELL STATE ========================= */

  get currentSpellLimits(): SpellLimits {
    return getSpellLimits(
      +this.characterData.core_build.id_class,
      +this.characterData.core_build.level
    );
  }

  get classSpellIds(): Set<number> {
    return new Set(CLASS_SPELLS[+this.characterData.core_build.id_class] ?? []);
  }

  get spellsByCircle(): Map<number, Spell[]> {
    const ids = this.classSpellIds;
    const map = new Map<number, Spell[]>();
    for (const spell of this.availableSpells) {
      if (!ids.has(spell.id_spell)) continue;
      // O truque racial (ver TRUQUE RACIAL) é concedido à parte — não aparece aqui pra não ser
      // confundido com uma escolha de classe nem descontar da cota normal de truques/magias.
      if (spell.id_spell === this.currentRacialCantripSpellId) continue;
      const lvl = spell.spellLevel;
      if (!map.has(lvl)) map.set(lvl, []);
      map.get(lvl)!.push(spell);
    }
    return map;
  }

  get accessibleCircles(): number[] {
    const limits = this.currentSpellLimits;
    const circles: number[] = [];
    if (limits.cantrips > 0) circles.push(0);
    for (let i = 1; i <= 9; i++) {
      if ((limits.byCircle[i] ?? 0) > 0) circles.push(i);
    }
    return circles;
  }

  get currentSpellCircle(): number {
    return this.accessibleCircles[this.spellCircleStep] ?? 0;
  }

  selectedSpellCountByCircle(circle: number): number {
    return this.characterData.choices.spells.filter(
      s => s.spellLevel === circle && s.id_spell !== this.currentRacialCantripSpellId,
    ).length;
  }

  spellLimitForCircle(circle: number): number {
    if (circle === 0) return this.currentSpellLimits.cantrips;

    if (this.hasSharedSpellPool) {
      const availableInCircle = (this.spellsByCircle.get(circle) ?? []).length;
      const selectedInOtherCircles =
        this.selectedNonCantripSpellCount - this.selectedSpellCountByCircle(circle);
      const remainingPool = Math.max(0, this.nonCantripSpellPoolSize - selectedInOtherCircles);
      return Math.min(availableInCircle, remainingPool);
    }

    return this.currentSpellLimits.byCircle[circle] ?? 0;
  }

  isSpellAvailable(spell: Spell): boolean {
    return this.classSpellIds.has(spell.id_spell);
  }

  isSpellSelected(spell: Spell): boolean {
    return this.characterData.choices.spells.some(s => s.id_spell === spell.id_spell);
  }

  isSpellCheckboxDisabled(spell: Spell): boolean {
    if (!this.isSpellAvailable(spell)) return true;
    const limit = this.spellLimitForCircle(spell.spellLevel);
    if (limit === 0) return true;
    if (!this.isSpellSelected(spell) && this.selectedSpellCountByCircle(spell.spellLevel) >= limit) return true;
    return false;
  }

  toggleSpell(spell: Spell, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    if (isChecked) {
      const limit = this.spellLimitForCircle(spell.spellLevel);
      if (this.selectedSpellCountByCircle(spell.spellLevel) >= limit) {
        (event.target as HTMLInputElement).checked = false;
        return;
      }
      if (!this.characterData.choices.spells.some(s => s.id_spell === spell.id_spell)) {
        this.characterData.choices.spells.push(spell);
      }
    } else {
      const idx = this.characterData.choices.spells.findIndex(s => s.id_spell === spell.id_spell);
      if (idx > -1) this.characterData.choices.spells.splice(idx, 1);
    }
  }

  circleName(circle: number): string {
    return circle === 0 ? 'TRUQUES' : `${circle}º CÍRCULO`;
  }

  /** ========================= WEAPON PAGINATION ========================= */

  readonly weaponsPageSize = 8;
  weaponsPage = 0;

  get pagedWeapons(): WeaponRow[] {
    const start = this.weaponsPage * this.weaponsPageSize;
    return this.availableWeapons.slice(start, start + this.weaponsPageSize);
  }

  get weaponsTotalPages(): number {
    return Math.ceil(this.availableWeapons.length / this.weaponsPageSize);
  }

  weaponsPrevPage() { if (this.weaponsPage > 0) this.weaponsPage--; }
  weaponsNextPage() { if (this.weaponsPage < this.weaponsTotalPages - 1) this.weaponsPage++; }

  /** ========================= SPELL PAGINATION ========================= */

  readonly spellsPageSize = 8;
  spellsPage = 0;

  get pagedSpells(): Spell[] {
    const start = this.spellsPage * this.spellsPageSize;
    return this.availableSpells.slice(start, start + this.spellsPageSize);
  }

  get spellsTotalPages(): number {
    return Math.ceil(this.availableSpells.length / this.spellsPageSize);
  }

  spellsPrevPage() { if (this.spellsPage > 0) this.spellsPage--; }
  spellsNextPage() { if (this.spellsPage < this.spellsTotalPages - 1) this.spellsPage++; }

  /** ========================= METHOD ========================= */

  onMethodChange() {
    this.mobileSelectedValue = null;
    this.mobileSelectedFromStat = null;
    const method = this.characterData.attributes.generation_method;

    if (method === 'standard_array') {
      this.pool = [...this.standardArray];
      this.resetStats();
    }

    if (method === 'point_buy') {
      this.resetPointBuy();
    }

    if (method === 'dice_roll') {
      this.rollPool(); // já reseta os atributos (ver rollPool)
    }
  }

  resetStats() {
    this.attributesList.forEach(stat => {
      this.characterData.attributes.base_values[stat] = 0;
    });
  }

  /** ========================= MOBILE TAP-TO-ASSIGN ========================= */

  mobileSelectedValue: number | null = null;
  mobileSelectedFromStat: AttributeKey | null = null;

  mobileTapPool(value: number) {
    if (this.mobileSelectedValue === value && !this.mobileSelectedFromStat) {
      this.mobileSelectedValue = null;
    } else {
      this.mobileSelectedValue = value;
      this.mobileSelectedFromStat = null;
    }
  }

  mobileTapStat(stat: AttributeKey) {
    const current = this.characterData.attributes.base_values[stat];

    if (this.mobileSelectedValue === null) {
      if (current !== 0) {
        this.mobileSelectedValue = current;
        this.mobileSelectedFromStat = stat;
      }
      return;
    }

    if (this.mobileSelectedFromStat === stat) {
      this.mobileSelectedValue = null;
      this.mobileSelectedFromStat = null;
      return;
    }

    if (this.mobileSelectedFromStat) {
      this.characterData.attributes.base_values[this.mobileSelectedFromStat] = current;
    } else {
      const index = this.pool.indexOf(this.mobileSelectedValue);
      if (index > -1) this.pool.splice(index, 1);
      if (current !== 0) this.pool.push(current);
    }

    this.characterData.attributes.base_values[stat] = this.mobileSelectedValue;
    this.mobileSelectedValue = null;
    this.mobileSelectedFromStat = null;
  }

  /** ========================= DRAG & DROP ========================= */

  dragValue: number | null = null;
  fromStat: AttributeKey | null = null;

  /** DRAG DO POOL */
  onDragStart(value: number) {
    this.dragValue = value;
    this.fromStat = null;
  }

  /** DRAG DE UM ATRIBUTO */
  onDragFromStat(stat: AttributeKey) {
    this.dragValue = this.characterData.attributes.base_values[stat];
    this.fromStat = stat;
  }

  /** DROP */
  onDrop(stat: AttributeKey) {
    if (this.dragValue === null) return;

    const current = this.characterData.attributes.base_values[stat];

    // 🔁 SWAP ENTRE ATRIBUTOS
    if (this.fromStat) {
      this.characterData.attributes.base_values[this.fromStat] = current;
    }
    else {
      // veio do pool → remove
      const index = this.pool.indexOf(this.dragValue);
      if (index > -1) this.pool.splice(index, 1);

      // devolve antigo pro pool
      if (current !== 0) this.pool.push(current);
    }

    this.characterData.attributes.base_values[stat] = this.dragValue;

    this.dragValue = null;
    this.fromStat = null;
  }

  /** EVITA BUG DE DROP FORA */
  allowDrop(event: DragEvent) {
    event.preventDefault();
  }

  /** LIMPA DRAG SE SOLTAR FORA */
  @HostListener('document:drop', ['$event'])
  onGlobalDrop(event: DragEvent) {
    if (!(event.target as HTMLElement).closest('.stat-box')) {
      this.dragValue = null;
      this.fromStat = null;
    }
  }

  /** ========================= POINT BUY ========================= */

  resetPointBuy() {
    this.availablePoints = 27;

    this.attributesList.forEach(stat => {
      this.characterData.attributes.base_values[stat] = 8;
    });
  }

  increaseStat(stat: AttributeKey) {
    const current = this.characterData.attributes.base_values[stat];
    const next = current + 1;

    if (next > 18) return;

    const cost = this.pointCosts[next] - this.pointCosts[current];

    if (this.availablePoints >= cost) {
      this.characterData.attributes.base_values[stat] = next;
      this.availablePoints -= cost;
    }
  }

  decreaseStat(stat: AttributeKey) {
    const current = this.characterData.attributes.base_values[stat];
    const prev = current - 1;

    if (prev < 8) return;

    const refund = this.pointCosts[current] - this.pointCosts[prev];

    this.characterData.attributes.base_values[stat] = prev;
    this.availablePoints += refund;
  }

  /** ========================= DICE ========================= */
  isRolling = false;
  /** Faces exibidas durante a animação de rolagem (6 rolagens x 4 dados). */
  rollingDice: number[][] = [];
  /** Detalhamento (4d6, descarta o menor) de cada valor em `pool`. */
  rollBreakdowns: DiceBreakdown[] = [];

  rollSingleStat(): DiceBreakdown {
    const rolls = Array.from({ length: 4 }, () =>
      Math.floor(Math.random() * 6) + 1
    );

    const dropped = rolls.indexOf(Math.min(...rolls));
    const total = rolls.reduce((sum, roll, i) => (i === dropped ? sum : sum + roll), 0);

    return { rolls, dropped, total };
  }

  /** Encontra o detalhamento de dados que gerou um valor rolado (para exibir os 4d6 por trás do total). */
  breakdownFor(value: number): DiceBreakdown | undefined {
    return this.rollBreakdowns.find(breakdown => breakdown.total === value);
  }

  rollPool() {
    // Rolar de novo descarta qualquer atribuição já feita — senão os atributos já preenchidos
    // ficariam com valores de uma rolagem anterior que não existe mais no pool.
    this.resetStats();
    this.mobileSelectedValue = null;
    this.mobileSelectedFromStat = null;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      this.rollBreakdowns = Array.from({ length: 6 }, () => this.rollSingleStat());
      this.pool = this.rollBreakdowns.map(breakdown => breakdown.total);
      this.isRolling = false;
      return;
    }

    this.isRolling = true;
    this.rollingDice = Array.from({ length: 6 }, () => [1, 1, 1, 1]);

    let ticks = 0;

    const interval = setInterval(() => {
      // faces aleatórias enquanto os dados "chacoalham"
      this.rollingDice = this.rollingDice.map(() =>
        Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1)
      );

      ticks++;

      if (ticks > 10) { // duração da animação
        clearInterval(interval);

        // valores reais
        this.rollBreakdowns = Array.from({ length: 6 }, () => this.rollSingleStat());
        this.pool = this.rollBreakdowns.map(breakdown => breakdown.total);
        this.isRolling = false;
      }

      // setInterval roda fora da detecção de mudanças do Angular (app zoneless) — força o repaint a cada tick.
      this.cdr.detectChanges();
    }, 80);
  }

  /** ========================= DINHEIRO INICIAL (RIQUEZA INICIAL POR CLASSE) ========================= */

  rollingStartingGold = false;
  startingGoldDiceRolls: number[] | null = null;

  get startingGoldDice(): { count: number; sides: number; multiplier: number } {
    return this.selectedClass?.starting_gold_dice ?? { count: 0, sides: 4, multiplier: 10 };
  }

  get startingGoldFormulaLabel(): string {
    const d = this.startingGoldDice;
    return d.multiplier === 1 ? `${d.count}d${d.sides} PO` : `${d.count}d${d.sides} × ${d.multiplier} PO`;
  }

  get hasRolledStartingGold(): boolean {
    return this.characterData.equipment.starting_gold != null;
  }

  rollStartingGold(): void {
    if (this.rollingStartingGold || this.hasRolledStartingGold) return;

    const d = this.startingGoldDice;
    const rollFinalValue = () => {
      const rolls = Array.from({ length: d.count }, () => Math.floor(Math.random() * d.sides) + 1);
      this.startingGoldDiceRolls = rolls;
      const sum = rolls.reduce((a, b) => a + b, 0);
      this.characterData.equipment.starting_gold = sum * d.multiplier;
      this.rollingStartingGold = false;
    };

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      rollFinalValue();
      return;
    }

    this.rollingStartingGold = true;
    this.startingGoldDiceRolls = Array.from({ length: d.count }, () => 1);
    let ticks = 0;

    const interval = setInterval(() => {
      this.startingGoldDiceRolls = Array.from({ length: d.count }, () => Math.floor(Math.random() * d.sides) + 1);
      ticks++;

      if (ticks > 8) {
        clearInterval(interval);
        rollFinalValue();
      }

      this.cdr.detectChanges();
    }, 80);
  }

  /** ========================= ARMOUR SELECTION ========================= */

  get allowedArmourTypes(): Set<string> {
    const rule = CLASS_ARMOUR_RULES[+this.characterData.core_build.id_class];
    return new Set(rule?.types ?? []);
  }

  get shieldAllowed(): boolean {
    return CLASS_ARMOUR_RULES[+this.characterData.core_build.id_class]?.shield ?? false;
  }

  isArmourAvailable(armour: Armour): boolean {
    return !!armour.armour_type && this.allowedArmourTypes.has(armour.armour_type);
  }

  private resetArmourChoices(): void {
    if (this.characterData.equipment.armour && !this.isArmourAvailable(this.characterData.equipment.armour)) {
      this.characterData.equipment.armour = null;
    }
    if (!this.shieldAllowed) {
      this.characterData.equipment.has_shield = false;
    }
  }

  selectArmour(armour: Armour | null) {
    this.characterData.equipment.armour = armour;
  }

  private expandedArmourIds = new Set<number>();

  isArmourExpanded(idArmour: number): boolean {
    return this.expandedArmourIds.has(idArmour);
  }

  toggleArmourDetails(idArmour: number): void {
    if (this.expandedArmourIds.has(idArmour)) this.expandedArmourIds.delete(idArmour);
    else this.expandedArmourIds.add(idArmour);
  }

  isWeaponSelected(weapon: WeaponRow): boolean {
    return this.characterData.equipment.weapons.some(w => w.id_weapon === weapon.id_weapon);
  }

  /** ========================= WEAPON MODAL ========================= */

  selectedWeapon: WeaponRow | null = null;

  openWeaponModal(weapon: WeaponRow) {
    this.selectedWeapon = weapon;
  }

  closeWeaponModal() {
    this.selectedWeapon = null;
  }

  
  /** ========================= SPELL MODAL ========================= */

  selectedSpell: Spell | null = null;

  openSpellModal(spell: Spell) {
    this.selectedSpell = spell;
  }

  closeSpellModal() {
    this.selectedSpell = null;
  }

  /** ========================= SKILLS / SPELLS ========================= */

  toggleArrayItem(
    arrayName: 'skills' | 'spells' | 'weapons',
    item: Skill | Spell | WeaponRow,
    event: Event
  ) {
    const isChecked = (event.target as HTMLInputElement).checked;

    if (arrayName === 'skills') {
      const skill = item as Skill;
      if (isChecked) {
        this.characterData.choices.skills.push(skill);
      } else {
        const idx = this.characterData.choices.skills.findIndex(s => s.id_skill === skill.id_skill);
        if (idx > -1) this.characterData.choices.skills.splice(idx, 1);
      }
    } else if (arrayName === 'spells') {
      const spell = item as Spell;
      if (isChecked) {
        this.characterData.choices.spells.push(spell);
      } else {
        const idx = this.characterData.choices.spells.findIndex(s => s.id_spell === spell.id_spell);
        if (idx > -1) this.characterData.choices.spells.splice(idx, 1);
      }
    } else if (arrayName === 'weapons') {
      const weapon = item as WeaponRow;
      if (isChecked) {
        this.characterData.equipment.weapons.push(weapon);
      } else {
        const idx = this.characterData.equipment.weapons.findIndex(w => w.id_weapon === weapon.id_weapon);
        if (idx > -1) this.characterData.equipment.weapons.splice(idx, 1);
      }
    }
  }

  /** ========================= AVATAR ========================= */

  initAvatarPreset(): void {
    if (this.characterData.avatar_preset) return;
    const race = RACE_NAME_TO_AVATAR[this.characterData.core_build.race] ?? 'human';
    const classKey = CLASS_NAME_TO_AVATAR[this.characterData.core_build.class] ?? 'fighter';
    this.characterData.avatar_preset = {
      race,
      gender: 'male',
      classKey: null,
      skinColor: 'medium',
      hairStyle: null,
      hairColor: 'lbrown',
      beardStyle: null,
      beardColor: null,
      showSmile: false,
    };
  }

  onPresetChange(preset: AvatarPreset): void {
    this.characterData.avatar_preset = preset;
  }

  /** ========================= SAVE ========================= */

  saveCharacter() {
    // Clampeia contra escolha de subclasse trocada depois de já ter marcado perícias de
    // Especialização/Bênção do Conhecimento pra uma subclasse diferente (ids ficariam órfãos).
    const validPoolIds = new Set(this.expertisePoolSkills.map(s => s.id_skill));
    this.characterData.choices.expertise_skill_ids = (this.characterData.choices.expertise_skill_ids ?? [])
      .filter(id => validPoolIds.has(id))
      .slice(0, this.expertiseGrantCount);

    this.loadingOverlay.show('SALVANDO SEU PERSONAGEM...', 'AGUARDE ENQUANTO A MAGIA ACONTECE');

    this.charService.saveCharacter(this.characterData).subscribe({
      next: (res) => {
        this.charService.currentCharacter.set(res);
        this.showSuccess = true;

        setTimeout(() => {
          this.loadingOverlay.hide();
          this.router.navigate(['/sheet-result']);
        }, 1500);
      },
      error: (err) => {
        console.error(err);
        this.loadingOverlay.hide();
        alert('Erro ao salvar personagem!');
      }
    });
  }
}