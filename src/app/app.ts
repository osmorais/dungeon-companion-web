import { Component, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { LoadingOverlayComponent } from './loading-overlay/loading-overlay.component';
import { LoadingOverlayService } from './loading-overlay/loading-overlay.service';
import { BackgroundService } from './services/background.service';
import { ServerWakeupComponent } from './server-wakeup/server-wakeup.component';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoadingOverlayComponent, ServerWakeupComponent],
  template: `
    <div class="app-bg"
      [style.background-image]="'url(' + bg.currentImage() + ')'"
      [class.app-bg--fading]="bg.transitioning()">
    </div>
    <router-outlet /><app-loading-overlay /><app-server-wakeup />
    @if (authService.isLoggedIn()) {
      <footer class="global-footer">
        <span class="global-footer__email">{{ authService.currentUser()!.email }}</span>
        <button class="retro-btn global-footer__logout" (click)="logout()">SAIR</button>
      </footer>
    }
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
