import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router } from '@angular/router';
import { AvatarDisplayComponent } from '../avatar-display/avatar-display.component';
import { RankingService } from '../services/ranking.service';
import { RankingCategory } from '../models/ranking.interface';

/** Ranking global (1.7.0): os maiores feitos de cada categoria, de todas as mesas. */
@Component({
  selector: 'app-ranking',
  standalone: true,
  imports: [AvatarDisplayComponent, NgTemplateOutlet],
  templateUrl: './ranking.component.html',
  styleUrls: ['./ranking.component.scss'],
})
export class RankingComponent implements OnInit {
  private router = inject(Router);
  private rankingService = inject(RankingService);

  isMobile = signal(typeof window !== 'undefined' && window.innerWidth < 768);

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 768);
  }

  categories = signal<RankingCategory[]>([]);
  loading = signal(true);
  error = signal(false);
  activeKey = signal<string | null>(null);

  active = computed(() => {
    const list = this.categories();
    return list.find((c) => c.key === this.activeKey()) ?? list[0] ?? null;
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(false);
    this.rankingService.getRanking().subscribe({
      next: (res) => {
        this.categories.set(res.categories);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  selectCategory(key: string) {
    this.activeKey.set(key);
  }

  formatValue(value: number): string {
    return Number.isInteger(value)
      ? value.toLocaleString('pt-BR')
      : value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
