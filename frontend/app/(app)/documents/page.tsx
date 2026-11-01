import { redirect } from 'next/navigation';
import { AuthServerService, ProfileServerService } from '@/services/server';
import { PageHeader } from '@/components/page-header';
import { DocumentsCenter } from '@/features/hr';
import { HRClientService } from '@/services/hr.service';
import type { UserRole } from '@/constants/roles';

export default async function DocumentsPage() {
  const session = await AuthServerService.requireAuth();
  const profile = await ProfileServerService.getProfile(session.user.id);
  const role = (profile?.role || 'employee') as UserRole;

  if (role === 'employee') {
    redirect('/dashboard');
  }

  const canUpload = role === 'hr' || role === 'admin';
  const documents = await HRClientService.getDocuments();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Center"
        description="Access company policies, formal employment letters, and statutory organization agreements."
      />

      <DocumentsCenter initialDocuments={documents} canUpload={canUpload} />
    </div>
  );
}