import { SecretRollCheck } from '../models/game-session.interface';
import { CharacterSheetResponse } from '../models/character-response.interface';

/** Perícias como estão na tabela `skill` (mesmos ids do backend). */
export const SECRET_ROLL_SKILLS: { id_skill: number; name: string }[] = [
  'Atletismo',
  'Acrobacia',
  'Furtividade',
  'Prestidigitação',
  'Arcanismo',
  'História',
  'Investigação',
  'Natureza',
  'Religião',
  'Adestrar Animais',
  'Intuição',
  'Medicina',
  'Percepção',
  'Sobrevivência',
  'Atuação',
  'Enganação',
  'Intimidação',
  'Persuasão',
].map((name, i) => ({ id_skill: i + 1, name }));

export const SECRET_ROLL_SAVES: {
  ability: 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';
  name: string;
}[] = [
  { ability: 'STR', name: 'Força' },
  { ability: 'DEX', name: 'Destreza' },
  { ability: 'CON', name: 'Constituição' },
  { ability: 'INT', name: 'Inteligência' },
  { ability: 'WIS', name: 'Sabedoria' },
  { ability: 'CHA', name: 'Carisma' },
];

/** Nome do teste (ex.: "Percepção", "Resistência: Sabedoria"). */
export function secretCheckLabel(check: SecretRollCheck): string {
  if (check.kind === 'skill') {
    return SECRET_ROLL_SKILLS.find((s) => s.id_skill === check.id_skill)?.name ?? 'Perícia';
  }
  const save = SECRET_ROLL_SAVES.find((s) => s.ability === check.ability);
  return `Resistência: ${save?.name ?? check.ability}`;
}

/** Bônus do personagem no teste pedido, pela ficha (perícia: total; resistência: salvaguarda). */
export function secretCheckModifier(sheet: CharacterSheetResponse, check: SecretRollCheck): number {
  const cs = sheet.character_sheet;
  if (check.kind === 'skill') {
    return cs.skills.find((s) => s.id_skill === check.id_skill)?.total_skill_value ?? 0;
  }
  return cs.attributes_and_saves[check.ability]?.save ?? 0;
}
