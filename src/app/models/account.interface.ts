export interface AccountProfile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string | null;
  has_password: boolean;
  google_linked: boolean;
}

export interface DeleteAccountRequest {
  confirm_email: string;
  password?: string;
}
