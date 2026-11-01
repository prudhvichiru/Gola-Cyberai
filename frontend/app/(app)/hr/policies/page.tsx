import { AuthServerService, ProfileServerService } from '@/services/server';
import { PageHeader } from '@/components/page-header';
import { PoliciesCenter } from '@/features/hr';
import { HRClientService } from '@/services/hr.service';
import type { UserRole } from '@/constants/roles';

export default async function PoliciesPage() {
  const session = await AuthServerService.requireAuth();
  const profile = await ProfileServerService.getProfile(session.user.id);
  const role = (profile?.role || 'employee') as UserRole;
  const canUpload = role === 'hr' || role === 'admin';

  const documents = await HRClientService.getDocuments('company_policy');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Policies & Charters"
        description="Official employee handbooks, non-disclosure agreements, and security compliance charters."
      />
      <PoliciesCenter initialDocuments={documents} canUpload={canUpload} />
    </div>
  );
}
