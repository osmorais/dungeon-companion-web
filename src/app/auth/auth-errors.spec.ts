import { apiErrorMessage, newPasswordError, PASSWORD_MIN_LENGTH } from './auth-errors';

describe('auth-errors', () => {
  it('lê a mensagem no formato do LoopBack ({ error: { message } })', () => {
    const err = {
      status: 429,
      error: { error: { message: 'Muitas tentativas. Tente de novo em 3 minutos.' } },
    };
    expect(apiErrorMessage(err, 'x')).toBe('Muitas tentativas. Tente de novo em 3 minutos.');
  });

  it('aceita também { message } direto', () => {
    expect(apiErrorMessage({ error: { message: 'Credenciais inválidas' } }, 'x')).toBe(
      'Credenciais inválidas',
    );
  });

  it('cai no fallback sem mensagem utilizável', () => {
    expect(apiErrorMessage({ status: 0, error: new ProgressEvent('error') }, 'Falhou')).toBe(
      'Falhou',
    );
    expect(apiErrorMessage(undefined, 'Falhou')).toBe('Falhou');
    expect(apiErrorMessage({ error: { error: { message: '  ' } } }, 'Falhou')).toBe('Falhou');
  });

  it('senha nova precisa de 8 caracteres (mesmo mínimo do backend)', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
    expect(newPasswordError('1234567', '1234567')).toBe(
      'A senha precisa ter pelo menos 8 caracteres.',
    );
    expect(newPasswordError('12345678', '12345678')).toBeNull();
  });

  it('confere a confirmação depois do tamanho', () => {
    expect(newPasswordError('12345678', '87654321')).toBe('As senhas não coincidem.');
  });
});
