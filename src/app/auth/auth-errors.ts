/** Mesmo mínimo do backend (`PASSWORD_MIN_LENGTH` no auth.controller) — só pra senha nova. */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * Mensagem de erro vinda da API. O LoopBack responde `{ error: { message } }`; o fallback cobre
 * erro de rede ou corpo inesperado. Inclui o 429 ("Muitas tentativas...") do limite de tentativas.
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const body = (err as { error?: { error?: { message?: unknown }; message?: unknown } })?.error;
  const message = body?.error?.message ?? body?.message;
  return typeof message === 'string' && message.trim() ? message : fallback;
}

/** Validação da senha nova (cadastro e redefinição). `null` = ok. */
export function newPasswordError(password: string, confirmation: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }
  if (password !== confirmation) return 'As senhas não coincidem.';
  return null;
}
