import { Component, input } from '@angular/core';
import { GameCardComponent } from '../game-card/game-card.component';
import { GameCardData, GameCardState } from '../game-card/game-card.model';
import { MonsterStatBlock } from '../models/monster-catalog.interface';
import { MonsterAbilityKey } from '../models/game-session.interface';
import { MonsterActionsComponent } from '../monster-actions/monster-actions.component';
import { challengeRatingText, monsterSpeedText } from '../services/monster-format';

const ABILITY_FIELDS: { key: MonsterAbilityKey; label: string }[] = [
  { key: 'strength', label: 'FOR' },
  { key: 'dexterity', label: 'DES' },
  { key: 'constitution', label: 'CON' },
  { key: 'intelligence', label: 'INT' },
  { key: 'wisdom', label: 'SAB' },
  { key: 'charisma', label: 'CAR' },
];

/**
 * Ficha do monstro fora da mesa, só leitura (1.13.4): a cara da gaveta do monstro na sessão — os
 * números em destaque e as colunas MONSTRO | AÇÕES | TESTES, com a carta do monstro e as ações que
 * rolam em cartas (baralho que abre a mão). Usada no detail do bestiário e na tela de catalogar;
 * o que cada tela faz embaixo da carta (trocar imagem, catalogar) vem por conteúdo projetado.
 */
@Component({
  selector: 'app-monster-sheet',
  standalone: true,
  imports: [GameCardComponent, MonsterActionsComponent],
  templateUrl: './monster-sheet.component.html',
  // Colunas, destaque e linhas vêm da gaveta dos personagens (a mesma base da gaveta do monstro).
  styleUrls: [
    '../player-actions-modal/player-actions-modal.component.scss',
    './monster-sheet.component.scss',
  ],
})
export class MonsterSheetComponent {
  readonly block = input.required<MonsterStatBlock>();
  readonly card = input.required<GameCardData>();
  readonly cardState = input<GameCardState>(null);
  /** PV e CA do monstro (o catálogo guarda os seus; o livro tem os da ficha). */
  readonly hp = input.required<number>();
  readonly ac = input.required<number>();
  /** Imagem do monstro (arte das cartas das ações). */
  readonly imageUrl = input<string | null>(null);
  /** Desktop: a ficha cabe na tela (altura da janela) e cada coluna rola por dentro, com o rodapé
   *  sempre à vista (tela de catalogar). */
  readonly fit = input(false);

  readonly abilityFields = ABILITY_FIELDS;
  readonly crText = challengeRatingText;
  readonly speedText = monsterSpeedText;

  modifier(score: number): string {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  }
}
