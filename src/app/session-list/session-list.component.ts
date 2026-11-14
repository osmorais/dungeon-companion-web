import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { finalize } from 'rxjs';
import { SkeletonRowsComponent } from '../skeleton/skeleton-rows.component';
import { Router } from '@angular/router';
import { GameSessionService } from '../services/game-session.service';
import { GameSessionSummary } from '../models/game-session.interface';

const PAGE_SIZE = 10;

/** Sessões criadas pelo mestre (`/sessions`) — visual da Home 1.19.x (1.19.2). */
@Component({
  selector: 'app-session-list',
  standalone: true,
  imports: [SkeletonRowsComponent, DatePipe],
  templateUrl: './session-list.component.html',
  styleUrls: ['./session-list.component.scss'],
})
export class SessionListComponent implements OnInit {
  private router = inject(Router);
  private gameSessionService = inject(GameSessionService);

  sessions = signal<GameSessionSummary[]>([]);
  error = signal(false);
  /** Buscando a página — mostra skeleton em vez de "nenhuma sessão". */
  loading = signal(true);
  page = signal(1);
  totalCount = signal(0);
  pageSize = PAGE_SIZE;

  totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize) || 1);
  hasPrev = computed(() => this.page() > 1);
  hasNext = computed(() => this.page() < this.totalPages());
  /** Faixa mostrada no rodapé ("MOSTRANDO 11–17 DE 17"). */
  rangeStart = computed(() => (this.sessions().length ? (this.page() - 1) * this.pageSize + 1 : 0));
  rangeEnd = computed(() => (this.page() - 1) * this.pageSize + this.sessions().length);

  ngOnInit() {
    this.loadPage();
  }

  loadPage() {
    this.error.set(false);
    this.loading.set(true);
    this.gameSessionService
      .getMySessions(this.page(), this.pageSize, 'dm')
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          this.sessions.set(res.GameSessionPagedList);
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

  openSession(id: string) {
    this.router.navigate(['/session', id]);
  }

  createSession() {
    this.router.navigate(['/session-create']);
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
