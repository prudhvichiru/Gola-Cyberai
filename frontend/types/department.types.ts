import type { UserProfile } from './user.types';

export interface Department {
  id: string;
  name: string;
  description: string | null;
  head_id: string | null;
  created_at: string;
  head?: UserProfile | null;
}

export interface Designation {
  id: string;
  title: string;
  department_id: string | null;
  created_at: string;
}

export interface CreateDepartmentInput {
  name: string;
  description?: string;
  head_id?: string;
}
