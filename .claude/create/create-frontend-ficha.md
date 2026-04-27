


Para implementar essa nova fase com perfeição, nós vamos organizar a arquitetura do Angular em **Serviço** (para gerenciar a chamada da API e guardar os dados), atualizar o **Wizard** (para ter o loading e a mensagem de sucesso), e criar o **novo Componente da Ficha Final**.

### 1. Modelo de Resposta da API (`src/app/models/character-response.interface.ts`)
Este arquivo mapeia exatamente o JSON que você enviou.

```typescript
export interface CharacterSheetResponse {
  character_sheet: {
    header: {
      name: string;
      class_and_level: string;
      race: string;
      background: string;
      alignment: string;
      experience_points: number;
    };
    combat_stats: {
      proficiency_bonus: number;
      armor_class: number;
      initiative: number;
      speed: string;
      hit_points: { max: number; current: number; temporary: number };
      hit_dice: string;
      passive_perception: number;
    };
    attributes_and_saves: Record<string, {
      score: number;
      modifier: number;
      save: number;
      save_proficiency: boolean;
    }>;
    skills: Record<string, {
      stat: string;
      bonus: number;
      proficient: boolean;
    }>;
    combat_actions: { weapons: any[] };
    features_and_traits: Array<{ name: string; source: string; description: string }>;
    proficiencies_and_languages: {
      armor: string[];
      weapons: string[];
      tools: string[];
      languages: string[];
    };
    equipment: {
      currency: any;
      items: string[];
    };
    spellcasting?: {
      is_spellcaster: boolean;
      spellcasting_ability: string;
      spell_save_dc: number;
      spell_attack_bonus: number;
      spells_known: {
        cantrips: string[];
        level_1?: string[];
      };
    };
  };
}
```

### 2. Serviço de Gerenciamento (`src/app/services/character.service.ts`)
Este serviço fará a "ponte" entre o Wizard (que salva) e a Tela da Ficha (que exibe).

```typescript
import { Injectable, signal } from '@angular/core';
import { CharacterSheetResponse } from '../models/character-response.interface';
import { delay, Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CharacterService {
  // Signal do Angular 16+ para armazenar a ficha recebida da API
  public currentCharacter = signal<CharacterSheetResponse | null>(null);

  // Simula a chamada POST para a sua API e o retorno do JSON
  saveCharacterToApi(payload: any): Observable<CharacterSheetResponse> {
    // AQUI VAI O SEU HTTP CLIENT. 
    // Por enquanto, simulamos o delay de rede de 2 segundos com RxJS
    const mockResponse: CharacterSheetResponse = { character_sheet: { /* O JSON ENTRA AQUI NO SEU CÓDIGO REAL */ } } as any;
    
    // Simula a resposta da API (Mude para httpClient no projeto final)
    return of(mockResponse).pipe(delay(2000));
  }
}
```

### 3. Atualização do Componente do Wizard (`src/app/character-wizard/character-wizard.component.ts` e HTML)
Vamos adicionar os estados de Loading, Sucesso e o Redirecionamento usando o Angular Router.

**No arquivo `.ts` adicione no topo/construtor:**
```typescript
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CharacterService } from '../services/character.service';
// ... outros imports

export class CharacterWizardComponent {
  // Injeções
  private router = inject(Router);
  private charService = inject(CharacterService);

  // Novos estados para a UI
  showLoader = false;
  showSuccess = false;

  // ... (mantenha o resto do código)

  saveGame() {
    this.showLoader = true;
    
    this.charService.saveCharacterToApi(this.characterData).subscribe({
      next: (apiResponse) => {
        // Salva a ficha gerada no serviço
        this.charService.currentCharacter.set(apiResponse);
        
        this.showLoader = false;
        this.showSuccess = true;

        // Aguarda 1.5s mostrando a mensagem e redireciona
        setTimeout(() => {
          this.router.navigate(['/sheet-result']);
        }, 1500);
      },
      error: (err) => {
        console.error(err);
        this.showLoader = false;
        alert('Erro ao criar personagem!');
      }
    });
  }
}
```

**No final do seu arquivo `.html` do Wizard, adicione as telas de Loading e Sucesso:**
```html
<!-- OVERLAYS DE LOADING E SUCESSO -->
@if (showLoader) {
  <div class="overlay loading-overlay">
    <div class="retro-panel blinking-text">
      <p>SALVANDO O JOGO...</p>
      <p>AGUARDE A API MAGICA</p>
    </div>
  </div>
}

@if (showSuccess) {
  <div class="overlay success-overlay">
    <div class="retro-panel success-panel">
      <h2 style="color: #00ff00;">SUCESSO!</h2>
      <p>PERSONAGEM CRIADO COM SUCESSO</p>
    </div>
  </div>
}
```

