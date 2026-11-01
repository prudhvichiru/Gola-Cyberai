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

const CLIENTS_STORE: ClientRecord[] = [];

export class ClientService {
  static async getClients(filters?: { status?: string; search?: string }) {
    let list = [...CLIENTS_STORE];
    if (filters?.status && filters.status !== 'all') {
      list = list.filter((c) => c.status === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.contact_person.toLowerCase().includes(q)
      );
    }
    return list;
  }

  static async getClientById(id: string) {
    const client = CLIENTS_STORE.find((c) => c.id === id);
    if (!client) throw new Error('Client record not found');
    return client;
  }

  static async createClient(data: Partial<ClientRecord>) {
    if (!data.name) throw new Error('Client name is required.');
    const newClient: ClientRecord = {
      id: `client-${Date.now()}`,
      name: data.name,
      code: data.code || `CLI-${Math.floor(100 + Math.random() * 900)}`,
      contact_person: data.contact_person || '',
      email: data.email || '',
      phone: data.phone || '',
      industry: data.industry || 'Technology & Enterprise',
      status: data.status || 'active',
      address: data.address || '',
      billing_currency: data.billing_currency || 'INR',
      active_projects_count: 0,
      total_billed: 0,
      assigned_employee_id: data.assigned_employee_id || undefined,
      assigned_employee_name: data.assigned_employee_name || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    CLIENTS_STORE.unshift(newClient);
    return newClient;
  }

  static async updateClient(id: string, updates: Partial<ClientRecord>) {
    const idx = CLIENTS_STORE.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Client record not found');
    CLIENTS_STORE[idx] = {
      ...CLIENTS_STORE[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return CLIENTS_STORE[idx];
  }
}
