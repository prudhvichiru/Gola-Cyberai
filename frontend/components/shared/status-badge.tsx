import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ROLE_LABELS, ROLE_COLORS, type UserRole } from '@/constants/roles';
import type { UserStatus } from '@/types/user.types';

export type AttendanceStatusType =
  | 'working'
  | 'on_break'
  | 'completed'
  | 'present'
  | 'absent'
  | 'half_day'
  | 'late';

interface StatusBadgeProps {
  status?: UserStatus | AttendanceStatusType | string;
  role?: UserRole;
  label?: string;
  className?: string;
  showDot?: boolean;
}

const ATTENDANCE_STATUS_CONFIG: Record<
  AttendanceStatusType,
  { bg: string; text: string; border: string; dot: string; pulse?: boolean; defaultLabel: string }
> = {
  working: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-500',
    pulse: true,
    defaultLabel: 'Working',
  },
  on_break: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
    dot: 'bg-amber-500',
    pulse: true,
    defaultLabel: 'On Break',
  },
  completed: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/30',
    dot: 'bg-blue-500',
    defaultLabel: 'Completed',
  },
  present: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-500',
    defaultLabel: 'Present',
  },
  absent: {
    bg: 'bg-zinc-500/10',
    text: 'text-zinc-600 dark:text-zinc-400',
    border: 'border-zinc-500/20',
    dot: 'bg-zinc-400',
    defaultLabel: 'Absent',
  },
  half_day: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-500/20',
    dot: 'bg-purple-500',
    defaultLabel: 'Half Day',
  },
  late: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/20',
    dot: 'bg-rose-500',
    defaultLabel: 'Late',
  },
};

export function StatusBadge({
  status,
  role,
  label,
  className,
  showDot = true,
}: StatusBadgeProps) {
  // 1. Role badge
  if (role) {
    const roleConfig = ROLE_COLORS[role];
    const displayLabel = label || ROLE_LABELS[role] || role;

    return (
      <Badge
        variant="outline"
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium capitalize',
          roleConfig?.bg,
          roleConfig?.text,
          roleConfig?.border,
          className,
        )}
      >
        {showDot && (
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              role === 'admin'
                ? 'bg-rose-500'
                : role === 'hr'
                ? 'bg-amber-500'
                : role === 'manager'
                ? 'bg-teal-500'
                : 'bg-blue-500',
            )}
          />
        )}
        {displayLabel}
      </Badge>
    );
  }

  // 2. Attendance Status badge
  if (status && status in ATTENDANCE_STATUS_CONFIG) {
    const cfg = ATTENDANCE_STATUS_CONFIG[status as AttendanceStatusType];
    const displayLabel = label || cfg.defaultLabel;

    return (
      <Badge
        variant="outline"
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium',
          cfg.bg,
          cfg.text,
          cfg.border,
          className,
        )}
      >
        {showDot && (
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              cfg.dot,
              cfg.pulse && 'animate-pulse',
            )}
          />
        )}
        {displayLabel}
      </Badge>
    );
  }

  // 3. User account status fallback
  const isActive = status === 'active';
  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium capitalize',
        isActive
          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400'
          : 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20 dark:text-zinc-400',
        className,
      )}
    >
      {showDot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            isActive ? 'bg-emerald-500' : 'bg-zinc-400',
          )}
        />
      )}
      {label || (isActive ? 'Active' : status || 'Inactive')}
    </Badge>
  );
}