**Adicione no seu `.scss` global ou do wizard:**
```scss
/* Estilos para o Loading e Overlay */
.overlay {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  background-color: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
}

.blinking-text p {
  text-align: center;
  color: var(--text-color);
  animation: blink 1s step-end infinite;
}

.success-panel {
  border-color: #00ff00;
  text-align: center;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
```

### 4. A Nova Tela da Ficha Final (`src/app/character-sheet/character-sheet.component.html`, `.ts`, `.scss`)
Esta tela irá ler os dados armazenados no Signal e exibir tudo no formato retro.

**TS:** `character-sheet.component.ts`
```typescript
import { Component, inject } from '@angular/core';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { Router } from '@angular/router';
import { CharacterService } from '../services/character.service';

@Component({
  selector: 'app-character-sheet',
  standalone: true,
  imports: [CommonModule, KeyValuePipe],
  templateUrl: './character-sheet.component.html',
  styleUrls: ['./character-sheet.component.scss']
})
export class CharacterSheetComponent {
  private charService = inject(CharacterService);
  private router = inject(Router);

  // Resgata o dado da API salvo no Service
  sheetData = this.charService.currentCharacter;

  goBack() {
    this.router.navigate(['/']); // Volta pro menu ou wizard
  }

  // Helper para formatar modificador (+3, -1)
  formatMod(value: number): string {
    return value >= 0 ? `+${value}` : `${value}`;
  }
}
```

**HTML:** `character-sheet.component.html`
```html
@if (sheetData(); as data) {
  <div class="full-sheet-container">
    
    <!-- CABEÇALHO -->
    <fieldset class="retro-panel header-panel">
      <div class="char-title">
        <h1>{{ data.character_sheet.header.name }}</h1>
        <p>{{ data.character_sheet.header.class_and_level }} - {{ data.character_sheet.header.race || 'Humano' }}</p>
      </div>
      <div class="char-details">
        <p>Antecedente: {{ data.character_sheet.header.background }}</p>
        <p>Alinhamento: {{ data.character_sheet.header.alignment }}</p>
        <p>XP: {{ data.character_sheet.header.experience_points }}</p>
      </div>
    </fieldset>

    <div class="sheet-grid">
      <!-- COLUNA ESQUERDA: ATRIBUTOS -->
      <div class="column">
        <fieldset class="retro-panel">
          <legend>ATRIBUTOS & RESISTÊNCIAS</legend>
          <div class="attributes-list">
            @for (attr of data.character_sheet.attributes_and_saves | keyvalue; track attr.key) {
              <div class="attr-box">
                <span class="attr-name">{{ attr.key }}</span>
                <span class="attr-score">{{ attr.value.score }}</span>
                <span class="attr-mod">{{ formatMod(attr.value.modifier) }}</span>
                <div class="save-box">
                  <span class="prof-dot">{{ attr.value.save_proficiency ? '●' : '○' }}</span>
                  Save: {{ formatMod(attr.value.save) }}
                </div>
              </div>
            }
          </div>
        </fieldset>
      </div>

      <!-- COLUNA DO MEIO: COMBATE & PERÍCIAS -->
      <div class="column">
        <fieldset class="retro-panel combat-panel">
          <legend>COMBATE</legend>
          <div class="stats-row">
            <div><label>CA</label> <span>{{ data.character_sheet.combat_stats.armor_class }}</span></div>
            <div><label>INIT</label> <span>{{ formatMod(data.character_sheet.combat_stats.initiative) }}</span></div>
            <div><label>MOV</label> <span>{{ data.character_sheet.combat_stats.speed }}</span></div>
          </div>
          <div class="hp-box">
            <p>PONTOS DE VIDA</p>
            <h3>{{ data.character_sheet.combat_stats.current }} / {{ data.character_sheet.combat_stats.max }}</h3>
          </div>
        </fieldset>

        <fieldset class="retro-panel skills-panel">
          <legend>PERÍCIAS</legend>
          <ul>
            @for (skill of data.character_sheet.skills | keyvalue; track skill.key) {
              <li>
                <span class="prof-dot">{{ skill.value.proficient ? '●' : '○' }}</span>
                {{ formatMod(skill.value.bonus) }} {{ skill.key }} <small>({{ skill.value.stat }})</small>
              </li>
            }
          </ul>
        </fieldset>
      </div>

      <!-- COLUNA DIREITA: CARACTERÍSTICAS & MAGIAS -->
      <div class="column">
        <fieldset class="retro-panel">
          <legend>TRAÇOS & HABILIDADES</legend>
          <ul class="traits-list">
            @for (trait of data.character_sheet.features_and_traits; track trait.name) {
              <li><strong>{{ trait.name }}:</strong> {{ trait.description }}</li>
            }
          </ul>
        </fieldset>

        @if (data.character_sheet.spellcasting?.is_spellcaster) {
          <fieldset class="retro-panel magic-panel">
            <legend>MAGIA</legend>
            <p>Atributo: {{ data.character_sheet.spellcasting?.spellcasting_ability }} | CD: {{ data.character_sheet.spellcasting?.spell_save_dc }}</p>
            <p>Truques:</p>
            <ul>
              @for (cantrip of data.character_sheet.spellcasting?.spells_known?.cantrips; track cantrip) {
                <li>> {{ cantrip }}</li>
              }
            </ul>
            <p>Nível 1:</p>
            <ul>
              @for (spell of data.character_sheet.spellcasting?.spells_known?.level_1; track spell) {
                <li>> {{ spell }}</li>
              }
            </ul>
          </fieldset>
        }
      </div>
    </div>

    <button class="retro-btn" (click)="goBack()">CRIAR NOVO PERSONAGEM</button>
  </div>
} @else {
  <div class="overlay">
    <div class="retro-panel blinking-text">
      <p>NENHUMA FICHA ENCONTRADA</p>
      <button class="retro-btn" (click)="goBack()">VOLTAR</button>
    </div>
  </div>
}
```

