import { fetchApi } from './api';
import type {
  EmployeeProfile,
  DepartmentItem,
  DesignationItem,
  LeaveBalance,
  LeaveRequest,
  CompanyHoliday,
  PayslipRecord,
  HRDocument,
  LeaveType,
} from '@/types/hr.types';

export class HRClientService {
  // ==========================================
  // EMPLOYEES
  // ==========================================
  static async getEmployees(params?: { search?: string; departmentId?: string; role?: string; status?: string }) {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.departmentId) q.set('departmentId', params.departmentId);
    if (params?.role) q.set('role', params.role);
    if (params?.status) q.set('status', params.status);

    const qs = q.toString() ? `?${q.toString()}` : '';
    const res = await fetchApi<{ total: number; employees: EmployeeProfile[] }>(`/hr/employees${qs}`);
    return res.data?.employees || [];
  }

  static async getEmployeeById(id: string) {
    const res = await fetchApi<EmployeeProfile>(`/hr/employees/${id}`);
    return res.data;
  }

  static async createEmployee(payload: Partial<EmployeeProfile> & { password?: string }) {
    return await fetchApi<{ message: string; data: EmployeeProfile & { email_dispatched?: boolean } }>('/hr/employees', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  static async updateEmployee(id: string, payload: Partial<EmployeeProfile>) {
    return await fetchApi<{ message: string; data: EmployeeProfile }>(`/hr/employees/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  // ==========================================
  // DEPARTMENTS & DESIGNATIONS
  // ==========================================
  static async getDepartments(): Promise<DepartmentItem[]> {
    const res = await fetchApi<{ departments: DepartmentItem[] }>('/hr/departments');
    return res.data?.departments || [];
  }

  static async createDepartment(payload: { name: string; description?: string; head_id?: string }) {
    return await fetchApi<{ message: string; data: DepartmentItem }>('/hr/departments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  static async getDesignations(departmentId?: string): Promise<DesignationItem[]> {
    const qs = departmentId ? `?departmentId=${encodeURIComponent(departmentId)}` : '';
    const res = await fetchApi<{ designations: DesignationItem[] }>(`/hr/designations${qs}`);
    return res.data?.designations || [];
  }

  static async createDesignation(payload: { title: string; department_id: string }) {
    return await fetchApi<{ message: string; data: DesignationItem }>('/hr/designations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ==========================================
  // LEAVES
  // ==========================================
  static async getLeaveTypes(): Promise<LeaveType[]> {
    const res = await fetchApi<{ types: LeaveType[] }>('/hr/leave/types');
    return res.data?.types || [];
  }

  static async getLeaveBalances(userId = 'current-user'): Promise<LeaveBalance[]> {
    const res = await fetchApi<{ balances: LeaveBalance[] }>(`/hr/leave/balances?userId=${encodeURIComponent(userId)}`);
    return res.data?.balances || [];
  }

  static async getHolidays(): Promise<CompanyHoliday[]> {
    const res = await fetchApi<{ holidays: CompanyHoliday[] }>('/hr/leave/holidays');
    return res.data?.holidays || [];
  }

  static async getMyLeaveRequests(userId = 'current-user'): Promise<LeaveRequest[]> {
    const res = await fetchApi<{ requests: LeaveRequest[] }>(`/hr/leave/my-requests?userId=${encodeURIComponent(userId)}`);
    return res.data?.requests || [];
  }

  static async getApprovalQueue(): Promise<LeaveRequest[]> {
    const res = await fetchApi<{ queue: LeaveRequest[] }>('/hr/leave/approval-queue');
    return res.data?.queue || [];
  }

  static async applyLeave(payload: {
    userId: string;
    leave_type_id: string;
    start_date: string;
    end_date: string;
    is_half_day?: boolean;
    half_day_period?: 'first_half' | 'second_half';
    reason: string;
  }) {
    return await fetchApi<{ message: string; data: LeaveRequest }>('/hr/leave/apply', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  static async reviewLeave(payload: {
    requestId: string;
    reviewerId: string;
    status: 'approved' | 'rejected';
    rejectionReason?: string;
  }) {
    return await fetchApi<{ message: string; data: LeaveRequest }>('/hr/leave/review', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ==========================================
  // PAYSLIPS
  // ==========================================
  static async getMyPayslips(userId = 'current-user'): Promise<PayslipRecord[]> {
    const res = await fetchApi<{ payslips: PayslipRecord[] }>(`/hr/payslips/my?userId=${encodeURIComponent(userId)}`);
    return res.data?.payslips || [];
  }

  static async getPayslipById(id: string): Promise<PayslipRecord | null> {
    const res = await fetchApi<PayslipRecord>(`/hr/payslips/${id}`);
    return res.data || null;
  }

  static async publishPayslip(payload: any) {
    return await fetchApi<{ message: string; data: PayslipRecord }>('/hr/payslips/publish', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ==========================================
  // DOCUMENTS & LETTERS
  // ==========================================
  static async getDocuments(category?: 'personal_letter' | 'company_policy'): Promise<HRDocument[]> {
    const qs = category ? `?category=${category}` : '';
    const res = await fetchApi<{ documents: HRDocument[] }>(`/hr/documents${qs}`);
    return res.data?.documents || [];
  }

  static async createDocument(payload: Partial<HRDocument>) {
    return await fetchApi<{ message: string; data: HRDocument }>('/hr/documents', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}
