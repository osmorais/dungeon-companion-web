/**
 * Onde pôr os valores mais altos de cada classe, pela "Construção Rápida" do Livro do Jogador
 * (cap. 3): o atributo principal recebe o maior valor e o secundário o seguinte. Quando o livro
 * dá duas opções ("Força ou Destreza"), as duas entram na mesma prioridade e a `note` explica.
 *
 * id_class: 1=Bárbaro 2=Bardo 3=Bruxo 4=Clérigo 5=Druida 6=Feiticeiro 7=Guerreiro 8=Ladino
 * 9=Mago 10=Monge 11=Paladino 12=Patrulheiro (mesma ordem de `armour-rules.ts`).
 */

export type AbilityAbbr = 'FOR' | 'DES' | 'CON' | 'INT' | 'SAB' | 'CAR';

export interface AttributePriority {
  /** Recebe o maior valor. */
  primary: AbilityAbbr[];
  /** Recebe o segundo maior. */
  secondary: AbilityAbbr[];
  /** Quando escolher entre as opções (só quando há mais de uma). */
  note?: string;
}

export const CLASS_ATTRIBUTE_PRIORITY: Record<number, AttributePriority> = {
  1: { primary: ['FOR'], secondary: ['CON'] },
  2: { primary: ['CAR'], secondary: ['DES'] },
  3: { primary: ['CAR'], secondary: ['CON'] },
  4: {
    primary: ['SAB'],
    secondary: ['FOR', 'CON'],
    note: 'FOR se for usar armadura pesada e lutar corpo a corpo; CON para aguentar mais.',
  },
  5: { primary: ['SAB'], secondary: ['CON'] },
  6: { primary: ['CAR'], secondary: ['CON'] },
  7: {
    primary: ['FOR', 'DES'],
    secondary: ['CON'],
    note: 'DES se for lutar com arco ou armas de acuidade; FOR para armas pesadas.',
  },
  8: {
    primary: ['DES'],
    secondary: ['CAR', 'INT'],
    note: 'CAR para enganar e persuadir; INT se pensa em ser Trapaceiro Arcano.',
  },
  9: {
    primary: ['INT'],
    secondary: ['CON', 'DES'],
    note: 'CON para aguentar mais e manter a concentração; DES para se esquivar.',
  },
  10: { primary: ['DES'], secondary: ['SAB'] },
  11: { primary: ['FOR'], secondary: ['CAR'] },
  12: { primary: ['DES'], secondary: ['SAB'] },
};

/** 1 = principal, 2 = secundário, null = sem prioridade (ou classe sem regra). */
export function attributePriorityRank(
  idClass: number | null | undefined,
  ability: AbilityAbbr,
): 1 | 2 | null {
  const rule = idClass != null ? CLASS_ATTRIBUTE_PRIORITY[+idClass] : undefined;
  if (!rule) return null;
  if (rule.primary.includes(ability)) return 1;
  if (rule.secondary.includes(ability)) return 2;
  return null;
}
