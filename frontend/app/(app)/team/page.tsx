import { AuthServerService, ProfileServerService } from '@/services/server';
import { PageHeader } from '@/components/page-header';
import { EmployeeDirectory } from '@/features/hr';
import { HRClientService } from '@/services/hr.service';
import { createClient } from '@/lib/supabase-server';
import type { UserRole } from '@/constants/roles';
import type { EmployeeProfile } from '@/types/hr.types';

export default async function TeamPage() {
  const session = await AuthServerService.requireAuth();
  const profile = await ProfileServerService.getProfile(session.user.id);
  const role = (profile?.role || 'employee') as UserRole;

  // Load employees directly from Supabase profiles table (bypasses backend anon key issue)
  const sb = await createClient();
  const { data: profilesData } = await sb
    .from('profiles')
    .select('id, full_name, first_name, last_name, email, role, status, avatar_url, phone, department_id, designation_id, manager_id, hired_at, employee_id, created_at, updated_at')
    .order('role')
    .order('full_name');

  const employees: EmployeeProfile[] = (profilesData || []).map((p: any) => ({
    id: p.id,
    employee_id: p.employee_id || `GCA-${p.id.slice(0, 4).toUpperCase()}`,
    full_name: p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email,
    first_name: p.first_name || '',
    last_name: p.last_name || '',
    email: p.email,
    role: p.role,
    status: p.status || 'active',
    avatar_url: p.avatar_url,
    phone: p.phone,
    department_id: p.department_id,
    designation_id: p.designation_id,
    manager_id: p.manager_id,
    hired_at: p.hired_at,
    created_at: p.created_at,
    updated_at: p.updated_at || p.created_at,
  }));

  const [departments, designations] = await Promise.all([
    HRClientService.getDepartments().catch(() => []),
    HRClientService.getDesignations().catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Directory"
        description="Connect with colleagues, find departmental leads, and browse organizational rosters."
      />

      <EmployeeDirectory
        initialEmployees={employees}
        departments={departments}
        designations={designations}
        userRole={role}
      />
    </div>
  );
}
