import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  signal,
} from '@angular/core';
import { CastShatterComponent } from './cast-shatter.component';
import { CastTriumphComponent } from './cast-triumph.component';

/** Depois que o dano/cura apareceu e quem lança concluiu, a mesa ainda lê o total por este tempo
 *  antes da saída de vitória. */
export const TRIUMPH_READ_MS = 1500;
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
  imports: [
    ModalBurstComponent,
    SpellCastStageComponent,
    CastShatterComponent,
    CastTriumphComponent,
  ],
  template: `
    <div class="csn-overlay" (click)="closed.emit()">
      <app-modal-burst variant="roll" />
      <div
        class="csn-panel framed-toast"
        [class.csn-panel--shatter]="shattering"
        [class.csn-panel--broken]="broken()"
        [class.csn-panel--triumph]="triumph() !== null"
        role="status"
        aria-live="polite"
        (click)="$event.stopPropagation()"
      >
        <button class="csn-close" title="Fechar" (click)="closed.emit()">✕</button>
        <app-spell-cast-stage [view]="view" (rollRevealed)="onRollRevealed($event)" />
        <app-cast-shatter
          [active]="shattering"
          (broke)="broken.set(true)"
          (finished)="closed.emit()"
        />
        <app-cast-triumph
          [active]="triumph() !== null"
          [kind]="triumph() ?? 'damage'"
          (finished)="closed.emit()"
        />
        @if (view.done) {
          <div class="csn-timer">
            <div class="csn-timer-fill" [style.animation-duration.ms]="doneMs"></div>
          </div>
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

    /* Errou o ataque: treme quando trinca; quebrado, só os cacos aparecem (cast-shatter). */
    .csn-panel--shatter {
      animation: csn-shake 0.38s steps(6) 0.7s both;
    }

    /* Concluiu o dano/cura: brilha com o corte e se recolhe subindo (cast-triumph). */
    .csn-panel--triumph {
      animation: csn-triumph 1.25s ease-in both;
    }

    @keyframes csn-triumph {
      0% {
        transform: none;
        filter: none;
        opacity: 1;
      }
      18% {
        transform: scale(1.03);
        filter: brightness(1.5);
      }
      35% {
        transform: none;
        filter: brightness(1.1);
        opacity: 1;
      }
      100% {
        transform: translateY(-40px) scale(0.82);
        filter: brightness(1.6) blur(2px);
        opacity: 0;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .csn-panel--triumph {
        animation: none;
      }
    }

    .csn-panel--broken {
      border-image: none !important;
      background: transparent !important;
      box-shadow: none !important;
    }

    .csn-panel--broken > :not(app-cast-shatter) {
      visibility: hidden;
    }

    @keyframes csn-shake {
      0%,
      100% {
        transform: none;
      }
      25% {
        transform: translate(-6px, 2px) rotate(-0.6deg);
      }
      50% {
        transform: translate(5px, -3px) rotate(0.5deg);
      }
      75% {
        transform: translate(-3px, 3px);
      }
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
export class SpellCastNoticeComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) view!: CastStageView;
  @Output() closed = new EventEmitter<void>();
  /** Total de uma rolagem apareceu no palco (impacto de dano e Tom tocam junto). */
  @Output() rollRevealed = new EventEmitter<string>();

  readonly doneMs = SPELL_CAST_DONE_MS;

  broken = signal(false);
  /** Saída de vitória tocando (dano ou cura), igual à do painel de quem lança. */
  triumph = signal<'damage' | 'heal' | null>(null);
  private revealed = new Set<string>();
  private shatterLatched = false;
  private triumphTimer: ReturnType<typeof setTimeout> | null = null;

  onRollRevealed(id: string): void {
    this.revealed.add(id);
    this.rollRevealed.emit(id);
    this.checkTriumph();
  }

  ngOnChanges(): void {
    this.checkTriumph();
  }

  ngOnDestroy(): void {
    if (this.triumphTimer) clearTimeout(this.triumphTimer);
  }

  /** Terminou com dano/cura (já mostrado no palco): depois de um instante pra ler, sai com a
   *  mesma animação de quem lança. */
  private checkTriumph(): void {
    if (this.triumphTimer || this.triumph()) return;
    const last = this.view?.rolls[this.view.rolls.length - 1];
    if (!this.view?.done || !last || last.kind === 'attack' || !this.revealed.has(last.id)) return;
    const kind = last.kind === 'heal' ? 'heal' : 'damage';
    this.triumphTimer = setTimeout(() => this.triumph.set(kind), TRIUMPH_READ_MS);
  }

  /** Terminou com o último ataque errado (sem dano depois), já mostrado no palco: quebra. */
  get shattering(): boolean {
    if (this.shatterLatched) return true;
    const last = this.view.rolls[this.view.rolls.length - 1];
    if (
      this.view.done &&
      last?.kind === 'attack' &&
      last.outcome === 'miss' &&
      this.revealed.has(last.id)
    ) {
      this.shatterLatched = true;
    }
    return this.shatterLatched;
  }
}
