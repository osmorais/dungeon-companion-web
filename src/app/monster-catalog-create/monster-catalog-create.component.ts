import { Component, inject, OnInit, signal, computed, HostListener } from '@angular/core';
import { SkeletonRowsComponent } from '../skeleton/skeleton-rows.component';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MonsterCatalogService } from '../services/monster-catalog.service';
import { BestiaryMonsterSummary, MonsterStatBlock } from '../models/monster-catalog.interface';
import { GameCardComponent } from '../game-card/game-card.component';
import { bestiaryMonsterCard, monsterCardState } from '../game-card/monster-card';
import { MonsterSheetComponent } from '../monster-sheet/monster-sheet.component';
import { MonsterFiltersComponent } from '../monster-filters/monster-filters.component';
import {
  EMPTY_MONSTER_FILTERS,
  MonsterFilters,
  MonsterSort,
  filterMonsters,
  monsterFilterOptions,
} from '../monster-filters/monster-filters';

/** Cartas por página (o bestiário tem 428 monstros). */
const PAGE_SIZE = 8;

/**
 * Catalogar monstro (1.13.4): o bestiário do livro em cartas (as mesmas do bestiário do mestre),
 * com busca e filtros (ND, tipo, tamanho, lendários, voadores); a carta abre a ficha com a cara do
 * detalhe (app-monster-sheet), com o nome customizado e o CATALOGAR embaixo da carta.
 */
@Component({
  selector: 'app-monster-catalog-create',
  standalone: true,
  imports: [
    FormsModule,
    SkeletonRowsComponent,
    GameCardComponent,
    MonsterSheetComponent,
    MonsterFiltersComponent,
  ],
  templateUrl: './monster-catalog-create.component.html',
  styleUrls: ['./monster-catalog-create.component.scss'],
})
export class MonsterCatalogCreateComponent implements OnInit {
  private router = inject(Router);
  private monsterCatalogService = inject(MonsterCatalogService);

  isMobile = signal(typeof window !== 'undefined' && window.innerWidth < 768);

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 768);
  }

  loadingList = signal(true);
  listError = signal(false);
  allMonsters = signal<BestiaryMonsterSummary[]>([]);

  readonly sortOptions: { value: MonsterSort; label: string }[] = [
    { value: 'name', label: 'NOME' },
    { value: 'cr', label: 'ND (MENOR PRIMEIRO)' },
  ];
  readonly filters = signal<MonsterFilters>(EMPTY_MONSTER_FILTERS);
  readonly filterOptions = computed(() => monsterFilterOptions(this.allMonsters()));
  readonly filteredMonsters = computed(() => filterMonsters(this.allMonsters(), this.filters()));

  readonly page = signal(1);
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredMonsters().length / PAGE_SIZE)),
  );
  readonly visibleCards = computed(() =>
    this.filteredMonsters()
      .slice((this.page() - 1) * PAGE_SIZE, this.page() * PAGE_SIZE)
      .map((m) => ({
        monster: m,
        card: bestiaryMonsterCard(m),
        state: monsterCardState(m.challenge_rating),
      })),
  );

  selected = signal<BestiaryMonsterSummary | null>(null);
  loadingDetail = signal(false);
  detailError = signal(false);
  selectedDetail = signal<MonsterStatBlock | null>(null);
  customName = signal('');
  /** A carta da ficha já mostra o nome customizado enquanto o mestre digita. */
  readonly previewCard = computed(() => {
    const m = this.selected();
    return m ? bestiaryMonsterCard(m, this.customName()) : null;
  });

  readonly cardState = (m: BestiaryMonsterSummary) => monsterCardState(m.challenge_rating);

  cataloging = signal(false);
  catalogError = signal<string | null>(null);

  /** Rolagem da lista ao abrir uma carta, pra voltar no mesmo ponto. */
  private listScroll = 0;

  ngOnInit() {
    this.monsterCatalogService.listBestiary().subscribe({
      next: (monsters) => {
        this.allMonsters.set(monsters);
        this.loadingList.set(false);
      },
      error: () => {
        this.listError.set(true);
        this.loadingList.set(false);
      },
    });
  }

  /** Muda filtros; a lista volta pra primeira página. */
  patchFilters(patch: Partial<MonsterFilters>) {
    this.filters.update((f) => ({ ...f, ...patch }));
    this.page.set(1);
  }

  clearFilters() {
    this.patchFilters({ ...EMPTY_MONSTER_FILTERS, sort: this.filters().sort });
  }

  prevPage() {
    if (this.page() > 1) this.page.update((p) => p - 1);
  }

  nextPage() {
    if (this.page() < this.totalPages()) this.page.update((p) => p + 1);
  }

  selectMonster(monster: BestiaryMonsterSummary) {
    this.listScroll = typeof window !== 'undefined' ? window.scrollY : 0;
    this.selected.set(monster);
    this.selectedDetail.set(null);
    this.detailError.set(false);
    this.customName.set('');
    this.catalogError.set(null);
    this.loadingDetail.set(true);
    this.scrollTo(0);
    this.monsterCatalogService.getBestiaryMonster(monster.index).subscribe({
      next: (detail) => {
        this.selectedDetail.set(detail);
        this.loadingDetail.set(false);
      },
      error: () => {
        this.detailError.set(true);
        this.loadingDetail.set(false);
      },
    });
  }

  /** Volta pras cartas, com os filtros e a rolagem de antes. */
  closePreview() {
    this.selected.set(null);
    this.selectedDetail.set(null);
    const y = this.listScroll;
    setTimeout(() => this.scrollTo(y));
  }

  confirmCatalog() {
    const slug = this.selected()?.index;
    if (!slug || this.cataloging()) return;
    this.cataloging.set(true);
    this.catalogError.set(null);
    const name = this.customName().trim();
    this.monsterCatalogService.catalogMonster(slug, name || null).subscribe({
      next: () => this.router.navigate(['/monster-catalog']),
      error: () => {
        this.cataloging.set(false);
        this.catalogError.set('Não foi possível catalogar esse monstro. Tente novamente.');
      },
    });
  }

  goBack() {
    if (this.selected()) {
      this.closePreview();
      return;
    }
    this.router.navigate(['/monster-catalog']);
  }

  private scrollTo(top: number) {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      try {
        window.scrollTo({ top });
      } catch {
        // jsdom (testes) não implementa a rolagem
      }
    }
  }
}
