import { Component, computed, input, output } from '@angular/core';

/** Ferramenta genérica do antecedente ("Um tipo de kit de jogo") com as opções do livro. */
export interface ToolChoiceSlot {
  placeholder: string;
  options: readonly string[];
}

export interface LanguageToolValue {
  languages: string[];
  tools: Record<string, string>;
}

/** Escolhas completas: todos os idiomas (sem repetir nem os que já fala) e todas as ferramentas. */
export function languageToolComplete(
  value: LanguageToolValue,
  languageCount: number,
  fixed: readonly string[],
  toolSlots: readonly ToolChoiceSlot[],
): boolean {
  const langs = value.languages.slice(0, languageCount).filter((l) => !!l);
  return (
    langs.length === languageCount &&
    new Set(langs).size === langs.length &&
    langs.every((l) => !fixed.includes(l)) &&
    toolSlots.every((t) => t.options.includes(value.tools[t.placeholder] ?? ''))
  );
}

/** Só o que vale pras vagas atuais (raça/antecedente podem ter mudado depois de escolher). */
export function trimLanguageToolValue(
  value: LanguageToolValue,
  languageCount: number,
  fixed: readonly string[],
  toolSlots: readonly ToolChoiceSlot[],
): LanguageToolValue {
  const languages = [
    ...new Set(value.languages.slice(0, languageCount).filter((l) => !!l && !fixed.includes(l))),
  ];
  const tools: Record<string, string> = {};
  for (const slot of toolSlots) {
    const pick = value.tools[slot.placeholder];
    if (pick && slot.options.includes(pick)) tools[slot.placeholder] = pick;
  }
  return { languages, tools };
}

/**
 * Idiomas e ferramentas "à escolha" da raça e do antecedente (1.24.0): um select por idioma
 * (sem os que o personagem já fala nem os já escolhidos nos outros) e um por ferramenta genérica.
 */
@Component({
  selector: 'app-language-tool-picker',
  standalone: true,
  template: `
    @for (i of slotIndexes(); track i) {
      <label
        >IDIOMA À ESCOLHA{{ languageCount() > 1 ? ' ' + (i + 1) : '' }}
        <select [value]="value().languages[i] || ''" (change)="setLanguage(i, $event)">
          <option value="">Selecione...</option>
          @for (lang of optionsFor(i); track lang) {
            <option [value]="lang" [selected]="value().languages[i] === lang">{{ lang }}</option>
          }
        </select>
      </label>
    }
    @for (slot of toolSlots(); track slot.placeholder) {
      <label
        >{{ toolLabel(slot.placeholder) }}
        <select
          [value]="value().tools[slot.placeholder] || ''"
          (change)="setTool(slot.placeholder, $event)"
        >
          <option value="">Selecione...</option>
          @for (opt of slot.options; track opt) {
            <option [value]="opt" [selected]="value().tools[slot.placeholder] === opt">
              {{ opt }}
            </option>
          }
        </select>
      </label>
    }
  `,
  styles: `
    :host {
      display: contents;
    }
  `,
})
export class LanguageToolPickerComponent {
  languageCount = input(0);
  /** Idiomas que o personagem já fala (da raça). */
  fixedLanguages = input<readonly string[]>([]);
  /** Todos os idiomas que dá pra escolher. */
  languages = input<readonly string[]>([]);
  toolSlots = input<readonly ToolChoiceSlot[]>([]);
  value = input<LanguageToolValue>({ languages: [], tools: {} });
  valueChange = output<LanguageToolValue>();

  readonly slotIndexes = computed(() => Array.from({ length: this.languageCount() }, (_, i) => i));

  /** Opções do select `i`: sem os que já fala e sem os escolhidos nos outros selects. */
  optionsFor(i: number): string[] {
    const taken = this.value().languages.filter((l, j) => j !== i && !!l);
    return this.languages().filter((l) => !this.fixedLanguages().includes(l) && !taken.includes(l));
  }

  toolLabel(placeholder: string): string {
    if (placeholder === 'Um tipo de kit de jogo') return 'KIT DE JOGO';
    if (placeholder === 'Um tipo de instrumento musical') return 'INSTRUMENTO MUSICAL';
    return placeholder.toUpperCase();
  }

  setLanguage(i: number, event: Event): void {
    const languages = [...this.value().languages];
    while (languages.length < this.languageCount()) languages.push('');
    languages[i] = (event.target as HTMLSelectElement).value;
    this.valueChange.emit({ ...this.value(), languages });
  }

  setTool(placeholder: string, event: Event): void {
    const pick = (event.target as HTMLSelectElement).value;
    const tools = { ...this.value().tools };
    if (pick) tools[placeholder] = pick;
    else delete tools[placeholder];
    this.valueChange.emit({ ...this.value(), tools });
  }
}
