'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Users, Shield, Building, Lock, FileText, LucideIcon } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import type { UserRole as Role } from '@/constants/roles';

interface SettingsTab {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
}

const SETTINGS_TABS: SettingsTab[] = [
  {
    href: '/settings/profile',
    label: 'My Profile',
    icon: User,
    roles: ['admin', 'hr', 'manager', 'project_manager', 'payroll', 'employee'],
  },
  {
    href: '/settings/users',
    label: 'Users & Roles',
    icon: Users,
    roles: ['admin', 'hr'],
  },
  {
    href: '/settings/permissions',
    label: 'Permissions Matrix',
    icon: Shield,
    roles: ['admin'],
  },
  {
    href: '/settings/company',
    label: 'Company Settings',
    icon: Building,
    roles: ['admin'],
  },
  {
    href: '/settings/security',
    label: 'Security & MFA',
    icon: Lock,
    roles: ['admin', 'hr', 'manager', 'project_manager', 'payroll', 'employee'],
  },
  {
    href: '/settings/audit-logs',
    label: 'Audit Logs',
    icon: FileText,
    roles: ['admin'],
  },
];

export function SettingsNav() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const currentRole: Role = profile?.role || 'employee';

  const visibleTabs = SETTINGS_TABS.filter((tab) => tab.roles.includes(currentRole));

  return (
    <div className="flex border-b border-border overflow-x-auto gap-1">
      {visibleTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
              isActive
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
