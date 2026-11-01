import { AuthServerService, ProfileServerService } from '@/services/server';
import { PageHeader } from '@/components/page-header';
import { LeaveDashboard } from '@/features/hr';
import { HRClientService } from '@/services/hr.service';

export default async function LeaveRequestsPage() {
  const session = await AuthServerService.requireAuth();

  const [balances, requests, holidays, leaveTypes] = await Promise.all([
    HRClientService.getLeaveBalances(session.user.id),
    HRClientService.getMyLeaveRequests(session.user.id),
    HRClientService.getHolidays(),
    HRClientService.getLeaveTypes(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Management & Balances"
        description="Apply for time off, review leave quota balances, and inspect the company holiday calendar."
      />

      <LeaveDashboard
        userId={session.user.id}
        initialBalances={balances}
        initialRequests={requests}
        holidays={holidays}
        leaveTypes={leaveTypes}
      />
    </div>
  );
}