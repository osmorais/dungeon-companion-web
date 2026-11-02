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
}

export interface DeleteAccountRequest {
  confirm_email: string;
  password?: string;
}
