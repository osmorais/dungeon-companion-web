/** Elemento do efeito de magia na tela — define as cores (ver spell-impact.component.scss). */
export type SpellElement =
  | 'fire'
  | 'cold'
  | 'lightning'
  | 'thunder'
  | 'acid'
  | 'poison'
  | 'necrotic'
  | 'radiant'
  | 'psychic'
  | 'force'
  | 'arcane';

export type SpellEffect =
  | { kind: 'spell'; element: SpellElement }
  | { kind: 'heal'; tempHp: boolean };

/** Palavra do tipo de dano (como aparece no rótulo da rolagem) → elemento. */
const ELEMENT_KEYWORDS: [RegExp, SpellElement][] = [
  [/fogo|ígneo/, 'fire'],
  [/frio|gélido|gelo/, 'cold'],
  [/elétrico|relâmpago/, 'lightning'],
  [/trovejante|trovão/, 'thunder'],
  [/ácido/, 'acid'],
  [/veneno/, 'poison'],
  [/necrótico/, 'necrotic'],
  [/radiante/, 'radiant'],
  [/psíquico/, 'psychic'],
  [/energia/, 'force'],
];

/**
 * Efeito de tela de uma rolagem, pelo tipo e pelo rótulo que vai pro log da sessão — assim quem só
 * recebe o toast vê o mesmo efeito de quem rolou, sem campo novo na API:
 * - `heal` → névoa de cura ("PV temporários: …" → variante de PV temporários);
 * - `damage` de magia (rótulo "Dano: <magia> (<tipo>)…", montado em `spell-roll-config.ts`) →
 *   efeito de magia com a cor do primeiro tipo de dano citado (ex.: "fogo + radiante" → fogo);
 * - `damage` de arma (rótulo sem tipo entre parênteses, ex.: "Dano: Espada Longa") → `null`, fica
 *   o golpe com flash de sempre.
 */
export function spellEffectFor(
  rollType: string | undefined,
  label: string | undefined,
): SpellEffect | null {
  if (rollType === 'heal') return { kind: 'heal', tempHp: !!label?.startsWith('PV temporários') };
  if (rollType !== 'damage' || !label) return null;
  const type = label.match(/^Dano: [^(]+\(([^)]+)\)/)?.[1]?.toLowerCase();
  if (!type) return null;
  let best: { index: number; element: SpellElement } | null = null;
  for (const [pattern, element] of ELEMENT_KEYWORDS) {
    const index = type.search(pattern);
    if (index >= 0 && (!best || index < best.index)) best = { index, element };
  }
  return { kind: 'spell', element: best?.element ?? 'arcane' };
}
