import { Component, Input } from '@angular/core';
import { CharacterCardComponent } from '../character-card/character-card.component';
import { GameCardComponent } from '../game-card/game-card.component';
import { PixelDieComponent } from '../pixel-die/pixel-die.component';
import { PixelNumericDieComponent } from '../pixel-numeric-die/pixel-numeric-die.component';
import { CastStageView } from './spell-cast-stage.model';

/**
 * Palco do lançamento de magia: card do personagem + carta da magia (entra jogada e vira, como
 * uma carta de verdade) + as rolagens, que vão aparecendo conforme quem lança rola (ataque →
 * acertou/errou → dano). Só desenha; quem monta o `view` é o aviso da mesa ou o modal de rolagem.
 */
@Component({
  selector: 'app-spell-cast-stage',
  standalone: true,
  imports: [CharacterCardComponent, GameCardComponent, PixelDieComponent, PixelNumericDieComponent],
  templateUrl: './spell-cast-stage.component.html',
  styleUrls: ['./spell-cast-stage.component.scss'],
})
export class SpellCastStageComponent {
  @Input({ required: true }) view!: CastStageView;

  rollLabel(kind: 'attack' | 'damage' | 'heal'): string {
    return kind === 'attack' ? 'ATAQUE' : kind === 'heal' ? 'CURA' : 'DANO';
  }

  formatMod(value: number): string {
    return value >= 0 ? `+${value}` : `${value}`;
  }
}
