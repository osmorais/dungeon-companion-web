import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-pixel-die',
  standalone: true,
  templateUrl: './pixel-die.component.html',
  styleUrls: ['./pixel-die.component.scss'],
})
export class PixelDieComponent {
  @Input() face = 1;
  @Input() dropped = false;
  @Input() mini = false;
  @Input() rolling = false;
}
