import {
  Component,
  ElementRef,
  inject,
  OnInit,
  signal,
  computed,
  effect,
  viewChild,
  HostListener,
} from '@angular/core';
import { Observable, finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { SkeletonRowsComponent } from '../skeleton/skeleton-rows.component';
import { GameCardComponent } from '../game-card/game-card.component';
import { Router, RouterLink } from '@angular/router';
import { MonsterCatalogService } from '../services/monster-catalog.service';
import { MonsterCatalogEntry } from '../models/monster-catalog.interface';
import { catalogMonsterName } from '../services/monster-format';
import { catalogMonsterCard, catalogMonsterCardState } from '../game-card/monster-card';
import { MonsterFiltersComponent } from '../monster-filters/monster-filters.component';
import {
  EMPTY_MONSTER_FILTERS,
  FilterableMonster,
  MonsterFilters,
  MonsterSort,
  filterMonsters,
  monsterFilterOptions,
} from '../monster-filters/monster-filters';

/** Cartas por página (como na tela de catalogar). */
const PAGE_SIZE = 8;
/** Teto de itens por página da api (`MAX_PAGE_SIZE`): o bestiário inteiro vem em lotes desse tamanho. */
const FETCH_SIZE = 50;

/** Monstro do bestiário com o que os filtros olham (o nome que o mestre deu e o original). */
type CatalogItem = FilterableMonster & { entry: MonsterCatalogEntry };

function toItem(entry: MonsterCatalogEntry): CatalogItem {
  const s = entry.data_snapshot;
  return {
    entry,
    name: catalogMonsterName(entry),
    altName: entry.custom_name ? s.name : null,
    challenge_rating: s.challenge_rating,
    type: s.type,
    size: s.size,
    legendary: !!s.legendary_actions?.length,
    flies: !!s.speed?.['voo'],
  };
}

@Component({
  selector: 'app-monster-catalog-list',
  standalone: true,
  imports: [SkeletonRowsComponent, RouterLink, GameCardComponent, MonsterFiltersComponent],
  templateUrl: './monster-catalog-list.component.html',
  styleUrls: ['./monster-catalog-list.component.scss'],
})
export class MonsterCatalogListComponent implements OnInit {
  private router = inject(Router);
  private monsterCatalogService = inject(MonsterCatalogService);

  /** Miniatura padrão pra monstros catalogados sem image_url. */
  readonly DEFAULT_MONSTER_IMAGE = 'assets/monster.png';

  isMobile = signal(typeof window !== 'undefined' && window.innerWidth < 768);

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 768);
  }

  /** O bestiário inteiro do mestre (filtros e páginas são feitos aqui, 1.14.0). */
  monsters = signal<MonsterCatalogEntry[]>([]);
  error = signal(false);
  /** Buscando o bestiário — mostra skeleton em vez de "nenhum encontrado". */
  loading = signal(true);
  page = signal(1);
  pageSize = PAGE_SIZE;
  totalCount = computed(() => this.monsters().length);

  readonly sortOptions: { value: MonsterSort; label: string }[] = [
    { value: 'recent', label: 'MAIS RECENTES' },
    { value: 'name', label: 'NOME' },
    { value: 'cr', label: 'ND (MENOR PRIMEIRO)' },
  ];
  readonly filters = signal<MonsterFilters>({ ...EMPTY_MONSTER_FILTERS, sort: 'recent' });
  private readonly items = computed(() => this.monsters().map(toItem));
  readonly filterOptions = computed(() => monsterFilterOptions(this.items()));
  readonly filteredMonsters = computed(() =>
    filterMonsters(this.items(), this.filters()).map((i) => i.entry),
  );
  readonly pageMonsters = computed(() =>
    this.filteredMonsters().slice((this.page() - 1) * PAGE_SIZE, this.page() * PAGE_SIZE),
  );

  totalPages = computed(() => Math.ceil(this.filteredMonsters().length / this.pageSize) || 1);
  hasPrev = computed(() => this.page() > 1);
  hasNext = computed(() => this.page() < this.totalPages());

  deleteTarget = signal<MonsterCatalogEntry | null>(null);
  deleting = signal(false);
  deleteError = signal<string | null>(null);

  private deleteModal = viewChild<ElementRef<HTMLElement>>('deleteModal');
  private newButton = viewChild<ElementRef<HTMLButtonElement>>('newButton');
  /** Quem abriu a confirmação (o ✕ da carta): o foco volta pra ele ao fechar. */
  private deleteOpener: HTMLElement | null = null;

  constructor() {
    // Abriu o modal: foco vai pro quadro (role="dialog"), senão leitor de tela não percebe a troca.
    effect(() => {
      if (this.deleteTarget()) {
        queueMicrotask(() => this.deleteModal()?.nativeElement.focus());
      }
    });
  }

  ngOnInit() {
    this.loadAll();
  }

  /** Busca o bestiário inteiro (primeiro lote e, se passar do teto da api, o resto junto). */
  loadAll() {
    this.error.set(false);
    this.loading.set(true);
    this.fetchAll()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (all) => {
          this.monsters.set(all);
          // Removeu o último da última página: volta uma.
          this.page.update((p) => Math.min(p, this.totalPages()));
        },
        error: () => this.error.set(true),
      });
  }

  private fetchAll(): Observable<MonsterCatalogEntry[]> {
    return this.monsterCatalogService.getCatalog(1, FETCH_SIZE).pipe(
      switchMap((first) => {
        const pages = Math.ceil(first.total_count / FETCH_SIZE);
        if (pages <= 1) return of(first.MonsterCatalogPagedList);
        const rest = Array.from({ length: pages - 1 }, (_, i) =>
          this.monsterCatalogService.getCatalog(i + 2, FETCH_SIZE),
        );
        return forkJoin(rest).pipe(
          map((more) => [
            ...first.MonsterCatalogPagedList,
            ...more.flatMap((r) => r.MonsterCatalogPagedList),
          ]),
        );
      }),
    );
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
    if (this.hasPrev()) this.page.update((p) => p - 1);
  }

  nextPage() {
    if (this.hasNext()) this.page.update((p) => p + 1);
  }

  readonly monsterName = catalogMonsterName;

  // Carta e destaque compartilhados com o detalhe (game-card/monster-card.ts).
  readonly toCard = catalogMonsterCard;
  readonly cardState = catalogMonsterCardState;

  catalogNew() {
    this.router.navigate(['/monster-catalog/new']);
  }

  goBack() {
    this.router.navigate(['/']);
  }

  requestDelete(monster: MonsterCatalogEntry) {
    this.deleteOpener =
      typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
    this.deleteError.set(null);
    this.deleteTarget.set(monster);
  }

  cancelDelete() {
    if (this.deleting()) return;
    this.closeDeleteModal();
  }

  /** Fecha a confirmação e devolve o foco pra quem abriu (ou, se a carta sumiu, pro "+ CATALOGAR"). */
  private closeDeleteModal() {
    this.deleteTarget.set(null);
    const opener = this.deleteOpener;
    this.deleteOpener = null;
    queueMicrotask(() => {
      if (opener?.isConnected) opener.focus();
      else this.newButton()?.nativeElement.focus();
    });
  }

  /**
   * Com a confirmação aberta (aria-modal): Esc fecha de onde estiver o foco, e o Tab circula só
   * entre os botões dela, sem escapar pras cartas e pela paginação por trás.
   */
  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent) {
    if (!this.deleteTarget()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelDelete();
      return;
    }
    if (event.key !== 'Tab') return;
    const modal = this.deleteModal()?.nativeElement;
    if (!modal) return;
    const focusables = Array.from(
      modal.querySelectorAll<HTMLElement>('button:not([disabled]), [href]'),
    );
    if (!focusables.length) {
      event.preventDefault();
      modal.focus();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (!active || !modal.contains(active) || active === modal) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  confirmDelete() {
    const target = this.deleteTarget();
    if (!target || this.deleting()) return;
    this.deleting.set(true);
    this.deleteError.set(null);
    this.monsterCatalogService.deleteCatalogEntry(target.id_monster_catalog).subscribe({
      next: () => {
        this.deleting.set(false);
        this.closeDeleteModal();
        this.loadAll();
      },
      error: () => {
        this.deleting.set(false);
        this.deleteError.set('Não foi possível remover o monstro. Tente novamente.');
      },
    });
  }
}
