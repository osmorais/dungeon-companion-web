import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { GameSessionService } from './game-session.service';
import { SessionSocketService } from './session-socket.service';
import { applySessionEvent } from './session-event.reducer';
import { GameSessionDetail } from '../models/game-session.interface';
import { SessionEvent } from '../models/session-event.interface';

/** Dono do signal de estado da sessão — compõe REST (refetch completo), socket (payload por evento) e o reducer. */
@Injectable({
  providedIn: 'root',
})
export class SessionStateService {
  private gameSessionService = inject(GameSessionService);
  private socketService = inject(SessionSocketService);

  readonly detail = signal<GameSessionDetail | null>(null);

  /** Refetch completo — usado no load inicial, no polling e na safety-net. Sempre SUBSTITUI o estado. */
  loadFull(sessionId: string): Observable<GameSessionDetail> {
    return this.gameSessionService
      .getSessionById(sessionId, true)
      .pipe(tap((d) => this.detail.set(d)));
  }

  connectRealtime(sessionId: string): Observable<SessionEvent> {
    return this.socketService.connect(sessionId);
  }

  /** Aplica uma mensagem tipada do socket — nunca faz I/O, só reduz o estado atual. */
  applyEvent(event: SessionEvent): void {
    this.detail.update((current) => (current ? applySessionEvent(current, event) : current));
  }

  /** Mutação otimista local do autor da ação (pós-REST, antes do eco do próprio socket). */
  patch(fn: (detail: GameSessionDetail) => GameSessionDetail): void {
    this.detail.update((current) => (current ? fn(current) : current));
  }
}
