import {
  availabilityToggle,
  avatarInitial,
  discoverAction,
  FRIENDS_TABS,
  isFriendsTab,
  presenceLine,
  shortDate,
  totalPages,
} from './friends-page';

describe('friends-page', () => {
  it('inicial do nome no lugar do avatar', () => {
    expect(avatarInitial('gorak')).toBe('G');
    expect(avatarInitial('  aldric')).toBe('A');
    expect(avatarInitial('')).toBe('?');
    expect(avatarInitial(null)).toBe('?');
  });

  it('data curta dd/mm/aaaa; inválida ou vazia vira texto vazio', () => {
    expect(shortDate('2026-11-03T12:00:00')).toBe('03/11/2026');
    expect(shortDate('não é data')).toBe('');
    expect(shortDate(null)).toBe('');
  });

  it('ação do jogador encontrado conforme a relação', () => {
    expect(discoverAction('none')).toEqual({ label: 'ADICIONAR', disabled: false });
    expect(discoverAction('request_sent')).toEqual({ label: 'CANCELAR PEDIDO', disabled: false });
    expect(discoverAction('request_received')).toEqual({
      label: 'ACEITAR PEDIDO',
      disabled: false,
    });
    expect(discoverAction('blocked')).toEqual({ label: 'DESBLOQUEAR', disabled: false });
    expect(discoverAction('friend').disabled).toBe(true);
  });

  it('páginas: pelo menos 1', () => {
    expect(totalPages(0, 12)).toBe(1);
    expect(totalPages(12, 12)).toBe(1);
    expect(totalPages(13, 12)).toBe(2);
  });

  it('abas na ordem da tela', () => {
    expect(FRIENDS_TABS.map((t) => t.key)).toEqual([
      'all',
      'online',
      'requests',
      'discover',
      'blocked',
    ]);
    expect(isFriendsTab('online')).toBe(true);
    expect(isFriendsTab('x')).toBe(false);
  });

  it('linha de presença: status, quer jogar e última atividade', () => {
    expect(
      presenceLine({ presence: 'online', availability: 'available', last_seen_at: null }),
    ).toBe('ONLINE · QUER JOGAR');
    expect(
      presenceLine({ presence: 'busy', availability: 'not_available', last_seen_at: null }),
    ).toBe('OCUPADO');
    expect(
      presenceLine({
        presence: 'offline',
        availability: null,
        last_seen_at: '2026-11-02T12:00:00',
      }),
    ).toBe('OFFLINE · VISTO EM 02/11/2026');
    expect(presenceLine({ presence: 'offline', availability: null, last_seen_at: null })).toBe(
      'OFFLINE',
    );
  });

  it('alternar disponibilidade', () => {
    expect(availabilityToggle('available')).toBe('not_available');
    expect(availabilityToggle('not_available')).toBe('available');
  });
});