**SCSS:** `character-sheet.component.scss`
```scss
.full-sheet-container {
  width: 900px;
  max-width: 95vw;
  margin: 20px auto;
}

.header-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-color: #ffaa00; /* Destaque no cabeçalho */
  
  h1 { margin: 0 0 10px; font-size: 16px; color: #ffaa00; }
  .char-details p { margin: 5px 0; font-size: 8px; color: #aaa; }
}

.sheet-grid {
  display: grid;
  grid-template-columns: 1fr 1.5fr 1.5fr;
  gap: 20px;
  margin-top: 20px;
}

/* Coluna Esquerda - Atributos */
.attributes-list {
  display: flex;
  flex-direction: column;
  gap: 10px;

  .attr-box {
    border: 1px solid var(--border-color);
    text-align: center;
    padding: 10px 5px;
    
    .attr-name { display: block; font-size: 12px; margin-bottom: 5px; color: #88aaff; }
    .attr-score { display: block; font-size: 16px; margin-bottom: 5px; }
    .attr-mod { display: block; font-size: 10px; margin-bottom: 5px; }
    .save-box { font-size: 8px; border-top: 1px dashed #555; padding-top: 5px; }
  }
}

/* Bolinha de Proficiência */
.prof-dot { color: var(--accent-color); margin-right: 5px; }

/* Combate */
.combat-panel .stats-row {
  display: flex;
  justify-content: space-around;
  text-align: center;
  margin-bottom: 15px;

  label { display: block; font-size: 8px; color: #88aaff; margin-bottom: 5px; }
  span { font-size: 14px; }
}

.hp-box {
  border: 1px solid var(--border-color);
  text-align: center;
  padding: 10px;
  p { margin: 0 0 10px; font-size: 8px; }
  h3 { margin: 0; font-size: 16px; color: #00ff00; }
}

/* Perícias e Traços */
ul { list-style: none; padding: 0; margin: 0; }
.skills-panel li { margin-bottom: 8px; font-size: 8px; display: flex; align-items: center; }
.skills-panel small { color: #555; margin-left: 5px; }

.traits-list li {
  font-size: 8px;
  margin-bottom: 15px;
  line-height: 1.6;
  strong { color: #ffaa00; display: block; margin-bottom: 3px;}
}

.magic-panel p { font-size: 8px; color: #88aaff; margin: 10px 0 5px; }
.magic-panel li { font-size: 8px; margin-bottom: 5px; }
```

### Instruções para implementação:

> Para criar a tela final do nosso criador de fichas retro e configurar o fluxo de requisição. Por favor, siga essas instruções usando a arquitetura Standalone do Angular 17+:
> 
> 1. Crie uma interface `CharacterSheetResponse` para tipar o payload de resposta da API que te passei.
> 2. Crie um `CharacterService` que possua um Signal ou BehaviorSubject para armazenar os dados do personagem após a API responder. 
> 3. No arquivo atual `character-wizard.component.ts`, injete esse serviço e o `Router`. Ao clicar em 'Salvar Jogo', mude o estado `showLoader` para true para exibir a tela preta com Loading piscante. Quando o serviço responder, mude para `showSuccess` e mostre a mensagem 'Personagem criado com sucesso' por 1.5 segundos.
> 4. Redirecione o usuário (`router.navigate`) para uma nova rota chamada `/sheet-result`.
> 5. Crie um novo componente chamado `CharacterSheetComponent`. Copie a estrutura de HTML, TS e SCSS que estou te enviando para organizar os atributos, CA, Vida e Perícias simulando o estilo de uma tela final de RPG clássico de SNES.