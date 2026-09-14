import { Component, inject, OnInit, OnDestroy, signal, computed, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SpellCatalogService } from '../services/spell-catalog.service';
import { SpellCatalogEntry } from '../models/spell-catalog.interface';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;

@Component({
  selector: 'app-spell-catalog-list',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './spell-catalog-list.component.html',
  styleUrls: ['./spell-catalog-list.component.scss'],
})
export class SpellCatalogListComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private spellCatalogService = inject(SpellCatalogService);
  private searchDebounceHandle: ReturnType<typeof setTimeout> | null = null;

  isMobile = signal(typeof window !== 'undefined' && window.innerWidth < 768);

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 768);
  }

  spells = signal<SpellCatalogEntry[]>([]);
  loading = signal(false);
  error = signal(false);
  page = signal(1);
  totalCount = signal(0);
  pageSize = PAGE_SIZE;
  searchTerm = signal('');

  totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize) || 1);
  hasPrev = computed(() => this.page() > 1);
  hasNext = computed(() => this.page() < this.totalPages());

  selectedSpell = signal<SpellCatalogEntry | null>(null);

  ngOnInit() {
    this.loadPage();
  }

  ngOnDestroy() {
    if (this.searchDebounceHandle) clearTimeout(this.searchDebounceHandle);
  }

  loadPage() {
    this.loading.set(true);
    this.error.set(false);
    this.spellCatalogService.getCatalog(this.page(), this.pageSize, this.searchTerm() || null).subscribe({
      next: res => {
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

  onSearchChange(value: string) {
    this.searchTerm.set(value);
    if (this.searchDebounceHandle) clearTimeout(this.searchDebounceHandle);
    this.searchDebounceHandle = setTimeout(() => {
      this.page.set(1);
      this.loadPage();
    }, SEARCH_DEBOUNCE_MS);
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

  circleName(spellLevel: number): string {
    return spellLevel === 0 ? 'TRUQUE' : `${spellLevel}º CÍRCULO`;
  }

  openDetail(spell: SpellCatalogEntry) {
    this.selectedSpell.set(spell);
  }

  closeDetail() {
    this.selectedSpell.set(null);
  }

  components(spell: SpellCatalogEntry): string {
    const parts: string[] = [];
    if (spell.is_verbal) parts.push('V');
    if (spell.is_somatic) parts.push('S');
    if (spell.is_material) parts.push('M');
    return parts.join(', ') || '—';
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
