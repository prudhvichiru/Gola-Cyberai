import type { LucideIcon } from 'lucide-react';

export type StatTone = 'primary' | 'success' | 'accent' | 'warning' | 'neutral' | 'info';

export interface DashboardStatItem {
  id: string;
  label: string;
  value: string | number;
  hint?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  icon: LucideIcon;
  tone: StatTone;
}

export interface QuickActionItem {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'attendance' | 'task' | 'meeting' | 'system';
}

export interface DashboardData {
  stats: DashboardStatItem[];
  departmentCount: number;
  activeEmployeeCount: number;
  recentActivities: ActivityItem[];
}
