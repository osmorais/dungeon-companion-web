import { Component, Input } from '@angular/core';
import { AvatarDisplayComponent } from '../avatar-display/avatar-display.component';
import { AvatarPreset } from '../models/avatar-preset.interface';
import { hpColor, hpPercent } from '../session-panel/hp-display';

/** Quem aparece num card de personagem dos avisos (troca de vez, lançamento de magia): jogador,
 *  NPC ou monstro, já com o nome que a mesa vê. */
export interface CharacterCardData {
  name: string;
  /** Foto do personagem (fundo do card) ou imagem do monstro. */
  imageUrl: string | null;
  avatarPreset: AvatarPreset | null;
  /** Jogador/NPC: dados do card inteiro, como na sessão. Ausente/`null` = monstro (só imagem e
   *  nome — o jogador não vê o PV do monstro). */
  character?: {
    /** `null` pra NPC. */
    playerName: string | null;
    className: string;
    race: string;
    level: number;
    hp: { current: number; max: number; temp: number };
  } | null;
}

/**
 * Card inteiro do personagem, como na sessão (moldura .framed-card do styles.scss): foto de
 * fundo, avatar, jogador, nome, classe/raça, nível e PV. Monstro: só imagem e nome.
 * Usado nos avisos em tela cheia (troca de vez, lançamento de magia).
 */
@Component({
  selector: 'app-character-card',
  standalone: true,
  imports: [AvatarDisplayComponent],
  templateUrl: './character-card.component.html',
  styleUrls: ['./character-card.component.scss'],
})
export class CharacterCardComponent {
  @Input({ required: true }) card!: CharacterCardData;

  readonly hpPercent = hpPercent;
  readonly hpColor = hpColor;
}
