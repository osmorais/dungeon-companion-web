export interface AccountProfile {
  id: string;
  email: string;
  full_name: string | null;
  /** Nome de usuário (1.9.0) — aparece pra mesa e no ranking. */
  username: string | null;
  created_at: string | null;
  has_password: boolean;
  google_linked: boolean;
  /** Aparece no ranking global (padrão sim). */
  show_in_ranking: boolean;
  /** Último acesso (1.17.8), gravado no máximo uma vez por hora; `null` antes do primeiro. */
  last_access_at?: string | null;
  /** Amigos (1.18.0): aparece na busca de jogadores por parte do nome (senão, só pelo nome exato). */
  discoverable: boolean;
  /** Amigos (1.18.0): outros jogadores podem enviar solicitação de amizade. */
  accept_friend_requests: boolean;
  /** Amigos (1.18.0): 'friends' — amigos veem se está online; 'nobody' — aparece offline. */
  presence_visibility: 'friends' | 'nobody';
  /** Amigos (1.18.0): amigos veem a última atividade quando está offline. */
  show_last_seen: boolean;
}

export type FriendPrivacyPreference = 'discoverable' | 'accept_friend_requests' | 'show_last_seen';

export interface DeleteAccountRequest {
  confirm_email: string;
  password?: string;
}
