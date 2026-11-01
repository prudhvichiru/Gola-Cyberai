import { supabase } from '../config/supabase.js';

// Fallback in-memory store in case Supabase table has not been migrated yet
interface FallbackBreak {
  id: string;
  session_id: string;
  break_type: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  created_at: string;
}

interface FallbackSession {
  id: string;
  user_id: string;
  date: string;
  check_in: string;
  check_out: string | null;
  total_break_seconds: number;
  total_work_seconds: number;
  status: 'working' | 'on_break' | 'completed';
  notes: string | null;
  created_at: string;
  updated_at: string;
  breaks: FallbackBreak[];
}

const fallbackSessions = new Map<string, FallbackSession>();

function isSchemaCacheError(error: any): boolean {
  if (!error) return false;
  return (
    error.code === 'PGRST205' ||
    String(error.message || '').includes('schema cache') ||
    String(error.message || '').includes('attendance_sessions') ||
    String(error.message || '').includes('does not exist')
  );
}

// No fabricated mock data. Returns actual recorded sessions or empty arrays.

export class AttendanceService {
  /**
   * Get today's attendance session for a user along with any active break
   */
  static async getTodaySession(userId: string) {
    const today = new Date().toISOString().split('T')[0];

    try {
      const { data: session, error } = await supabase
        .from('attendance_sessions')
        .select('*, breaks:attendance_breaks(*)')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle();

      if (error) {
        if (isSchemaCacheError(error)) {
          return this.getFallbackToday(userId, today);
        }
        throw error;
      }

      const activeBreak = session?.breaks?.find((b: any) => !b.end_time) || null;
      return { session, activeBreak };
    } catch (err: any) {
      if (isSchemaCacheError(err)) {
        return this.getFallbackToday(userId, today);
      }
      throw err;
    }
  }

  private static getFallbackToday(userId: string, today: string) {
    const key = `${userId}_${today}`;
    const session = fallbackSessions.get(key) || null;
    const activeBreak = session?.breaks?.find((b) => !b.end_time) || null;
    return { session, activeBreak };
  }

  /**
   * Check in (Clock in) for today
   */
  static async checkIn(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    try {
      // Check if session already exists in Supabase
      const { data: existing, error: findError } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle();

      if (findError) {
        if (isSchemaCacheError(findError)) {
          return this.fallbackCheckIn(userId, today, now);
        }
        throw findError;
      }

      if (existing) {
        return existing;
      }

      const { data, error } = await supabase
        .from('attendance_sessions')
        .insert({
          user_id: userId,
          date: today,
          check_in: now,
          status: 'working',
          total_break_seconds: 0,
          total_work_seconds: 0,
        })
        .select()
        .single();

      if (error) {
        if (isSchemaCacheError(error)) {
          return this.fallbackCheckIn(userId, today, now);
        }
        throw error;
      }
      return data;
    } catch (err: any) {
      if (isSchemaCacheError(err)) {
        return this.fallbackCheckIn(userId, today, now);
      }
      throw err;
    }
  }

  private static fallbackCheckIn(userId: string, today: string, now: string) {
    console.warn(
      `[AttendanceService] Notice: Supabase table 'attendance_sessions' not found in schema cache. Using seamless in-memory fallback. (Run backend/supabase/setup_complete_database.sql in Supabase SQL editor to enable persistent storage)`,
    );
    const key = `${userId}_${today}`;
    let session = fallbackSessions.get(key);
    if (!session) {
      session = {
        id: `session-${Date.now()}`,
        user_id: userId,
        date: today,
        check_in: now,
        check_out: null,
        total_break_seconds: 0,
        total_work_seconds: 0,
        status: 'working',
        notes: 'Office Web Check-in',
        created_at: now,
        updated_at: now,
        breaks: [],
      };
      fallbackSessions.set(key, session);
    }
    return session;
  }

