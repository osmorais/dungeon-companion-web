/**
 * Regras do nome de usuário — cópia de `dungeon-companion-api/src/services/username.ts` (o
 * backend é quem decide; aqui é só pra avisar antes de perguntar). Mudou lá, muda aqui.
 */
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const USERNAME_PATTERN = /^[A-Za-z0-9_-]+$/;

/** Mensagem do problema de formato, ou `null` se o nome é válido. */
export function usernameFormatError(username: string): string | null {
  if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH)
    return `O nome de usuário deve ter de ${USERNAME_MIN_LENGTH} a ${USERNAME_MAX_LENGTH} caracteres`;
  if (!USERNAME_PATTERN.test(username)) return 'Use só letras sem acento, números, _ e -';
  return null;
}

/** Sugestões que a API manda junto do 409 (nome em uso), em `error.error.details.suggestions`. */
export function suggestionsFromError(err: unknown): string[] {
  const body = (err as { error?: { error?: { details?: { suggestions?: unknown } } } })?.error;
  const suggestions = body?.error?.details?.suggestions;
  return Array.isArray(suggestions) ? suggestions.filter((s) => typeof s === 'string') : [];
}
