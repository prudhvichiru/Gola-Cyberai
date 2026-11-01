import { AuthServerService, ProfileServerService } from '@/services/server';
import { PageHeader } from '@/components/page-header';
import { AttendancePageClient } from '@/features/attendance';
import { AttendanceClientService } from '@/services/attendance.service';
import type { UserRole } from '@/constants/roles';

export default async function AttendancePage() {
  const session = await AuthServerService.requireAuth();
  const profile = await ProfileServerService.getProfile(session.user.id);
  const role = (profile?.role || 'employee') as UserRole;

  // Server-side initial data fetch
  const { session: todaySession, activeBreak } =
    await AttendanceClientService.getToday(session.user.id);

  const history = await AttendanceClientService.getHistory(session.user.id);

  let teamSummary = null;
  if (role === 'manager' || role === 'hr' || role === 'admin') {
    teamSummary = await AttendanceClientService.getTeamSummary();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance & Working Hours"
        description="Clock in, manage your daily breaks, and review verified shift records."
      />

      <AttendancePageClient
        userId={session.user.id}
        role={role}
        initialSession={todaySession}
        initialActiveBreak={activeBreak}
        initialHistory={history}
        initialTeamSummary={teamSummary}
      />
    </div>
  );
}