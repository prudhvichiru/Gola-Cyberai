'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AttendanceSession } from '@/types/attendance.types';
import {
  LogIn,
  LogOut,
  Coffee,
  CheckCircle2,
  Clock,
  Play,
  Activity,
} from 'lucide-react';

interface TodayActivityTimelineProps {
  session: AttendanceSession | null;
}

export function TodayActivityTimeline({ session }: TodayActivityTimelineProps) {
  if (!session) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Today's Punch Audit Trail
          </CardTitle>
          <CardDescription>
            Live shift logs and biometric timestamp verification
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          No punch activity recorded today. Click <strong>Check In</strong> above to begin your shift.
        </CardContent>
      </Card>
    );
  }

  const events: Array<{
    id: string;
    title: string;
    time: string;
    type: 'check_in' | 'break_start' | 'break_end' | 'check_out';
    icon: React.ReactNode;
    color: string;
    description: string;
  }> = [];

  // 1. Check in event
  events.push({
    id: 'check-in',
    title: 'Shift Web Punch In',
    time: new Date(session.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    type: 'check_in',
    icon: <LogIn className="h-4 w-4 text-emerald-600" />,
    color: 'bg-emerald-500/10 border-emerald-500/30',
    description: 'Verified via Company Office Network (Bangalore HQ)',
  });

  // 2. Breaks events
  const breaks = (session as any).breaks || [];
  breaks.forEach((b: any, idx: number) => {
    const breakLabel = b.break_type === 'lunch' ? 'Lunch Break' : b.break_type === 'coffee' ? 'Coffee / Tea Break' : 'Short Break';
    events.push({
      id: `break-start-${idx}`,
      title: `${breakLabel} Started`,
      time: new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'break_start',
      icon: <Coffee className="h-4 w-4 text-amber-600" />,
      color: 'bg-amber-500/10 border-amber-500/30',
      description: 'Shift paused for break interval',
    });

    if (b.end_time) {
      const mins = Math.floor((b.duration_seconds || 0) / 60);
      events.push({
        id: `break-end-${idx}`,
        title: `Resumed from ${breakLabel}`,
        time: new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'break_end',
        icon: <Play className="h-4 w-4 text-primary" />,
        color: 'bg-primary/10 border-primary/30',
        description: `Break ended • Duration: ${mins} minutes`,
      });
    }
  });

  // 3. Check out event
  if (session.check_out) {
    const hours = (session.total_work_seconds / 3600).toFixed(2);
    events.push({
      id: 'check-out',
      title: 'Shift Web Punch Out',
      time: new Date(session.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'check_out',
      icon: <LogOut className="h-4 w-4 text-rose-600" />,
      color: 'bg-rose-500/10 border-rose-500/30',
      description: `Shift concluded • Total net work: ${hours} hours`,
    });
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Today's Punch Audit Trail
            </CardTitle>
            <CardDescription>
              Chronological log of shift events and biometric verification
            </CardDescription>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {events.length} {events.length === 1 ? 'event' : 'events'} recorded
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
          {events.map((ev, i) => (
            <div key={ev.id} className="relative mb-5 last:mb-0">
              {/* Event bullet */}
              <div
                className={`absolute -left-[27px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full border bg-background ${ev.color}`}
              >
                {ev.icon}
              </div>

              {/* Event details */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{ev.title}</h4>
                  <p className="text-xs text-muted-foreground">{ev.description}</p>
                </div>
                <span className="font-mono text-xs font-semibold text-foreground/80 sm:text-right">
                  {ev.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
