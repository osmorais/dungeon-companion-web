import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragonAnimationComponent } from '../dragon-animation/dragon-animation.component';
import { LoadingOverlayService } from './loading-overlay.service';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [CommonModule, DragonAnimationComponent],
  templateUrl: './loading-overlay.component.html',
  styleUrls: ['./loading-overlay.component.scss'],
})
export class LoadingOverlayComponent {
  protected svc = inject(LoadingOverlayService);
}
