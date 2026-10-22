import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ModalBurstComponent } from '../modal-burst/modal-burst.component';
import { SpellCastStageComponent } from './spell-cast-stage.component';
import { CastStageView } from './spell-cast-stage.model';

/** Quanto o aviso fica depois que quem lança terminou (decisão do usuário, 1.5.0). */
export const SPELL_CAST_DONE_MS = 8000;

/**
 * Aviso do lançamento de magia pra mesa (1.5.0): um só, que vai crescendo — abre com o ataque
 * (ou direto com o dano, ou só as cartas pra magia sem dados), espera quem lança e some
 * SPELL_CAST_DONE_MS depois que ele termina. Fecha também pelo ✕ ou tocando fora.
 */
@Component({
  selector: 'app-spell-cast-notice',
  standalone: true,
  imports: [ModalBurstComponent, SpellCastStageComponent],
  template: `
    <div class="csn-overlay" (click)="closed.emit()">
      <app-modal-burst variant="roll" />
      <div class="csn-panel framed-toast" role="status" aria-live="polite" (click)="$event.stopPropagation()">
        <button class="csn-close" title="Fechar" (click)="closed.emit()">✕</button>
        <app-spell-cast-stage [view]="view" />
        @if (view.done) {
          <div class="csn-timer"><div class="csn-timer-fill" [style.animation-duration.ms]="doneMs"></div></div>
        }
      </div>
    </div>
  `,
  styles: `
    .csn-overlay {
      position: fixed;
      inset: 0;
      z-index: 1090; /* abaixo do aviso de rolagem avulso (1100), acima do painel e da troca de vez */
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px;
      box-sizing: border-box;
      background: rgba(0, 0, 0, 0.65);
      overflow-y: auto;
    }

    /* Moldura do tema (.framed-toast, styles.scss): não definir border aqui. */
    .csn-panel {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      width: 92vw;
      max-width: 640px;
      margin: auto 0;
      padding: 8px 6px 4px;
      box-sizing: border-box;
      background-color: var(--panel-bg);
      animation: modal-blast-in 0.5s steps(10) both;
    }

    .csn-close {
      position: absolute;
      top: 0;
      right: 0;
      z-index: 1;
      padding: 4px 8px;
      border: none;
      background: none;
      color: var(--text-color);
      font-family: inherit;
      font-size: 11px;
      cursor: var(--cp);
    }

    .csn-close:hover {
      color: var(--accent-color);
    }

    .csn-timer {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
    }

    .csn-timer-fill {
      height: 100%;
      background: var(--accent-color);
      animation: csn-timer linear both;
    }

    @keyframes csn-timer {
      from {
        width: 100%;
      }
      to {
        width: 0;
      }
    }
  `,
})
export class SpellCastNoticeComponent {
  @Input({ required: true }) view!: CastStageView;
  @Output() closed = new EventEmitter<void>();

  readonly doneMs = SPELL_CAST_DONE_MS;
}
