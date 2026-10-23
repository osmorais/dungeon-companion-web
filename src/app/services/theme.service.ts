import { Injectable, signal } from '@angular/core';

/** Tema de cores do site. `sombrio` é o padrão (desde a 1.7.5); `fantasia`, o visual original. */
export type Theme = 'fantasia' | 'sombrio';

export const THEMES: { value: Theme; label: string }[] = [
  { value: 'fantasia', label: 'FANTASIA' },
  { value: 'sombrio', label: 'SOMBRIO' },
];

/** Preferência do próprio navegador (não é dado pessoal) — ver seção 6 da Política. */
export const THEME_STORAGE_KEY = 'dc.theme';

/**
 * Aplica o tema como `data-theme` no `<html>`: as cores saem das variáveis CSS de `styles.scss`
 * (`:root` = fantasia, `:root[data-theme='sombrio']` = sombrio). Injetado no App, então vale
 * desde a primeira tela.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(this.readTheme());

  constructor() {
    this.apply(this.theme());
  }

  set(theme: Theme): void {
    this.theme.set(theme);
    this.apply(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Navegador sem armazenamento (modo privado etc.): vale só até recarregar a página.
    }
  }

  toggle(): void {
    this.set(this.theme() === 'fantasia' ? 'sombrio' : 'fantasia');
  }

  get label(): string {
    return THEMES.find((t) => t.value === this.theme())!.label;
  }

  private apply(theme: Theme): void {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset['theme'] = theme;
  }

  private readTheme(): Theme {
    try {
      // Só quem escolheu FANTASIA fica nele; sem escolha (ou valor desconhecido), sombrio.
      return localStorage.getItem(THEME_STORAGE_KEY) === 'fantasia' ? 'fantasia' : 'sombrio';
    } catch {
      return 'sombrio';
    }
  }
}
