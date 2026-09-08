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
        // 'websocket' primeiro, sem upgrade a partir de polling: em produção (Render) o
        // upgrade de uma conexão polling pra WS falha porque a nova conexão TCP do upgrade
        // pode cair numa instância diferente da que abriu a sessão original (sem sticky
        // session), e o servidor rejeita o `sid` por não reconhecê-lo. Conectar direto via
        // WS evita esse caminho por completo; 'polling' fica só como fallback caso WS falhe
        // de verdade (ex: proxy corporativo bloqueando).
        transports: ['websocket', 'polling'],
        upgrade: false,
      });
      socket.on('session:event', (event: SessionEvent) => subscriber.next(event));
      // Reconexão automática do socket.io-client cobre quedas transitórias; o polling/safety-net
      // do painel cobre o resto (mensagens perdidas durante a reconexão).
      return () => socket.disconnect();
    });
  }
}
