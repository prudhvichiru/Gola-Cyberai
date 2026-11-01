import { AuthServerService, ProfileServerService } from '@/services/server';
import { PageHeader } from '@/components/page-header';
import { DocumentsCenter } from '@/features/hr';
import { HRClientService } from '@/services/hr.service';
import { createClient } from '@/lib/supabase-server';
import type { UserRole } from '@/constants/roles';
import type { EmployeeProfile } from '@/types/hr.types';

export default async function HRDocumentsPage() {
  const session = await AuthServerService.requireAuth();
  const profile = await ProfileServerService.getProfile(session.user.id);
  const role = (profile?.role || 'employee') as UserRole;
  const canUpload = role === 'hr' || role === 'admin';

  const sb = await createClient();

  const employees: EmployeeProfile[] = [];
  if (canUpload) {
    const { data: profilesData } = await sb
      .from('profiles')
      .select('id, full_name, first_name, last_name, email, role, status, employee_id, department_id, created_at, updated_at')
      .order('full_name');

    if (profilesData) {
      for (const p of profilesData) {
        employees.push({
          id: p.id,
          employee_id: p.employee_id || `GCA-${p.id.slice(0, 4).toUpperCase()}`,
          full_name: p.full_name || p.email,
          first_name: p.first_name || '',
          last_name: p.last_name || '',
          email: p.email,
          role: p.role,
          status: p.status || 'active',
          department_id: p.department_id,
          created_at: p.created_at,
          updated_at: p.updated_at || p.created_at,
        });
      }
    }
  }

  const documents = await HRClientService.getDocuments();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employment Letters & Company Documents"
        description="Official correspondence, offer letters, appointment agreements, and corporate compliance policies."
      />
      <DocumentsCenter
        initialDocuments={documents}
        employees={employees}
        canUpload={canUpload}
      />
    </div>
  );
}
