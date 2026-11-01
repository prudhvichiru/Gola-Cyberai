import { createClient as createServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { ROUTES } from '@/constants/routes';
import type { UserProfile } from '@/types/user.types';
import type { DashboardStatItem } from '@/types/dashboard.types';
import { Clock, CheckCircle2, Calendar, MessageSquare } from 'lucide-react';

export class AuthServerService {
  static async getSession() {
    const supabase = await createServerClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    return { session, error };
  }

  static async requireAuth() {
    const { session } = await this.getSession();
    if (!session) {
      redirect(ROUTES.AUTH.SIGN_IN);
    }
    return session;
  }
}

export class ProfileServerService {
  static async getProfile(userId: string): Promise<UserProfile | null> {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('[ProfileServerService.getProfile] Error:', error);
      return null;
    }
    return data as UserProfile | null;
  }

  static async getActiveEmployeeCount(): Promise<number> {
    const supabase = await createServerClient();
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');

    return count || 0;
  }
}

export class DashboardServerService {
  static async getDashboardMetrics(userId?: string) {
    const supabase = await createServerClient();
    const today = new Date().toISOString().split('T')[0];

    const [deptRes, empCount, attendanceRes] = await Promise.all([
      supabase.from('departments').select('id', { count: 'exact', head: true }),
      ProfileServerService.getActiveEmployeeCount(),
      userId
        ? supabase
            .from('attendance_sessions')
            .select('*')
            .eq('user_id', userId)
            .eq('date', today)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const session = attendanceRes.data;
    let workingHoursText = '0h 00m';
    let attendanceHint = 'No active session';

    if (session) {
      if (session.status === 'completed') {
        const h = Math.floor(session.total_work_seconds / 3600);
        const m = Math.floor((session.total_work_seconds % 3600) / 60);
        workingHoursText = `${h}h ${String(m).padStart(2, '0')}m`;
        attendanceHint = 'Shift completed';
      } else if (session.status === 'working') {
        const elapsed = Math.max(0, Math.floor((Date.now() - new Date(session.check_in).getTime()) / 1000));
        const netSec = Math.max(0, elapsed - (session.total_break_seconds || 0));
        const h = Math.floor(netSec / 3600);
        const m = Math.floor((netSec % 3600) / 60);
        workingHoursText = `${h}h ${String(m).padStart(2, '0')}m`;
        attendanceHint = 'Currently clocked in';
      } else if (session.status === 'on_break') {
        attendanceHint = 'Currently on break';
      }
    }

    const stats: DashboardStatItem[] = [
      {
        id: 'working-hours',
        label: 'Working hours today',
        value: workingHoursText,
        hint: attendanceHint,
        icon: Clock,
        tone: session?.status === 'working' ? 'success' : 'primary',
      },
      {
        id: 'tasks-completed',
        label: 'Tasks completed',
        value: '0',
        hint: 'No tasks yet',
        icon: CheckCircle2,
        tone: 'success',
      },
      {
        id: 'upcoming-meetings',
        label: 'Upcoming meetings',
        value: '0',
        hint: 'Nothing scheduled',
        icon: Calendar,
        tone: 'accent',
      },
      {
        id: 'unread-messages',
        label: 'Unread messages',
        value: '0',
        hint: 'Inbox empty',
        icon: MessageSquare,
        tone: 'neutral',
      },
    ];

    return {
      stats,
      departmentCount: deptRes.count || 0,
      activeEmployeeCount: empCount,
    };
  }
}
