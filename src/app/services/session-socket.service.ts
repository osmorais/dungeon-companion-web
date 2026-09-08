import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { SessionEvent } from '../models/session-event.interface';

/** Só transporte: abre um socket por sessão e emite os eventos tipados recebidos. */
@Injectable({
  providedIn: 'root',
})
export class SessionSocketService {
  private baseUrl = environment.apiUrl;

  connect(sessionId: string): Observable<SessionEvent> {
    return new Observable<SessionEvent>((subscriber) => {
      const socket = io(this.baseUrl, {
        withCredentials: true,
        query: { sessionId },
      });
      socket.on('session:event', (event: SessionEvent) => subscriber.next(event));
      // Reconexão automática do socket.io-client cobre quedas transitórias; o polling/safety-net
      // do painel cobre o resto (mensagens perdidas durante a reconexão).
      return () => socket.disconnect();
    });
  }
}
