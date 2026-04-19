import { Component, inject, OnInit, HostListener} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CharacterSheetData } from '../models/character.interface';
import { AttributeType, Skill } from '../models/character-options.interface';
import { DragonAnimationComponent } from '../dragon-animation/dragon-animation.component';
import { CharacterService } from '../services/character.service';

type AttributeKey = 'FOR' | 'DES' | 'CON' | 'INT' | 'SAB' | 'CAR';

@Component({
  selector: 'app-character-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, DragonAnimationComponent],
  templateUrl: './character-wizard.component.html',
  styleUrls: ['./character-wizard.component.scss']
})
export class CharacterWizardComponent implements OnInit {
  private router = inject(Router);
  private charService = inject(CharacterService);

  currentStep = 1;
  dragonTrigger = 0;

  isSaving = false;
  showSuccess = false;

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
  availableSpells = ['Raio de Fogo', 'Mãos Mágicas', 'Escudo Arcano', 'Bola de Fogo', 'Ilusão Menor', 'Mísseis Mágicos', 'Curar Ferimentos', 'Invisibilidade'];
  constructor() {
      this.onMethodChange();
    }

  ngOnInit(): void {
    this.charService.getCharacterOptions().subscribe({
      next: (options) => {
        this.availableAttributes = options.attributes;
        this.availableSkills = options.skills;
      },
      error: (err) => console.error('Erro ao carregar opções de personagem:', err)
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
    this.isSaving = true;

    this.charService.saveCharacter(this.characterData).subscribe({
      next: (res) => {
        this.charService.currentCharacter.set(res);
        this.isSaving = false;
        this.showSuccess = true;

        setTimeout(() => {
          this.router.navigate(['/sheet-result']);
        }, 1500);
      },
      error: (err) => {
        console.error(err);
        this.isSaving = false;
        alert('Erro ao salvar personagem!');
      }
    });
  }
}