import { ChangeDetectorRef, Component, inject, OnInit, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CharacterSheetData } from '../models/character.interface';
import { Alignment, Armour, AttributeType, Background, CharacterClass, CharacterOptions, Race, Skill, Spell, WeaponRow } from '../models/character-options.interface';
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
import { CLASS_SPELLS, getSpellLimits, SpellLimits } from '../constants/spell-rules';
import { CLASS_ARMOUR_RULES } from '../constants/armour-rules';

type AttributeKey = 'FOR' | 'DES' | 'CON' | 'INT' | 'SAB' | 'CAR';

@Component({
  selector: 'app-character-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, DragonAnimationComponent, LoadingOverlayComponent, AvatarPickerModalComponent, AvatarCustomizerComponent],
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
    12: 4, 13: 5, 14: 7, 15: 9
  };

  characterData: CharacterSheetData = {
    core_build: { level: 1, id_race: 0, race: '', id_class: 0, class: '', id_background: 0, background: '', subrace: '' },
    character_details: { name: '', id_alignment: 0, alignment: '', age: 20 },
    attributes: {
      generation_method: 'standard_array',
      base_values: { FOR: 8, DES: 8, CON: 8, INT: 8, SAB: 8, CAR: 8 }
    },
    choices: { skills: [], spells: [] },
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

  private isCurrentStepValid(): boolean {
    switch (this.currentStep) {
      case 1:
        return (
          +this.characterData.core_build.id_race !== 0 &&
          +this.characterData.core_build.id_class !== 0 &&
          +this.characterData.core_build.id_background !== 0 &&
          this.characterData.character_details.name.trim() !== '' &&
          +this.characterData.character_details.id_alignment !== 0
        );
      case 2:
        if (this.characterData.attributes.generation_method === 'point_buy') return true;
        return this.attributesList.every(attr => this.characterData.attributes.base_values[attr] !== 0);
      case 3: {
        const circle = this.currentSpellCircle;
        const limit = this.spellLimitForCircle(circle);
        const available = (this.spellsByCircle.get(circle) ?? []).length;
        return this.selectedSpellCountByCircle(circle) >= Math.min(limit, available);
      }
      case 4:
        return this.maxSkillChoices === 0 || this.selectedChoicesCount >= this.maxSkillChoices;
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

    if (this.currentStep < 7) {
      this.currentStep++;
      if (this.currentStep === 3) this.spellCircleStep = 0;
      if (this.currentStep === 4) this.syncGrantedSkills();
      if (this.currentStep === 7) this.initAvatarPreset();
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
    this.resetAllChoices();
  }

  onRaceChange(): void {
    const race = this.availableRaces.find(r => +r.id_race === +this.characterData.core_build.id_race);
    this.characterData.core_build.race = race?.name ?? '';
    this.resetAllChoices();

    if (this.characterData.avatar_preset) {
      const raceKey = RACE_NAME_TO_AVATAR[this.characterData.core_build.race] ?? 'human';
      this.characterData.avatar_preset = { ...this.characterData.avatar_preset, race: raceKey };
    }
  }

  private resetAllChoices(): void {
    this.resetSkillChoices();
    this.characterData.choices.spells = [];
    this.characterData.equipment.armour = null;
    this.characterData.equipment.has_shield = false;
    this.characterData.equipment.weapons = [];
    this.spellCircleStep = 0;
    this.weaponsPage = 0;
    this.showStepError = false;
  }

  private resetSkillChoices(): void {
    const granted = this.grantedSkills;
    this.characterData.choices.skills = [...granted];
  }

  private syncGrantedSkills(): void {
    const granted = this.grantedSkills;
    for (const skill of granted) {
      if (!this.characterData.choices.skills.some(s => s.id_skill === skill.id_skill)) {
        this.characterData.choices.skills.push(skill);
      }
    }
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
    }
  }

  /** ========================= MAGIC ========================= */

  hasMagic(): boolean {
    const magicClasses = ["2", "3", "4", "5", "6", "9", "11", "12"];
    return magicClasses.includes(this.characterData.core_build.id_class.toString());
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
    return this.characterData.choices.spells.filter(s => s.spellLevel === circle).length;
  }

  spellLimitForCircle(circle: number): number {
    return circle === 0
      ? this.currentSpellLimits.cantrips
      : (this.currentSpellLimits.byCircle[circle] ?? 0);
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
      this.rollPool(); // agora realmente random
      this.resetStats();
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

    if (next > 15) return;

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
  displayPool: number[] = [];

  rollStat(): number {
    const rolls = Array.from({ length: 4 }, () =>
      Math.floor(Math.random() * 6) + 1
    );

    rolls.sort((a, b) => b - a);
    return rolls[0] + rolls[1] + rolls[2];
  }

  rollPool() {
    this.isRolling = true;
    this.displayPool = [0, 0, 0, 0, 0, 0];

    let ticks = 0;

    const interval = setInterval(() => {
      // gera números fake enquanto "rola"
      this.displayPool = Array.from({ length: 6 }, () =>
        Math.floor(Math.random() * 20) + 1
      );

      ticks++;

      if (ticks > 10) { // duração da animação
        clearInterval(interval);

        // valores reais
        this.pool = [];
        for (let i = 0; i < 6; i++) {
          this.pool.push(this.rollStat());
        }

        this.displayPool = [...this.pool];
        this.isRolling = false;
      }
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