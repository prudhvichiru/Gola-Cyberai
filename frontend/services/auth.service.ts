import { createClient } from '@/lib/supabase-client';
import { fetchApi } from './api';
import type { SignInCredentials, SignUpCredentials } from '@/types/auth.types';

export class AuthClientService {
  static async signIn({ email, password }: SignInCredentials) {
    const supabase = createClient();
    return await supabase.auth.signInWithPassword({
      email,
      password,
    });
  }

  static async signUp({ email, password, firstName, lastName }: SignUpCredentials) {
    const supabase = createClient();
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName || '',
        },
      },
    });
  }

  static async signOut() {
    const supabase = createClient();
    return await supabase.auth.signOut();
  }

  static async requestAccess(payload: {
    fullName: string;
    email: string;
    department?: string;
    requestedRole: string;
    reason: string;
  }) {
    return await fetchApi<{ message: string; data: { ticket_id: string; status: string } }>('/auth/request-access', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}
