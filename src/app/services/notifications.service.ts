import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { SKIP_LOADING_OVERLAY } from '../loading-overlay/loading.interceptor';
import { AppNotification, PagedList } from '../models/friend.interface';

/** Notificações do usuário logado (1.18.0). `unread` é o contador do sino no topo. */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;
  /** Tudo aqui roda em segundo plano (sino): sem o overlay de carregamento. */
  private silent = { context: new HttpContext().set(SKIP_LOADING_OVERLAY, true) };

  readonly unread = signal(0);

  refreshUnread(): void {
    this.http
      .get<{ count: number }>(`${this.baseUrl}/api/notifications/unread-count`, this.silent)
      .subscribe({ next: (res) => this.unread.set(res.count), error: () => undefined });
  }

  list(page: number, pageSize: number): Observable<PagedList<AppNotification>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PagedList<AppNotification>>(`${this.baseUrl}/api/notifications`, {
      params,
      ...this.silent,
    });
  }

  markRead(id: string): Observable<void> {
    return this.http
      .patch<void>(`${this.baseUrl}/api/notifications/${id}/read`, {}, this.silent)
      .pipe(tap(() => this.unread.update((n) => Math.max(0, n - 1))));
  }

  markAllRead(): Observable<{ updated: number }> {
    return this.http
      .post<{ updated: number }>(`${this.baseUrl}/api/notifications/read-all`, {}, this.silent)
      .pipe(tap(() => this.unread.set(0)));
  }
}
