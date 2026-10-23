import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  signal,
} from '@angular/core';

/** Duração da saída de vitória (corte/onda + faíscas + painel se recolhendo). */
export const TRIUMPH_MS = 1300;

/** Faíscas (posição inicial em % do painel, deslocamento em px, atraso em ms, tamanho em px). */
export const SPARKS: {
  x: number;
  y: number;
  dx: number;
  dy: number;
  delay: number;
  size: number;
}[] = [
  { x: 46, y: 63, dx: 59, dy: -136, delay: 132, size: 8 },
  { x: 24, y: 75, dx: -3, dy: -154, delay: 48, size: 6 },
  { x: 33, y: 40, dx: 43, dy: -163, delay: 11, size: 6 },
  { x: 89, y: 68, dx: 16, dy: -99, delay: 4, size: 8 },
  { x: 13, y: 37, dx: 53, dy: -152, delay: 202, size: 6 },
  { x: 45, y: 77, dx: 3, dy: -157, delay: 130, size: 4 },
  { x: 46, y: 49, dx: 70, dy: -199, delay: 218, size: 6 },
  { x: 34, y: 46, dx: -30, dy: -88, delay: 199, size: 6 },
  { x: 17, y: 50, dx: -61, dy: -82, delay: 178, size: 4 },
  { x: 26, y: 81, dx: -4, dy: -198, delay: 103, size: 4 },
  { x: 56, y: 45, dx: 24, dy: -120, delay: 81, size: 4 },
  { x: 89, y: 73, dx: -53, dy: -110, delay: 26, size: 4 },
  { x: 47, y: 59, dx: 25, dy: -103, delay: 132, size: 4 },
  { x: 43, y: 54, dx: -15, dy: -199, delay: 0, size: 8 },
  { x: 34, y: 79, dx: -41, dy: -127, delay: 222, size: 8 },
  { x: 16, y: 84, dx: -40, dy: -111, delay: 201, size: 6 },
  { x: 78, y: 54, dx: -60, dy: -105, delay: 166, size: 4 },
  { x: 59, y: 54, dx: -7, dy: -195, delay: 126, size: 8 },
];

/**
 * Concluiu o lançamento depois do dano ou da cura (1.7.2): um corte dourado atravessa o painel (na
 * cura, uma onda verde), faíscas sobem e o pai se recolhe sumindo (classe do pai). Cobre o pai
 * (`position: relative`); `finished` quando acabou.
 */
@Component({
  selector: 'app-cast-triumph',
  standalone: true,
  templateUrl: './cast-triumph.component.html',
  styleUrls: ['./cast-triumph.component.scss'],
})
export class CastTriumphComponent implements OnChanges, OnDestroy {
  @Input() active = false;
  @Input() kind: 'damage' | 'heal' = 'damage';
  @Output() finished = new EventEmitter<void>();

  readonly sparks = SPARKS;
  playing = signal(false);
  private timer: ReturnType<typeof setTimeout> | null = null;

  ngOnChanges(): void {
    if (!this.active || this.playing()) return;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.playing.set(true);
    this.timer = setTimeout(() => this.finished.emit(), reduced ? 0 : TRIUMPH_MS);
  }

  ngOnDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
  }
}
