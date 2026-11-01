import type { UserRole } from '@/constants/roles';

export type UserStatus = 'active' | 'inactive';

export interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  employee_id?: string;
  role: UserRole;
  department_id: string | null;
  designation_id: string | null;
  status: UserStatus;
  hired_at: string | null;
  created_at: string;
  updated_at: string;
  department?: { name: string } | null;
  designation?: { title: string } | null;
}

export interface UpdateProfileInput {
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
}
