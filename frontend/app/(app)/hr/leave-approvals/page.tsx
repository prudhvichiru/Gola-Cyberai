import { AuthServerService, ProfileServerService } from '@/services/server';
import { PageHeader } from '@/components/page-header';
import { LeaveApprovalQueue } from '@/features/hr';
import { HRClientService } from '@/services/hr.service';
import type { UserRole } from '@/constants/roles';
import { redirect } from 'next/navigation';

export default async function LeaveApprovalsPage() {
  const session = await AuthServerService.requireAuth();
  const profile = await ProfileServerService.getProfile(session.user.id);
  const role = (profile?.role || 'employee') as UserRole;

  // Role guard: Only managers, HR, and admins can access approval queue
  if (role !== 'manager' && role !== 'hr' && role !== 'admin') {
    redirect('/hr/leave-requests');
  }

  const queue = await HRClientService.getApprovalQueue();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Approval Queue"
        description="Review, authorize, or reject pending team leave applications with audit logging."
      />

      <LeaveApprovalQueue reviewerId={session.user.id} initialQueue={queue} />
    </div>
  );
}