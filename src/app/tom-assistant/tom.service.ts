import { Injectable, signal } from '@angular/core';

/** Preferência do próprio navegador (não é dado pessoal) — ver seção 6 da Política. */
export const TOM_STORAGE_KEY = 'dc.tom';

/**
 * Liga/desliga a ajuda do Tom no site todo (criação de personagem e sessão). Desligar pelo balão
 * ("DESATIVAR AJUDA") ou pelo botão TOM da barra do topo; fica guardado no navegador.
 */
@Injectable({ providedIn: 'root' })
export class TomService {
  readonly enabled = signal(this.read());

  set(enabled: boolean): void {
    this.enabled.set(enabled);
    try {
      localStorage.setItem(TOM_STORAGE_KEY, enabled ? 'on' : 'off');
    } catch {
      // Navegador sem armazenamento (modo privado etc.): vale só até recarregar a página.
    }
  }

  toggle(): void {
    this.set(!this.enabled());
  }

  private read(): boolean {
    try {
      return localStorage.getItem(TOM_STORAGE_KEY) !== 'off';
    } catch {
      return true;
    }
  }
}
