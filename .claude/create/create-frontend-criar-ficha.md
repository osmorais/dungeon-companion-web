### 1. Modelo de Dados (`src/app/models/character.interface.ts`)
Este arquivo garante que o front-end e a API falem a mesma língua.

```typescript
export interface CharacterSheetData {
  core_build: {
    level: number;
    race: string;
    subrace?: string;
    class: string;
    background: string;
  };
  attributes: {
    generation_method: string;
    base_values: {
      FOR: number;
      DES: number;
      CON: number;
      INT: number;
      SAB: number;
      CAR: number;
    };
  };
  choices: {
    skills: string[];
    spells: string[];
  };
  equipment: {
    armor_type: string;
    weapons: string[];
    has_shield: boolean;
  };
  character_details: {
    name: string;
    alignment: string;
    age: number;
  };
}
```

### 2. Estilos Globais e Tema Retro (`src/styles.scss`)
Aqui importamos a fonte pixelada e estilizamos os inputs genéricos e o fundo preto.

```scss
/* Importando a fonte estilo 8-bit do Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

:root {
  --bg-color: #381919;
  --panel-bg: #3f1f0c; /* Azul escuro retro */
  --text-color: #ffffff;
  --accent-color: #ffaa00; /* Laranja da checkbox */
  --border-color: #7d3606;
}

body {
  background-color: var(--bg-color);
  color: var(--text-color);
  font-family: 'Press Start 2P', monospace;
  font-size: 10px; /* Fonte pixelada precisa ser pequena para caber bem */
  line-height: 1.5;
  margin: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

/* O Segredo do Design Retro: Fieldset e Legend */
fieldset.retro-panel {
  border: 2px solid var(--border-color);
  background-color: var(--panel-bg);
  padding: 20px;
  margin-bottom: 20px;
  
  legend {
    border: 2px solid var(--border-color);
    background-color: var(--bg-color);
    padding: 5px 10px;
    font-size: 12px;
  }
}

/* Inputs, Selects estilo retro */
input[type="text"], input[type="number"], select {
  background-color: var(--bg-color);
  color: var(--text-color);
  border: 1px solid var(--border-color);
  padding: 8px;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  width: 100%;
  box-sizing: border-box;
}

input:focus, select:focus {
  outline: 2px solid var(--accent-color);
}

/* Estilizando o botão CONFIRMAR */
button.retro-btn {
  background-color: #0000aa;
  color: var(--text-color);
  border: 2px solid var(--border-color);
  padding: 10px 20px;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  cursor: pointer;
  margin-top: 10px;
  float: right;

  &:hover {
    background-color: #0000ff;
  }
}

/* Checkbox retro laranja igual as imagens */
input[type="checkbox"].retro-checkbox {
  appearance: none;
  background-color: var(--bg-color);
  border: 1px solid var(--border-color);
  width: 14px;
  height: 14px;
  cursor: pointer;
  position: relative;
  top: 3px;

  &:checked {
    background-color: var(--accent-color);
  }
}
```

### 3. Componente Principal (Lógica de Navegação) (`src/app/character-wizard/character-wizard.component.ts`)
Este componente moderno gerencia o estado usando `Forms` básicos e controla em qual passo o usuário está.

```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CharacterSheetData } from '../models/character.interface';

@Component({
  selector: 'app-character-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './character-wizard.component.html',
  styleUrls: ['./character-wizard.component.scss']
})
export class CharacterWizardComponent {
  currentStep = 1;
  
  // Objeto reativo que irá guardar todas as escolhas
  characterData: CharacterSheetData = {
    core_build: { level: 1, race: '', class: '', background: '', subrace: '' },
    character_details: { name: '', alignment: '', age: 20 },
    attributes: { generation_method: 'standard_array', base_values: { FOR: 8, DES: 8, CON: 8, INT: 8, SAB: 8, CAR: 8 } },
    choices: { skills: [], spells: [] },
    equipment: { armor_type: '', weapons:[], has_shield: false }
  };

  // Listas de opções fixas (Podem vir de uma API no futuro)
  availableSkills =['Arcanismo', 'Atletismo', 'Enganação', 'Furtividade', 'História', 'Intuição', 'Investigação', 'Percepção'];
  availableSpells =['Raio de Fogo', 'Mãos Mágicas', 'Escudo Arcano', 'Bola de Fogo', 'Ilusão Menor', 'Mísseis Mágicos', 'Curar Ferimentos', 'Invisibilidade'];

  nextStep() {
    if (this.currentStep < 7) this.currentStep++;
  }

  prevStep() {
    if (this.currentStep > 1) this.currentStep--;
  }

  toggleArrayItem(arrayName: 'skills' | 'spells' | 'weapons', item: string, event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    let targetArray: string[] =[];
    
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
    console.log('Payload enviado para a API:', this.characterData);
    // Aqui você chama seu Service (HttpClient) enviando o this.characterData
  }
}
```

