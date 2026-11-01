export interface ClientRecord {
  id: string;
  name: string;
  code: string;
  contact_person: string;
  email: string;
  phone?: string;
  industry: string;
  status: 'active' | 'prospect' | 'inactive';
  address?: string;
  billing_currency: string;
  active_projects_count: number;
  total_billed: number;
  assigned_employee_id?: string;
  assigned_employee_name?: string;
  created_at: string;
  updated_at: string;
}
