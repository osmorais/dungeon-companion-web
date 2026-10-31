import { Component, inject, OnInit, signal, computed, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { SpellCatalogService } from '../services/spell-catalog.service';
import { SpellCatalogEntry } from '../models/spell-catalog.interface';
import { GameCardComponent } from '../game-card/game-card.component';
import { CardViewerComponent } from '../game-card/card-viewer.component';
import { spellToCard } from '../game-card/spell-card';
import { SkeletonRowsComponent } from '../skeleton/skeleton-rows.component';
import { SpellFiltersComponent } from '../spell-filters/spell-filters.component';
import {
  EMPTY_SPELL_FILTERS,
  SpellFilters,
  filterSpells,
  spellSchoolOptions,
} from '../spell-filters/spell-filters';

/** Cartas por página (igual ao catalogar monstros). */
const PAGE_SIZE = 8;

/**
 * Grimório de magias, com a cara do catalogar monstros: busca e filtros (círculo, escola, classe,
 * concentração, ação bônus, reação) numa coluna à esquerda e as cartas em páginas de 8. Carrega o
 * catálogo inteiro e filtra no navegador; a carta abre em tela cheia.
 */
@Component({
  selector: 'app-spell-catalog-list',
  standalone: true,
  imports: [GameCardComponent, CardViewerComponent, SkeletonRowsComponent, SpellFiltersComponent],
  templateUrl: './spell-catalog-list.component.html',
  styleUrls: ['./spell-catalog-list.component.scss'],
})
export class SpellCatalogListComponent implements OnInit {
  private router = inject(Router);
  private spellCatalogService = inject(SpellCatalogService);

  isMobile = signal(typeof window !== 'undefined' && window.innerWidth < 768);

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 768);
  }

  loading = signal(true);
  error = signal(false);
  allSpells = signal<SpellCatalogEntry[]>([]);

  readonly filters = signal<SpellFilters>(EMPTY_SPELL_FILTERS);
  readonly schools = computed(() => spellSchoolOptions(this.allSpells()));
  readonly filteredSpells = computed(() => filterSpells(this.allSpells(), this.filters()));

  readonly page = signal(1);
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredSpells().length / PAGE_SIZE)),
  );
  readonly visibleCards = computed(() =>
    this.filteredSpells()
      .slice((this.page() - 1) * PAGE_SIZE, this.page() * PAGE_SIZE)
      .map((spell) => ({ spell, card: spellToCard(spell) })),
  );

  selectedSpell = signal<SpellCatalogEntry | null>(null);
  readonly spellToCard = spellToCard;

  ngOnInit() {
    this.spellCatalogService.getAll().subscribe({
      next: (spells) => {
        this.allSpells.set(spells);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  /** Muda filtros; a lista volta pra primeira página. */
  patchFilters(patch: Partial<SpellFilters>) {
    this.filters.update((f) => ({ ...f, ...patch }));
    this.page.set(1);
  }

  clearFilters() {
    this.patchFilters({ ...EMPTY_SPELL_FILTERS, sort: this.filters().sort });
  }

  prevPage() {
    if (this.page() > 1) this.page.update((p) => p - 1);
  }

  nextPage() {
    if (this.page() < this.totalPages()) this.page.update((p) => p + 1);
  }

  openDetail(spell: SpellCatalogEntry) {
    this.selectedSpell.set(spell);
  }

  closeDetail() {
    this.selectedSpell.set(null);
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
