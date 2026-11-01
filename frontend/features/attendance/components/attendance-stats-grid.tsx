'use client';

import * as React from 'react';
import { StatCard } from '@/components/shared/stat-card';
import type { AttendanceSession } from '@/types/attendance.types';
import { Clock, Coffee, CheckCircle, Target } from 'lucide-react';

interface AttendanceStatsGridProps {
  session: AttendanceSession | null;
}

export function AttendanceStatsGrid({ session }: AttendanceStatsGridProps) {
  const checkInFormatted = session
    ? new Date(session.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Not yet';

  const checkOutFormatted = session?.check_out
    ? new Date(session.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'In progress';

  const totalBreakMinutes = session
    ? Math.floor((session.total_break_seconds || 0) / 60)
    : 0;

  const totalWorkHours = session
    ? (session.total_work_seconds / 3600).toFixed(1)
    : '0.0';

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Check In Time"
        value={checkInFormatted}
        hint={session ? 'Recorded by server' : 'Awaiting check-in'}
        icon={Clock}
        tone="primary"
      />
      <StatCard
        label="Total Break"
        value={`${totalBreakMinutes} mins`}
        hint="Lunch & short breaks"
        icon={Coffee}
        tone="accent"
      />
      <StatCard
        label="Total Hours"
        value={`${totalWorkHours} hrs`}
        hint="Target: 8.0 hrs / day"
        icon={Target}
        tone="success"
      />
      <StatCard
        label="Check Out Time"
        value={checkOutFormatted}
        hint={session?.check_out ? 'Shift completed' : 'End of day'}
        icon={CheckCircle}
        tone="neutral"
      />
    </div>
  );
}
