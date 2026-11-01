import { AuditLogger, AuditLogEntry } from '../middleware/security.middleware.js';

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'hr' | 'payroll' | 'employee';
  department: string;
  status: 'active' | 'suspended';
  mfa_enabled: boolean;
  last_login: string;
}

export interface CompanySettings {
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

let USERS_STORE: AdminUserRecord[] = [];

let COMPANY_SETTINGS: CompanySettings = {
  companyName: 'Gola CyberAI Technologies Private Limited',
  corporateDomain: 'cyberai.internal',
  timezone: 'Asia/Kolkata (IST, UTC+5:30)',
  workWeekDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  standardWorkHoursPerDay: 8,
  breakPolicy: {
    maxBreaksPerDay: 3,
    maxTotalBreakMinutes: 60,
    requireManagerApprovalForOvertime: true,
  },
  mfaEnforcement: 'privileged_only',
  sessionTimeoutMinutes: 480,
};

let ACTIVE_SESSIONS = [
  {
    id: 'sess-current',
    userId: 'current-user',
    userName: 'Current Authorized User',
    ipAddress: '127.0.0.1 (Localhost / Workstation)',
    userAgent: 'Corporate Web Client',
    location: 'Active Workstation',
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    isCurrent: true,
  },
];

export class AdminService {
  static async getUsers() {
    return USERS_STORE;
  }

  static async updateUserRole(userId: string, role: AdminUserRecord['role']) {
    const user = USERS_STORE.find((u) => u.id === userId);
    if (!user) throw new Error('User account not found');
    const oldRole = user.role;
    user.role = role;

    AuditLogger.log({
      action: 'USER_ROLE_CHANGED',
      actorId: 'admin',
      actorRole: 'admin',
      resource: `/api/admin/users/${userId}/role`,
      ip: '127.0.0.1',
      status: 'SUCCESS',
      details: { userId, oldRole, newRole: role },
    });

    return user;
  }

  static async getCompanySettings() {
    return COMPANY_SETTINGS;
  }

  static async updateCompanySettings(updates: Partial<CompanySettings>) {
    COMPANY_SETTINGS = { ...COMPANY_SETTINGS, ...updates };
    AuditLogger.log({
      action: 'COMPANY_SETTINGS_UPDATED',
      actorId: 'admin',
      actorRole: 'admin',
      resource: '/api/admin/company',
      ip: '127.0.0.1',
      status: 'SUCCESS',
      details: updates,
    });
    return COMPANY_SETTINGS;
  }

  static async getSecuritySessions() {
    return ACTIVE_SESSIONS;
  }

  static async revokeSession(sessionId: string) {
    ACTIVE_SESSIONS = ACTIVE_SESSIONS.filter((s) => s.id !== sessionId);
    AuditLogger.log({
      action: 'SECURITY_SESSION_REVOKED',
      actorId: 'admin',
      actorRole: 'admin',
      resource: `/api/admin/security/revoke/${sessionId}`,
      ip: '127.0.0.1',
      status: 'SUCCESS',
      details: { revokedSessionId: sessionId },
    });
    return { success: true, message: 'Session revoked successfully' };
  }

  static async getAuditLogs(limit: number = 50) {
    return AuditLogger.getRecentLogs(limit);
  }
}
