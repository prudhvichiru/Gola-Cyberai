import { supabaseAdmin } from '../config/supabase.js';
const supabase = supabaseAdmin;
import { EmailService } from './email.service.js';

// Legitimate company organizational structure lookup
const DEPARTMENTS_STORE: any[] = [
  { id: 'dept-eng', name: 'Engineering & Technology', description: 'Core product engineering, platform and AI infrastructure', head_id: null },
  { id: 'dept-cyber', name: 'Cybersecurity & Compliance', description: 'Enterprise SOC, threat intelligence and security assurance', head_id: null },
  { id: 'dept-hr', name: 'Human Resources', description: 'People operations, talent acquisition and employee relations', head_id: null },
  { id: 'dept-design', name: 'Product Design & UX', description: 'User research, design system and interface architecture', head_id: null },
  { id: 'dept-ops', name: 'Operations & DevOps', description: 'Cloud infrastructure, CI/CD pipelines and site reliability', head_id: null },
];

const DESIGNATIONS_STORE: any[] = [
  { id: 'desig-1', title: 'Principal Software Architect', department_id: 'dept-eng' },
  { id: 'desig-2', title: 'Senior Full Stack Engineer', department_id: 'dept-eng' },
  { id: 'desig-3', title: 'Cyber Threat Hunter', department_id: 'dept-cyber' },
  { id: 'desig-4', title: 'Lead Product Designer', department_id: 'dept-design' },
  { id: 'desig-5', title: 'HR Business Partner', department_id: 'dept-hr' },
  { id: 'desig-6', title: 'Senior DevOps Architect', department_id: 'dept-ops' },
];

// Real data stores - initialized empty (no mock employees or payslips; leave requests use Supabase)
const EMPLOYEES_STORE: any[] = [];
const PAYSLIPS_STORE: any[] = [];

// Statutory leave types lookup
export const LEAVE_TYPES = [
  { id: 'lt-cl', name: 'Casual Leave', code: 'CL', days_per_year: 12, description: 'Personal and emergency leave', is_paid: true, requires_doc: false },
  { id: 'lt-sl', name: 'Sick Leave', code: 'SL', days_per_year: 10, description: 'Medical and health recuperation', is_paid: true, requires_doc: false },
  { id: 'lt-pl', name: 'Privilege Leave', code: 'PL', days_per_year: 18, description: 'Annual planned vacation leave', is_paid: true, requires_doc: false },
  { id: 'lt-lop', name: 'Loss of Pay', code: 'LOP', days_per_year: 0, description: 'Unpaid leave', is_paid: false, requires_doc: true },
];

// Official calendar holidays lookup
export const GAZETTED_HOLIDAYS = [
  { id: 'h-1', name: "New Year's Day", date: '2026-01-01', day_of_week: 'Thursday', type: 'gazetted', description: 'Public Holiday' },
  { id: 'h-2', name: 'Republic Day', date: '2026-01-26', day_of_week: 'Monday', type: 'gazetted', description: 'National Holiday' },
  { id: 'h-3', name: 'Holi', date: '2026-03-04', day_of_week: 'Wednesday', type: 'gazetted', description: 'Festival of Colours' },
  { id: 'h-4', name: 'Independence Day', date: '2026-08-15', day_of_week: 'Saturday', type: 'gazetted', description: 'National Holiday' },
  { id: 'h-5', name: 'Mahatma Gandhi Jayanti', date: '2026-10-02', day_of_week: 'Friday', type: 'gazetted', description: 'National Holiday' },
  { id: 'h-6', name: 'Dussehra (Vijayadashami)', date: '2026-10-20', day_of_week: 'Tuesday', type: 'gazetted', description: 'Festival Holiday' },
  { id: 'h-7', name: 'Diwali (Deepavali)', date: '2026-11-08', day_of_week: 'Sunday', type: 'gazetted', description: 'Festival of Lights' },
  { id: 'h-8', name: 'Christmas Day', date: '2026-12-25', day_of_week: 'Friday', type: 'gazetted', description: 'Public Holiday' },
];

