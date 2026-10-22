import { AvatarPreset } from './avatar-preset.interface';

/** Um feito no ranking: personagem numa sessão (GET /api/ranking). */
export interface RankingEntry {
  position: number;
  id_character: number;
  character_name: string;
  avatar_preset: AvatarPreset | null;
  /** Nome de jogador usado naquela mesa (o apelido digitado ao entrar). */
  player_name: string;
  session_name: string;
  value: number;
}

export interface RankingCategory {
  key: string;
  title: string;
  description: string;
  unit: string;
  entries: RankingEntry[];
}

export interface RankingResponse {
  categories: RankingCategory[];
}
