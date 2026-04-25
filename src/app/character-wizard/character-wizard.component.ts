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
import { Avatar } from '../constants/avatars';

type AttributeKey = 'FOR' | 'DES' | 'CON' | 'INT' | 'SAB' | 'CAR';

@Component({
  selector: 'app-character-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, DragonAnimationComponent, LoadingOverlayComponent, AvatarPickerModalComponent],
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

  showSuccess = false;
  showAvatarPicker = signal(false);
  avatarUrl = this.charService.avatarUrl;

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

  nextStep() {
    this.dragonTrigger++;

    if (this.currentStep === 2 && !this.hasMagic()) {
      this.currentStep = 4;
      return;
    }

    if (this.currentStep < 6) this.currentStep++;
  }

  goHome() {
    this.router.navigate(['/']);
  }

  prevStep() {
    if (this.currentStep === 4 && !this.hasMagic()) {
      this.currentStep = 2;
      return;
    }

    if (this.currentStep > 1) this.currentStep--;
  }

  /** ========================= MAGIC ========================= */

  hasMagic(): boolean {
    const magicClasses = ["2", "3", "4", "5", "6", "9", "11", "12"];
    return magicClasses.includes(this.characterData.core_build.id_class.toString());
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

  selectArmour(armour: Armour | null) {
    this.characterData.equipment.armour = armour;
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