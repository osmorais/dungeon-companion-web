/** O que se vê de outro jogador: só o id e o nome de usuário. */
export interface SocialUser {
  id: string;
  username: string;
}

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';
export type ChosenPresenceStatus = Exclude<PresenceStatus, 'offline'>;
export type PlayAvailability = 'available' | 'not_available';

/** Presença de um amigo, já com as preferências de privacidade dele aplicadas pela API. */
export interface FriendPresence {
  presence: PresenceStatus;
  availability: PlayAvailability | null;
  /** Última atividade: só quando offline e só se o amigo deixou mostrar. */
  last_seen_at: string | null;
}

export interface Friend extends SocialUser, FriendPresence {
  friends_since: string;
}

export interface MyPresence {
  status: ChosenPresenceStatus;
  availability: PlayAvailability;
  connected: boolean;
}

export type NotificationType =
  | 'friend_request_received'
  | 'friend_request_accepted'
  | 'session_invite_received'
  | 'session_invite_accepted'
  | 'session_invite_rejected';

export interface AppNotification {
  id_notification: string;
  type: NotificationType;
  payload: Record<string, string>;
  actor: SocialUser | null;
  /** Solicitação de amizade que ainda dá pra responder por esta notificação; senão, null. */
  pending_friend_request_id: string | null;
  read_at: string | null;
  created_at: string;
}

/** Eventos do socket `/social` (cada um só chega ao próprio usuário). */
export type SocialEvent =
  | { type: 'notification_created'; user_id: string; notification: AppNotification }
  | {
      type: 'social_changed';
      user_id: string;
      scope: 'friends' | 'requests' | 'blocked' | 'invites';
    }
  | { type: 'presence_updated'; user_id: string; friend: { id: string } & FriendPresence };

/** Convite para mesa visto por um dos lados — `user` é o mestre (recebido) ou o convidado (enviado). */
export interface SessionInviteView {
  id_session_invite: string;
  id_game_session: string;
  session_name: string;
  message: string | null;
  created_at: string;
  expires_at: string;
  user: SocialUser;
}

/** Solicitação vista por um dos lados — `user` é a outra pessoa. */
export interface FriendRequestView {
  id_friend_request: string;
  created_at: string;
  user: SocialUser;
}

export interface BlockedUser extends SocialUser {
  blocked_at: string;
}

export type PlayerRelationship =
  | 'none'
  | 'friend'
  | 'request_sent'
  | 'request_received'
  | 'blocked';

export interface PlayerSearchResult extends SocialUser {
  relationship: PlayerRelationship;
  id_friend_request: string | null;
}

export interface PagedList<T> {
  items: T[];
  page: number;
  pageSize: number;
  total_count: number;
}

export interface FriendRequestCounts {
  received: number;
  sent: number;
}

export interface FriendRequest {
  id_friend_request: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  created_at: string;
  responded_at: string | null;
}

/** `accepted`: o outro jogador já tinha pedido — enviar virou aceitar, e a amizade já existe. */
export interface SendFriendRequestResult {
  status: 'pending' | 'accepted';
  request: FriendRequest;
}
