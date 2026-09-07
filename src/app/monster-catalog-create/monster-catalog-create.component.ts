import { Component, inject, OnInit, signal, computed, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MonsterCatalogService } from '../services/monster-catalog.service';
import { SrdMonsterDetail, SrdMonsterSummary } from '../models/monster-catalog.interface';

@Component({
  selector: 'app-monster-catalog-create',
  standalone: true,
  imports: [FormsModule],
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
  allMonsters = signal<SrdMonsterSummary[]>([]);
  searchText = signal('');

  filteredMonsters = computed(() => {
    const term = this.searchText().trim().toLowerCase();
    const all = this.allMonsters();
    if (!term) return all;
    return all.filter(m => m.name.toLowerCase().includes(term));
  });

  selectedSlug = signal<string | null>(null);
  loadingDetail = signal(false);
  detailError = signal(false);
  selectedDetail = signal<SrdMonsterDetail | null>(null);
  customName = signal('');

  cataloging = signal(false);
  catalogError = signal<string | null>(null);

  ngOnInit() {
    this.monsterCatalogService.searchSrdMonsters().subscribe({
      next: monsters => {
        this.allMonsters.set(monsters);
        this.loadingList.set(false);
      },
      error: () => {
        this.listError.set(true);
        this.loadingList.set(false);
      },
    });
  }

  selectMonster(monster: SrdMonsterSummary) {
    this.selectedSlug.set(monster.index);
    this.selectedDetail.set(null);
    this.detailError.set(false);
    this.customName.set('');
    this.catalogError.set(null);
    this.loadingDetail.set(true);
    this.monsterCatalogService.getSrdMonster(monster.index).subscribe({
      next: detail => {
        this.selectedDetail.set(detail);
        this.loadingDetail.set(false);
      },
      error: () => {
        this.detailError.set(true);
        this.loadingDetail.set(false);
      },
    });
  }

  acValue(detail: SrdMonsterDetail): number | null {
    return detail.armor_class?.[0]?.value ?? null;
  }

  speedText(detail: SrdMonsterDetail): string {
    return Object.entries(detail.speed ?? {})
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  }

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
