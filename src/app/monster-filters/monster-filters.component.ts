import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CR_TIERS, MonsterFilters, MonsterSort, activeFilterCount } from './monster-filters';

/**
 * Painel de busca e filtros das listas de monstros em carta (1.14.0: catalogar e bestiário):
 * nome, faixa de ND, tipo, tamanho, lendários, voadores e ordenação. No desktop fica numa coluna
 * à esquerda; no celular os filtros recolhem atrás de um botão (a busca fica sempre à mostra).
 * Quem filtra é a tela: o painel só emite o que mudou.
 */
@Component({
  selector: 'app-monster-filters',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './monster-filters.component.html',
  styleUrls: ['./monster-filters.component.scss'],
})
export class MonsterFiltersComponent {
  readonly filters = input.required<MonsterFilters>();
  readonly types = input<string[]>([]);
  readonly sizes = input<string[]>([]);
  /** Quantos monstros sobraram com os filtros. */
  readonly total = input(0);
  readonly sortOptions = input<{ value: MonsterSort; label: string }[]>([]);
  readonly mobile = input(false);
  readonly label = input('Buscar monstros');
  readonly patch = output<Partial<MonsterFilters>>();
  readonly cleared = output<void>();

  readonly crTiers = CR_TIERS;
  /** Filtros abertos no celular (no desktop ficam sempre à mostra). */
  readonly open = signal(false);
  readonly active = computed(() => activeFilterCount(this.filters()));

  setTier(tier: { min: number | null; max: number | null }) {
    this.patch.emit({ crMin: tier.min, crMax: tier.max });
  }

  isTier(tier: { min: number | null; max: number | null }): boolean {
    const f = this.filters();
    return f.crMin === tier.min && f.crMax === tier.max;
  }
}
