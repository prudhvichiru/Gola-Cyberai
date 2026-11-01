import { fetchApi } from './api';
import type {
  AttendanceSession,
  AttendanceBreak,
  TeamAttendanceSummary,
} from '@/types/attendance.types';

export class AttendanceClientService {
  /**
   * Get today's attendance session and active break
   */
  static async getToday(userId: string): Promise<{
    session: AttendanceSession | null;
    activeBreak: AttendanceBreak | null;
  }> {
    const res = await fetchApi<{
      session: AttendanceSession | null;
      activeBreak: AttendanceBreak | null;
    }>(`/attendance/today?userId=${encodeURIComponent(userId)}`);

    if (res.error || !res.data) {
      return { session: null, activeBreak: null };
    }
    return res.data;
  }

  /**
   * Check in (Clock in)
   */
  static async checkIn(userId: string) {
    return await fetchApi<{ message: string; data: AttendanceSession }>('/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  /**
   * Start a break (Lunch, Tea, etc.)
   */
  static async startBreak(userId: string, breakType = 'break') {
    return await fetchApi<{ message: string; data: { session: AttendanceSession; break: AttendanceBreak } }>(
      '/attendance/break/start',
      {
        method: 'POST',
        body: JSON.stringify({ userId, breakType }),
      },
    );
  }

  /**
   * End current break and resume work
   */
  static async endBreak(userId: string) {
    return await fetchApi<{ message: string; data: { session: AttendanceSession; durationSeconds: number } }>(
      '/attendance/break/end',
      {
        method: 'POST',
        body: JSON.stringify({ userId }),
      },
    );
  }

  /**
   * Check out (Clock out)
   */
  static async checkOut(userId: string) {
    return await fetchApi<{ message: string; data: AttendanceSession }>('/attendance/check-out', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  /**
   * Get attendance history
   */
  static async getHistory(userId: string, limit = 30): Promise<AttendanceSession[]> {
    const res = await fetchApi<{ records: AttendanceSession[] }>(
      `/attendance/history?userId=${encodeURIComponent(userId)}&limit=${limit}`,
    );
    return res.data?.records || [];
  }

  /**
   * Get team attendance summary for managers/admins
   */
  static async getTeamSummary(): Promise<TeamAttendanceSummary | null> {
    const res = await fetchApi<TeamAttendanceSummary>('/attendance/team-summary');
    return res.data || null;
  }
}
