import { AuthServerService, ProfileServerService } from '@/services/server';
import { PageHeader } from '@/components/page-header';
import { DepartmentManagement } from '@/features/hr';
import { HRClientService } from '@/services/hr.service';
import type { UserRole } from '@/constants/roles';

export default async function DepartmentsPage() {
  const session = await AuthServerService.requireAuth();
  const profile = await ProfileServerService.getProfile(session.user.id);
  const role = (profile?.role || 'employee') as UserRole;
  const canManage = role === 'hr' || role === 'admin';

  const [departments, designations, employees] = await Promise.all([
    HRClientService.getDepartments(),
    HRClientService.getDesignations(),
    HRClientService.getEmployees(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments & Designations"
        description="Structure business units, map leadership hierarchies, and organize career tracks."
      />

      <DepartmentManagement
        initialDepartments={departments}
        initialDesignations={designations}
        employees={employees}
        canManage={canManage}
      />
    </div>
  );
}