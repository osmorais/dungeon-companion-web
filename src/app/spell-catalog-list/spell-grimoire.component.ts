import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CardViewerComponent } from '../game-card/card-viewer.component';
import { GameCardComponent } from '../game-card/game-card.component';
import { spellToCard } from '../game-card/spell-card';
import { SpellCatalogEntry } from '../models/spell-catalog.interface';
import { SpellCatalogService } from '../services/spell-catalog.service';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Grimório com todas as magias do catálogo, em tela cheia (Quadro do Mestre, 1.6.6): busca pelo
 * nome, cartas em grade com paginação, e a carta em tela cheia ao tocar. Fecha pelo "◀ VOLTAR",
 * pelo fundo ou com Esc. Camada 190 (acima das gavetas, abaixo do modal de rolagem).
 */
@Component({
  selector: 'app-spell-grimoire',
  standalone: true,
  imports: [FormsModule, GameCardComponent, CardViewerComponent],
  templateUrl: './spell-grimoire.component.html',
  styleUrls: ['./spell-grimoire.component.scss'],
})
export class SpellGrimoireComponent implements OnInit, OnDestroy {
  private spellCatalogService = inject(SpellCatalogService);

  @Input() title = 'GRIMÓRIO';
  @Input() backLabel = 'VOLTAR';
  @Output() closed = new EventEmitter<void>();

  spells = signal<SpellCatalogEntry[]>([]);
  loading = signal(false);
  error = signal(false);
  page = signal(1);
  totalCount = signal(0);
  searchTerm = signal('');
  totalPages = computed(() => Math.ceil(this.totalCount() / PAGE_SIZE) || 1);
  cards = computed(() => this.spells().map((spell) => ({ spell, card: spellToCard(spell) })));

  selectedSpell = signal<SpellCatalogEntry | null>(null);
  readonly spellToCard = spellToCard;

  private searchHandle: ReturnType<typeof setTimeout> | null = null;
  /** A carta em tela cheia acabou de fechar com Esc: o mesmo Esc não fecha o grimório. */
  private viewerJustClosed = false;

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    if (this.searchHandle) clearTimeout(this.searchHandle);
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.spellCatalogService
      .getCatalog(this.page(), PAGE_SIZE, this.searchTerm().trim() || null)
      .subscribe({
        next: (res) => {
          this.spells.set(res.SpellCatalogPagedList);
          this.totalCount.set(res.total_count);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }

  onSearch(value: string): void {
    this.searchTerm.set(value);
    if (this.searchHandle) clearTimeout(this.searchHandle);
    this.searchHandle = setTimeout(() => {
      this.page.set(1);
      this.load();
    }, SEARCH_DEBOUNCE_MS);
  }

  goTo(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.page()) return;
    this.page.set(page);
    this.load();
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
