import type { UserProfile } from './user.types';

export type AttendanceStatus = 'not_started' | 'working' | 'on_break' | 'completed' | 'absent';

export interface AttendanceBreak {
  id: string;
  session_id: string;
  break_type: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
}

export interface AttendanceSession {
  id: string;
  user_id: string;
  date: string;
  check_in: string;
  check_out: string | null;
  total_break_seconds: number;
  total_work_seconds: number;
  status: 'working' | 'on_break' | 'completed';
  notes?: string | null;
  created_at: string;
  updated_at: string;
  breaks?: AttendanceBreak[];
}

export interface TeamMemberAttendance {
  profile: UserProfile;
  session: AttendanceSession | null;
  status: AttendanceStatus;
}

export interface TeamAttendanceSummary {
  date: string;
  counts: {
    total: number;
    working: number;
    on_break: number;
    completed: number;
    absent: number;
  };
  members: TeamMemberAttendance[];
}
