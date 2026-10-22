/**
 * Dados do controlador e de contato usados na Política de Privacidade e nos Termos de Uso.
 * Ao mudar qualquer coisa aqui ou no texto das páginas, atualizar também LEGAL_LAST_UPDATED.
 */
export const LEGAL_CONTROLLER_NAME = 'Osmar de Morais Junior';
export const LEGAL_CONTACT_EMAIL = 'mensageiro@forjaarcana.com';
export const LEGAL_SITE_NAME = 'Forja Arcana';
export const LEGAL_SITE_URL = 'https://forjaarcana.com';
export const LEGAL_LAST_UPDATED = '22 de outubro de 2026';
export const LEGAL_MINIMUM_AGE = 18;

export type LegalDoc = 'privacy' | 'terms';

export const LEGAL_DOC_TITLES: Record<LegalDoc, string> = {
  privacy: 'POLÍTICA DE PRIVACIDADE',
  terms: 'TERMOS DE USO',
};

/** Rota de cada documento — usada nos links do cadastro, login e home. */
export const LEGAL_DOC_ROUTES: Record<LegalDoc, string> = {
  privacy: '/privacidade',
  terms: '/termos',
};

/** Qualquer valor desconhecido na rota cai na política de privacidade. */
export function resolveLegalDoc(value: unknown): LegalDoc {
  return value === 'terms' ? 'terms' : 'privacy';
}
