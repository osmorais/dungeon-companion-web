import { TestBed } from '@angular/core/testing';
import { THEME_STORAGE_KEY, ThemeService } from './theme.service';

describe('ThemeService (tema de cores)', () => {
  beforeEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    delete document.documentElement.dataset['theme'];
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.removeItem(THEME_STORAGE_KEY);
  });

  const create = () => TestBed.runInInjectionContext(() => new ThemeService());

  it('sem preferência salva usa FANTASIA e marca o <html>', () => {
    const theme = create();
    expect(theme.theme()).toBe('fantasia');
    expect(theme.label).toBe('FANTASIA');
    expect(document.documentElement.dataset['theme']).toBe('fantasia');
  });

  it('alternar troca o <html> e grava a preferência', () => {
    const theme = create();
    theme.toggle();
    expect(theme.theme()).toBe('sombrio');
    expect(theme.label).toBe('SOMBRIO');
    expect(document.documentElement.dataset['theme']).toBe('sombrio');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('sombrio');
    theme.toggle();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('fantasia');
  });

  it('lê a preferência salva ao abrir o site', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'sombrio');
    expect(create().theme()).toBe('sombrio');
    expect(document.documentElement.dataset['theme']).toBe('sombrio');
  });

  it('valor desconhecido salvo cai no padrão', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'neon');
    expect(create().theme()).toBe('fantasia');
  });

  it('navegador sem armazenamento: usa o padrão e troca só na tela', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const theme = create();
    expect(theme.theme()).toBe('fantasia');
    theme.toggle();
    expect(theme.theme()).toBe('sombrio');
    expect(document.documentElement.dataset['theme']).toBe('sombrio');
  });
});
