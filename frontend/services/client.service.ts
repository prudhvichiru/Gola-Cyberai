import { fetchApi } from './api';
import { ClientRecord } from '@/types/client.types';

export class ClientFrontendService {
  static async getClients(params?: { status?: string; search?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);

    const qs = searchParams.toString();
    return fetchApi<ClientRecord[]>(`/clients${qs ? `?${qs}` : ''}`);
  }

  static async getClientById(id: string) {
    return fetchApi<ClientRecord>(`/clients/${id}`);
  }

  static async createClient(payload: Partial<ClientRecord>) {
    return fetchApi<{ message: string; data: ClientRecord }>('/clients', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  static async updateClient(id: string, payload: Partial<ClientRecord>) {
    return fetchApi<{ message: string; data: ClientRecord }>(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }
}
