import type { UserRole as Role } from '@/constants/roles';
import {
  Home,
  LayoutDashboard,
  FolderKanban,
  Users,
  Briefcase,
  BarChart3,
  Calendar,
  MessageSquare,
  Clock,
  Timer,
  CheckSquare,
  UserCog,
  Video,
  FileText,
  ClipboardList,
  Settings,
  User,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: Role[];
  badge?: string | number;
  children?: { label: string; href: string; roles?: Role[]; badge?: string | number }[];
};

export const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'Team', href: '/team', icon: Users },
  { label: 'Clients', href: '/clients', icon: Briefcase },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Calendar', href: '/calendar', icon: Calendar },
  { label: 'Messages', href: '/messages', icon: MessageSquare },
  { label: 'Attendance', href: '/attendance', icon: Clock },
  { label: 'Time Tracking', href: '/time-tracking', icon: Timer },
  { label: 'Tasks', href: '/tasks', icon: CheckSquare },
  {
    label: 'HR Management',
    href: '/hr',
    icon: UserCog,
    children: [
      { label: 'Employee Directory', href: '/hr/employees' },
      { label: 'Departments', href: '/hr/departments' },
      { label: 'Leave Requests', href: '/hr/leave-requests' },
      { label: 'Leave Approvals', href: '/hr/leave-approvals', roles: ['manager', 'hr', 'admin'] },
      { label: 'Payslips', href: '/hr/payslips' },
      { label: 'Employee Letters', href: '/hr/letters' },
      { label: 'HR Documents', href: '/hr/documents' },
      { label: 'Holidays & Policies', href: '/hr/policies' },
    ],
  },
  { label: 'Meetings', href: '/meetings', icon: Video },
  { label: 'Documents', href: '/documents', icon: FileText },
  { label: 'Reports', href: '/reports', icon: ClipboardList },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    children: [
      { label: 'My Profile', href: '/settings/profile' },
      { label: 'Users & Roles', href: '/settings/users', roles: ['hr', 'admin'] },
      { label: 'Permissions', href: '/settings/permissions', roles: ['admin'] },
      { label: 'Company Settings', href: '/settings/company', roles: ['admin'] },
      { label: 'Security', href: '/settings/security' },
      { label: 'Audit Logs', href: '/settings/audit-logs', roles: ['admin'] },
    ],
  },
];

export function filterNavItems(role: Role): NavItem[] {
  return navItems
    .map((item) => {
      if (item.roles && !item.roles.includes(role)) return null;
      if (item.children) {
        const kids = item.children.filter(
          (c) => !c.roles || c.roles.includes(role),
        );
        if (kids.length === 0) return null;
        return { ...item, children: kids };
      }
      return item;
    })
    .filter(Boolean) as NavItem[];
}

// -------------------------------------------------------------
// HubSpot-Style Role-Based Categorized Navigation Structure
// -------------------------------------------------------------

export type HubSpotNavChild = {
  id: string;
  label: string;
  href: string;
  roles?: Role[];
  badge?: string | number;
};

export type HubSpotNavCategory = {
  id: string;
  label: string;
  href?: string;
  icon: LucideIcon;
  roles?: Role[];
  badge?: string | number;
  section?: string;
  children?: HubSpotNavChild[];
};

