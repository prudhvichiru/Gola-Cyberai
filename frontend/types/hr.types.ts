import type { UserRole } from '@/constants/roles';
import type { UserStatus } from './user.types';

export interface EmployeeProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  employee_id: string;
  avatar_url?: string | null;
  phone?: string | null;
  role: UserRole;
  department_id?: string | null;
  designation_id?: string | null;
  manager_id?: string | null;
  status: UserStatus;
  hired_at?: string | null;
  date_of_birth?: string | null;
  emergency_contact?: string | null;
  address?: string | null;
  department?: { id: string; name: string } | null;
  designation?: { id: string; title: string } | null;
  manager?: { id: string; full_name: string; email: string } | null;
  created_at: string;
  updated_at: string;
}

export interface DepartmentItem {
  id: string;
  name: string;
  description?: string | null;
  head_id?: string | null;
  head?: { id: string; full_name: string; email: string } | null;
  employee_count?: number;
  designations?: Array<{ id: string; title: string }>;
  created_at: string;
}

export interface DesignationItem {
  id: string;
  title: string;
  department_id?: string | null;
  department?: { id: string; name: string } | null;
  created_at: string;
}

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  days_per_year: number;
  description?: string | null;
  is_paid: boolean;
  requires_doc: boolean;
}

export interface LeaveBalance {
  id: string;
  user_id: string;
  leave_type_id: string;
  year: number;
  allocated_days: number;
  used_days: number;
  pending_days: number;
  available_days: number;
  leave_type?: LeaveType;
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  is_half_day: boolean;
  half_day_period?: 'first_half' | 'second_half' | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  employee?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string | null;
    department?: { name: string } | null;
  };
  leave_type?: LeaveType;
}

export interface CompanyHoliday {
  id: string;
  name: string;
  date: string;
  day_of_week: string;
  type: 'gazetted' | 'optional' | 'restricted';
  description?: string | null;
}

export interface PayslipRecord {
  id: string;
  user_id: string;
  month: string;
  year: number;
  pay_period: string;
  basic_salary: number;
  hra: number;
  special_allowance: number;
  gross_earnings: number;
  pf_deduction: number;
  professional_tax: number;
  tds_deduction: number;
  total_deductions: number;
  net_salary: number;
  payment_status: 'paid' | 'processing' | 'on_hold';
  paid_on?: string;
  document_url?: string;
  employee?: {
    id: string;
    full_name: string;
    employee_id: string;
    email: string;
    department?: { name: string } | null;
    designation?: { title: string } | null;
  };
}

export interface HRDocument {
  id: string;
  user_id?: string | null;
  title: string;
  document_type: string;
  file_name: string;
  file_size: string;
  category: 'personal_letter' | 'company_policy';
  issue_date: string;
  version: string;
  access_role: 'all' | 'hr' | 'admin' | 'manager';
  file_url?: string;
  created_at: string;
}
