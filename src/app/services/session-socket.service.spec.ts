import { TestBed } from '@angular/core/testing';
import { Socket } from 'socket.io-client';
import { SessionSocketService } from './session-socket.service';

describe('SessionSocketService', () => {
  it('conexão própria (forceNew) e sessionId no auth: não pega carona na conexão do /social', () => {
    const fakeSocket = { on: vi.fn(), disconnect: vi.fn() };
    const createSocket = vi.fn((_url: string, _opts: unknown) => fakeSocket as unknown as Socket);
    const service = TestBed.inject(SessionSocketService);
    service.createSocket = createSocket as unknown as SessionSocketService['createSocket'];

    const sub = service.connect('gs-1').subscribe();
    const opts = createSocket.mock.calls[0][1] as unknown as {
      forceNew: boolean;
      auth: { sessionId: string };
      query: { sessionId: string };
    };
    expect(opts.forceNew).toBe(true);
    expect(opts.auth.sessionId).toBe('gs-1');
    expect(opts.query.sessionId).toBe('gs-1');

    sub.unsubscribe();
    expect(fakeSocket.disconnect).toHaveBeenCalled();
  });
});
