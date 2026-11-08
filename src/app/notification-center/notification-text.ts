import { AppNotification } from '../models/friend.interface';

/** Texto da notificação pro jogador. Tipo desconhecido (versão nova da API) cai num genérico. */
export function notificationText(n: AppNotification): string {
  const who = n.actor?.username ?? 'Um jogador';
  switch (n.type) {
    case 'friend_request_received':
      return `${who} quer ser seu amigo.`;
    case 'friend_request_accepted':
      return `${who} aceitou sua solicitação de amizade.`;
    case 'session_invite_received':
      return `${who} convidou você para uma mesa.`;
    case 'session_invite_accepted':
      return `${who} aceitou o convite e entrou na sua mesa.`;
    case 'session_invite_rejected':
      return `${who} recusou o convite para a sua mesa.`;
    default:
      return 'Você tem uma novidade em Amigos.';
  }
}

/** Para onde a notificação leva (a página confere o acesso de novo pela API). */
export function notificationLink(n: AppNotification): {
  commands: string[];
  queryParams?: Record<string, string>;
} {
  switch (n.type) {
    case 'friend_request_received':
    case 'session_invite_received':
    case 'session_invite_rejected':
      return { commands: ['/amigos'], queryParams: { aba: 'requests' } };
    case 'session_invite_accepted':
      return n.payload['id_game_session']
        ? { commands: ['/session', n.payload['id_game_session']] }
        : { commands: ['/amigos'] };
    default:
      return { commands: ['/amigos'], queryParams: { aba: 'all' } };
  }
}

/** "agora", "há 5 min", "há 3 h", "há 2 dias". */
export function timeAgo(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `há ${days} dia${days > 1 ? 's' : ''}`;
}
