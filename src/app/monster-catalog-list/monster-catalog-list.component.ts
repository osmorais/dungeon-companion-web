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
import { finalize } from 'rxjs';
import { SkeletonRowsComponent } from '../skeleton/skeleton-rows.component';
import { GameCardComponent } from '../game-card/game-card.component';
import { GameCardData, GameCardState } from '../game-card/game-card.model';
import { Router, RouterLink } from '@angular/router';
import { MonsterCatalogService } from '../services/monster-catalog.service';
import { MonsterCatalogEntry } from '../models/monster-catalog.interface';
import { catalogMonsterName, challengeRatingText, isHighThreat } from '../services/monster-format';
import { monsterToCard } from '../game-card/monster-card';

const PAGE_SIZE = 12;

@Component({
  selector: 'app-monster-catalog-list',
  standalone: true,
  imports: [SkeletonRowsComponent, RouterLink, GameCardComponent],
  templateUrl: './monster-catalog-list.component.html',
  styleUrls: ['./monster-catalog-list.component.scss'],
})
export class MonsterCatalogListComponent implements OnInit {
  private router = inject(Router);
  private monsterCatalogService = inject(MonsterCatalogService);

  crText = challengeRatingText;

  /** Miniatura padrão pra monstros catalogados sem image_url. */
  readonly DEFAULT_MONSTER_IMAGE = 'assets/monster.png';

  isMobile = signal(typeof window !== 'undefined' && window.innerWidth < 768);

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 768);
  }

  monsters = signal<MonsterCatalogEntry[]>([]);
  error = signal(false);
  /** Buscando a página — mostra skeleton em vez de "nenhum encontrado". */
  loading = signal(true);
  page = signal(1);
  totalCount = signal(0);
  pageSize = PAGE_SIZE;

  totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize) || 1);
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
    this.loadPage();
  }

  loadPage() {
    this.error.set(false);
    this.loading.set(true);
    this.monsterCatalogService
      .getCatalog(this.page(), this.pageSize)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          this.monsters.set(res.MonsterCatalogPagedList);
          this.totalCount.set(res.total_count);
        },
        error: () => this.error.set(true),
      });
  }

  prevPage() {
    if (this.hasPrev()) {
      this.page.update((p) => p - 1);
      this.loadPage();
    }
  }

  nextPage() {
    if (this.hasNext()) {
      this.page.update((p) => p + 1);
      this.loadPage();
    }
  }

  readonly monsterName = catalogMonsterName;

  /** Carta igual à de revelação de monstro em combate (game-card, variant 'monster': moldura e
   *  medalhão do próprio monstro) — só que com o ND no medalhão (lá é "?", monstro desconhecido;
   *  aqui já é catalogado) e um resumo no lugar da descrição (não há texto de lore por entrada do
   *  bestiário). No tema sombrio o medalhão vira o emblema do monstro (sem número, de propósito —
   *  ver --monster-card-badge no styles.scss); o ND continua no resumo. */
  toCard(monster: MonsterCatalogEntry): GameCardData {
    const snapshot = monster.data_snapshot;
    // A mesma carta da revelação (monsterToCard: faixa tipo · tamanho, moldura do monstro), com o
    // ND no medalhão e o resumo no pergaminho.
    return {
      ...monsterToCard({
        name: this.monsterName(monster),
        imageUrl: monster.image_url,
        monsterType: snapshot.type,
        size: snapshot.size,
        lore: this.summary(monster),
      }),
      badge: this.crText(snapshot.challenge_rating),
    };
  }

  private summary(monster: MonsterCatalogEntry): string {
    const s = monster.data_snapshot;
    const meta = [s.size, s.type].filter((p): p is string => !!p?.trim()).join(' ');
    const alignment = s.alignment ? `, ${s.alignment}` : '';
    return `${meta}${alignment}.\nCA ${monster.ac} · PV ${monster.hp_max} · ND ${this.crText(s.challenge_rating)}.`;
  }

  /** ND 5+ é ameaça de verdade: destaque dourado no card (mesmo corte de monster-stat-block). */
  cardState(monster: MonsterCatalogEntry): GameCardState {
    return isHighThreat(monster.data_snapshot.challenge_rating) ? 'threat' : null;
  }

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
        if (this.monsters().length === 1 && this.hasPrev()) {
          this.page.update((p) => p - 1);
        }
        this.loadPage();
      },
      error: () => {
        this.deleting.set(false);
        this.deleteError.set('Não foi possível remover o monstro. Tente novamente.');
      },
    });
  }
}
