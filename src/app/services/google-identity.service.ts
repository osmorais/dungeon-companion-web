import { Injectable } from '@angular/core';

export const GOOGLE_IDENTITY_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

/**
 * Carrega o script de login do Google (Google Identity Services) só quando uma tela que tem o
 * botão abre (login/cadastro), em vez de em todas as páginas pelo index.html — assim quem só
 * navega pelo site não tem o IP enviado ao Google (LGPD, docs/dungeon-companion-lgpd.md item 8).
 * Também resolve uma corrida antiga: com `async` no index.html, o componente podia chamar
 * `google.accounts.id` antes do script terminar de carregar.
 */
@Injectable({ providedIn: 'root' })
export class GoogleIdentityService {
  private loading: Promise<void> | null = null;

  load(): Promise<void> {
    if (typeof google !== 'undefined' && google.accounts?.id) return Promise.resolve();
    if (this.loading) return this.loading;

    this.loading = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GOOGLE_IDENTITY_SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        // Permite tentar de novo na próxima vez que a tela abrir.
        this.loading = null;
        script.remove();
        reject(new Error('Não foi possível carregar o login do Google'));
      };
      document.head.appendChild(script);
    });
    return this.loading;
  }
}
