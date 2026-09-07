import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MonsterCatalogService } from '../services/monster-catalog.service';
import { MonsterCatalogEntry, SrdMonsterDetail } from '../models/monster-catalog.interface';

@Component({
  selector: 'app-monster-catalog-detail',
  standalone: true,
  templateUrl: './monster-catalog-detail.component.html',
  styleUrls: ['./monster-catalog-detail.component.scss'],
})
export class MonsterCatalogDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private monsterCatalogService = inject(MonsterCatalogService);

  isMobile = signal(typeof window !== 'undefined' && window.innerWidth < 768);

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 768);
  }

  loading = signal(true);
  error = signal(false);
  monster = signal<MonsterCatalogEntry | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set(true);
      this.loading.set(false);
      return;
    }
    this.monsterCatalogService.getCatalogEntry(id).subscribe({
      next: monster => {
        this.monster.set(monster);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  monsterName(monster: MonsterCatalogEntry): string {
    return monster.custom_name ?? monster.data_snapshot.name;
  }

  acValue(detail: SrdMonsterDetail): number | null {
    return detail.armor_class?.[0]?.value ?? null;
  }

  speedText(detail: SrdMonsterDetail): string {
    return Object.entries(detail.speed ?? {})
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  }

  goBack() {
    this.router.navigate(['/monster-catalog']);
  }
}