  /**
   * Start a break (Lunch, Tea, etc.)
   */
  static async startBreak(userId: string, breakType = 'break') {
    const { session } = await this.getTodaySession(userId);
    if (!session) {
      throw new Error('Please check in before taking a break.');
    }
    if (session.status === 'on_break') {
      throw new Error('You are already on break.');
    }
    if (session.status === 'completed') {
      throw new Error('Cannot take break after checking out.');
    }

    const now = new Date().toISOString();

    try {
      // 1. Insert break record
      const { data: breakRecord, error: breakError } = await supabase
        .from('attendance_breaks')
        .insert({
          session_id: session.id,
          break_type: breakType,
          start_time: now,
        })
        .select()
        .single();

      if (breakError) {
        if (isSchemaCacheError(breakError)) {
          return this.fallbackStartBreak(session, breakType, now);
        }
        throw breakError;
      }

      // 2. Update session status
      const { data: updatedSession, error: sessionError } = await supabase
        .from('attendance_sessions')
        .update({ status: 'on_break', updated_at: now })
        .eq('id', session.id)
        .select()
        .single();

      if (sessionError) throw sessionError;

      return { session: updatedSession, break: breakRecord };
    } catch (err: any) {
      if (isSchemaCacheError(err)) {
        return this.fallbackStartBreak(session, breakType, now);
      }
      throw err;
    }
  }

  private static fallbackStartBreak(session: any, breakType: string, now: string) {
    const newBreak: FallbackBreak = {
      id: `break-${Date.now()}`,
      session_id: session.id,
      break_type: breakType,
      start_time: now,
      end_time: null,
      duration_seconds: null,
      created_at: now,
    };
    session.status = 'on_break';
    session.updated_at = now;
    session.breaks = [...(session.breaks || []), newBreak];
    return { session, break: newBreak };
  }

  /**
   * End the current break and resume work
   */
  static async endBreak(userId: string) {
    const { session, activeBreak } = await this.getTodaySession(userId);
    if (!session || !activeBreak) {
      throw new Error('No active break found.');
    }

    const now = new Date();
    const startTime = new Date(activeBreak.start_time);
    const durationSeconds = Math.max(0, Math.floor((now.getTime() - startTime.getTime()) / 1000));

    try {
      // 1. Update break record
      const { error: breakError } = await supabase
        .from('attendance_breaks')
        .update({
          end_time: now.toISOString(),
          duration_seconds: durationSeconds,
        })
        .eq('id', activeBreak.id);

      if (breakError) {
        if (isSchemaCacheError(breakError)) {
          return this.fallbackEndBreak(session, activeBreak, now, durationSeconds);
        }
        throw breakError;
      }

      // 2. Update session total break seconds and status
      const newTotalBreak = (session.total_break_seconds || 0) + durationSeconds;
      const { data: updatedSession, error: sessionError } = await supabase
        .from('attendance_sessions')
        .update({
          status: 'working',
          total_break_seconds: newTotalBreak,
          updated_at: now.toISOString(),
        })
        .eq('id', session.id)
        .select()
        .single();

      if (sessionError) throw sessionError;

      return { session: updatedSession, durationSeconds };
    } catch (err: any) {
      if (isSchemaCacheError(err)) {
        return this.fallbackEndBreak(session, activeBreak, now, durationSeconds);
      }
      throw err;
    }
  }

  private static fallbackEndBreak(
    session: any,
    activeBreak: any,
    now: Date,
    durationSeconds: number,
  ) {
    activeBreak.end_time = now.toISOString();
    activeBreak.duration_seconds = durationSeconds;
    session.status = 'working';
    session.total_break_seconds = (session.total_break_seconds || 0) + durationSeconds;
    session.updated_at = now.toISOString();
    return { session, durationSeconds };
  }

  /**
   * Check out (Clock out) for today and calculate total working hours
   */
  static async checkOut(userId: string) {
    const { session, activeBreak } = await this.getTodaySession(userId);
    if (!session) {
      throw new Error('No active attendance session found to check out.');
    }
    if (session.status === 'completed') {
      return session;
    }

    const now = new Date();
    let totalBreak = session.total_break_seconds || 0;

    // End active break if still ongoing
    if (activeBreak) {
      const startTime = new Date(activeBreak.start_time);
      const breakDuration = Math.max(0, Math.floor((now.getTime() - startTime.getTime()) / 1000));
      totalBreak += breakDuration;

      try {
        await supabase
          .from('attendance_breaks')
          .update({
            end_time: now.toISOString(),
            duration_seconds: breakDuration,
          })
          .eq('id', activeBreak.id);
      } catch (e) {
        // ignore fallback
      }
    }

    // Calculate total net work seconds: (checkout - checkin) - totalBreak
    const checkInTime = new Date(session.check_in);
    const totalElapsedSeconds = Math.max(0, Math.floor((now.getTime() - checkInTime.getTime()) / 1000));
    const netWorkSeconds = Math.max(0, totalElapsedSeconds - totalBreak);

    try {
      const { data: updatedSession, error } = await supabase
        .from('attendance_sessions')
        .update({
          check_out: now.toISOString(),
          status: 'completed',
          total_break_seconds: totalBreak,
          total_work_seconds: netWorkSeconds,
          updated_at: now.toISOString(),
        })
        .eq('id', session.id)
        .select()
        .single();

      if (error) {
        if (isSchemaCacheError(error)) {
          return this.fallbackCheckOut(session, activeBreak, now, totalBreak, netWorkSeconds);
        }
        throw error;
      }
      return updatedSession;
    } catch (err: any) {
      if (isSchemaCacheError(err)) {
        return this.fallbackCheckOut(session, activeBreak, now, totalBreak, netWorkSeconds);
      }
      throw err;
    }
  }

