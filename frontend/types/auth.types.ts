import type { User, Session } from '@supabase/supabase-js';

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials extends SignInCredentials {
  firstName: string;
  lastName?: string;
}

export interface AuthResponse<T = Session | null> {
  data: T;
  error: Error | null;
}

export interface CurrentUserSession {
  user: User | null;
  session: Session | null;
}