### 4. Template do Wizard (`src/app/character-wizard/character-wizard.component.html`)
Usando o novo `@switch` do Angular 17+ para transitar entre as telas suavemente.

```html
<div class="wizard-container">
  
  @switch (currentStep) {
    <!-- TELA 1: CONSTRUÇÃO BÁSICA -->
    @case (1) {
      <fieldset class="retro-panel">
        <legend>CONSTRUÇÃO BÁSICA</legend>
        <div class="grid-2-col">
          <label>NÍVEL <input type="number" [(ngModel)]="characterData.core_build.level" min="1" max="20"></label>
          <label>RAÇA 
            <select[(ngModel)]="characterData.core_build.race">
              <option value="Elfo">Elfo</option>
              <option value="Anão">Anão</option>
              <option value="Humano">Humano</option>
            </select>
          </label>
          <label>CLASSE 
            <select [(ngModel)]="characterData.core_build.class">
              <option value="Mago">Mago</option>
              <option value="Guerreiro">Guerreiro</option>
            </select>
          </label>
          <label>ANTECEDENTE 
            <select [(ngModel)]="characterData.core_build.background">
              <option value="Sábio">Sábio</option>
              <option value="Soldado">Soldado</option>
            </select>
          </label>
        </div>
      </fieldset>
      <button class="retro-btn" (click)="nextStep()">CONFIRMAR</button>
    }

    <!-- TELA 2: DETALHES -->
    @case (2) {
      <fieldset class="retro-panel">
        <legend>DETALHES DO PERSONAGEM</legend>
        <div class="grid-2-col">
          <label>NOME <input type="text" [(ngModel)]="characterData.character_details.name"></label>
          <label>IDADE <input type="number" [(ngModel)]="characterData.character_details.age"></label>
          <label class="full-width">ALINHAMENTO 
            <select [(ngModel)]="characterData.character_details.alignment">
              <option value="Caótico e Bom">Caótico e Bom</option>
              <option value="Leal e Neutro">Leal e Neutro</option>
            </select>
          </label>
        </div>
      </fieldset>
      <button class="retro-btn" (click)="nextStep()">CONFIRMAR</button>
    }

    <!-- TELA 3: ATRIBUTOS -->
    @case (3) {
      <fieldset class="retro-panel">
        <legend>ATRIBUTOS</legend>
        <label>MÉTODO DE GERAÇÃO
          <select [(ngModel)]="characterData.attributes.generation_method">
            <option value="standard_array">standard_array</option>
          </select>
        </label>
        <div class="stats-grid">
          <div class="stat-box"><label>FOR <input type="number" [(ngModel)]="characterData.attributes.base_values.FOR"></label></div>
          <div class="stat-box"><label>DES <input type="number" [(ngModel)]="characterData.attributes.base_values.DES"></label></div>
          <div class="stat-box"><label>CON <input type="number" [(ngModel)]="characterData.attributes.base_values.CON"></label></div>
          <div class="stat-box"><label>INT <input type="number" [(ngModel)]="characterData.attributes.base_values.INT"></label></div>
          <div class="stat-box"><label>SAB <input type="number" [(ngModel)]="characterData.attributes.base_values.SAB"></label></div>
          <div class="stat-box"><label>CAR <input type="number" [(ngModel)]="characterData.attributes.base_values.CAR"></label></div>
        </div>
      </fieldset>
      <button class="retro-btn" (click)="nextStep()">CONFIRMAR</button>
    }

    <!-- TELA 4: MAGIAS (Simulando a imagem 1) -->
    @case (4) {
      <fieldset class="retro-panel">
        <legend>MAGIAS</legend>
        <p class="panel-subtitle">SELECIONE AS MAGIAS</p>
        <div class="grid-2-col checkboxes">
          @for (spell of availableSpells; track spell) {
            <label>
              <input type="checkbox" class="retro-checkbox" 
                     (change)="toggleArrayItem('spells', spell, $event)"> 
              {{ spell }}
            </label>
          }
        </div>
      </fieldset>
      <button class="retro-btn" (click)="nextStep()">CONFIRMAR</button>
    }

    <!-- TELA FINAL: FICHA DE RESUMO (Simulando a imagem 5) -->
    @case (7) {
      <div class="sheet-layout">
        <!-- Coluna Esquerda -->
        <div class="left-col">
          <div class="portrait-box">?</div>
          <h2 class="char-name">{{ characterData.character_details.name || 'Sem Nome' }}</h2>
          <p>Lvl {{ characterData.core_build.level }} {{ characterData.core_build.race }} {{ characterData.core_build.class }}</p>
          <p>{{ characterData.character_details.alignment }}</p>
          <p>{{ characterData.character_details.age }} anos</p>
        </div>
        
        <!-- Coluna Direita -->
        <div class="right-col">
          <fieldset class="retro-panel stats-panel">
            <legend>ATRIBUTOS</legend>
            <!-- Caixas de status do resumo -->
            <div class="stats-grid">
               <div class="stat-box"><span>FOR</span><span>{{ characterData.attributes.base_values.FOR }}</span></div>
               <div class="stat-box"><span>DES</span><span>{{ characterData.attributes.base_values.DES }}</span></div>
               <!-- Repetir para os 6 -->
            </div>
          </fieldset>
          
          <div class="grid-2-col">
            <fieldset class="retro-panel">
               <legend>COMBATE</legend>
               <p>Armadura: {{ characterData.equipment.armor_type || 'Nenhuma' }}</p>
               <p>Escudo: {{ characterData.equipment.has_shield ? 'Equipado' : 'Nenhum' }}</p>
            </fieldset>
            
            <fieldset class="retro-panel">
               <legend>PERÍCIAS</legend>
               <ul>
                 @for (skill of characterData.choices.skills; track skill) {
                   <li>> {{ skill }}</li>
                 }
               </ul>
            </fieldset>
          </div>
          
          <fieldset class="retro-panel">
             <legend>MAGIAS CONHECIDAS</legend>
             <ul class="magias-list">
               @for (spell of characterData.choices.spells; track spell) {
                 <li>[x] {{ spell }}</li>
               }
             </ul>
          </fieldset>
        </div>
      </div>
      
      <div class="action-buttons">
        <button class="retro-btn secondary" (click)="currentStep = 1">VOLTAR E EDITAR</button>
        <button class="retro-btn primary" (click)="saveGame()">SALVAR JOGO</button>
      </div>
    }
  }
</div>
```

