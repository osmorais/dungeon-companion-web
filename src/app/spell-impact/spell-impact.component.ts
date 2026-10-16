import { Component, Input } from '@angular/core';
import { DamageImpact } from '../services/damage-impact.service';

/**
 * Efeito de magia/cura em tela cheia, no estilo pixel art (só CSS, sem imagem, não bloqueia
 * cliques). Renderizado pelo DamageImpactComponent quando o impacto tem `effect`:
 * - magia: projétil atravessa a tela até o centro e explode em partículas na cor do elemento;
 * - cura: névoa subindo do pé da tela com brilhos (verde; azul-claro pros PV temporários).
 */
@Component({
  selector: 'app-spell-impact',
  standalone: true,
  templateUrl: './spell-impact.component.html',
  styleUrls: ['./spell-impact.component.scss'],
})
export class SpellImpactComponent {
  @Input({ required: true }) impact!: DamageImpact;

  /** Partículas da explosão: 8/12/16 conforme a intensidade, distribuídas em volta do centro. */
  protected burstParticles(): { angle: number; distance: number; delay: number }[] {
    const count = this.impact.intensity * 4 + 4;
    return Array.from({ length: count }, (_, i) => ({
      angle: (360 / count) * i + (i % 2 ? 12 : 0),
      distance: (i % 3 === 0 ? 34 : 24) + this.impact.intensity * 6,
      delay: (i % 4) * 25,
    }));
  }

  /** Rastro do projétil: quadradinhos que ficam pra trás. */
  protected trail(): number[] {
    return [0, 1, 2, 3, 4];
  }

  /** Névoa de cura: nuvens em posições fixas no pé da tela, subindo em tempos diferentes. */
  protected mist(): { left: number; size: number; delay: number }[] {
    return [
      { left: 4, size: 22, delay: 0 },
      { left: 18, size: 30, delay: 180 },
      { left: 33, size: 26, delay: 60 },
      { left: 48, size: 34, delay: 240 },
      { left: 62, size: 24, delay: 120 },
      { left: 76, size: 30, delay: 300 },
      { left: 90, size: 22, delay: 90 },
    ];
  }

  protected sparkles(): { left: number; delay: number }[] {
    return [12, 27, 41, 55, 69, 83].map((left, i) => ({ left, delay: 250 + i * 130 }));
  }
}