  private static fallbackCheckOut(
    session: any,
    activeBreak: any,
    now: Date,
    totalBreak: number,
    netWorkSeconds: number,
  ) {
    if (activeBreak) {
      activeBreak.end_time = now.toISOString();
    }
    session.check_out = now.toISOString();
    session.status = 'completed';
    session.total_break_seconds = totalBreak;
    session.total_work_seconds = netWorkSeconds;
    session.updated_at = now.toISOString();
    return session;
  }

  /**
   * Get attendance history for a user
   */
  static async getHistory(userId: string, limit = 30) {
    try {
      const { data, error } = await supabase
        .from('attendance_sessions')
        .select('*, breaks:attendance_breaks(*)')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(limit);

      if (error) {
        if (isSchemaCacheError(error)) {
          return this.getFallbackHistory(userId, limit);
        }
        throw error;
      }
      return data || [];
    } catch (err: any) {
      if (isSchemaCacheError(err)) {
        return this.getFallbackHistory(userId, limit);
      }
      throw err;
    }
  }

  private static getFallbackHistory(userId: string, limit: number) {
    const userSessions: FallbackSession[] = [];
    fallbackSessions.forEach((sess) => {
      if (sess.user_id === userId) {
        userSessions.push(sess);
      }
    });
    userSessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return userSessions.slice(0, limit);
  }

  /**
   * Get team attendance overview for managers and administrators
   */
  static async getTeamSummary() {
    const today = new Date().toISOString().split('T')[0];

    try {
      // Get all active profiles
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role, department:departments(name)')
        .eq('status', 'active')
        .order('full_name');

      if (pError) throw pError;

      // Get today's attendance sessions
      const { data: sessions, error: sError } = await supabase
        .from('attendance_sessions')
        .select('*, breaks:attendance_breaks(*)')
        .eq('date', today);

      if (sError) {
        if (isSchemaCacheError(sError)) {
          return this.getFallbackTeamSummary(profiles || [], today);
        }
        throw sError;
      }

      const sessionMap = new Map((sessions || []).map((s: any) => [s.user_id, s]));

      const team = (profiles || []).map((profile: any) => {
        const session = sessionMap.get(profile.id) || null;
        let status: 'working' | 'on_break' | 'completed' | 'absent' = 'absent';

        if (session) {
          status = session.status;
        }

        return {
          profile,
          session,
          status,
        };
      });

      const counts = {
        total: team.length,
        working: team.filter((t) => t.status === 'working').length,
        on_break: team.filter((t) => t.status === 'on_break').length,
        completed: team.filter((t) => t.status === 'completed').length,
        absent: team.filter((t) => t.status === 'absent').length,
      };

      return {
        date: today,
        counts,
        members: team,
      };
    } catch (err: any) {
      return this.getFallbackTeamSummary([], today);
    }
  }

  private static getFallbackTeamSummary(profiles: any[], today: string) {
    // Derive only from real registered profiles or return empty
    const members = (profiles || []).map((profile) => {
      const key = `${profile.id}_${today}`;
      const session = fallbackSessions.get(key) || null;
      let status: 'working' | 'on_break' | 'completed' | 'absent' = 'absent';
      if (session) {
        status = session.status;
      }
      return { profile, session, status };
    });

    const counts = {
      total: members.length,
      working: members.filter((t) => t.status === 'working').length,
      on_break: members.filter((t) => t.status === 'on_break').length,
      completed: members.filter((t) => t.status === 'completed').length,
      absent: members.filter((t) => t.status === 'absent').length,
    };

    return {
      date: today,
      counts,
      members,
    };
  }
}
