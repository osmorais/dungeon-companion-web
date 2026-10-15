import { routes } from '../app.routes';
import { authGuard } from '../guards/auth.guard';
import { LEGAL_DOC_ROUTES, LEGAL_DOC_TITLES, resolveLegalDoc } from './legal-info';

describe('legal-info', () => {
  it('resolveLegalDoc reconhece os termos', () => {
    expect(resolveLegalDoc('terms')).toBe('terms');
  });

  it('resolveLegalDoc cai na política de privacidade para qualquer outro valor', () => {
    expect(resolveLegalDoc('privacy')).toBe('privacy');
    expect(resolveLegalDoc(undefined)).toBe('privacy');
    expect(resolveLegalDoc('xyz')).toBe('privacy');
  });

  it('tem título para cada documento', () => {
    expect(LEGAL_DOC_TITLES.privacy).toBe('POLÍTICA DE PRIVACIDADE');
    expect(LEGAL_DOC_TITLES.terms).toBe('TERMOS DE USO');
  });

  it.each(['privacy', 'terms'] as const)(
    'a rota de %s existe, é pública e aponta o documento certo',
    (doc) => {
      const path = LEGAL_DOC_ROUTES[doc].replace(/^\//, '');
      const route = routes.find((r) => r.path === path);
      expect(route).toBeDefined();
      expect(route!.data?.['doc']).toBe(doc);
      // Precisa abrir sem login: é linkada no cadastro e no login.
      expect(route!.canActivate ?? []).not.toContain(authGuard);
    },
  );
});
