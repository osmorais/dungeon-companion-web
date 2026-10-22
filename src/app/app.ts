import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterOutlet, Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { LoadingOverlayComponent } from './loading-overlay/loading-overlay.component';
import { LoadingOverlayService } from './loading-overlay/loading-overlay.service';
import { BackgroundService } from './services/background.service';
import { ServerWakeupComponent } from './server-wakeup/server-wakeup.component';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NgTemplateOutlet, LoadingOverlayComponent, ServerWakeupComponent],
  template: `
    <div class="app-bg"
      [style.background-image]="'url(' + bg.currentImage() + ')'"
      [class.app-bg--fading]="bg.transitioning()">
    </div>
    <!-- Sessão no celular: a base da tela é da gaveta (Quadro do Mestre / Ações de personagem),
         então TEMA/SAIR vão pro topo e rolam com a página. -->
    @if (authService.isLoggedIn() && footerOnTop()) {
      <ng-container *ngTemplateOutlet="footer; context: { top: true }" />
    }
    <router-outlet /><app-loading-overlay /><app-server-wakeup />
    @if (authService.isLoggedIn() && !footerOnTop()) {
      <ng-container *ngTemplateOutlet="footer; context: { top: false }" />
    }
    <ng-template #footer let-top="top">
      <footer class="global-footer" [class.global-footer--top]="top">
        <span class="global-footer__email">{{ authService.currentUser()!.email }}</span>
        <button
          class="retro-btn global-footer__logout"
          [title]="'Trocar as cores do site (agora: ' + theme.label + ')'"
          (click)="theme.toggle()"
        >
          TEMA: {{ theme.label }}
        </button>
        <button class="retro-btn global-footer__logout" (click)="logout()">SAIR</button>
      </footer>
    </ng-template>
  `,
  styles: [`
    .global-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 16px;
      padding: 8px 24px;
      background-color: var(--bg-color);
      border-top: 1px solid var(--border-color);
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
    .global-footer--top {
      position: static;
      width: 100vw;
      box-sizing: border-box;
      border-top: none;
      border-bottom: 1px solid var(--border-color);
    }
    @media (max-width: 767px) {
      .global-footer {
        padding: 6px 16px;
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

  private readonly url = signal('');
  private readonly isMobile = signal(typeof window !== 'undefined' && window.innerWidth < 768);
  /** Tela da sessão (`/session/:id`) no celular: rodapé vai pro topo. */
  readonly footerOnTop = computed(() => this.isMobile() && /^\/session\//.test(this.url()));

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 768);
  }

  constructor() {
    inject(Router).events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.overlay.show();
      } else if (event instanceof NavigationEnd) {
        this.url.set(event.urlAfterRedirects);
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
