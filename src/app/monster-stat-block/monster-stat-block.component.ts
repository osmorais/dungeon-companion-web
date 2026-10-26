import { Component, Input } from '@angular/core';
import { MonsterStatBlock } from '../models/monster-catalog.interface';
import { challengeRatingText, isHighThreat, monsterSpeedText } from '../services/monster-format';

/**
 * Ficha de monstro (nome, CA/PV/deslocamento, atributos, habilidades, ações) — mesma marcação em
 * monster-catalog-detail e monster-catalog-create (mobile e desktop), antes copiada 4 vezes.
 * `nameOverride`/`originalName`/`hpOverride` cobrem o que cada tela tem de próprio (nome
 * customizado e PV já catalogado): sem eles, o componente usa os dados crus do bestiário.
 */
@Component({
  selector: 'app-monster-stat-block',
  standalone: true,
  templateUrl: './monster-stat-block.component.html',
  styleUrls: ['./monster-stat-block.component.scss'],
})
export class MonsterStatBlockComponent {
  @Input({ required: true }) detail!: MonsterStatBlock;
  @Input() nameOverride: string | null = null;
  @Input() originalName: string | null = null;
  @Input() hpOverride: number | null = null;

  crText = challengeRatingText;

  get displayName(): string {
    return this.nameOverride ?? this.detail.name;
  }

  get hp(): number {
    return this.hpOverride ?? this.detail.hit_points;
  }

  get speed(): string {
    return monsterSpeedText(this.detail.speed);
  }

  /** Mesmo corte de "ameaça" usado no card da lista: nome em dourado aqui também. */
  get isThreat(): boolean {
    return isHighThreat(this.detail.challenge_rating);
  }

  acValue(): number | null {
    return this.detail.armor_class?.[0]?.value ?? null;
  }
}
