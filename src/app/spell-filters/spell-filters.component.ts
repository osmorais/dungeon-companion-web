import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SPELL_ELEMENTS, SPELL_FUNCTIONS } from './spell-tags';
import {
  SPELL_CLASSES,
  SPELL_LEVELS,
  SPELL_RANGES,
  SpellFilters,
  SpellSort,
  activeSpellFilterCount,
} from './spell-filters';

/**
 * Painel de busca e filtros do grimório de magias em carta: nome, círculo, escola, classe,
 * função, elemento, alcance, concentração, ação bônus, reação e ordenação. Mesmo visual e
 * comportamento do painel dos monstros (app-monster-filters, cujo SCSS reaproveita): coluna à
 * esquerda no desktop, filtros recolhidos atrás de um botão no celular. Quem filtra é a tela: o painel só emite o que mudou.
 */
@Component({
  selector: 'app-spell-filters',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './spell-filters.component.html',
  styleUrls: ['../monster-filters/monster-filters.component.scss'],
})
export class SpellFiltersComponent {
  readonly filters = input.required<SpellFilters>();
  readonly schools = input<string[]>([]);
  /** Quantas magias sobraram com os filtros. */
  readonly total = input(0);
  readonly mobile = input(false);
  readonly patch = output<Partial<SpellFilters>>();
  readonly cleared = output<void>();

  readonly levels = SPELL_LEVELS;
  readonly classes = SPELL_CLASSES;
  readonly ranges = SPELL_RANGES;
  readonly elements = SPELL_ELEMENTS;
  readonly roles = SPELL_FUNCTIONS;
  readonly sortOptions: { value: SpellSort; label: string }[] = [
    { value: 'level', label: 'CÍRCULO' },
    { value: 'name', label: 'NOME' },
  ];
  /** Filtros abertos no celular (no desktop ficam sempre à mostra). */
  readonly open = signal(false);
  readonly active = computed(() => activeSpellFilterCount(this.filters()));

  /** O select devolve string; "" = todas as classes. */
  setClass(value: string | number) {
    this.patch.emit({ classId: value === '' || value === null ? null : Number(value) });
  }
}
