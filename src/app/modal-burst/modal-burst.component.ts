import { Component, Input, inject } from '@angular/core';
import { DamageImpactService } from '../services/damage-impact.service';

export type ModalBurstVariant = 'roll' | 'reveal' | 'defeat' | 'spell' | 'levelup';

/**
 * Explosão em pixel art atrás de um modal da sessão, no instante em que ele aparece (só CSS, não
 * bloqueia cliques). Fica dentro do overlay, antes do painel — o painel é desenhado por cima.
 * - `roll`: estouro dourado (toast de rolagem);
 * - `reveal`: explosão vermelho-escura com onda de choque e brasas subindo (monstro revelado);
 * - `defeat`: estilhaços cinza que caem (monstro derrotado);
 * - `spell`: estouro violeta arcano com runas (losangos) girando (magia lançada);
 * - `levelup`: verde e dourado, com estrelas subindo (personagem pode subir de nível).
 * Some com o "efeitos de tela" desligado e com "reduzir movimento" no sistema.
 */
@Component({
  selector: 'app-modal-burst',
  standalone: true,
  templateUrl: './modal-burst.component.html',
  styleUrls: ['./modal-burst.component.scss'],
})
export class ModalBurstComponent {
  @Input() variant: ModalBurstVariant = 'roll';

  protected enabled = inject(DamageImpactService).enabled;

  /** Partículas em volta do centro (ângulo/distância/tamanho variando pra não parecer um círculo). */
  protected particles(): { angle: number; distance: number; size: number; delay: number }[] {
    const count = this.variant === 'roll' ? 14 : 20;
    return Array.from({ length: count }, (_, i) => ({
      angle: (360 / count) * i + (i % 2 ? 9 : -6),
      distance: (this.variant === 'roll' ? 28 : 40) + (i % 3) * 8,
      size: 8 + (i % 3) * 4,
      delay: (i % 4) * 30,
    }));
  }

  /** Brasas (revelação) / estrelas (subir de nível) subindo de pontos espalhados. */
  protected embers(): { left: number; delay: number }[] {
    return [18, 30, 44, 57, 70, 83].map((left, i) => ({ left, delay: 200 + i * 90 }));
  }
}