export const hubSpotCategories: HubSpotNavCategory[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'hr', 'manager', 'project_manager', 'payroll', 'employee'],
    section: 'Overview',
  },
  {
    id: 'projects',
    label: 'Projects',
    href: '/projects',
    icon: FolderKanban,
    roles: ['admin', 'hr', 'manager', 'project_manager', 'employee'],
    section: 'Operations',
  },
  {
    id: 'people-teams',
    label: 'People & Teams',
    icon: Users,
    roles: ['admin', 'hr', 'manager', 'project_manager', 'employee'],
    section: 'Operations',
    children: [
      { id: 'team', label: 'Team', href: '/team', roles: ['admin', 'hr', 'manager', 'project_manager', 'employee'] },
      { id: 'clients', label: 'Clients', href: '/clients', roles: ['admin', 'hr', 'manager', 'project_manager'] },
    ],
  },
  {
    id: 'time-attendance',
    label: 'Time & Attendance',
    icon: Clock,
    roles: ['admin', 'hr', 'manager', 'project_manager', 'payroll', 'employee'],
    section: 'Operations',
    children: [
      { id: 'attendance', label: 'Attendance', href: '/attendance', roles: ['admin', 'hr', 'manager', 'project_manager', 'payroll', 'employee'] },
      { id: 'time-tracking', label: 'Time Tracking', href: '/time-tracking', roles: ['admin', 'hr', 'manager', 'project_manager', 'payroll', 'employee'] },
    ],
  },
  {
    id: 'work-management',
    label: 'Work Management',
    icon: CheckSquare,
    roles: ['admin', 'hr', 'manager', 'project_manager', 'payroll', 'employee'],
    section: 'Operations',
    children: [
      { id: 'tasks', label: 'Tasks', href: '/tasks', roles: ['admin', 'hr', 'manager', 'project_manager', 'employee'] },
      { id: 'calendar', label: 'Calendar', href: '/calendar', roles: ['admin', 'hr', 'manager', 'project_manager', 'payroll', 'employee'] },
    ],
  },
  {
    id: 'communication',
    label: 'Communication',
    icon: MessageSquare,
    roles: ['admin', 'hr', 'manager', 'project_manager', 'payroll', 'employee'],
    section: 'Collaboration',
    children: [
      { id: 'messages', label: 'Messages', href: '/messages', roles: ['admin', 'hr', 'manager', 'project_manager', 'payroll', 'employee'] },
      { id: 'meetings', label: 'Meetings', href: '/meetings', roles: ['admin', 'hr', 'manager', 'project_manager', 'payroll', 'employee'] },
    ],
  },
  {
    id: 'hr-management',
    label: 'HR Management',
    icon: UserCog,
    roles: ['admin', 'hr', 'manager', 'payroll'],
    section: 'Organization',
    children: [
      { id: 'hr-employees', label: 'Employee Directory', href: '/hr/employees', roles: ['admin', 'hr'] },
      { id: 'hr-departments', label: 'Departments', href: '/hr/departments', roles: ['admin', 'hr'] },
      { id: 'hr-leave-requests', label: 'Leave Requests', href: '/hr/leave-requests', roles: ['admin', 'hr', 'manager', 'payroll'] },
      { id: 'hr-leave-approvals', label: 'Leave Approvals', href: '/hr/leave-approvals', roles: ['admin', 'hr', 'manager'] },
      { id: 'hr-payslips', label: 'Payroll & Payslips', href: '/hr/payslips', roles: ['admin', 'payroll', 'hr'] },
      { id: 'hr-letters', label: 'Employee Letters', href: '/hr/letters', roles: ['admin', 'hr'] },
      { id: 'hr-documents', label: 'HR Documents', href: '/hr/documents', roles: ['admin', 'hr'] },
      { id: 'hr-policies', label: 'Holidays & Policies', href: '/hr/policies', roles: ['admin', 'hr', 'manager', 'payroll'] },
    ],
  },
  {
    id: 'analytics-reports',
    label: 'Analytics & Reports',
    icon: BarChart3,
    roles: ['admin', 'hr', 'manager', 'payroll'],
    section: 'Intelligence',
    children: [
      { id: 'analytics', label: 'Analytics', href: '/analytics', roles: ['admin', 'hr', 'manager', 'payroll'] },
      { id: 'reports', label: 'Reports', href: '/reports', roles: ['admin', 'hr', 'manager', 'payroll'] },
    ],
  },
  {
    id: 'documents',
    label: 'Documents',
    href: '/documents',
    icon: FileText,
    roles: ['admin', 'hr', 'manager', 'project_manager'],
    section: 'Organization',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    roles: ['admin', 'hr', 'manager', 'project_manager', 'payroll', 'employee'],
    section: 'Configuration',
    children: [
      { id: 'settings-profile', label: 'My Profile', href: '/settings/profile', roles: ['admin', 'hr', 'manager', 'project_manager', 'payroll', 'employee'] },
      { id: 'settings-users', label: 'Users & Roles', href: '/settings/users', roles: ['admin', 'hr'] },
      { id: 'settings-permissions', label: 'Permissions', href: '/settings/permissions', roles: ['admin'] },
      { id: 'settings-company', label: 'Company Settings', href: '/settings/company', roles: ['admin'] },
      { id: 'settings-security', label: 'Security', href: '/settings/security', roles: ['admin', 'hr', 'manager', 'project_manager', 'payroll', 'employee'] },
      { id: 'settings-audit-logs', label: 'Audit Logs', href: '/settings/audit-logs', roles: ['admin'] },
    ],
  },
];

export const employeeHubSpotCategories: HubSpotNavCategory[] = [
  {
    id: 'dashboard',
    label: 'Home',
    href: '/dashboard',
    icon: Home,
    section: 'Overview',
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: FolderKanban,
    section: 'Work',
    children: [
      { id: 'my-projects', label: 'My Projects', href: '/projects' },
    ],
  },
  {
    id: 'people-teams',
    label: 'People & Teams',
    icon: Users,
    section: 'Work',
    children: [
      { id: 'team', label: 'Team', href: '/team' },
    ],
  },
  {
    id: 'time-attendance',
    label: 'Time & Attendance',
    icon: Clock,
    section: 'Work',
    children: [
      { id: 'attendance', label: 'My Attendance', href: '/attendance' },
      { id: 'time-tracking', label: 'Time Tracking', href: '/time-tracking' },
    ],
  },
  {
    id: 'work-management',
    label: 'Work Management',
    icon: CheckSquare,
    section: 'Work',
    children: [
      { id: 'tasks', label: 'My Tasks', href: '/tasks' },
      { id: 'leave-management', label: 'Leave Management', href: '/hr/leave-requests' },
    ],
  },
  {
    id: 'communication',
    label: 'Communication',
    icon: MessageSquare,
    section: 'Collaboration',
    children: [
      { id: 'messages', label: 'Messages', href: '/messages' },
    ],
  },
  {
    id: 'meetings',
    label: 'Meetings',
    icon: Video,
    section: 'Collaboration',
    children: [
      { id: 'my-meetings', label: 'My Meetings', href: '/meetings' },
    ],
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: FileText,
    section: 'Collaboration',
    children: [
      { id: 'my-documents', label: 'My Documents', href: '/hr/documents' },
      { id: 'my-payslips', label: 'My Payslips', href: '/hr/payslips' },
    ],
  },
  {
    id: 'personal',
    label: 'Personal',
    icon: User,
    section: 'Personal',
    children: [
      { id: 'my-profile', label: 'My Profile', href: '/settings/profile' },
    ],
  },
];

export function getHubSpotNavigation(role: Role): HubSpotNavCategory[] {
  if (role === 'employee') {
    return employeeHubSpotCategories;
  }

  return hubSpotCategories
    .map((category) => {
      if (category.roles && !category.roles.includes(role)) {
        return null;
      }
      if (category.children) {
        const filteredChildren = category.children.filter(
          (child) => !child.roles || child.roles.includes(role),
        );
        if (filteredChildren.length === 0) {
          return null;
        }
        return {
          ...category,
          children: filteredChildren,
        };
      }
      return category;
    })
    .filter(Boolean) as HubSpotNavCategory[];
}