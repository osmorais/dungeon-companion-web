import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CharacterSheetData } from '../models/character.interface';

@Component({
  selector: 'app-character-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './character-wizard.component.html',
  styleUrls: ['./character-wizard.component.scss']
})
export class CharacterWizardComponent {
  private http = inject(HttpClient);

  currentStep = 1;

  characterData: CharacterSheetData = {
    core_build: { level: 1, race: '', class: '', background: '', subrace: '' },
    character_details: { name: '', alignment: '', age: 20 },
    attributes: { generation_method: 'standard_array', base_values: { FOR: 8, DES: 8, CON: 8, INT: 8, SAB: 8, CAR: 8 } },
    choices: { skills: [], spells: [] },
    equipment: { armor_type: '', weapons: [], has_shield: false }
  };

  availableSkills = ['Arcanismo', 'Atletismo', 'Enganação', 'Furtividade', 'História', 'Intuição', 'Investigação', 'Percepção'];
  availableSpells = ['Raio de Fogo', 'Mãos Mágicas', 'Escudo Arcano', 'Bola de Fogo', 'Ilusão Menor', 'Mísseis Mágicos', 'Curar Ferimentos', 'Invisibilidade'];

  nextStep() {
    if (this.currentStep < 7) this.currentStep++;
  }

  prevStep() {
    if (this.currentStep > 1) this.currentStep--;
  }

  toggleArrayItem(arrayName: 'skills' | 'spells' | 'weapons', item: string, event: Event) {
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

  saveGame() {
    this.http.post('http://127.0.0.1:3000/api/character-sheet', this.characterData).subscribe({
      next: (response) => console.log('Ficha salva com sucesso:', response),
      error: (err) => console.error('Erro ao salvar ficha:', err),
    });
  }
}
