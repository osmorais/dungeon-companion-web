import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { SocialEvent } from '../models/friend.interface';
import { AUTH_TOKEN_KEY } from './auth.service';

/** Bem abaixo do TTL da presença na API (70 s): uma perda de heartbeat não derruba ninguém. */
export const PRESENCE_HEARTBEAT_MS = 25_000;

/**
 * Só transporte do tempo real social (amigos, notificações, presença): um socket no namespace
 * `/social` enquanto houver alguém usando (contagem de `acquire`/`release` — o sino do topo segura
 * a conexão enquanto o usuário está logado). Cada aba é uma conexão; o heartbeat mantém a
 * presença viva, e a reconexão automática do socket.io-client cobre quedas transitórias.
 * O REST continua sendo a fonte de verdade: os eventos só avisam o que recarregar.
 */
@Injectable({ providedIn: 'root' })
export class SocialSocketService {
  private socket: Socket | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private users = 0;
  private events$ = new Subject<SocialEvent>();
  private connected$ = new Subject<void>();

  readonly events: Observable<SocialEvent> = this.events$.asObservable();
  /** Emite a cada (re)conexão — quem mostra listas recarrega, pra cobrir o que perdeu no meio. */
  readonly reconnected: Observable<void> = this.connected$.asObservable();

  /** Abre o socket — substituível só nos testes. */
  createSocket: typeof io = io;

  acquire(): void {
    this.users++;
    if (this.socket) return;
    // Mesmo esquema do SessionSocketService: token no payload de auth (o cookie não chega no
    // handshake cross-site) e websocket direto, sem upgrade a partir de polling.
    const socket = this.createSocket(`${environment.apiUrl}/social`, {
      auth: { token: localStorage.getItem(AUTH_TOKEN_KEY) },
      transports: ['websocket', 'polling'],
      upgrade: false,
    });
    socket.on('social:event', (event: SocialEvent) => this.events$.next(event));
    socket.on('connect', () => this.connected$.next());
    this.heartbeat = setInterval(() => {
      if (socket.connected) socket.emit('presence:heartbeat');
    }, PRESENCE_HEARTBEAT_MS);
    this.socket = socket;
  }

  release(): void {
    this.users = Math.max(0, this.users - 1);
    if (this.users > 0 || !this.socket) return;
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
    this.socket.disconnect();
    this.socket = null;
  }
}
