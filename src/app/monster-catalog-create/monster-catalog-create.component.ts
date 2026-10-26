import { Component, inject, OnInit, signal, computed, HostListener } from '@angular/core';
import { SkeletonRowsComponent } from '../skeleton/skeleton-rows.component';
import { MonsterStatBlockComponent } from '../monster-stat-block/monster-stat-block.component';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MonsterCatalogService } from '../services/monster-catalog.service';
import { BestiaryMonsterSummary, MonsterStatBlock } from '../models/monster-catalog.interface';
import { challengeRatingText, normalizeSearch } from '../services/monster-format';

@Component({
  selector: 'app-monster-catalog-create',
  standalone: true,
  imports: [FormsModule, SkeletonRowsComponent, MonsterStatBlockComponent],
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
  searchText = signal('');

  filteredMonsters = computed(() => {
    const term = normalizeSearch(this.searchText());
    const all = this.allMonsters();
    if (!term) return all;
    return all.filter((m) => normalizeSearch(m.name).includes(term));
  });

  selectedSlug = signal<string | null>(null);
  loadingDetail = signal(false);
  detailError = signal(false);
  selectedDetail = signal<MonsterStatBlock | null>(null);
  customName = signal('');

  cataloging = signal(false);
  catalogError = signal<string | null>(null);

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

  selectMonster(monster: BestiaryMonsterSummary) {
    this.selectedSlug.set(monster.index);
    this.selectedDetail.set(null);
    this.detailError.set(false);
    this.customName.set('');
    this.catalogError.set(null);
    this.loadingDetail.set(true);
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

  crText = challengeRatingText;

  confirmCatalog() {
    const slug = this.selectedSlug();
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
    this.router.navigate(['/monster-catalog']);
  }
}
