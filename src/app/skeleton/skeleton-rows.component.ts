import { Component, Input } from '@angular/core';

/** Linhas de skeleton com larguras variadas (lista, texto) — estilo `.skeleton` no styles.scss. */
@Component({
  selector: 'app-skeleton-rows',
  standalone: true,
  template: `
    <div class="skeleton-stack" aria-hidden="true">
      @for (width of widths; track $index) {
        <span class="skeleton" [style.width]="width" [style.height.px]="height"></span>
      }
    </div>
  `,
})
export class SkeletonRowsComponent {
  /** Larguras que se repetem — dá cara de texto/lista em vez de blocos iguais. */
  private static readonly WIDTHS = ['92%', '70%', '84%', '60%', '76%'];

  @Input() rows = 3;
  @Input() height = 12;

  get widths(): string[] {
    return Array.from(
      { length: this.rows },
      (_, i) => SkeletonRowsComponent.WIDTHS[i % SkeletonRowsComponent.WIDTHS.length],
    );
  }
}
