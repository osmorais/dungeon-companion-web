import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SKIP_LOADING_OVERLAY } from '../loading-overlay/loading.interceptor';
import {
  CreateGameSessionPayload,
  GameSessionDetail,
  GameSessionPagedList,
  GameSessionResponse,
  JoinSessionPayload,
  PlayerSession,
  RollLogEntry,
  RollLogPayload,
} from '../models/game-session.interface';

@Injectable({
  providedIn: 'root',
})
export class GameSessionService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  createSession(payload: CreateGameSessionPayload): Observable<GameSessionResponse> {
    return this.http.post<GameSessionResponse>(`${this.baseUrl}/api/game-session`, payload);
  }

  /** `silent` evita o overlay de carregamento em tela cheia — usado no polling em segundo plano. */
  getSessionById(id: string, silent = false): Observable<GameSessionDetail> {
    return this.http.get<GameSessionDetail>(`${this.baseUrl}/api/game-session/${id}`, {
      context: silent ? new HttpContext().set(SKIP_LOADING_OVERLAY, true) : undefined,
    });
  }

  getSessions(page: number, pageSize: number): Observable<GameSessionPagedList> {
    return this.http.get<GameSessionPagedList>(`${this.baseUrl}/api/game-session`, {
      params: { page: page.toString(), pageSize: pageSize.toString() },
    });
  }

  getMySessions(page: number, pageSize: number, role?: 'dm' | 'player'): Observable<GameSessionPagedList> {
    return this.http.get<GameSessionPagedList>(`${this.baseUrl}/api/game-session/my-sessions`, {
      params: {
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(role ? { role } : {}),
      },
    });
  }

  joinSession(payload: JoinSessionPayload): Observable<PlayerSession> {
    return this.http.post<PlayerSession>(`${this.baseUrl}/api/game-session/player`, payload);
  }

  deletePlayer(idPlayerSession: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/game-session/player/${idPlayerSession}`);
  }

  updatePlayerHp(idPlayerSession: string, currentHitPoints: number): Observable<void> {
    return this.http.patch<void>(
      `${this.baseUrl}/api/game-session/player/${idPlayerSession}/hp`,
      { current_hit_points: currentHitPoints },
    );
  }

  updateNpcHp(idNpcSession: string, currentHitPoints: number): Observable<void> {
    return this.http.patch<void>(
      `${this.baseUrl}/api/game-session/npc/${idNpcSession}/hp`,
      { current_hit_points: currentHitPoints },
    );
  }

  deleteNpc(idNpcSession: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/game-session/npc/${idNpcSession}`);
  }

  addNpcToSession(sessionId: string, idCharacter: number): Observable<{ id_npc_session: string; id_game_session: string; id_character: number }> {
    return this.http.post<{ id_npc_session: string; id_game_session: string; id_character: number }>(
      `${this.baseUrl}/api/game-session/${sessionId}/npc`,
      { id_character: idCharacter },
    );
  }

  postRoll(sessionId: string, payload: RollLogPayload): Observable<RollLogEntry> {
    return this.http.post<RollLogEntry>(`${this.baseUrl}/api/game-session/${sessionId}/roll`, payload);
  }
}
