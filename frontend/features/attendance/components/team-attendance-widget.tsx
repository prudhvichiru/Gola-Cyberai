'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/shared/status-badge';
import { Skeleton } from '@/components/shared/loading-skeleton';
import type { TeamAttendanceSummary } from '@/types/attendance.types';
import { Users, CheckCircle2, Coffee, Clock, AlertTriangle } from 'lucide-react';

interface TeamAttendanceWidgetProps {
  summary: TeamAttendanceSummary | null;
  isLoading?: boolean;
}

export function TeamAttendanceWidget({ summary, isLoading = false }: TeamAttendanceWidgetProps) {
  if (isLoading || !summary) {
    return (
      <Card className="border-border">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border/50">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const { counts, members } = summary;

  return (
    <Card className="border-border shadow-card">
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Live Team Attendance Board
            </CardTitle>
            <CardDescription>
              Real-time shift presence for managers and supervisors
            </CardDescription>
          </div>

          {/* Quick Counter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {counts.working} Working
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600 border border-amber-500/20">
              <Coffee className="h-3 w-3" />
              {counts.on_break} On Break
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary border border-primary/20">
              <CheckCircle2 className="h-3 w-3" />
              {counts.completed} Completed
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground border border-border">
              {counts.absent} Away/Absent
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {members.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No active team members registered.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {members.map(({ profile, session, status }) => {
              const initials = profile.full_name
                ? profile.full_name
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()
                : 'U';

              return (
                <div
                  key={profile.id}
                  className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/20 p-3.5 transition-all hover:bg-muted/40 hover:border-primary/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name ?? ''} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{profile.full_name || profile.email}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {profile.department?.name || profile.role}
                      </p>
                    </div>
                  </div>

                  <div>
                    <StatusBadge status={status} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
