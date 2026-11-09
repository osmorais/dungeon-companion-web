import {
  ChosenPresenceStatus,
  FriendPresence,
  PlayAvailability,
  PlayerRelationship,
} from '../models/friend.interface';

export const FRIENDS_PAGE_SIZE = 12;
/** Igual ao backend (PLAYER_SEARCH_MIN_LENGTH). */
export const PLAYER_SEARCH_MIN_LENGTH = 2;

/** Data curta (dd/mm/aaaa) pra "amigos desde" e "bloqueado em". */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/**
 * Ação principal do jogador encontrado na busca, conforme a relação: `icon` é o arquivo em
 * assets/icons (`null` = ✕) e `label`, a dica do botão. Amigos não aparecem nessa lista.
 */
export function discoverAction(relationship: PlayerRelationship): {
  icon: string | null;
  label: string;
} {
  switch (relationship) {
    case 'request_sent':
      return { icon: null, label: 'Cancelar pedido' };
    case 'request_received':
      return { icon: 'check', label: 'Aceitar pedido' };
    case 'blocked':
      return { icon: 'padlock', label: 'Desbloquear' };
    default:
      return { icon: 'heart', label: 'Adicionar aos amigos' };
  }
}

export const PRESENCE_LABELS: Record<FriendPresence['presence'], string> = {
  online: 'ONLINE',
  away: 'AUSENTE',
  busy: 'OCUPADO',
  offline: 'OFFLINE',
};

export const MY_STATUS_OPTIONS: { value: ChosenPresenceStatus; label: string }[] = [
  { value: 'online', label: 'ONLINE' },
  { value: 'away', label: 'AUSENTE' },
  { value: 'busy', label: 'OCUPADO' },
];

/** Linha de presença do card: "ONLINE · QUER JOGAR", "OFFLINE · VISTO EM 03/11/2026". */
export function presenceLine(p: FriendPresence): string {
  const parts = [PRESENCE_LABELS[p.presence] ?? 'OFFLINE'];
  if (p.presence !== 'offline' && p.availability === 'available') parts.push('QUER JOGAR');
  if (p.presence === 'offline' && p.last_seen_at)
    parts.push(`VISTO EM ${shortDate(p.last_seen_at)}`);
  return parts.join(' · ');
}

export function availabilityToggle(current: PlayAvailability): PlayAvailability {
  return current === 'available' ? 'not_available' : 'available';
}

export function totalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
