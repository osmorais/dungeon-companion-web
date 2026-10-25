import { Component, Input, signal } from '@angular/core';
import { CardViewerComponent } from '../game-card/card-viewer.component';
import { GameCardComponent } from '../game-card/game-card.component';
import { GameCardData } from '../game-card/game-card.model';
import { monsterToCard } from '../game-card/monster-card';
import { RevealedMonster } from '../models/game-session.interface';

/**
 * Monstro revelado em destaque no painel de combate (1.11.0): a carta dele, a mesma do aviso de
 * revelação. Tocar abre a carta em tela cheia, com a descrição.
 */
@Component({
  selector: 'app-monster-spotlight-card',
  standalone: true,
  imports: [GameCardComponent, CardViewerComponent],
  template: `
    <button
      type="button"
      class="msc-card"
      [title]="'Ver a carta de ' + card.title"
      (click)="open.set(true)"
    >
      <app-game-card [card]="card" size="mini" />
    </button>
    @if (open()) {
      <app-card-viewer [card]="card" (closed)="open.set(false)" />
    }
  `,
  styles: `
    :host {
      display: flex;
      justify-content: center;
    }

    .msc-card {
      display: block;
      width: min(100%, 220px);
      padding: 0;
      border: none;
      background: none;
      cursor: var(--cp);
      transition: transform 0.15s steps(3);
    }

    .msc-card:hover,
    .msc-card:focus-visible {
      transform: translateY(-3px);
    }
  `,
})
export class MonsterSpotlightCardComponent {
  @Input({ required: true }) set monster(value: RevealedMonster) {
    this.card = monsterToCard({
      name: value.name,
      imageUrl: value.image_url,
      monsterType: value.monster_type,
      size: value.size,
      lore: value.lore,
    });
  }

  card!: GameCardData;
  readonly open = signal(false);
}
