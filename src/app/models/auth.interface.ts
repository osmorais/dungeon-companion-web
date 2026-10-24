export interface UserPublic {
  id: string;
  email: string;
  /** Nome de usuário (1.9.0). `null` = conta antiga ou criada com o Google, ainda sem escolher. */
  username: string | null;
}

export interface AuthResponse {
  user: UserPublic;
  token: string;
}

export interface MeResponse {
  id: string;
  email: string;
  username: string | null;
}

/** Resposta de `GET /auth/username-available`. */
export interface UsernameCheck {
  username: string;
  available: boolean;
  /** Problema de formato, se houver. */
  error: string | null;
  /** Nomes livres parecidos — só quando o pedido não está disponível. */
  suggestions: string[];
}
