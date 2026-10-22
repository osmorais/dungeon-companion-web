import { Component, Input } from '@angular/core';
import { hpColor } from '../session-panel/hp-display';

/** Menor largura visível do preenchimento (% do trilho): o começo do trilho fica sob os enfeites
 *  da moldura, então 1 PV de 47 sumiria. */
export const FRAME_BAR_MIN_FILL = 7;

/**
 * Barra de vida do card do personagem na sessão (1.7.1), com a moldura do tema: verde → amarelo
 * → vermelho conforme o PV, temporários em azul depois, e o medalhão do coração na cor da vida.
 */
@Component({
  selector: 'app-hp-bar',
  standalone: true,
  templateUrl: './hp-bar.component.html',
  styleUrls: ['./hp-bar.component.scss'],
})
export class HpBarComponent {
  @Input({ required: true }) current = 0;
  @Input({ required: true }) max = 0;
  @Input() temp = 0;

  /** Temporários somam ao total da barra (podem passar do máximo). */
  private get total(): number {
    return this.max + Math.max(0, this.temp);
  }

  get greenPercent(): number {
    if (this.total <= 0 || this.current <= 0) return 0;
    const pct = Math.min(100, Math.round((this.current / this.total) * 100));
    return Math.max(FRAME_BAR_MIN_FILL, pct);
  }

  /** Medalhão do coração: na cor da vida; apagado com 0 PV. */
  get medalBackground(): string | null {
    if (this.current <= 0) return null;
    return `radial-gradient(circle at 40% 35%, #fff8 0%, ${this.color} 45%, #000a 100%)`;
  }

  get tempPercent(): number {
    if (this.total <= 0 || this.temp <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((this.temp / this.total) * 100)));
  }

  get color(): string {
    return hpColor(this.current, this.max);
  }

  get label(): string {
    return `${this.current}/${this.max}${this.temp > 0 ? ' +' + this.temp : ''}`;
  }
}
