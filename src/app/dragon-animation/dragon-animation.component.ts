import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dragon-animation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dragon-animation.component.html',
  styleUrls: ['./dragon-animation.component.scss'],
})
export class DragonAnimationComponent implements OnChanges {
  @Input() trigger = 0;
  @Input() stationary = false;
  @Input() stationaryInvert = false;


  visible = false;

  ngOnChanges(): void {
    if (this.stationary || this.stationaryInvert) return;
    if (this.trigger > 0) {
      this.visible = true;
      setTimeout(() => (this.visible = false), 2400);
    }
  }
}
