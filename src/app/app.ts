import { Component, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { LoadingOverlayComponent } from './loading-overlay/loading-overlay.component';
import { LoadingOverlayService } from './loading-overlay/loading-overlay.service';
import { BackgroundService } from './services/background.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoadingOverlayComponent],
  template: `
    <div class="app-bg"
      [style.background-image]="'url(' + bg.currentImage() + ')'"
      [class.app-bg--fading]="bg.transitioning()">
    </div>
    <router-outlet /><app-loading-overlay />
  `
})
export class App {
  private overlay = inject(LoadingOverlayService);
  readonly bg = inject(BackgroundService);

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
}
