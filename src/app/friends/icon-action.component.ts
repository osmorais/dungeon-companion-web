import { Component, input, output } from '@angular/core';

/**
 * Botão só com ícone e dica ao passar o mouse (ou focar pelo teclado). Sem `icon`, mostra o ✕. A
 * dica também é o nome acessível do botão. `end`: dica alinhada à direita, pra não vazar da coluna.
 */
@Component({
  selector: 'app-icon-action',
  standalone: true,
  template: `
    <button
      type="button"
      class="ia"
      [class.ia--danger]="danger()"
      [class.ia--end]="end()"
      [disabled]="disabled()"
      [attr.aria-label]="label()"
      [attr.data-tip]="label()"
      (click)="pressed.emit()"
    >
      @if (icon(); as file) {
        <img class="ui-icon" [src]="'assets/icons/' + file + '.png'" alt="" />
      } @else {
        <span aria-hidden="true">✕</span>
      }
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    .ia {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      padding: 0;
      border: 2px solid var(--border-color);
      background-color: var(--panel-bg);
      color: var(--text-color);
      font-family: inherit;
      font-size: 10px;
      cursor: var(--cp);

      .ui-icon {
        width: 22px;
        height: 22px;
      }

      &:hover:not(:disabled),
      &:focus-visible {
        border-color: var(--accent-color);
        background-color: var(--btn-color-hover);
        outline: none;
      }

      &:disabled {
        opacity: 0.5;
        cursor: var(--cx);
      }

      &--danger {
        color: var(--sheet-label-color);

        &:hover:not(:disabled),
        &:focus-visible {
          border-color: var(--sheet-label-color);
        }
      }

      &::after {
        content: attr(data-tip);
        position: absolute;
        bottom: calc(100% + 6px);
        left: 50%;
        z-index: 20;
        padding: 5px 7px;
        border: 1px solid var(--accent-color);
        background-color: var(--bg-color);
        color: var(--text-color);
        font-size: 6px;
        line-height: 1.4;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transform: translateX(-50%);
      }

      &:hover::after,
      &:focus-visible::after {
        opacity: 1;
      }

      &--end::after {
        left: auto;
        right: 0;
        transform: none;
      }
    }
  `,
})
export class IconActionComponent {
  icon = input<string | null>(null);
  label = input.required<string>();
  danger = input(false);
  disabled = input(false);
  end = input(false);
  pressed = output<void>();
}
