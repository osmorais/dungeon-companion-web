import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { GameSessionService } from '../services/game-session.service';
import { GameSessionSummary } from '../models/game-session.interface';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-session-list',
  standalone: true,
  imports: [],
  templateUrl: './session-list.component.html',
  styleUrls: ['./session-list.component.scss'],
})
export class SessionListComponent implements OnInit {
  private router = inject(Router);
  private gameSessionService = inject(GameSessionService);

  isMobile = signal(typeof window !== 'undefined' && window.innerWidth < 768);
  sessions = signal<GameSessionSummary[]>([]);
  error = signal(false);
  page = signal(1);
  totalCount = signal(0);
  pageSize = PAGE_SIZE;

  totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize) || 1);
  hasPrev = computed(() => this.page() > 1);
  hasNext = computed(() => this.page() < this.totalPages());

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 768);
  }

  ngOnInit() {
    this.loadPage();
  }

  loadPage() {
    this.error.set(false);
    this.gameSessionService.getSessions(this.page(), this.pageSize).subscribe({
      next: res => {
        this.sessions.set(res.GameSessionPagedList);
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

  openSession(id: string) {
    this.router.navigate(['/session', id]);
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
