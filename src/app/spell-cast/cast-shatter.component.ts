import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  signal,
} from '@angular/core';

/** Espera o carimbo ERROU assentar antes de trincar. */
export const SHATTER_DELAY_MS = 700;
/** Trincas se espalhando pelo painel. */
export const SHATTER_CRACK_MS = 380;
/** Cacos voando até sumir. */
export const SHATTER_FLY_MS = 1000;

/** Cacos (triângulos cobrindo o painel inteiro, em %) e pra onde voam (px, graus, atraso ms). */
export const SHARDS: { poly: string; dx: number; dy: number; r: number; delay: number }[] = [
  { poly: '0% 0%, 28.1% 0%, 35.1% 40.3%', dx: -44, dy: 73, r: 105, delay: 11 },
  { poly: '0% 0%, 35.1% 40.3%, 0% 44.8%', dx: -71, dy: 131, r: 25, delay: 36 },
  { poly: '0% 44.8%, 35.1% 40.3%, 0% 100%', dx: -127, dy: 191, r: -67, delay: 13 },
  { poly: '35.1% 40.3%, 33.5% 100%, 0% 100%', dx: -42, dy: 229, r: -102, delay: 52 },
  { poly: '28.1% 0%, 65.1% 0%, 35.1% 40.3%', dx: -25, dy: 47, r: -140, delay: 5 },
  { poly: '65.1% 0%, 60.8% 48.1%, 35.1% 40.3%', dx: 18, dy: 11, r: -59, delay: 53 },
  { poly: '35.1% 40.3%, 60.8% 48.1%, 60.5% 100%', dx: 11, dy: 243, r: 64, delay: 22 },
  { poly: '35.1% 40.3%, 60.5% 100%, 33.5% 100%', dx: -21, dy: 268, r: 73, delay: 26 },
  { poly: '65.1% 0%, 100% 0%, 100% 46.8%', dx: 110, dy: 80, r: 82, delay: 14 },
  { poly: '65.1% 0%, 100% 46.8%, 60.8% 48.1%', dx: 88, dy: 117, r: 85, delay: 52 },
  { poly: '60.8% 48.1%, 100% 46.8%, 60.5% 100%', dx: 100, dy: 204, r: 30, delay: 52 },
  { poly: '100% 46.8%, 100% 100%, 60.5% 100%', dx: 68, dy: 265, r: -8, delay: 60 },
];

/** Trincas saindo do ponto de impacto (viewBox 0 0 100 100). */
const CRACKS = [
  'M50 45 L37.3 45.1 L35.1 40.3',
  'M50 45 L57.2 52.5 L60.8 48.1',
  'M50 45 L42.9 19.9 L28.1 0',
  'M50 45 L53.9 74.5 L60.5 100',
  'M50 45 L19.3 42.0 L0 40',
  'M50 45 L71.0 45.4 L100 55',
  'M50 45 L29.7 75.7 L20 100',
  'M50 45 L60.6 19.5 L80 0',
];

/**
 * Errou o ataque (1.7.2): o painel do lançamento trinca a partir do carimbo, estilhaça em cacos
 * que caem girando e some. Cobre o pai (que precisa de `position: relative`); `broke` avisa a hora
 * de esconder o conteúdo de verdade (os cacos montados cobrem tudo), `finished` quando acabou.
 */
@Component({
  selector: 'app-cast-shatter',
  standalone: true,
  templateUrl: './cast-shatter.component.html',
  styleUrls: ['./cast-shatter.component.scss'],
})
export class CastShatterComponent implements OnChanges, OnDestroy {
  @Input() active = false;
  @Output() broke = new EventEmitter<void>();
  @Output() finished = new EventEmitter<void>();

  readonly shards = SHARDS;
  readonly cracks = CRACKS;
  readonly flyMs = SHATTER_FLY_MS;
  phase = signal<'idle' | 'crack' | 'fly'>('idle');
  private timers: ReturnType<typeof setTimeout>[] = [];
  private started = false;

  ngOnChanges(): void {
    if (!this.active || this.started) return;
    this.started = true;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      // Sem animação: só some depois do carimbo.
      this.later(SHATTER_DELAY_MS, () => {
        this.broke.emit();
        this.finished.emit();
      });
      return;
    }
    this.later(SHATTER_DELAY_MS, () => this.phase.set('crack'));
    this.later(SHATTER_DELAY_MS + SHATTER_CRACK_MS, () => {
      this.phase.set('fly');
      this.broke.emit();
    });
    this.later(SHATTER_DELAY_MS + SHATTER_CRACK_MS + SHATTER_FLY_MS + 120, () =>
      this.finished.emit(),
    );
  }

  ngOnDestroy(): void {
    this.timers.forEach(clearTimeout);
  }

  private later(ms: number, fn: () => void): void {
    this.timers.push(setTimeout(fn, ms));
  }
}
