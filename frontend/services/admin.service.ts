import { fetchApi } from './api';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'hr' | 'payroll' | 'employee';
  department: string;
  status: 'active' | 'suspended';
  mfa_enabled: boolean;
  last_login: string;
}

export interface CompanySettingsData {
  companyName: string;
  corporateDomain: string;
  timezone: string;
  workWeekDays: string[];
  standardWorkHoursPerDay: number;
  breakPolicy: {
    maxBreaksPerDay: number;
    maxTotalBreakMinutes: number;
    requireManagerApprovalForOvertime: boolean;
  };
  mfaEnforcement: 'optional' | 'privileged_only' | 'all_users';
  sessionTimeoutMinutes: number;
}

export interface SecuritySession {
  id: string;
  userId: string;
  userName: string;
  ipAddress: string;
  userAgent: string;
  location: string;
  createdAt: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface AuditLogItem {
  action: string;
  actorId: string;
  actorRole: string;
  resource: string;
  ip: string;
  status: 'SUCCESS' | 'DENIED' | 'FAILED';
  details?: Record<string, any>;
  timestamp: string;
}

export class AdminFrontendService {
  static async getUsers() {
    return fetchApi<AdminUser[]>('/admin/users');
  }

  static async updateUserRole(userId: string, role: string) {
    return fetchApi<{ message: string; data: AdminUser }>(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }

  static async getCompanySettings() {
    return fetchApi<CompanySettingsData>('/admin/company');
  }

  static async updateCompanySettings(updates: Partial<CompanySettingsData>) {
    return fetchApi<{ message: string; data: CompanySettingsData }>('/admin/company', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  static async getSecuritySessions() {
    return fetchApi<SecuritySession[]>('/admin/security/sessions');
  }

  static async revokeSession(sessionId: string) {
    return fetchApi<{ success: boolean; message: string }>(`/admin/security/sessions/${sessionId}/revoke`, {
      method: 'POST',
    });
  }

  static async getAuditLogs(limit: number = 50) {
    return fetchApi<AuditLogItem[]>(`/admin/audit-logs?limit=${limit}`);
  }
}
