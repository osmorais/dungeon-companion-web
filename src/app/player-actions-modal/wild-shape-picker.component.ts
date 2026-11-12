import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CharacterService } from '../services/character.service';
import { WildShapeOption } from '../models/character-response.interface';

/** "1/4", "1/2", "1", "2"… — como o livro escreve o ND. */
export function formatCr(cr: number): string {
  if (cr === 0.125) return '1/8';
  if (cr === 0.25) return '1/4';
  if (cr === 0.5) return '1/2';
  return String(cr);
}

/** "terrestre 12 m, natação 9 m". */
export function formatSpeed(speed: Record<string, string>): string {
  return Object.entries(speed)
    .map(([kind, value]) => `${kind} ${value}`)
    .join(', ');
}

/**
 * Escolha da besta da Forma Selvagem: só as que o nível do druida permite (a API filtra por ND,
 * nado e voo), com busca pelo nome.
 */
@Component({
  selector: 'app-wild-shape-picker',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="ws-backdrop" (click)="closed.emit()">
      <div
        class="ws-modal framed-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ws-title"
        (click)="$event.stopPropagation()"
      >
        <button type="button" class="ws-close" aria-label="Fechar" (click)="closed.emit()">
          ✕
        </button>
        <h3 id="ws-title" class="ws-title">FORMA SELVAGEM</h3>
        <p class="ws-hint">Escolha a besta. Transformar gasta um uso.</p>
        <label class="ws-sr-only" for="ws-search">Buscar besta pelo nome</label>
        <input
          id="ws-search"
          class="m-input ws-search"
          type="search"
          autocomplete="off"
          placeholder="BUSCAR BESTA"
          [ngModel]="query()"
          (ngModelChange)="query.set($event)"
        />
        @if (error()) {
          <p class="ws-hint">Não foi possível carregar as bestas.</p>
        } @else if (loading()) {
          <p class="ws-hint">Carregando as bestas...</p>
        } @else if (filtered().length === 0) {
          <p class="ws-hint">Nenhuma besta com esse nome no seu nível.</p>
        } @else {
          <ul class="ws-list">
            @for (beast of filtered(); track beast.slug) {
              <li class="ws-row">
                <span class="ws-body">
                  <span class="ws-name">{{ beast.name }}</span>
                  <span class="ws-desc"
                    >ND {{ cr(beast.challenge_rating) }} · PV {{ beast.hp_max }} · CA
                    {{ beast.ac }}</span
                  >
                  <span class="ws-desc">{{ speed(beast.speed) }}</span>
                </span>
                <button
                  type="button"
                  class="retro-btn ws-pick"
                  [disabled]="busy()"
                  (click)="picked.emit(beast)"
                >
                  TRANSFORMAR
                </button>
              </li>
            }
          </ul>
        }
      </div>
    </div>
  `,
  styles: `
    .ws-backdrop {
      position: fixed;
      inset: 0;
      z-index: 400;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px;
      background-color: rgba(0, 0, 0, 0.7);
    }
    .ws-modal {
      position: relative;
      box-sizing: border-box;
      width: min(460px, 100%);
      max-height: 85vh;
      overflow-y: auto;
      padding: 16px 14px;
      background-color: var(--bg-color);
      text-align: left;
    }
    .ws-close {
      position: absolute;
      top: 8px;
      right: 8px;
      border: none;
      background: none;
      color: var(--text-color);
      font-family: inherit;
      cursor: var(--cp);
    }
    .ws-title {
      margin: 0 0 8px;
      font-size: 10px;
      color: var(--accent-color);
    }
    .ws-hint {
      margin: 0 0 10px;
      font-size: 7px;
      line-height: 1.7;
      color: var(--label-title-color);
    }
    .ws-search {
      width: 100%;
      box-sizing: border-box;
      margin-bottom: 10px;
    }
    .ws-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .ws-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px;
      border: 1px solid var(--border-color);
      background-color: var(--panel-bg);
    }
    .ws-body {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }
    .ws-name {
      font-size: 9px;
      color: var(--accent-color);
    }
    .ws-desc {
      font-size: 6px;
      line-height: 1.7;
      color: var(--text-soft);
    }
    .ws-pick {
      float: none;
      flex: none;
      margin: 0;
      padding: 6px 8px;
      font-size: 7px;
    }
    .ws-sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
  `,
})
export class WildShapePickerComponent implements OnInit {
  private charService = inject(CharacterService);

  idCharacter = input.required<number>();
  /** Transformando (aguardando a API): trava os botões. */
  busy = input(false);
  picked = output<WildShapeOption>();
  closed = output<void>();

  readonly cr = formatCr;
  readonly speed = formatSpeed;

  beasts = signal<WildShapeOption[]>([]);
  loading = signal(true);
  error = signal(false);
  query = signal('');

  filtered = computed(() => {
    const term = this.query().trim().toLowerCase();
    return term ? this.beasts().filter((b) => b.name.toLowerCase().includes(term)) : this.beasts();
  });

  ngOnInit(): void {
    this.charService.getWildShapeOptions(this.idCharacter()).subscribe({
      next: (res) => {
        this.beasts.set(res.beasts);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
