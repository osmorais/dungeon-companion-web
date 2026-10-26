import { Component, Input } from '@angular/core';
import { AvatarDisplayComponent } from '../avatar-display/avatar-display.component';
import { HpBarComponent } from '../hp-bar/hp-bar.component';
import { XpBarComponent } from '../xp-bar/xp-bar.component';
import { AvatarPreset } from '../models/avatar-preset.interface';
import { GameCardComponent } from '../game-card/game-card.component';
import { GameCardData } from '../game-card/game-card.model';

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
    /** XP atual e o do próximo nível (barra de XP; sem eles a barra fica só com o nível). */
    xp?: number;
    nextLevelXp?: number | null;
  } | null;
  /** Monstro com carta (1.13.0): no lugar do card, a carta dele (a mesma da revelação). */
  monsterCard?: GameCardData | null;
}

/**
 * Card inteiro do personagem, como na sessão (moldura .framed-card do styles.scss): foto de
 * fundo, avatar, jogador, nome, classe/raça, nível e PV. Monstro: só imagem e nome.
 * Usado nos avisos em tela cheia (troca de vez, lançamento de magia).
 */
@Component({
  selector: 'app-character-card',
  standalone: true,
  imports: [AvatarDisplayComponent, HpBarComponent, XpBarComponent, GameCardComponent],
  templateUrl: './character-card.component.html',
  styleUrls: ['./character-card.component.scss'],
})
export class CharacterCardComponent {
  @Input({ required: true }) card!: CharacterCardData;
}
