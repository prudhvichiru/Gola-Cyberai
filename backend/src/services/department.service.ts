import { supabase } from '../config/supabase.js';

export class DepartmentService {
  static async getDepartments() {
    const { data, error } = await supabase
      .from('departments')
      .select('*, head:profiles!departments_head_id_fkey(*)')
      .order('name');

    if (error) throw error;
    return data || [];
  }

  static async getCount() {
    const { count, error } = await supabase
      .from('departments')
      .select('id', { count: 'exact', head: true });

    if (error) throw error;
    return count || 0;
  }

  static async createDepartment(name: string, description?: string, head_id?: string) {
    const { data, error } = await supabase
      .from('departments')
      .insert({ name, description, head_id })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
