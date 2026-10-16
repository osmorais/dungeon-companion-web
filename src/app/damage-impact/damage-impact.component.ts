import { Component, inject } from '@angular/core';
import { DamageImpactService } from '../services/damage-impact.service';
import { SpellImpactComponent } from '../spell-impact/spell-impact.component';

/**
 * Camada de impacto de dano por cima da sessão: escurece a tela, corta com 1 a 3 golpes (risco
 * branco + flash curto) e mostra o valor do dano. Só CSS, não bloqueia cliques. Disparada pelo
 * DamageImpactService (roll-modal de quem rola o dano e toast de rolagem dos outros). Magia e
 * cura têm efeito próprio (`SpellImpactComponent`).
 */
@Component({
  selector: 'app-damage-impact',
  standalone: true,
  imports: [SpellImpactComponent],
  templateUrl: './damage-impact.component.html',
  styleUrls: ['./damage-impact.component.scss'],
})
export class DamageImpactComponent {
  protected impact = inject(DamageImpactService).current;

  /** Um elemento por golpe: 1º diagonal subindo, 2º descendo, 3º quase horizontal. */
  protected slashes(intensity: number): number[] {
    return Array.from({ length: intensity }, (_, i) => i);
  }
}
