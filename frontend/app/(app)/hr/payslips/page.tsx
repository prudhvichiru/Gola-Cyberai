import { AuthServerService, ProfileServerService } from '@/services/server';
import { PageHeader } from '@/components/page-header';
import { PayslipsCenter } from '@/features/hr';
import { createClient } from '@/lib/supabase-server';
import type { UserRole } from '@/constants/roles';
import type { EmployeeProfile, PayslipRecord } from '@/types/hr.types';

export default async function PayslipsPage() {
  const session = await AuthServerService.requireAuth();
  const profile = await ProfileServerService.getProfile(session.user.id);
  const role = (profile?.role || 'employee') as UserRole;
  const canPublish = role === 'hr' || role === 'admin';

  const sb = await createClient();

  // Load employees from Supabase directly
  const { data: profilesData } = await sb
    .from('profiles')
    .select('id, full_name, first_name, last_name, email, role, status, employee_id, department_id, designation_id, created_at, updated_at')
    .order('full_name');

  const employees: EmployeeProfile[] = canPublish ? (profilesData || []).map((p: any) => ({
    id: p.id,
    employee_id: p.employee_id || `GCA-${p.id.slice(0, 4).toUpperCase()}`,
    full_name: p.full_name || p.email,
    first_name: p.first_name || '',
    last_name: p.last_name || '',
    email: p.email,
    role: p.role,
    status: p.status || 'active',
    created_at: p.created_at,
    updated_at: p.updated_at || p.created_at,
  })) : [];

  // Load payslips from Supabase
  const { data: payslipsData } = await sb
    .from('payslips')
    .select('*, employee:profiles(id, full_name, email, employee_id)')
    .eq('user_id', session.user.id)
    .order('year', { ascending: false })
    .order('created_at', { ascending: false });

  const payslips: PayslipRecord[] = (payslipsData || []).map((p: any) => ({
    ...p,
    gross_earnings: p.gross_earnings || (p.basic_salary + p.hra + p.special_allowance),
    total_deductions: p.total_deductions || (p.pf_deduction + p.professional_tax + p.tds_deduction),
    net_salary: p.net_salary || (p.gross_earnings - p.total_deductions),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payslips & Compensation"
        description="Access monthly salary statements, itemized statutory deductions, and tax compliance certificates."
      />
      <PayslipsCenter
        userId={session.user.id}
        initialPayslips={payslips}
        employees={employees}
        canPublish={canPublish}
      />
    </div>
  );
}
