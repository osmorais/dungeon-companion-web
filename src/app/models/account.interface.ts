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
}

export interface DeleteAccountRequest {
  confirm_email: string;
  password?: string;
}
