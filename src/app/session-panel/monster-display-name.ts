import { MonsterSession } from '../models/game-session.interface';

/** Nome do monstro na sessão: o apelido dado pelo mestre ou o slug da API em "Title Case". */
export function monsterDisplayName(
  monster: Pick<MonsterSession, 'custom_name' | 'monster_api_slug'>,
): string {
  if (monster.custom_name) return monster.custom_name;
  return monster.monster_api_slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
