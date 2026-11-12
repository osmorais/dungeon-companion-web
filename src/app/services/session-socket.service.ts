import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { SessionEvent } from '../models/session-event.interface';
import { AUTH_TOKEN_KEY } from './auth.service';

/** Só transporte: abre um socket por sessão e emite os eventos tipados recebidos. */
@Injectable({
  providedIn: 'root',
})
export class SessionSocketService {
  private baseUrl = environment.apiUrl;

  /** Abre o socket — substituível só nos testes. */
  createSocket: typeof io = io;

  connect(sessionId: string): Observable<SessionEvent> {
    return new Observable<SessionEvent>((subscriber) => {
      const socket = this.createSocket(this.baseUrl, {
        // `WebSocket` nativo não manda headers customizados, e o navegador bloqueia o cookie
        // `token` como cookie de terceiros (dungeon-companion-api é cross-site em relação ao
        // domínio do app) mesmo com SameSite=None — confirmado direto no DevTools (nenhum
        // `Cookie:` chega no handshake). Por isso o token vai explicitamente no payload de
        // auth do socket.io, que viaja dentro do próprio protocolo, não como cookie/header.
        // `sessionId` também no auth (vale por namespace): a query é da conexão inteira.
        auth: { token: localStorage.getItem(AUTH_TOKEN_KEY), sessionId },
        query: { sessionId },
        // Conexão própria: sem isso o socket.io reaproveita a conexão do socket social (/social,
        // aberto antes ao entrar no site) e a query com o `sessionId` se perde — o servidor
        // desconectava o socket da mesa e o mestre ficava só no polling (sem avisos, com atraso).
        forceNew: true,
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
