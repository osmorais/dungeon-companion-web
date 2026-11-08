import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SKIP_LOADING_OVERLAY } from '../loading-overlay/loading.interceptor';
import { PagedList, SessionInviteView } from '../models/friend.interface';
import { PlayerSession } from '../models/game-session.interface';

/** Convites para mesa (1.18.0): o mestre convida amigos; o convidado aceita com um personagem. */
@Injectable({ providedIn: 'root' })
export class SessionInviteService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;
  private silent = { context: new HttpContext().set(SKIP_LOADING_OVERLAY, true) };

  list(
    direction: 'received' | 'sent',
    page: number,
    pageSize: number,
  ): Observable<PagedList<SessionInviteView>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PagedList<SessionInviteView>>(
      `${this.baseUrl}/api/session-invites/${direction}`,
      { params, ...this.silent },
    );
  }

  send(idGameSession: string, receiverId: string, message: string): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/api/session-invites`, {
      id_game_session: idGameSession,
      receiver_id: receiverId,
      message: message.trim() || null,
    });
  }

  accept(
    id: string,
    idCharacter: number,
  ): Observable<{ id_game_session: string; player: PlayerSession }> {
    return this.http.post<{ id_game_session: string; player: PlayerSession }>(
      `${this.baseUrl}/api/session-invites/${id}/accept`,
      { id_character: idCharacter },
    );
  }

  reject(id: string): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/api/session-invites/${id}/reject`, {});
  }

  cancel(id: string): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/api/session-invites/${id}`);
  }
}
