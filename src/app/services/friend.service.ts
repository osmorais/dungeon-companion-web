import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SKIP_LOADING_OVERLAY } from '../loading-overlay/loading.interceptor';
import {
  BlockedUser,
  Friend,
  FriendRequest,
  FriendRequestView,
  MyPresence,
  PagedList,
  PlayAvailability,
  ChosenPresenceStatus,
  PlayerSearchResult,
  SendFriendRequestResult,
} from '../models/friend.interface';

/** Amigos (1.18.0): lista, solicitações, busca de jogadores e bloqueios. */
@Injectable({ providedIn: 'root' })
export class FriendService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  /** Busca e filtro rodam enquanto a pessoa digita: sem o overlay de carregamento por cima. */
  private silent = { context: new HttpContext().set(SKIP_LOADING_OVERLAY, true) };

  /** `online`: só os amigos conectados agora (aba Online). */
  getFriends(page: number, pageSize: number, search = ''): Observable<PagedList<Friend>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (search.trim()) params = params.set('search', search.trim());
    return this.http.get<PagedList<Friend>>(`${this.baseUrl}/api/friends`, {
      params,
      ...this.silent,
    });
  }

  getMyPresence(): Observable<MyPresence> {
    return this.http.get<MyPresence>(`${this.baseUrl}/api/presence/me`, this.silent);
  }

  setMyPresence(update: {
    status?: ChosenPresenceStatus;
    availability?: PlayAvailability;
  }): Observable<MyPresence> {
    return this.http.put<MyPresence>(`${this.baseUrl}/api/presence/me`, update, this.silent);
  }

  removeFriend(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/friends/${userId}`);
  }

  getRequests(
    direction: 'received' | 'sent',
    page: number,
    pageSize: number,
  ): Observable<PagedList<FriendRequestView>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PagedList<FriendRequestView>>(
      `${this.baseUrl}/api/friend-requests/${direction}`,
      { params, ...this.silent },
    );
  }

  sendRequest(receiverId: string): Observable<SendFriendRequestResult> {
    return this.http.post<SendFriendRequestResult>(`${this.baseUrl}/api/friend-requests`, {
      receiver_id: receiverId,
    });
  }

  acceptRequest(id: string): Observable<FriendRequest> {
    return this.http.post<FriendRequest>(`${this.baseUrl}/api/friend-requests/${id}/accept`, {});
  }

  rejectRequest(id: string): Observable<FriendRequest> {
    return this.http.post<FriendRequest>(`${this.baseUrl}/api/friend-requests/${id}/reject`, {});
  }

  cancelRequest(id: string): Observable<FriendRequest> {
    return this.http.delete<FriendRequest>(`${this.baseUrl}/api/friend-requests/${id}`);
  }

  searchPlayers(
    q: string,
    page: number,
    pageSize: number,
  ): Observable<PagedList<PlayerSearchResult>> {
    const params = new HttpParams().set('q', q.trim()).set('page', page).set('pageSize', pageSize);
    return this.http.get<PagedList<PlayerSearchResult>>(`${this.baseUrl}/api/users/search`, {
      params,
      ...this.silent,
    });
  }

  getBlocked(page: number, pageSize: number): Observable<PagedList<BlockedUser>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PagedList<BlockedUser>>(`${this.baseUrl}/api/users/blocked`, {
      params,
      ...this.silent,
    });
  }

  block(userId: string): Observable<{ friendshipRemoved: boolean }> {
    return this.http.post<{ friendshipRemoved: boolean }>(
      `${this.baseUrl}/api/users/${userId}/block`,
      {},
    );
  }

  unblock(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/users/${userId}/block`);
  }
}
