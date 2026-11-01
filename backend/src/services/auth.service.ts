import { supabaseAdmin as supabase } from '../config/supabase.js';

export class AuthService {
  static async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  static async signUp(email: string, password: string, firstName: string, lastName?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName || '',
        },
      },
    });
    if (error) throw error;
    return data;
  }

  static async getUser(token: string) {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) throw error;
    return data.user;
  }

  static async requestAccess(data: {
    fullName: string;
    email: string;
    department?: string;
    requestedRole: string;
    reason: string;
  }) {
    const ticketId = `REQ-${Date.now().toString().slice(-6)}`;
    const requestRecord = {
      ticket_id: ticketId,
      full_name: data.fullName,
      email: data.email,
      department: data.department || 'General',
      requested_role: data.requestedRole,
      reason: data.reason,
      status: 'pending_review',
      created_at: new Date().toISOString(),
    };
    return requestRecord;
  }
}