### 5. Estilos Específicos do Componente (`src/app/character-wizard/character-wizard.component.scss`)
Lida com os grids flexíveis (colunas) mostrados nas imagens.

```scss
.wizard-container {
  width: 600px;
  max-width: 90vw;
}

.panel-subtitle {
  color: #88aaff; /* Texto em azul mais claro que aparece nas imagens */
  margin-top: 0;
  margin-bottom: 15px;
}

.grid-2-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  
  label { display: block; margin-bottom: 10px; }
  .full-width { grid-column: span 2; }
}

.checkboxes label {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.stats-grid {
  display: flex;
  justify-content: space-between;
  margin-top: 15px;

  .stat-box {
    border: 1px solid var(--border-color);
    width: 45px;
    text-align: center;
    padding: 5px 0;
    
    label { display: block; }
    input { text-align: center; border: none; font-size: 10px; padding: 5px 0;}
    span { display: block; font-size: 8px; margin-bottom: 5px;}
  }
}

/* Estilos Específicos da Tela 7 (Resumo) */
.sheet-layout {
  display: flex;
  gap: 20px;
  
  .left-col {
    flex: 1;
    text-align: center;
    
    .portrait-box {
      width: 100px;
      height: 120px;
      border: 2px solid var(--border-color);
      margin: 0 auto 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }
    
    .char-name {
      color: var(--accent-color);
      font-size: 12px;
      margin-bottom: 5px;
    }
    
    p { margin: 5px 0; font-size: 8px; }
  }
  
  .right-col {
    flex: 3;
    
    ul { list-style: none; padding: 0; margin: 0; }
    li { margin-bottom: 8px; font-size: 8px; }
    
    .magias-list {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
  }
}

.action-buttons {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
  
  .secondary { background-color: transparent; border-color: #555; }
  .primary { background-color: #00aa00; border-color: #ffffff;}
}
```