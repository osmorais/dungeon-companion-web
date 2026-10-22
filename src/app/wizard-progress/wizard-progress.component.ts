import { Component, Input } from '@angular/core';

export interface WizardStep {
  label: string;
  /** Etapa que não se aplica (ex.: magias pra classe sem magia): aparece riscada e não conta. */
  skipped?: boolean;
}

/**
 * Barra de progresso da criação de personagem: "PASSO 3 DE 8 — MAGIAS (1º CÍRCULO)", a barra que
 * enche conforme avança e um marcador por etapa (feita = dourado, atual = destacada, próximas =
 * apagadas, puladas = riscadas). `partial` (0–1) adianta a barra dentro da etapa atual (os
 * círculos de magia).
 */
@Component({
  selector: 'app-wizard-progress',
  standalone: true,
  template: `
    <div
      class="wp"
      role="progressbar"
      [attr.aria-valuenow]="percent()"
      aria-valuemin="0"
      aria-valuemax="100"
      [attr.aria-label]="'Criação do personagem: ' + caption()"
    >
      <p class="wp-caption">
        <span class="wp-count">PASSO {{ position() + 1 }} DE {{ activeCount() }}</span>
        <span class="wp-label"
          >{{ steps[current - 1]?.label }}
          @if (detail) {
            <span class="wp-detail"> · {{ detail }}</span>
          }
        </span>
      </p>
      <div class="wp-bar"><div class="wp-fill" [style.width.%]="percent()"></div></div>
      <ol class="wp-steps">
        @for (step of steps; track $index; let i = $index) {
          <li
            class="wp-step"
            [class.wp-step--done]="!step.skipped && i < current - 1"
            [class.wp-step--current]="i === current - 1"
            [class.wp-step--skipped]="step.skipped"
          >
            <span class="wp-dot"></span>
            <span class="wp-step-label">{{ step.label }}</span>
          </li>
        }
      </ol>
    </div>
  `,
  styleUrls: ['./wizard-progress.component.scss'],
})
export class WizardProgressComponent {
  @Input({ required: true }) steps: WizardStep[] = [];
  /** Etapa atual, começando em 1 (o número do passo do wizard). */
  @Input({ required: true }) current = 1;
  @Input() detail: string | null = null;
  @Input() partial = 0;

  activeCount(): number {
    return this.steps.filter((s) => !s.skipped).length;
  }

  /** Posição da etapa atual entre as que contam (0 = primeira). */
  position(): number {
    return this.steps.slice(0, this.current - 1).filter((s) => !s.skipped).length;
  }

  /** 0% na primeira etapa, 100% na última; `partial` adianta dentro da etapa. */
  percent(): number {
    const last = this.activeCount() - 1;
    if (last <= 0) return 100;
    const value = ((this.position() + Math.min(Math.max(this.partial, 0), 1)) / last) * 100;
    return Math.round(Math.min(value, 100));
  }

  caption(): string {
    return `passo ${this.position() + 1} de ${this.activeCount()}, ${this.steps[this.current - 1]?.label ?? ''}`;
  }
}
