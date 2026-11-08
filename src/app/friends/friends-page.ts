import {
  ChosenPresenceStatus,
  FriendPresence,
  PlayAvailability,
  PlayerRelationship,
} from '../models/friend.interface';

export type FriendsTab = 'all' | 'online' | 'requests' | 'discover' | 'blocked';

export const FRIENDS_TABS: { key: FriendsTab; title: string }[] = [
  { key: 'all', title: 'TODOS' },
  { key: 'online', title: 'ONLINE' },
  { key: 'requests', title: 'SOLICITAÇÕES' },
  { key: 'discover', title: 'DESCOBRIR' },
  { key: 'blocked', title: 'BLOQUEADOS' },
];

export const FRIENDS_PAGE_SIZE = 12;
/** Igual ao backend (PLAYER_SEARCH_MIN_LENGTH). */
export const PLAYER_SEARCH_MIN_LENGTH = 2;

/** Inicial do nome no lugar do avatar (o usuário não tem foto própria). */
export function avatarInitial(username: string | null | undefined): string {
  const first = (username ?? '').trim().charAt(0);
  return first ? first.toUpperCase() : '?';
}

/** Data curta (dd/mm/aaaa) pra "amigos desde" e "bloqueado em". */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** Ação principal do jogador encontrado na busca, conforme a relação. */
export function discoverAction(relationship: PlayerRelationship): {
  label: string;
  disabled: boolean;
} {
  switch (relationship) {
    case 'friend':
      return { label: 'JÁ SÃO AMIGOS', disabled: true };
    case 'request_sent':
      return { label: 'CANCELAR PEDIDO', disabled: false };
    case 'request_received':
      return { label: 'ACEITAR PEDIDO', disabled: false };
    case 'blocked':
      return { label: 'DESBLOQUEAR', disabled: false };
    default:
      return { label: 'ADICIONAR', disabled: false };
  }
}

export function isFriendsTab(value: unknown): value is FriendsTab {
  return FRIENDS_TABS.some((t) => t.key === value);
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
