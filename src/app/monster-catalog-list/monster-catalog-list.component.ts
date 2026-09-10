import { Component, inject, OnInit, signal, computed, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { MonsterCatalogService } from '../services/monster-catalog.service';
import { MonsterCatalogEntry } from '../models/monster-catalog.interface';

const PAGE_SIZE = 12;

@Component({
  selector: 'app-monster-catalog-list',
  standalone: true,
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

  monsters = signal<MonsterCatalogEntry[]>([]);
  error = signal(false);
  page = signal(1);
  totalCount = signal(0);
  pageSize = PAGE_SIZE;

  totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize) || 1);
  hasPrev = computed(() => this.page() > 1);
  hasNext = computed(() => this.page() < this.totalPages());

  deleteTarget = signal<MonsterCatalogEntry | null>(null);
  deleting = signal(false);
  deleteError = signal<string | null>(null);

  ngOnInit() {
    this.loadPage();
  }

  loadPage() {
    this.error.set(false);
    this.monsterCatalogService.getCatalog(this.page(), this.pageSize).subscribe({
      next: res => {
        this.monsters.set(res.MonsterCatalogPagedList);
        this.totalCount.set(res.total_count);
      },
      error: () => this.error.set(true),
    });
  }

  prevPage() {
    if (this.hasPrev()) {
      this.page.update(p => p - 1);
      this.loadPage();
    }
  }

  nextPage() {
    if (this.hasNext()) {
      this.page.update(p => p + 1);
      this.loadPage();
    }
  }

  monsterName(monster: MonsterCatalogEntry): string {
    return monster.custom_name ?? monster.data_snapshot.name;
  }

  catalogNew() {
    this.router.navigate(['/monster-catalog/new']);
  }

  openDetail(monster: MonsterCatalogEntry) {
    this.router.navigate(['/monster-catalog', monster.id_monster_catalog]);
  }

  goBack() {
    this.router.navigate(['/']);
  }

  requestDelete(monster: MonsterCatalogEntry, event: Event) {
    event.stopPropagation();
    this.deleteError.set(null);
    this.deleteTarget.set(monster);
  }

  cancelDelete() {
    if (this.deleting()) return;
    this.deleteTarget.set(null);
  }

  confirmDelete() {
    const target = this.deleteTarget();
    if (!target || this.deleting()) return;
    this.deleting.set(true);
    this.deleteError.set(null);
    this.monsterCatalogService.deleteCatalogEntry(target.id_monster_catalog).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteTarget.set(null);
        if (this.monsters().length === 1 && this.hasPrev()) {
          this.page.update(p => p - 1);
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
