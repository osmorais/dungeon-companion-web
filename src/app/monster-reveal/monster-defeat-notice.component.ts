import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, signal } from '@angular/core';
import { GameCardComponent } from '../game-card/game-card.component';
import { GameCardData } from '../game-card/game-card.model';
import { MonsterRevealInfo, monsterToCard } from '../game-card/monster-card';
import { ModalBurstComponent } from '../modal-burst/modal-burst.component';
import { SHARDS } from '../spell-cast/cast-shatter.component';

/** A carta assenta na mesa antes de começar a rachar. */
export const DEFEAT_CRACK_AT_MS = 450;
/** Momento da explosão (a carta treme e racha em vermelho até aqui). */
export const DEFEAT_BOOM_AT_MS = 1600;
/** Pedaços da carta voando até sumir. */
export const DEFEAT_FLY_MS = 1200;

/** Trincas em brasa saindo do centro da carta (viewBox 0 0 100 100). */
const CRACKS = [
  'M50 50 L38 41 L28 22 L22 0',
  'M50 50 L64 43 L77 24 L84 0',
  'M50 50 L33 55 L14 62 L0 70',
  'M50 50 L68 57 L86 66 L100 64',
  'M50 50 L46 70 L38 86 L33 100',
  'M50 50 L57 72 L66 100',
];

/** Os mesmos cacos do "errou" (cast-shatter), mas voando pra fora a partir do centro. */
const PIECES = SHARDS.map((s, i) => {
  const pts = s.poly.split(',').map((p) =>
    p
      .trim()
      .split(/\s+/)
      .map((v) => parseFloat(v)),
  );
  const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length - 50;
  const cy = pts.reduce((a, p) => a + p[1], 0) / pts.length - 50;
  const len = Math.hypot(cx, cy) || 1;
  const dist = 190 + (i % 4) * 45;
  return {
    poly: s.poly,
    dx: Math.round((cx / len) * dist),
    dy: Math.round((cy / len) * dist + 60), // a gravidade puxa pra baixo no fim
    r: s.r * 3,
    delay: s.delay / 2,
  };
});

/** Brasas da explosão: ângulo e distância fixos (o mesmo desenho pra toda a mesa). */
const EMBERS = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * Math.PI * 2 + (i % 3) * 0.2;
  const dist = 120 + (i % 5) * 38;
  return {
    dx: Math.round(Math.cos(angle) * dist),
    dy: Math.round(Math.sin(angle) * dist),
    size: 4 + (i % 3) * 2,
    delay: (i % 4) * 40,
  };
});

/**
 * Aviso de monstro derrotado (1.11.0): a carta do monstro aparece na mesa, treme, racha em brasa
 * e explode em pedaços, com clarão e brasas; depois o nome e FOI DERROTADO!. Quem decide quando
 * some é a sessão; aqui só a barra de tempo. Fecha pelo ✕ ou tocando fora.
 */
@Component({
  selector: 'app-monster-defeat-notice',
  standalone: true,
  imports: [GameCardComponent, ModalBurstComponent],
  templateUrl: './monster-defeat-notice.component.html',
  styleUrls: ['./monster-defeat-notice.component.scss'],
})
export class MonsterDefeatNoticeComponent implements OnInit, OnDestroy {
  @Input({ required: true }) set info(value: MonsterRevealInfo) {
    this.name = value.name;
    this.card = monsterToCard(value);
  }
  /** Duração da barra de tempo (o mesmo tempo que a sessão espera pra fechar). */
  @Input() durationMs = 0;
  @Output() closed = new EventEmitter<void>();

  name = '';
  card!: GameCardData;
  readonly pieces = PIECES;
  readonly embers = EMBERS;
  readonly cracks = CRACKS;
  readonly flyMs = DEFEAT_FLY_MS;
  /** intact → cracking (treme e racha) → boom (pedaços voando); `still` sem animação. */
  readonly phase = signal<'intact' | 'cracking' | 'boom' | 'still'>('intact');
  private timers: ReturnType<typeof setTimeout>[] = [];

  ngOnInit(): void {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      this.phase.set('still');
      return;
    }
    this.timers.push(setTimeout(() => this.phase.set('cracking'), DEFEAT_CRACK_AT_MS));
    this.timers.push(setTimeout(() => this.phase.set('boom'), DEFEAT_BOOM_AT_MS));
  }

  ngOnDestroy(): void {
    this.timers.forEach(clearTimeout);
  }
}
