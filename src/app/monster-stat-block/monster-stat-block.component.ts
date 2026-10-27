import { Component, computed, input } from '@angular/core';
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
  readonly detail = input.required<MonsterStatBlock>();
  readonly nameOverride = input<string | null>(null);
  readonly originalName = input<string | null>(null);
  readonly hpOverride = input<number | null>(null);

  crText = challengeRatingText;

  // computed: recalcula só quando a entrada muda (getters rodavam a cada detecção de mudanças).
  readonly displayName = computed(() => this.nameOverride() ?? this.detail().name);
  readonly hp = computed(() => this.hpOverride() ?? this.detail().hit_points);
  readonly speed = computed(() => monsterSpeedText(this.detail().speed));
  /** Mesmo corte de "ameaça" usado no card da lista: nome em dourado aqui também. */
  readonly isThreat = computed(() => isHighThreat(this.detail().challenge_rating));
  readonly acValue = computed(() => this.detail().armor_class?.[0]?.value ?? null);
}
