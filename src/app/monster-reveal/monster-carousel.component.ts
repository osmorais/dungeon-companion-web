import { Component, computed, input, linkedSignal, output, signal } from '@angular/core';
import { CardViewerComponent } from '../game-card/card-viewer.component';
import { GameCardComponent } from '../game-card/game-card.component';
import { GameCardData } from '../game-card/game-card.model';
import { monsterToCard } from '../game-card/monster-card';
import { RevealedMonster } from '../models/game-session.interface';

/**
 * Monstros revelados no painel de combate (1.13.0): um carrossel com a carta de cada um. Mostra o
 * monstro em destaque (`focusId` — a sessão troca pro monstro da vez quando o turno é dele); as
 * setas e os pontos passam pelos outros até a próxima troca. Tocar na carta abre a tela cheia,
 * com a descrição.
 */
@Component({
  selector: 'app-monster-carousel',
  standalone: true,
  imports: [GameCardComponent, CardViewerComponent],
  templateUrl: './monster-carousel.component.html',
  styleUrls: ['./monster-carousel.component.scss'],
})
export class MonsterCarouselComponent {
  readonly monsters = input.required<RevealedMonster[]>();
  /** Monstro em destaque (o da vez); muda o carrossel pra ele quando muda. */
  readonly focusId = input<string | null>(null);
  /** Mestre: tocar na carta abre a ficha do monstro na gaveta (`select`), não a carta inteira. */
  readonly ownerMode = input(false);
  readonly select = output<string>();

  readonly cards = computed<{ id: string; card: GameCardData }[]>(() =>
    this.monsters().map((m) => ({
      id: m.id_monster_session,
      card: monsterToCard({
        name: m.name,
        imageUrl: m.image_url,
        monsterType: m.monster_type,
        size: m.size,
        lore: m.lore,
      }),
    })),
  );

  /** Carta mostrada: volta pro destaque sempre que ele (ou a lista) muda. */
  readonly index = linkedSignal(() => {
    const i = this.cards().findIndex((c) => c.id === this.focusId());
    return i < 0 ? 0 : i;
  });
  readonly current = computed(() => this.cards()[this.index()] ?? null);
  /** Direção da última troca (anima a entrada pela esquerda ou pela direita). */
  readonly direction = signal<'next' | 'prev'>('next');
  readonly open = signal(false);

  onCardClick(id: string): void {
    if (this.ownerMode()) this.select.emit(id);
    else this.open.set(true);
  }

  prev(): void {
    this.go(this.index() - 1, 'prev');
  }

  next(): void {
    this.go(this.index() + 1, 'next');
  }

  goTo(i: number): void {
    this.go(i, i < this.index() ? 'prev' : 'next');
  }

  private go(i: number, direction: 'next' | 'prev'): void {
    const n = this.cards().length;
    if (n < 2) return;
    this.direction.set(direction);
    this.index.set((i + n) % n);
  }
}
