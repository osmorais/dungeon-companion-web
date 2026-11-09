import {
  availabilityToggle,
  discoverAction,
  presenceLine,
  shortDate,
  totalPages,
} from './friends-page';

describe('friends-page', () => {
  it('data curta dd/mm/aaaa; inválida ou vazia vira texto vazio', () => {
    expect(shortDate('2026-11-03T12:00:00')).toBe('03/11/2026');
    expect(shortDate('não é data')).toBe('');
    expect(shortDate(null)).toBe('');
  });

  it('ícone e dica da ação do jogador encontrado, conforme a relação', () => {
    expect(discoverAction('none')).toEqual({ icon: 'heart', label: 'Adicionar aos amigos' });
    expect(discoverAction('request_sent')).toEqual({ icon: null, label: 'Cancelar pedido' });
    expect(discoverAction('request_received')).toEqual({ icon: 'check', label: 'Aceitar pedido' });
    expect(discoverAction('blocked')).toEqual({ icon: 'padlock', label: 'Desbloquear' });
  });

  it('páginas: pelo menos 1', () => {
    expect(totalPages(0, 12)).toBe(1);
    expect(totalPages(12, 12)).toBe(1);
    expect(totalPages(13, 12)).toBe(2);
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
