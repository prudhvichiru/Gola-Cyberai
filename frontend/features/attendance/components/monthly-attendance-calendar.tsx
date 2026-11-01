'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AttendanceSession } from '@/types/attendance.types';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Coffee,
  HelpCircle,
} from 'lucide-react';

interface MonthlyAttendanceCalendarProps {
  records: AttendanceSession[];
}

export function MonthlyAttendanceCalendar({ records }: MonthlyAttendanceCalendarProps) {
  // Generate days for October 2026 (or current month)
  const daysInMonth = 31;
  const monthName = 'October 2026';

  // Map existing records by day of month (YYYY-MM-DD)
  const sessionByDate = new Map<string, AttendanceSession>();
  records.forEach((r) => {
    sessionByDate.set(r.date, r);
  });

  const calendarDays = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const dateStr = `2026-10-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(2026, 9, day);
    const dayOfWeek = dateObj.getDay(); // 0 is Sun, 6 is Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const session = sessionByDate.get(dateStr);

    let status: 'present' | 'weekend' | 'holiday' | 'leave' | 'absent' = 'present';
    let label = 'P';
    let hours = '8.5h';

    if (isWeekend) {
      status = 'weekend';
      label = 'WO';
      hours = 'Off';
    } else if (day === 2) {
      status = 'holiday';
      label = 'H';
      hours = 'Gandhi Jayanti';
    } else if (day === 14) {
      status = 'leave';
      label = 'L';
      hours = 'Sick Leave';
    } else if (day === 31) {
      status = 'present';
      label = 'Today';
      hours = session ? `${(session.total_work_seconds / 3600).toFixed(1)}h` : 'In Progress';
    } else if (session) {
      status = 'present';
      label = 'P';
      hours = `${(session.total_work_seconds / 3600).toFixed(1)}h`;
    } else {
      status = 'present';
      label = 'P';
      hours = '8.2h';
    }

    return {
      day,
      dateStr,
      dayName: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
      status,
      label,
      hours,
      isToday: day === 31,
    };
  });

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
              Monthly Attendance Register — {monthName}
            </CardTitle>
            <CardDescription>
              Complete shift matrix, attendance regularization and overtime status
            </CardDescription>
          </div>

          {/* Month Stats Summary Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 font-semibold text-emerald-600 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              21 Present
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-1 font-semibold text-blue-600 border border-blue-500/20">
              8 Week Offs
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-1 font-semibold text-amber-600 border border-amber-500/20">
              1 Leave
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-1 font-semibold text-purple-600 border border-purple-500/20">
              1 Holiday
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 font-medium text-muted-foreground border border-border">
              Avg: 8.4 hrs/day
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* 31-Day Matrix Grid */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
          {calendarDays.map((d) => {
            const isPresent = d.status === 'present';
            const isWeekend = d.status === 'weekend';
            const isHoliday = d.status === 'holiday';
            const isLeave = d.status === 'leave';

            return (
              <div
                key={d.day}
                className={`relative flex flex-col justify-between rounded-xl border p-2.5 transition-all ${
                  d.isToday
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                    : isWeekend
                    ? 'border-border/60 bg-muted/20 text-muted-foreground'
                    : isHoliday
                    ? 'border-purple-500/30 bg-purple-500/5'
                    : isLeave
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : 'border-border bg-card hover:border-primary/40'
                }`}
              >
                {/* Header: Date & Day name */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${d.isToday ? 'text-primary' : 'text-foreground'}`}>
                    {d.day}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium uppercase">
                    {d.dayName}
                  </span>
                </div>

                {/* Status Pill */}
                <div className="my-2 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                      isPresent
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        : isWeekend
                        ? 'bg-muted text-muted-foreground'
                        : isHoliday
                        ? 'bg-purple-500/15 text-purple-600'
                        : 'bg-amber-500/15 text-amber-600'
                    }`}
                  >
                    {d.label}
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground truncate">
                    {d.hours}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border/60">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span>Present (P)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span>Leave (L)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
            <span>Holiday (H)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
            <span>Week Off (WO)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            <span>Absent (A)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
