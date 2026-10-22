import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { CharacterCardComponent } from '../character-card/character-card.component';
import { GameCardComponent } from '../game-card/game-card.component';
import { PixelDieComponent } from '../pixel-die/pixel-die.component';
import { PixelNumericDieComponent } from '../pixel-numeric-die/pixel-numeric-die.component';
import { CastStageView } from './spell-cast-stage.model';

/** Carta jogada: cai de costas, fica um instante mostrando o verso e vira (ver `cs-throw`). */
export const CAST_INTRO_MS = 2400;
/** Dados rolando ("?") antes do total bater na tela. */
export const CAST_ROLL_REVEAL_MS = 900;
/** Quando chegam várias rolagens juntas, uma depois da outra. */
const CAST_ROLL_STAGGER_MS = 1100;

/**
 * Palco do lançamento de magia / ataque com arma: card do personagem + carta (cai virada pra baixo,
 * mostra o verso e vira, como uma carta de verdade) + as rolagens, que entram depois que a carta
 * vira: dados rolando → total grande batendo na tela → selo ACERTOU/ERROU/CRÍTICO. Dano faz o
 * aviso tremer. Só desenha; quem monta o `view` é o aviso da mesa ou o modal de rolagem.
 */
@Component({
  selector: 'app-spell-cast-stage',
  standalone: true,
  imports: [CharacterCardComponent, GameCardComponent, PixelDieComponent, PixelNumericDieComponent],
  templateUrl: './spell-cast-stage.component.html',
  styleUrls: ['./spell-cast-stage.component.scss'],
})
export class SpellCastStageComponent implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) view!: CastStageView;
  /** O total de uma rolagem acabou de aparecer (id da rolagem): a mesa toca o impacto e o Tom. */
  @Output() rollRevealed = new EventEmitter<string>();

  /** A carta já virou: as rolagens podem aparecer. */
  introDone = signal(false);
  /** Rolagens cujos dados já pararam (total à mostra). */
  revealed = signal<ReadonlySet<string>>(new Set());
  /** Tremida do aviso quando um dano bate na tela. */
  shaking = signal(false);

  private known = new Set<string>();
  private queue: string[] = [];
  private timers: ReturnType<typeof setTimeout>[] = [];
  private nextRevealAt = 0;
  private readonly reducedMotion =
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  ngOnInit(): void {
    if (this.reducedMotion) {
      this.introDone.set(true);
      this.flushQueue();
      return;
    }
    this.later(() => {
      this.introDone.set(true);
      this.flushQueue();
    }, CAST_INTRO_MS);
  }

  ngOnChanges(): void {
    for (const roll of this.view?.rolls ?? []) {
      if (this.known.has(roll.id)) continue;
      this.known.add(roll.id);
      this.queue.push(roll.id);
    }
    if (this.introDone()) this.flushQueue();
  }

  ngOnDestroy(): void {
    this.timers.forEach(clearTimeout);
  }

  isRevealed(id: string): boolean {
    return this.revealed().has(id);
  }

  /** Revela as rolagens da fila: cada uma rola os dados e depois mostra o total (uma por vez). */
  private flushQueue(): void {
    while (this.queue.length) {
      const id = this.queue.shift()!;
      if (this.reducedMotion) {
        this.reveal(id);
        continue;
      }
      const now = Date.now();
      const start = Math.max(now, this.nextRevealAt);
      this.nextRevealAt = start + CAST_ROLL_STAGGER_MS;
      this.later(() => this.reveal(id), start - now + CAST_ROLL_REVEAL_MS);
    }
  }

  private reveal(id: string): void {
    this.revealed.update((set) => new Set(set).add(id));
    this.rollRevealed.emit(id);
    const roll = this.view.rolls.find((r) => r.id === id);
    if (roll && roll.kind !== 'attack' && !this.reducedMotion) {
      this.shaking.set(true);
      this.later(() => this.shaking.set(false), 450);
    }
  }

  private later(fn: () => void, ms: number): void {
    this.timers.push(setTimeout(fn, ms));
  }

  /** Rolagens que já podem aparecer (depois da carta virar), na ordem. */
  visibleRolls() {
    return this.introDone() ? this.view.rolls.filter((r) => this.known.has(r.id)) : [];
  }

  rollLabel(kind: 'attack' | 'damage' | 'heal'): string {
    return kind === 'attack' ? 'ATAQUE' : kind === 'heal' ? 'CURA' : 'DANO';
  }

  formatMod(value: number): string {
    return value >= 0 ? `+${value}` : `${value}`;
  }
}