// Legitimate company-wide policies only (no fake personal employee letters)
const DOCUMENTS_STORE: any[] = [
  {
    id: 'doc-3',
    user_id: null,
    title: 'Gola CyberAI Corporate Employee Handbook',
    document_type: 'handbook',
    file_name: 'Employee_Handbook_2026.pdf',
    file_size: '1.4 MB',
    category: 'company_policy',
    issue_date: '2026-01-01',
    version: 'v2.4',
    access_role: 'all',
  },
  {
    id: 'doc-4',
    user_id: null,
    title: 'Information Security & Non-Disclosure Agreement (NDA)',
    document_type: 'nda_policy',
    file_name: 'Enterprise_NDA_Policy.pdf',
    file_size: '420 KB',
    category: 'company_policy',
    issue_date: '2026-01-01',
    version: 'v3.0',
    access_role: 'all',
  },
  {
    id: 'doc-5',
    user_id: null,
    title: 'Corporate Code of Conduct & Ethics Charter',
    document_type: 'code_of_conduct',
    file_name: 'Code_of_Conduct_2026.pdf',
    file_size: '560 KB',
    category: 'company_policy',
    issue_date: '2026-01-01',
    version: 'v1.2',
    access_role: 'all',
  },
];

export class HRService {
  // ==========================================
  // EMPLOYEE MANAGEMENT
  // ==========================================

