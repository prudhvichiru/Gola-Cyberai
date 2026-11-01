import { AuthServerService, ProfileServerService } from '@/services/server';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { ROLE_LABELS, type UserRole } from '@/constants/roles';
import { ShieldCheck } from 'lucide-react';
import { RoleDashboardView, type DashboardRole } from '@/features/dashboard/components/role-dashboard-view';

export default async function DashboardPage() {
  // 1. Authenticate server-side via AuthServerService
  const session = await AuthServerService.requireAuth();

  // 2. Fetch User Profile via ProfileServerService
  let profile = await ProfileServerService.getProfile(session.user.id);

  const meta = session.user.user_metadata || {};
  const activeProfile = profile || {
    id: session.user.id,
    email: session.user.email || 'employee@golacyberai.internal',
    full_name: (meta.full_name as string) || (session.user.email?.split('@')[0]) || 'User',
    role: ((meta.role as UserRole) || (session.user.email === 'golacyberai@gmail.com' ? 'admin' : 'employee')) as UserRole,
    status: 'active',
    department_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const role = (activeProfile.role as DashboardRole) || 'employee';

  return (
    <div className="space-y-6 animate-in-up">
      {/* Enterprise Header */}
      <PageHeader
        title={`Welcome back, ${activeProfile.full_name?.split(' ')[0] ?? 'there'}`}
        description="Here's what's happening in your enterprise workspace today."
        actions={<StatusBadge role={role as UserRole} label={`${ROLE_LABELS[role as UserRole] || 'Role'} View`} />}
      />

      {/* Role-Specific Perspective Dashboard */}
      <RoleDashboardView
        initialRole={role}
        userName={activeProfile.full_name || 'Team Member'}
      />
    </div>
  );
}