import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CreateGameSessionPayload,
  GameSessionDetail,
  GameSessionPagedList,
  GameSessionResponse,
  JoinSessionPayload,
  PlayerSession,
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

  getSessionById(id: string): Observable<GameSessionDetail> {
    return this.http.get<GameSessionDetail>(`${this.baseUrl}/api/game-session/${id}`);
  }

  getSessions(page: number, pageSize: number): Observable<GameSessionPagedList> {
    return this.http.get<GameSessionPagedList>(`${this.baseUrl}/api/game-session`, {
      params: { page: page.toString(), pageSize: pageSize.toString() },
    });
  }

  getMySessions(page: number, pageSize: number): Observable<GameSessionPagedList> {
    return this.http.get<GameSessionPagedList>(`${this.baseUrl}/api/game-session/my-sessions`, {
      params: { page: page.toString(), pageSize: pageSize.toString() },
    });
  }

  joinSession(payload: JoinSessionPayload): Observable<PlayerSession> {
    return this.http.post<PlayerSession>(`${this.baseUrl}/api/game-session/player`, payload);
  }

  deletePlayer(idPlayerSession: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/game-session/player/${idPlayerSession}`);
  }
}
