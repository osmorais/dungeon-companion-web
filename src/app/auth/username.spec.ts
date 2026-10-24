import { suggestionsFromError, usernameFormatError } from './username';

/** Mesmas regras da API (`dungeon-companion-api/src/services/username.ts`). */
describe('nome de usuário — regras (cópia da API)', () => {
  it('aceita letras, números, _ e - de 3 a 20 caracteres', () => {
    for (const ok of ['gorak', 'Gorak_Dente', 'ana-3', 'abc', 'a'.repeat(20)]) {
      expect(usernameFormatError(ok), ok).toBeNull();
    }
  });

  it('recusa curto, longo, espaço, acento e símbolo', () => {
    for (const bad of ['ab', 'a'.repeat(21), 'gorak dente', 'joão', 'ana!']) {
      expect(usernameFormatError(bad), bad).toBeTruthy();
    }
  });

  it('lê as sugestões do 409 da API; corpo inesperado vira lista vazia', () => {
    const err = { error: { error: { details: { suggestions: ['gorak1', 42, 'gorak_7'] } } } };
    expect(suggestionsFromError(err)).toEqual(['gorak1', 'gorak_7']);
    expect(suggestionsFromError({ error: {} })).toEqual([]);
    expect(suggestionsFromError(null)).toEqual([]);
  });
});
