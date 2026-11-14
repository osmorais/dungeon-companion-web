import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { finalize } from 'rxjs';
import { SkeletonRowsComponent } from '../skeleton/skeleton-rows.component';
import { ActivatedRoute, Router } from '@angular/router';
import { GameSessionService } from '../services/game-session.service';
import { GameSessionSummary } from '../models/game-session.interface';

const PAGE_SIZE = 10;

export type SessionListRole = 'dm' | 'player';

/** Textos de cada versão da tela: Sessões criadas (mestre) e Minhas aventuras (jogador). */
export const SESSION_LIST_COPY: Record<
  SessionListRole,
  {
    title: string;
    subtitle: string;
    windowTitle: string;
    action: string;
    icon: string;
    error: string;
    emptyTitle: string;
    emptyDesc: string;
    emptyAction: string;
    actionRoute: string;
  }
> = {
  dm: {
    title: 'SESSÕES CRIADAS',
    subtitle: 'Suas campanhas esperam o próximo capítulo.',
    windowTitle: 'SUAS MESAS',
    action: '+ NOVA SESSÃO',
    icon: 'assets/icons/book-open.png',
    error: 'NÃO FOI POSSÍVEL CARREGAR AS SESSÕES',
    emptyTitle: 'NENHUMA SESSÃO AINDA',
    emptyDesc: 'Toda campanha começa com uma mesa vazia. Crie a primeira e chame seu grupo.',
    emptyAction: '+ CRIAR PRIMEIRA SESSÃO',
    actionRoute: '/session-create',
  },
  player: {
    title: 'MINHAS AVENTURAS',
    subtitle: 'As mesas em que você joga. Continue de onde parou.',
    windowTitle: 'SUAS JORNADAS',
    action: '+ ENTRAR EM UMA AVENTURA',
    icon: 'assets/icons/compass.png',
    error: 'NÃO FOI POSSÍVEL CARREGAR AS AVENTURAS',
    emptyTitle: 'VOCÊ AINDA NÃO ENTROU EM NENHUMA AVENTURA',
    emptyDesc: 'Peça o código ao mestre da mesa.',
    emptyAction: '+ ENTRAR EM UMA AVENTURA',
    actionRoute: '/session-join',
  },
};

/**
 * Sessões criadas pelo mestre (`/sessions`, 1.25.2) e Minhas aventuras do jogador (`/my-sessions`,
 * 1.25.3): a mesma tela, com o papel vindo de `data.role` da rota (sem dado: mestre).
 */
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
  readonly role: SessionListRole =
    inject(ActivatedRoute).snapshot?.data?.['role'] === 'player' ? 'player' : 'dm';
  readonly copy = computed(() => SESSION_LIST_COPY[this.role]);

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
      .getMySessions(this.page(), this.pageSize, this.role)
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

  /** + NOVA SESSÃO (mestre) ou + ENTRAR EM UMA AVENTURA (jogador). */
  primaryAction() {
    this.router.navigate([this.copy().actionRoute]);
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
