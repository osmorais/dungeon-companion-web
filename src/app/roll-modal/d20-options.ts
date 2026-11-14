import {
  CombatFeatures,
  D20Reminder,
  ResourceTracker,
  SaveContext,
} from '../models/character-response.interface';
import type { AbilityRollConfig } from './roll-modal.component';

/** Atributo da perícia (sigla em português do banco) → chave em inglês dos traços. */
export const ATTRIBUTE_PT_TO_EN: Record<string, string> = {
  FOR: 'STR',
  DES: 'DEX',
  CON: 'CON',
  INT: 'INT',
  SAB: 'WIS',
  CAR: 'CHA',
};

/** "contra veneno", "contra ser enfeitiçado"… — pro jogador ver contra o que rola. */
export const SAVE_CONTEXT_LABELS: Record<SaveContext, string> = {
  poison: 'veneno',
  charm: 'ser enfeitiçado',
  fear: 'medo',
  magic: 'magia',
  visible: 'efeito visível',
};

export const SAVE_CONTEXTS: SaveContext[] = ['poison', 'charm', 'fear', 'magic', 'visible'];

/**
 * Separa as vantagens desta rolagem. `against`: contra o que é a resistência, quando quem pediu
 * sabe; `null` = rolagem manual, sem contexto. Com contexto, a vantagem que bate entra sozinha e a
 * que não bate some; sem contexto, vira lembrete (com o botão "rolar com vantagem"). Vantagem sem
 * contexto (`against: null`, Fúria) entra sempre.
 */
export function splitAdvantage(
  reminders: D20Reminder[],
  kind: 'save' | 'check' | 'attack',
  ability: string | undefined,
  against: SaveContext[] | null,
): { advantageFrom: string[]; advantageReminders: string[] } {
  const advantageFrom: string[] = [];
  const advantageReminders: string[] = [];
  for (const r of reminders) {
    if (r.applies !== kind) continue;
    if (r.abilities && !(ability && (r.abilities as string[]).includes(ability))) continue;
    if (r.against === null) advantageFrom.push(r.text);
    else if (against === null || r.against === undefined) advantageReminders.push(r.text);
    else if (against.includes(r.against)) advantageFrom.push(r.text);
  }
  return { advantageFrom, advantageReminders };
}

function available(tracker: ResourceTracker | undefined): number {
  if (!tracker) return 0;
  if (tracker.max === 'unlimited') return Infinity;
  return Math.max(0, tracker.max - tracker.used);
}

/**
 * O que o personagem tem pra mexer num d20: Sortudo (Halfling e talento), Inspiração Bárdica
 * guardada, Indomável (só resistência), magias de apoio recebidas (Bênção em ataque e resistência;
 * Orientação no teste; Resistência na resistência) e as vantagens que valem pra esta rolagem.
 */
export function d20Options(
  features: CombatFeatures | null | undefined,
  trackers: ResourceTracker[],
  kind: 'save' | 'check' | 'attack',
  ability: string | undefined,
  against: SaveContext[] | null,
): Pick<
  AbilityRollConfig,
  | 'halflingLucky'
  | 'luckPoints'
  | 'inspiration'
  | 'indomitable'
  | 'blessing'
  | 'boostDie'
  | 'advantageFrom'
  | 'advantageReminders'
> {
  const byName = (name: string) => trackers.find((t) => t.name === name);
  const effects = features?.active_effects;
  const bless = kind !== 'check' ? effects?.bless : null;
  const guidance = kind === 'check' ? effects?.guidance : null;
  const resistance = kind === 'save' ? effects?.resistance : null;
  return {
    halflingLucky: !!features?.halfling_lucky,
    luckPoints: available(byName('Pontos de Sorte')),
    inspiration: features?.active_effects.bardic_inspiration ?? undefined,
    indomitable: kind === 'save' ? available(byName('Indomável')) : 0,
    blessing: bless ? { from: bless.from } : undefined,
    boostDie: guidance
      ? { key: 'guidance', label: 'Orientação', from: guidance.from }
      : resistance
        ? { key: 'resistance', label: 'Resistência', from: resistance.from }
        : undefined,
    ...splitAdvantage(features?.d20_reminders ?? [], kind, ability, against),
  };
}
