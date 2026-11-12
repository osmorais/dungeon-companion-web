import { Component, input, output, signal } from '@angular/core';
import { HpBarComponent } from '../hp-bar/hp-bar.component';
import { SessionCompanion } from '../models/game-session.interface';

/**
 * Card do Companheiro Animal na lista de NPCs da mesa. O contorno tem a cor sorteada pro par —
 * a mesma que contorna o card do ranger. Age na vez do ranger: as ações abrem pelo modal dele.
 */
@Component({
  selector: 'app-companion-card',
  standalone: true,
  imports: [HpBarComponent],
  template: `
    <div
      class="cc-card framed-card"
      [class.cc-card--turn]="currentTurn()"
      [style.outline-color]="companion().color"
    >
      <div class="cc-info">
        <span class="cc-name">{{ companion().name }}</span>
        <span class="cc-meta">COMPANHEIRO DE {{ ownerName() }}</span>
        <span class="cc-meta">CA {{ companion().armor_class }} · {{ companion().speed }}</span>
        <app-hp-bar class="cc-hp" [current]="companion().hp_current" [max]="companion().hp_max" />
        @if (canEdit()) {
          <div class="cc-hp-controls">
            <label class="cc-sr-only" [attr.for]="'cc-amount-' + companion().id_session_companion"
              >Quantidade de PV</label
            >
            <input
              [id]="'cc-amount-' + companion().id_session_companion"
              type="number"
              min="0"
              class="cc-amount"
              placeholder="0"
              [value]="amount() || ''"
              (input)="setAmount($event)"
            />
            <button
              type="button"
              class="retro-btn cc-btn cc-btn--damage"
              [disabled]="!amount() || saving()"
              (click)="apply(-1)"
            >
              DANO
            </button>
            <button
              type="button"
              class="retro-btn cc-btn cc-btn--heal"
              [disabled]="!amount() || saving()"
              (click)="apply(1)"
            >
              CURA
            </button>
          </div>
        }
      </div>
      @if (canAct()) {
        <button
          type="button"
          class="retro-btn cc-actions"
          title="Ações do companheiro (no modal do ranger)"
          (click)="openActions.emit()"
        >
          <img class="ui-icon" src="assets/icons/actions.png" alt="" />
          AÇÕES
        </button>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .cc-card {
      position: relative;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      outline: 2px solid transparent;
      outline-offset: 2px;
      background-color: var(--bg-color);
      background-image: var(--npc-card-bg);
      background-size: cover;
      background-position: center;
    }
    .cc-card--turn {
      outline-width: 3px;
    }
    .cc-info {
      display: flex;
      flex: 1 1 160px;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }
    .cc-name {
      font-size: 9px;
      color: var(--accent-color);
    }
    .cc-meta {
      font-size: 6px;
      line-height: 1.7;
      color: var(--text-soft);
    }
    .cc-hp {
      display: block;
      margin-top: 4px;
    }
    .cc-hp-controls {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 4px;
    }
    .cc-amount {
      flex: 1;
      min-width: 0;
      height: 26px;
      box-sizing: border-box;
      padding: 0 4px;
      border: 1px solid var(--border-color);
      background-color: var(--bg-color);
      color: var(--text-color);
      font-family: inherit;
      font-size: 9px;
      text-align: center;
    }
    .cc-btn {
      flex: 1;
      float: none;
      min-width: 0;
      height: 26px;
      margin: 0;
      padding: 0 8px;
      font-size: 6px;
    }
    .cc-btn:disabled {
      opacity: 0.4;
      cursor: var(--cx);
    }
    .cc-btn--damage {
      border-color: #ff6b6b;
      color: #ff6b6b;
    }
    .cc-btn--heal {
      border-color: #4caf50;
      color: #4caf50;
    }
    .cc-actions {
      float: none;
      flex: none;
      margin: 0;
      padding: 6px 8px;
      font-size: 7px;
    }
    .cc-sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
  `,
})
export class CompanionCardComponent {
  companion = input.required<SessionCompanion>();
  ownerName = input.required<string>();
  /** Mestre ou o jogador do ranger: ajusta o PV direto no card. */
  canEdit = input(false);
  /** Mestre ou o jogador do ranger: abre as ações (modal do ranger). */
  canAct = input(false);
  saving = input(false);
  /** É a vez do ranger (o companheiro age junto). */
  currentTurn = input(false);

  /** Dano (negativo) ou cura (positivo) a aplicar. */
  hpDelta = output<number>();
  openActions = output<void>();

  amount = signal(0);

  setAmount(event: Event): void {
    const value = Math.floor(Number((event.target as HTMLInputElement).value));
    this.amount.set(Number.isFinite(value) && value > 0 ? value : 0);
  }

  apply(sign: 1 | -1): void {
    const value = this.amount();
    if (!value) return;
    this.hpDelta.emit(sign * value);
    this.amount.set(0);
  }
}
