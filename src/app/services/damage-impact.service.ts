import { Injectable, signal } from '@angular/core';
import { SpellEffect, spellEffectFor } from './spell-effect';

export type DamageIntensity = 1 | 2 | 3;

export interface DamageImpact {
  /** Incremental — força o componente a recriar os elementos e reiniciar as animações CSS. */
  key: number;
  total: number;
  intensity: DamageIntensity;
  /** Magia (projétil + explosão na cor do elemento) ou cura (névoa); `null` = golpe de arma. */
  effect: SpellEffect | null;
}

/** Preferência do próprio navegador (não é dado pessoal) — ver seção 6 da Política. */
export const SCREEN_EFFECTS_STORAGE_KEY = 'dc.screen-effects';

/** Duração total da animação (ms) — o componente usa o mesmo valor no CSS. */
export const DAMAGE_IMPACT_MS = 1600;
/** A névoa de cura é mais lenta (spell-impact.component.scss usa o mesmo valor). */
export const HEAL_IMPACT_MS = 2000;

/**
 * Intensidade do golpe pela fração do dano máximo possível: até 40% = 1 golpe, acima de 40% = 2,
 * a partir de 80% (inclui o dano máximo) = 3. O máximo vem da notação dos dados ("2d6 + 1d8") mais o
 * modificador. Notação ilegível cai no golpe médio.
 */
export function damageIntensity(
  diceNotation: string,
  modifier: number,
  total: number,
): DamageIntensity {
  const terms = [...diceNotation.matchAll(/(\d+)\s*d\s*(\d+)/gi)];
  const maxDice = terms.reduce((sum, [, count, sides]) => sum + Number(count) * Number(sides), 0);
  const max = maxDice + modifier;
  if (maxDice <= 0 || max <= 0) return 2;
  const ratio = total / max;
  if (ratio >= 0.8) return 3;
  if (ratio > 0.4) return 2;
  return 1;
}

/** Dispara a animação de impacto na sessão: golpes e flashes (arma), projétil e explosão
 *  elemental (magia) ou névoa (cura). `roll_type`/`label` vêm da rolagem (ver `spellEffectFor`). */
@Injectable({ providedIn: 'root' })
export class DamageImpactService {
  readonly current = signal<DamageImpact | null>(null);
  readonly enabled = signal(this.readEnabled());

  private counter = 0;
  private clearTimer: ReturnType<typeof setTimeout> | null = null;

  trigger(roll: {
    dice_notation: string;
    modifier: number;
    total: number;
    roll_type?: string;
    label?: string;
  }): void {
    if (!this.enabled()) return;
    if (this.clearTimer) clearTimeout(this.clearTimer);
    this.counter++;
    const effect = spellEffectFor(roll.roll_type, roll.label);
    this.current.set({
      key: this.counter,
      total: roll.total,
      intensity: damageIntensity(roll.dice_notation, roll.modifier, roll.total),
      effect,
    });
    this.clearTimer = setTimeout(
      () => this.clear(),
      effect?.kind === 'heal' ? HEAL_IMPACT_MS : DAMAGE_IMPACT_MS,
    );
  }

  clear(): void {
    if (this.clearTimer) clearTimeout(this.clearTimer);
    this.clearTimer = null;
    this.current.set(null);
  }

  toggleEnabled(): void {
    const next = !this.enabled();
    this.enabled.set(next);
    if (!next) this.clear();
    try {
      localStorage.setItem(SCREEN_EFFECTS_STORAGE_KEY, next ? 'on' : 'off');
    } catch {
      // Navegador sem armazenamento (modo privado etc.): vale só até recarregar a página.
    }
  }

  private readEnabled(): boolean {
    try {
      return localStorage.getItem(SCREEN_EFFECTS_STORAGE_KEY) !== 'off';
    } catch {
      return true;
    }
  }
}
