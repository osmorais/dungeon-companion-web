import { ChangeDetectorRef, Component, inject, OnInit, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CharacterSheetData } from '../models/character.interface';
import { Alignment, AttributeType, Background, CharacterClass, Race, Skill, WeaponOption } from '../models/character-options.interface';
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
    core_build: { level: 1, race: '', class: '', background: '', subrace: '' },
    character_details: { name: '', alignment: '', age: 20 },
    attributes: {
      generation_method: 'standard_array',
      base_values: { FOR: 8, DES: 8, CON: 8, INT: 8, SAB: 8, CAR: 8 }
    },
    choices: { skills: [], spells: [] },
    equipment: { armor_type: '', weapons: [], has_shield: false }
  };

  availableAttributes: AttributeType[] = [];
  availableSkills: Skill[] = [];
  availableWeapons: WeaponOption[] = [];
  availableRaces: Race[] = [];
  availableClasses: CharacterClass[] = [];
  availableBackgrounds: Background[] = [];
  availableAlignments: Alignment[] = [];
  availableSpells = ['Raio de Fogo', 'Mãos Mágicas', 'Escudo Arcano', 'Bola de Fogo', 'Ilusão Menor', 'Mísseis Mágicos', 'Curar Ferimentos', 'Invisibilidade'];
  constructor() {
      this.onMethodChange();
    }

  ngOnInit(): void {
            // this.fillWeapons();
    
    this.loadingOverlay.show('CARREGANDO DADOS...', 'AGUARDE PARA COMEÇAR SUA JORNADA');
    this.charService.getCharacterOptions().subscribe({
      next: (options) => {
        this.availableAttributes = options.attributes;
        this.availableSkills = options.skills;
        this.availableWeapons = options.weapons ?? [];
        this.availableRaces = options.races ?? [];
        this.availableClasses = options.classes ?? [];
        this.availableBackgrounds = options.backgrounds ?? [];
        this.availableAlignments = options.alignments ?? [];
        this.loadingOverlay.hide();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loadingOverlay.hide();
        console.error('Erro ao carregar opções de personagem:', err)
      }
    });
  }

  nextStep() {
    this.dragonTrigger++;

    if (this.currentStep === 3 && !this.hasMagic()) {
      this.currentStep = 5;
      return;
    }

    if (this.currentStep < 7) this.currentStep++;
  }

  prevStep() {
    if (this.currentStep === 5 && !this.hasMagic()) {
      this.currentStep = 3;
      return;
    }

    if (this.currentStep > 1) this.currentStep--;
  }

  /** ========================= MAGIC ========================= */

  hasMagic(): boolean {
    return this.characterData.core_build.class === 'Mago';
  }

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

  /** ========================= WEAPONS ========================= */

  fillWeapons(){

this.availableWeapons = [
  // Armas Simples Corpo-a-Corpo
  { name: 'Adaga', damage: '1d4 perfurante', properties: ['Acuidade', 'leve', 'arremesso (distância 6/18)'], isRanged: false },
  { name: 'Azagaia', damage: '1d6 perfurante', properties: ['Arremesso (distância 9/36)'], isRanged: false },
  { name: 'Bordão', damage: '1d6 concussão', properties: ['Versátil (1d8)'], isRanged: false },
  { name: 'Clava Grande', damage: '1d8 concussão', properties: ['Pesada', 'duas mãos'], isRanged: false },
  { name: 'Foice Curta', damage: '1d4 cortante', properties: ['Leve'], isRanged: false },
  { name: 'Lança', damage: '1d6 perfurante', properties: ['Arremesso (distância 6/18)', 'versátil (1d8)'], isRanged: false },
  { name: 'Maça', damage: '1d6 concussão', properties: [], isRanged: false },
  { name: 'Machadinha', damage: '1d6 cortante', properties: ['Leve', 'arremesso (distância 6/18)'], isRanged: false },
  { name: 'Martelo Leve', damage: '1d4 concussão', properties: ['Leve', 'arremesso (distância 6/18)'], isRanged: false },
  { name: 'Porrete', damage: '1d4 concussão', properties: ['Leve'], isRanged: false },

  // Armas Simples à Distância
  { name: 'Arco Curto', damage: '1d6 perfurante', properties: ['Munição (distância 24/96)', 'duas mãos'], isRanged: true },
  { name: 'Besta Leve', damage: '1d8 perfurante', properties: ['Munição (distância 24/96)', 'recarga', 'duas mãos'], isRanged: true },
  { name: 'Dardo', damage: '1d4 perfurante', properties: ['Acuidade', 'arremesso (distância 6/18)'], isRanged: true },
  { name: 'Funda', damage: '1d4 concussão', properties: ['Munição (distância 9/36)'], isRanged: true },

  // Armas Marciais Corpo-a-Corpo
  { name: 'Alabarda', damage: '1d10 cortante', properties: ['Pesada', 'alcance', 'duas mãos'], isRanged: false },
  { name: 'Cimitarra', damage: '1d6 cortante', properties: ['Acuidade', 'leve'], isRanged: false },
  { name: 'Chicote', damage: '1d4 cortante', properties: ['Acuidade', 'alcance'], isRanged: false },
  { name: 'Espada Curta', damage: '1d6 perfurante', properties: ['Acuidade', 'leve'], isRanged: false },
  { name: 'Espada Grande', damage: '2d6 cortante', properties: ['Pesada', 'duas mãos'], isRanged: false },
  { name: 'Espada Longa', damage: '1d8 cortante', properties: ['Versátil (1d10)'], isRanged: false },
  { name: 'Glaive', damage: '1d10 cortante', properties: ['Pesada', 'alcance', 'duas mãos'], isRanged: false },
  { name: 'Lança de Montaria', damage: '1d12 perfurante', properties: ['Alcance', 'especial'], isRanged: false },
  { name: 'Lança Longa', damage: '1d10 perfurante', properties: ['Pesada', 'alcance', 'duas mãos'], isRanged: false },
  { name: 'Maça Estrela', damage: '1d8 perfurante', properties: [], isRanged: false },
  { name: 'Machado Grande', damage: '1d12 cortante', properties: ['Pesada', 'duas mãos'], isRanged: false },
  { name: 'Machado de Batalha', damage: '1d8 cortante', properties: ['Versátil (1d10)'], isRanged: false },
  { name: 'Malho', damage: '2d6 concussão', properties: ['Pesada', 'duas mãos'], isRanged: false },
  { name: 'Mangual', damage: '1d8 concussão', properties: [], isRanged: false },
  { name: 'Martelo de Guerra', damage: '1d8 concussão', properties: ['Versátil (1d10)'], isRanged: false },
  { name: 'Picareta de Guerra', damage: '1d8 perfurante', properties: [], isRanged: false },
  { name: 'Rapieira', damage: '1d8 perfurante', properties: ['Acuidade'], isRanged: false },
  { name: 'Tridente', damage: '1d6 perfurante', properties: ['Arremesso (6/18)', 'versátil (1d8)'], isRanged: false },

  // Armas Marciais à Distância
  { name: 'Arco Longo', damage: '1d8 perfurante', properties: ['Munição (distância 45/180)', 'pesada', 'duas mãos'], isRanged: true },
  { name: 'Besta de Mão', damage: '1d6 perfurante', properties: ['Munição (distância 9/36)', 'leve', 'recarga'], isRanged: true },
  { name: 'Besta Pesada', damage: '1d10 perfurante', properties: ['Munição (distância 30/120)', 'pesada', 'recarga', 'duas mãos'], isRanged: true },
  { name: 'Rede', damage: '-', properties: ['Especial', 'arremesso (distância 1,5/4,5)'], isRanged: true },
  { name: 'Zarabatana', damage: '1 perfurante', properties: ['Munição (distância 7,5/30)', 'recarga'], isRanged: true }
]; 

  }


  /** ========================= WEAPON MODAL ========================= */

  selectedWeapon: WeaponOption | null = null;

  openWeaponModal(weapon: WeaponOption) {
    this.selectedWeapon = weapon;
  }

  closeWeaponModal() {
    this.selectedWeapon = null;
  }

  /** ========================= SKILLS / SPELLS ========================= */

  toggleArrayItem(
    arrayName: 'skills' | 'spells' | 'weapons',
    item: string,
    event: Event
  ) {
    const isChecked = (event.target as HTMLInputElement).checked;

    let targetArray: string[] = [];

    if (arrayName === 'skills') targetArray = this.characterData.choices.skills;
    if (arrayName === 'spells') targetArray = this.characterData.choices.spells;
    if (arrayName === 'weapons') targetArray = this.characterData.equipment.weapons;

    if (isChecked) {
      targetArray.push(item);
    } else {
      const index = targetArray.indexOf(item);
      if (index > -1) targetArray.splice(index, 1);
    }
  }

  /** ========================= SAVE ========================= */

  saveCharacter() {
    this.loadingOverlay.show('SALVANDO SEU PERSONAGEM...', 'AGUARDE ENQUANTO A MAGIA ACONTECE');

    this.charService.saveCharacter(this.characterData).subscribe({
      next: (res) => {
        this.charService.currentCharacter.set(res);
        this.loadingOverlay.hide();
        this.showSuccess = true;

        setTimeout(() => {
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