import { Component, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { LoadingOverlayComponent } from './loading-overlay/loading-overlay.component';
import { LoadingOverlayService } from './loading-overlay/loading-overlay.service';
import { BackgroundService } from './services/background.service';
import { ServerWakeupComponent } from './server-wakeup/server-wakeup.component';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';
import { TomService } from './tom-assistant/tom.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoadingOverlayComponent, ServerWakeupComponent],
  template: `
    <div class="app-bg"
      [style.background-image]="'url(' + bg.currentImage() + ')'"
      [class.app-bg--fading]="bg.transitioning()">
    </div>
    <!-- TEMA/SAIR no topo da página (absolute, rola junto): a base da tela fica livre pras gavetas
         da sessão. A altura vem de --footer-height, que o body reserva em cima. -->
    @if (authService.isLoggedIn()) {
      <footer class="global-footer">
        <span class="global-footer__email">{{ authService.currentUser()!.email }}</span>
        <button
          class="retro-btn global-footer__logout"
          [title]="'Trocar as cores do site (agora: ' + theme.label + ')'"
          (click)="theme.toggle()"
        >
          TEMA: {{ theme.label }}
        </button>
        <button
          class="retro-btn global-footer__logout"
          [title]="tom.enabled() ? 'Desligar a ajuda do Tom' : 'Ligar a ajuda do Tom'"
          (click)="tom.toggle()"
        >
          TOM: {{ tom.enabled() ? 'LIGADO' : 'DESLIGADO' }}
        </button>
        <button class="retro-btn global-footer__logout" (click)="logout()">SAIR</button>
      </footer>
    }
    <router-outlet /><app-loading-overlay /><app-server-wakeup />
  `,
  styles: [`
    .global-footer {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: var(--footer-height);
      box-sizing: border-box;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 16px;
      padding: 0 24px;
      background-color: var(--bg-color);
      border-bottom: 1px solid var(--border-color);
      z-index: 100;
    }
    .global-footer__email {
      font-size: 7px;
      color: var(--label-title-color);
    }
    .global-footer__logout {
      float: none;
      margin: 0;
      font-size: 7px;
      padding: 6px 12px;
    }
    /* Celular estreito: o e-mail sai pra caberem TEMA, TOM e SAIR numa linha. */
    @media (max-width: 520px) {
      .global-footer {
        gap: 8px;
      }
      .global-footer__email {
        display: none;
      }
      .global-footer__logout {
        padding: 6px 8px;
      }
    }
    @media (max-width: 767px) {
      .global-footer {
        padding: 0 16px;
      }
      .global-footer__email {
        font-size: 6px;
      }
    }
  `]
})
export class App {
  private overlay = inject(LoadingOverlayService);
  readonly bg = inject(BackgroundService);
  readonly authService = inject(AuthService);
  /** Injetado aqui pra aplicar o tema salvo desde a primeira tela. */
  readonly theme = inject(ThemeService);
  readonly tom = inject(TomService);

  constructor() {
    inject(Router).events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.overlay.show();
      } else if (event instanceof NavigationEnd) {
        this.overlay.hideImmediate();
        this.bg.next();
      } else if (event instanceof NavigationCancel || event instanceof NavigationError) {
        this.overlay.hideImmediate();
      }
    });
  }

  logout() {
    this.authService.logout().subscribe();
  }
}