  static async getEmployees(filters: { search?: string; departmentId?: string; role?: string; status?: string }) {
    let list = [...EMPLOYEES_STORE];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (e) =>
          (e.full_name && e.full_name.toLowerCase().includes(q)) ||
          (e.email && e.email.toLowerCase().includes(q)) ||
          (e.employee_id && e.employee_id.toLowerCase().includes(q)),
      );
    }
    if (filters.departmentId && filters.departmentId !== 'all') {
      list = list.filter((e) => e.department_id === filters.departmentId);
    }
    if (filters.role && filters.role !== 'all') {
      list = list.filter((e) => e.role === filters.role);
    }
    if (filters.status && filters.status !== 'all') {
      list = list.filter((e) => e.status === filters.status);
    }

    return {
      total: list.length,
      employees: list,
    };
  }

  static async getEmployeeById(id: string) {
    const emp = EMPLOYEES_STORE.find((e) => e.id === id);
    if (!emp) {
      throw new Error(`Employee with ID ${id} not found`);
    }
    return emp;
  }

  static async createEmployee(data: any) {
    const newId = `emp-${Date.now()}`;
    const nextEmpNum = 1000 + EMPLOYEES_STORE.length + 1;
    const empId = data.employee_id || `GCA-${nextEmpNum}`;

    const dept = DEPARTMENTS_STORE.find((d) => d.id === data.department_id) || { id: data.department_id || 'dept-general', name: data.department_name || 'General' };
    const desig = DESIGNATIONS_STORE.find((d) => d.id === data.designation_id) || { id: data.designation_id || 'desig-general', title: data.designation_title || 'Staff' };
    const mgr = data.manager_id ? EMPLOYEES_STORE.find((e) => e.id === data.manager_id) : null;

    const assignedPassword = data.password || 'Gola@2026';

    // 1. If password provided, register user in Supabase Auth so they can log in immediately
    let supabaseUserId: string | null = null;
    if (data.email) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: data.email,
          password: assignedPassword,
          options: {
            data: {
              first_name: data.first_name,
              last_name: data.last_name,
              full_name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.email,
              role: data.role || 'employee',
              employee_id: empId,
            },
          },
        });

        if (authError) {
          console.warn('[HRService] Supabase Auth creation note:', authError.message);
        } else if (authData?.user?.id) {
          supabaseUserId = authData.user.id;
          // Upsert profile with service role key (bypasses RLS)
          try {
            const { error: upsertErr } = await supabaseAdmin.from('profiles').upsert({
              id: authData.user.id,
              email: data.email,
              first_name: data.first_name,
              last_name: data.last_name,
              role: data.role || 'employee',
              status: 'active',
              department_id: data.department_id || null,
              designation_id: data.designation_id || null,
              phone: data.phone || null,
              employee_id: empId,
            }, { onConflict: 'id' });
            if (upsertErr) console.warn('[HRService] profile upsert error:', upsertErr.message);
          } catch (e: any) {
            console.warn('[HRService] profile upsert exception:', e.message);
          }
        }
      } catch (err: any) {
        console.warn('[HRService] Auth provisioning notice:', err.message);
      }
    }

    const newEmp = {
      id: supabaseUserId || newId,
      employee_id: empId,
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      full_name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.email,
      role: data.role || 'employee',
      status: 'active',
      department_id: data.department_id || null,
      designation_id: data.designation_id || null,
      manager_id: data.manager_id || null,
      phone: data.phone || null,
      hired_at: data.hired_at || new Date().toISOString().split('T')[0],
      date_of_birth: data.date_of_birth || null,
      emergency_contact: data.emergency_contact || null,
      address: data.address || null,
      department: dept,
      designation: desig,
      manager: mgr ? { id: mgr.id, full_name: mgr.full_name, email: mgr.email } : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    EMPLOYEES_STORE.unshift(newEmp);

    // 2. Dispatch official congratulations email with role-tailored credentials
    const emailResult = await EmailService.sendWelcomeCredentialsEmail({
      to: data.email,
      fullName: newEmp.full_name,
      employeeId: empId,
      role: newEmp.role,
      departmentName: dept.name,
      designationTitle: desig.title,
      password: assignedPassword,
      hiredAt: newEmp.hired_at,
    });

    return {
      ...newEmp,
      email_dispatched: emailResult.success,
      email_message: emailResult.message,
    };
  }

  static async updateEmployee(id: string, updates: any, requesterRole: string) {
    const idx = EMPLOYEES_STORE.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error('Employee not found');

    const emp = EMPLOYEES_STORE[idx];

    // Role-based permission enforcement:
    // If not HR or Admin, user can only update personal contact details
    if (requesterRole !== 'hr' && requesterRole !== 'admin') {
      const allowedKeys = ['phone', 'emergency_contact', 'address'];
      Object.keys(updates).forEach((k) => {
        if (!allowedKeys.includes(k)) {
          delete updates[k];
        }
      });
    }

    if (updates.department_id) {
      const dept = DEPARTMENTS_STORE.find((d) => d.id === updates.department_id);
      if (dept) updates.department = dept;
    }
    if (updates.designation_id) {
      const desig = DESIGNATIONS_STORE.find((d) => d.id === updates.designation_id);
      if (desig) updates.designation = desig;
    }
    if (updates.manager_id) {
      const mgr = EMPLOYEES_STORE.find((e) => e.id === updates.manager_id);
      updates.manager = mgr ? { id: mgr.id, full_name: mgr.full_name, email: mgr.email } : null;
    }

    const updated = {
      ...emp,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    EMPLOYEES_STORE[idx] = updated;
    return updated;
  }

  // ==========================================
  // DEPARTMENTS & DESIGNATIONS
  // ==========================================

  static async getDepartments() {
    return DEPARTMENTS_STORE.map((dept) => {
      const emps = EMPLOYEES_STORE.filter((e) => e.department_id === dept.id);
      const head = dept.head_id ? EMPLOYEES_STORE.find((e) => e.id === dept.head_id) : null;
      const designations = DESIGNATIONS_STORE.filter((d) => d.department_id === dept.id);
      return {
        ...dept,
        employee_count: emps.length,
        head: head ? { id: head.id, full_name: head.full_name, email: head.email } : null,
        designations,
      };
    });
  }

  static async createDepartment(data: { name: string; description?: string; head_id?: string }) {
    const newDept = {
      id: `dept-${Date.now()}`,
      name: data.name,
      description: data.description || '',
      head_id: data.head_id || null,
    };
    DEPARTMENTS_STORE.push(newDept);
    return newDept;
  }

  static async getDesignations(departmentId?: string) {
    if (departmentId) {
      return DESIGNATIONS_STORE.filter((d) => d.department_id === departmentId);
    }
    return DESIGNATIONS_STORE;
  }

  static async createDesignation(data: { title: string; department_id: string }) {
    const newDesig = {
      id: `desig-${Date.now()}`,
      title: data.title,
      department_id: data.department_id,
    };
    DESIGNATIONS_STORE.push(newDesig);
    return newDesig;
  }

  // ==========================================
  // LEAVE MANAGEMENT
  // ==========================================

  static async getLeaveTypes() {
    return LEAVE_TYPES;
  }

  static async getLeaveBalances(userId: string) {
    const { data: requests } = await supabaseAdmin
      .from('leave_requests')
      .select('leave_type_id, status, total_days')
      .eq('user_id', userId);

    const rows = requests || [];
    return LEAVE_TYPES.map((lt) => {
      const approvedDays = rows
        .filter((r: any) => r.leave_type_id === lt.id && r.status === 'approved')
        .reduce((sum: number, r: any) => sum + (r.total_days || 0), 0);
      const pendingDays = rows
        .filter((r: any) => r.leave_type_id === lt.id && r.status === 'pending')
        .reduce((sum: number, r: any) => sum + (r.total_days || 0), 0);
      const allocated = lt.days_per_year;
      const available = Math.max(0, allocated - approvedDays);
      return {
        id: `bal-${lt.code.toLowerCase()}`,
        user_id: userId,
        leave_type_id: lt.id,
        year: new Date().getFullYear(),
        allocated_days: allocated,
        used_days: approvedDays,
        pending_days: pendingDays,
        available_days: available,
        leave_type: lt,
      };
    });
  }

  static async getHolidays() {
    return GAZETTED_HOLIDAYS;
  }

  static async getMyLeaveRequests(userId: string) {
    const { data, error } = await supabaseAdmin
      .from('leave_requests')
      .select('*, employee:profiles!leave_requests_user_id_fkey(id, full_name, email, department_id)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map((r: any) => ({ ...r, leave_type: LEAVE_TYPES.find((t) => t.id === r.leave_type_id) || null }));
  }

  static async getApprovalQueue() {
    const { data, error } = await supabaseAdmin
      .from('leave_requests')
      .select('*, employee:profiles!leave_requests_user_id_fkey(id, full_name, email, department_id)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data || []).map((r: any) => ({ ...r, leave_type: LEAVE_TYPES.find((t) => t.id === r.leave_type_id) || null }));
  }

  static async applyLeave(userId: string, data: any) {
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    if (end < start) throw new Error('End date cannot be prior to start date');

    const type = LEAVE_TYPES.find((t) => t.id === data.leave_type_id) || LEAVE_TYPES[0];
    const days = data.is_half_day ? 0.5 : Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1);

    const { data: inserted, error } = await supabaseAdmin
      .from('leave_requests')
      .insert({
        user_id: userId,
        leave_type_id: data.leave_type_id,
        start_date: data.start_date,
        end_date: data.end_date,
        total_days: days,
        is_half_day: !!data.is_half_day,
        half_day_period: data.half_day_period || null,
        reason: data.reason,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { ...inserted, leave_type: type };
  }

  static async reviewLeave(requestId: string, reviewerId: string, status: 'approved' | 'rejected', reason?: string) {
    const { data, error } = await supabaseAdmin
      .from('leave_requests')
      .update({
        status,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        ...(reason ? { rejection_reason: reason } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Leave request not found');
    return { ...data, leave_type: LEAVE_TYPES.find((t) => t.id === data.leave_type_id) || null };
  }

  // ==========================================
  // PAYSLIPS & DOCUMENTS
  // ==========================================

  static async getMyPayslips(userId: string) {
    return PAYSLIPS_STORE.filter(
      (slip) => slip.user_id === userId || (userId === 'current-user' && slip.user_id === 'current-user')
    );
  }

  static async getPayslipById(id: string, requesterUserId?: string, requesterRole?: string) {
    const p = PAYSLIPS_STORE.find((slip) => slip.id === id);
    if (!p) {
      throw new Error('Payslip not found');
    }
    // Strict RBAC & Ownership:
    if (requesterRole === 'employee' && requesterUserId) {
      const isOwner = p.user_id === requesterUserId || (requesterUserId === 'current-user' && p.user_id === 'current-user');
      if (!isOwner) {
        throw new Error('Access denied: Unauthorized access to external compensation record');
      }
    }
    return p;
  }

  static async publishPayslip(data: any) {
    const basic = data.basic_salary || 0;
    const hra = data.hra || 0;
    const special = data.special_allowance || 0;
    const gross = basic + hra + special;
    const pf = data.pf_deduction || Math.round(basic * 0.12);
    const pt = data.professional_tax || 200;
    const tds = data.tds_deduction || 0;
    const deductions = pf + pt + tds;
    const net = gross - deductions;

    const newSlip = {
      id: `pay-${Date.now()}`,
      user_id: data.user_id,
      month: data.month,
      year: data.year,
      pay_period: `${data.month} ${data.year}`,
      basic_salary: basic,
      hra: hra,
      special_allowance: special,
      gross_earnings: gross,
      pf_deduction: pf,
      professional_tax: pt,
      tds_deduction: tds,
      total_deductions: deductions,
      net_salary: net,
      payment_status: 'paid',
      paid_on: new Date().toISOString().split('T')[0],
    };
    PAYSLIPS_STORE.unshift(newSlip);
    return newSlip;
  }

  static async getDocuments(category?: string) {
    if (category) {
      return DOCUMENTS_STORE.filter((d) => d.category === category);
    }
    return DOCUMENTS_STORE;
  }

  static async createDocument(data: any) {
    const doc = {
      id: `doc-${Date.now()}`,
      user_id: data.user_id || null,
      title: data.title,
      document_type: data.document_type,
      file_name: data.file_name || `${data.title.replace(/\s+/g, '_')}.pdf`,
      file_size: data.file_size || '320 KB',
      category: data.category || 'company_policy',
      issue_date: data.issue_date || new Date().toISOString().split('T')[0],
      version: data.version || 'v1.0',
      access_role: data.access_role || 'all',
    };
    DOCUMENTS_STORE.unshift(doc);
    return doc;
  }
}
