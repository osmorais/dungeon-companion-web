export interface UserPublic {
  id: string;
  email: string;
  full_name?: string;
}

export interface AuthResponse {
  user: UserPublic;
  token: string;
}

export interface MeResponse {
  id: string;
  email: string;
}
