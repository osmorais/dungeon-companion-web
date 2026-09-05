import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-pixel-numeric-die',
  standalone: true,
  templateUrl: './pixel-numeric-die.component.html',
  styleUrls: ['./pixel-numeric-die.component.scss'],
})
export class PixelNumericDieComponent {
  /** null enquanto rola (mostra "?"). */
  @Input() value: number | null = null;
  @Input() sides = 20;
  @Input() rolling = false;
  @Input() mini = false;
  /** Destaca resultado natural máximo/mínimo (ex: 20 ou 1 num d20). */
  @Input() critical: 'high' | 'low' | null = null;
  /** Dado não escolhido (ex: perdeu na vantagem/desvantagem). */
  @Input() dropped = false;
}
