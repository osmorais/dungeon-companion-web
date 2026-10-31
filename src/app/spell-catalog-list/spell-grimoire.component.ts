import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CardViewerComponent } from '../game-card/card-viewer.component';
import { GameCardComponent } from '../game-card/game-card.component';
import { spellToCard } from '../game-card/spell-card';
import { SpellCatalogEntry } from '../models/spell-catalog.interface';
import { SpellCatalogService } from '../services/spell-catalog.service';
import { SpellFiltersComponent } from '../spell-filters/spell-filters.component';
import {
  EMPTY_SPELL_FILTERS,
  SpellFilters,
  filterSpells,
  spellSchoolOptions,
} from '../spell-filters/spell-filters';

const PAGE_SIZE = 20;

/**
 * Grimório com todas as magias do catálogo, em tela cheia (Quadro do Mestre, 1.6.6): os mesmos
 * filtros do Grimório de Magias (1.16.0, app-spell-filters) numa coluna à esquerda, cartas em grade
 * com paginação, e a carta em tela cheia ao tocar. Carrega o catálogo inteiro e filtra no
 * navegador. Fecha pelo "◀ VOLTAR", pelo fundo ou com Esc. Camada 190 (acima das gavetas, abaixo
 * do modal de rolagem).
 */
@Component({
  selector: 'app-spell-grimoire',
  standalone: true,
  imports: [GameCardComponent, CardViewerComponent, SpellFiltersComponent],
  templateUrl: './spell-grimoire.component.html',
  styleUrls: ['./spell-grimoire.component.scss'],
})
export class SpellGrimoireComponent implements OnInit {
  private spellCatalogService = inject(SpellCatalogService);

  @Input() title = 'GRIMÓRIO';
  @Input() backLabel = 'VOLTAR';
  @Output() closed = new EventEmitter<void>();

  isMobile = signal(typeof window !== 'undefined' && window.innerWidth < 768);

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 768);
  }

  allSpells = signal<SpellCatalogEntry[]>([]);
  loading = signal(true);
  error = signal(false);

  readonly filters = signal<SpellFilters>(EMPTY_SPELL_FILTERS);
  readonly schools = computed(() => spellSchoolOptions(this.allSpells()));
  readonly filteredSpells = computed(() => filterSpells(this.allSpells(), this.filters()));

  page = signal(1);
  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredSpells().length / PAGE_SIZE)));
  cards = computed(() =>
    this.filteredSpells()
      .slice((this.page() - 1) * PAGE_SIZE, this.page() * PAGE_SIZE)
      .map((spell) => ({ spell, card: spellToCard(spell) })),
  );

  selectedSpell = signal<SpellCatalogEntry | null>(null);
  readonly spellToCard = spellToCard;

  /** A carta em tela cheia acabou de fechar com Esc: o mesmo Esc não fecha o grimório. */
  private viewerJustClosed = false;

  ngOnInit(): void {
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
  patchFilters(patch: Partial<SpellFilters>): void {
    this.filters.update((f) => ({ ...f, ...patch }));
    this.page.set(1);
  }

  clearFilters(): void {
    this.patchFilters({ ...EMPTY_SPELL_FILTERS, sort: this.filters().sort });
  }

  goTo(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.page.set(page);
  }

  openCard(spell: SpellCatalogEntry): void {
    this.selectedSpell.set(spell);
  }

  closeCard(): void {
    this.selectedSpell.set(null);
    this.viewerJustClosed = true;
    setTimeout(() => (this.viewerJustClosed = false));
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.selectedSpell() || this.viewerJustClosed) return;
    this.closed.emit();
  }
}
