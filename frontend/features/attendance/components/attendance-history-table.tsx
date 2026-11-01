'use client';

import * as React from 'react';
import { DataTable, type Column } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import type { AttendanceSession } from '@/types/attendance.types';
import { Calendar, Clock, CheckCircle2, Coffee } from 'lucide-react';

interface AttendanceHistoryTableProps {
  records: AttendanceSession[];
  isLoading?: boolean;
}

export function AttendanceHistoryTable({ records, isLoading = false }: AttendanceHistoryTableProps) {
  const columns: Column<AttendanceSession>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (item) => (
        <div className="flex items-center gap-2 font-medium">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{new Date(item.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
        </div>
      ),
    },
    {
      key: 'check_in',
      header: 'Check In',
      render: (item) => (
        <span className="font-mono text-xs">
          {new Date(item.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
    {
      key: 'check_out',
      header: 'Check Out',
      render: (item) => (
        <span className="font-mono text-xs">
          {item.check_out
            ? new Date(item.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '—'}
        </span>
      ),
    },
    {
      key: 'total_break_seconds',
      header: 'Break Duration',
      render: (item) => (
        <span className="text-xs text-muted-foreground">
          {Math.floor((item.total_break_seconds || 0) / 60)} mins
        </span>
      ),
    },
    {
      key: 'total_work_seconds',
      header: 'Effective Hours',
      render: (item) => {
        const hours = (item.total_work_seconds / 3600).toFixed(2);
        return <span className="font-semibold">{hours} hrs</span>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => <StatusBadge status={item.status} />,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Attendance Log History</h3>
        <span className="text-xs text-muted-foreground">Recent 30 Days</span>
      </div>
      <DataTable
        columns={columns}
        data={records}
        isLoading={isLoading}
        emptyTitle="No attendance logs found"
        emptyDescription="Your check-in and check-out logs will be recorded here automatically."
      />
    </div>
  );
}
