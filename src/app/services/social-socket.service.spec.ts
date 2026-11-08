import { TestBed } from '@angular/core/testing';
import { Socket } from 'socket.io-client';
import { PRESENCE_HEARTBEAT_MS, SocialSocketService } from './social-socket.service';

describe('SocialSocketService', () => {
  let service: SocialSocketService;
  let fakeSocket: {
    connected: boolean;
    on: ReturnType<typeof vi.fn>;
    emit: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  };
  let createSocket: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    fakeSocket = { connected: true, on: vi.fn(), emit: vi.fn(), disconnect: vi.fn() };
    createSocket = vi.fn(() => fakeSocket as unknown as Socket);
    service = TestBed.inject(SocialSocketService);
    service.createSocket = createSocket as unknown as SocialSocketService['createSocket'];
  });

  afterEach(() => vi.useRealTimers());

  it('uma conexão só no namespace /social, mesmo com vários usuários da conexão', () => {
    service.acquire();
    service.acquire();
    expect(createSocket).toHaveBeenCalledTimes(1);
    expect(createSocket.mock.calls[0][0]).toMatch(/\/social$/);
  });

  it('heartbeat periódico de presença', () => {
    service.acquire();
    vi.advanceTimersByTime(PRESENCE_HEARTBEAT_MS);
    expect(fakeSocket.emit).toHaveBeenCalledWith('presence:heartbeat');
    service.release();
  });

  it('heartbeat não sai com o socket caído', () => {
    service.acquire();
    fakeSocket.connected = false;
    vi.advanceTimersByTime(PRESENCE_HEARTBEAT_MS);
    expect(fakeSocket.emit).not.toHaveBeenCalled();
    service.release();
  });

  it('só desconecta quando o último solta', () => {
    service.acquire();
    service.acquire();
    service.release();
    expect(fakeSocket.disconnect).not.toHaveBeenCalled();
    service.release();
    expect(fakeSocket.disconnect).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(PRESENCE_HEARTBEAT_MS * 2);
    expect(fakeSocket.emit).not.toHaveBeenCalled();
  });

  it('soltar a mais não quebra', () => {
    service.release();
    expect(fakeSocket.disconnect).not.toHaveBeenCalled();
  });
});
