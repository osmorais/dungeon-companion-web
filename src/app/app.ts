import { Component, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { LoadingOverlayComponent } from './loading-overlay/loading-overlay.component';
import { LoadingOverlayService } from './loading-overlay/loading-overlay.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoadingOverlayComponent],
  template: '<router-outlet /><app-loading-overlay />'
})
export class App {
  private overlay = inject(LoadingOverlayService);

  constructor() {
    inject(Router).events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.overlay.show();
      } else if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
        this.overlay.hideImmediate();
      }
    });
  }
}
