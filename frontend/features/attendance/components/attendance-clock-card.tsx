'use client';

import * as React from 'react';
import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { AttendanceClientService } from '@/services/attendance.service';
import type { AttendanceSession, AttendanceBreak } from '@/types/attendance.types';
import { toast } from 'sonner';
import {
  Play,
  Pause,
  Square,
  Coffee,
  CheckCircle2,
  Clock,
  Loader2,
  ChevronDown,
  Utensils,
  Sparkles,
} from 'lucide-react';

interface AttendanceClockCardProps {
  userId: string;
  initialSession: AttendanceSession | null;
  initialActiveBreak: AttendanceBreak | null;
  onSessionUpdate?: (session: AttendanceSession | null) => void;
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function AttendanceClockCard({
  userId,
  initialSession,
  initialActiveBreak,
  onSessionUpdate,
}: AttendanceClockCardProps) {
  const [session, setSession] = useState<AttendanceSession | null>(initialSession);
  const [activeBreak, setActiveBreak] = useState<AttendanceBreak | null>(initialActiveBreak);
  const [workSeconds, setWorkSeconds] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(0);
  const [isCheckoutConfirmOpen, setIsCheckoutConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Keep internal state synced if props change
  useEffect(() => {
    setSession(initialSession);
    setActiveBreak(initialActiveBreak);
  }, [initialSession, initialActiveBreak]);

  // Live seconds ticker
  useEffect(() => {
    if (!session || session.status === 'completed') {
      if (session?.total_work_seconds) {
        setWorkSeconds(session.total_work_seconds);
      }
      return;
    }

    const timer = setInterval(() => {
      const now = Date.now();
      const checkInTime = new Date(session.check_in).getTime();

      if (session.status === 'working') {
        const totalElapsed = Math.max(0, Math.floor((now - checkInTime) / 1000));
        const netWork = Math.max(0, totalElapsed - (session.total_break_seconds || 0));
        setWorkSeconds(netWork);
      } else if (session.status === 'on_break' && activeBreak) {
        const breakStartTime = new Date(activeBreak.start_time).getTime();
        const currentBreakDuration = Math.max(0, Math.floor((now - breakStartTime) / 1000));
        setBreakSeconds((session.total_break_seconds || 0) + currentBreakDuration);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [session, activeBreak]);

  // Actions
  async function handleCheckIn() {
    startTransition(async () => {
      const res = await AttendanceClientService.checkIn(userId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setSession(res.data?.data || null);
      onSessionUpdate?.(res.data?.data || null);
      toast.success('Successfully checked in! Have a productive day.');
    });
  }

  async function handleStartBreak(breakType: string) {
    startTransition(async () => {
      const res = await AttendanceClientService.startBreak(userId, breakType);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setSession(res.data?.data.session || null);
      setActiveBreak(res.data?.data.break || null);
      const label = breakType === 'lunch' ? 'Lunch break' : breakType === 'coffee' ? 'Coffee / Tea break' : 'Break';
      toast.info(`${label} started. Enjoy!`);
    });
  }

  async function handleEndBreak() {
    startTransition(async () => {
      const res = await AttendanceClientService.endBreak(userId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setSession(res.data?.data.session || null);
      setActiveBreak(null);
      toast.success('Resumed work! Break recorded.');
    });
  }

  async function handleExecuteCheckOut() {
    startTransition(async () => {
      const res = await AttendanceClientService.checkOut(userId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setSession(res.data?.data || null);
      setActiveBreak(null);
      setIsCheckoutConfirmOpen(false);
      onSessionUpdate?.(res.data?.data || null);
      toast.success('Checked out successfully. Shift completed!');
    });
  }

  const isWorking = session?.status === 'working';
  const isOnBreak = session?.status === 'on_break';
  const isCompleted = session?.status === 'completed';
  const isNotCheckedIn = !session;

  const targetSeconds = 8 * 3600; // 8.0 hours target
  const completionPercentage = Math.min(100, Math.round((workSeconds / targetSeconds) * 100));
  const remainingSeconds = Math.max(0, targetSeconds - workSeconds);

  return (
    <>
      <Card className="relative overflow-hidden border-border bg-card shadow-card">
        {/* Top accent indicator strip */}
        <div
          className={`h-1.5 w-full ${
            isWorking
              ? 'bg-emerald-500'
              : isOnBreak
              ? 'bg-amber-500'
              : isCompleted
              ? 'bg-primary'
              : 'bg-muted'
          }`}
        />

        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl">Daily Attendance Tracker</CardTitle>
              <CardDescription>
                Real-time working hours with server-side verified accuracy
              </CardDescription>
            </div>

            {/* Shared Status badge */}
            <StatusBadge
              status={session ? session.status : 'absent'}
              label={!session ? 'Not Checked In' : undefined}
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Main Digital Clock Display */}
          <div className="flex flex-col items-center justify-center rounded-2xl bg-muted/30 p-8 border border-border/60">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {isOnBreak ? 'Active Break Time' : 'Today Working Time'}
            </span>
            <div className="mt-2 font-mono text-5xl font-black tracking-wider text-foreground sm:text-6xl">
              {isOnBreak ? formatDuration(breakSeconds) : formatDuration(workSeconds)}
            </div>
            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
              <span>
                Checked in:{' '}
                <strong className="text-foreground">
                  {session
                    ? new Date(session.check_in).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </strong>
              </span>
              <span>•</span>
              <span>
                Total break:{' '}
                <strong className="text-foreground">
                  {session ? `${Math.floor((session.total_break_seconds || 0) / 60)}m` : '0m'}
                </strong>
              </span>
            </div>

            {/* 8-Hour Target Shift Progress Gauge */}
            {session && (
              <div className="mt-5 w-full max-w-md space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-muted-foreground">Daily 8.0h Goal</span>
                  <span className="font-semibold text-foreground">
                    {completionPercentage}% ({formatDuration(workSeconds)} / 08:00:00)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full transition-all duration-500 ${
                      completionPercentage >= 100
                        ? 'bg-emerald-500'
                        : isWorking
                        ? 'bg-primary'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>
                    {remainingSeconds === 0
                      ? '🎯 Target Achieved!'
                      : `${formatDuration(remainingSeconds)} remaining for full day`}
                  </span>
                  <span>Min 4.5h for Half Day</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {isNotCheckedIn && (
              <Button
                size="lg"
                onClick={handleCheckIn}
                disabled={isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-8 shadow-md shadow-emerald-600/20"
              >
                {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5 fill-current" />}
                Check In
              </Button>
            )}

            {isWorking && (
              <>
                {/* Break Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="lg"
                      variant="outline"
                      disabled={isPending}
                      className="gap-2 border-amber-500/40 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700 dark:text-amber-400"
                    >
                      <Coffee className="h-5 w-5" />
                      Take Break
                      <ChevronDown className="h-4 w-4 opacity-70" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-52">
                    <DropdownMenuLabel>Select Break Type</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleStartBreak('coffee')}
                      className="gap-2 cursor-pointer"
                    >
                      <Coffee className="h-4 w-4 text-amber-500" />
                      <span>Coffee / Tea Break (15m)</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStartBreak('lunch')}
                      className="gap-2 cursor-pointer"
                    >
                      <Utensils className="h-4 w-4 text-emerald-500" />
                      <span>Lunch Break (45m)</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStartBreak('break')}
                      className="gap-2 cursor-pointer"
                    >
                      <Sparkles className="h-4 w-4 text-blue-500" />
                      <span>Personal Break</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  size="lg"
                  variant="destructive"
                  onClick={() => setIsCheckoutConfirmOpen(true)}
                  disabled={isPending}
                  className="gap-2 px-6"
                >
                  {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Square className="h-4 w-4 fill-current" />}
                  Check Out
                </Button>
              </>
            )}

            {isOnBreak && (
              <>
                <Button
                  size="lg"
                  onClick={handleEndBreak}
                  disabled={isPending}
                  className="bg-primary hover:bg-primary-hover text-white gap-2 px-8 shadow-md shadow-primary/20"
                >
                  {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5 fill-current" />}
                  Resume Work
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setIsCheckoutConfirmOpen(true)}
                  disabled={isPending}
                  className="gap-2 text-destructive hover:bg-destructive/10"
                >
                  {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Square className="h-4 w-4 fill-current" />}
                  Check Out
                </Button>
              </>
            )}

            {isCompleted && (
              <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary">
                <CheckCircle2 className="h-5 w-5" />
                You have completed your shift today! Check in again tomorrow.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Senior Developer UX: Shared ConfirmDialog for Checkout */}
      <ConfirmDialog
        open={isCheckoutConfirmOpen}
        onOpenChange={setIsCheckoutConfirmOpen}
        title="Check Out for Today?"
        description="Are you sure you want to end your shift? Your total working hours and break durations will be finalized on the server."
        confirmLabel="Yes, Check Out"
        cancelLabel="Stay Checked In"
        isDestructive={true}
        onConfirm={handleExecuteCheckOut}
      />
    </>
  );
}
