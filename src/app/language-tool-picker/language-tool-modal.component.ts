import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { CharacterService } from '../services/character.service';
import { apiErrorMessage } from '../auth/auth-errors';
import { SheetLanguageToolChoices } from '../models/character-response.interface';
import {
  LanguageToolPickerComponent,
  LanguageToolValue,
  languageToolComplete,
} from './language-tool-picker.component';

/**
 * Escolha dos idiomas e ferramentas "à escolha" na própria ficha (1.24.0): pras fichas criadas
 * antes e pra quem não escolheu na criação. Dá pra trocar depois também.
 */
@Component({
  selector: 'app-language-tool-modal',
  standalone: true,
  imports: [LanguageToolPickerComponent],
  template: `
    <div class="lt-overlay" (click)="closed.emit()">
      <div
        class="retro-panel lt-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lt-title"
        (click)="$event.stopPropagation()"
      >
        <button type="button" class="lt-close" aria-label="Fechar" (click)="closed.emit()">
          ✕
        </button>
        <h3 id="lt-title" class="lt-title">IDIOMAS E FERRAMENTAS</h3>
        <p class="lt-hint">O que a raça e o antecedente deixam você escolher.</p>
        <div class="lt-fields">
          <app-language-tool-picker
            [languageCount]="choices().language_count"
            [fixedLanguages]="choices().fixed_languages"
            [languages]="choices().language_options"
            [toolSlots]="choices().tool_slots"
            [value]="value()"
            (valueChange)="value.set($event)"
          />
        </div>
        @if (error()) {
          <p class="lt-error">{{ error() }}</p>
        }
        <div class="lt-actions">
          <button type="button" class="retro-btn" [disabled]="saving()" (click)="closed.emit()">
            CANCELAR
          </button>
          <button
            type="button"
            class="retro-btn"
            [disabled]="saving() || !complete()"
            (click)="save()"
          >
            {{ saving() ? 'SALVANDO...' : 'SALVAR' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .lt-overlay {
      position: fixed;
      inset: 0;
      z-index: 999;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: rgba(0, 0, 0, 0.9);
    }
    .lt-modal {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-sizing: border-box;
      width: 420px;
      max-width: 95vw;
      max-height: 90vh;
      overflow-y: auto;
      padding: 24px 20px 20px;
      border: 2px solid var(--border-color);
      background-color: var(--panel-bg);
    }
    .lt-close {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 24px;
      height: 24px;
      border: 1px solid var(--border-color);
      background: none;
      color: var(--text-color);
      font-family: inherit;
      font-size: 9px;
      cursor: var(--cp);
    }
    .lt-title {
      margin: 0;
      font-size: 10px;
      color: var(--accent-color);
    }
    .lt-hint,
    .lt-error {
      margin: 0;
      font-size: 7px;
      line-height: 1.7;
      color: var(--label-title-color);
    }
    .lt-error {
      color: #ff6b6b;
    }
    .lt-fields {
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-size: 8px;
    }
    .lt-fields ::ng-deep label {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .lt-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .lt-actions .retro-btn {
      float: none;
      margin: 0;
    }
  `,
})
export class LanguageToolModalComponent implements OnInit {
  private charService = inject(CharacterService);

  idCharacter = input.required<number>();
  choices = input.required<SheetLanguageToolChoices>();
  saved = output<{ languages: string[]; tools: string[]; value: LanguageToolValue }>();
  closed = output<void>();

  value = signal<LanguageToolValue>({ languages: [], tools: {} });
  saving = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.value.set({
      languages: [...this.choices().chosen_languages],
      tools: { ...this.choices().chosen_tools },
    });
  }

  complete(): boolean {
    const c = this.choices();
    return languageToolComplete(this.value(), c.language_count, c.fixed_languages, c.tool_slots);
  }

  save(): void {
    if (this.saving() || !this.complete()) return;
    this.saving.set(true);
    this.error.set(null);
    const value = this.value();
    this.charService.updateLanguageToolChoices(this.idCharacter(), value).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.saved.emit({ ...res, value });
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(err, 'Não foi possível salvar as escolhas.'));
      },
    });
  }
}
