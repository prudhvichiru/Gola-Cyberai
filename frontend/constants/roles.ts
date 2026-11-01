export const ROLES = {
  EMPLOYEE: 'employee',
  MANAGER: 'manager',
  PROJECT_MANAGER: 'project_manager',
  HR: 'hr',
  PAYROLL: 'payroll',
  ADMIN: 'admin',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<UserRole, string> = {
  [ROLES.EMPLOYEE]: 'Employee',
  [ROLES.MANAGER]: 'Manager',
  [ROLES.PROJECT_MANAGER]: 'Project Manager',
  [ROLES.HR]: 'HR Specialist',
  [ROLES.PAYROLL]: 'Payroll Officer',
  [ROLES.ADMIN]: 'Administrator',
};

export const ROLE_COLORS: Record<UserRole, { bg: string; text: string; border: string }> = {
  [ROLES.EMPLOYEE]: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/20',
  },
  [ROLES.MANAGER]: {
    bg: 'bg-teal-500/10',
    text: 'text-teal-600 dark:text-teal-400',
    border: 'border-teal-500/20',
  },
  [ROLES.PROJECT_MANAGER]: {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-500/20',
  },
  [ROLES.HR]: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/20',
  },
  [ROLES.PAYROLL]: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/20',
  },
  [ROLES.ADMIN]: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/20',
  },
};
