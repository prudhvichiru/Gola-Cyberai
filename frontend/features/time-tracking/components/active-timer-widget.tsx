'use client';

import * as React from 'react';
import { Play, Pause, Square, Clock, AlertTriangle, CheckCircle2, ChevronDown } from 'lucide-react';
import { ProjectFrontendService } from '@/services/project.service';
import { createClient } from '@/lib/supabase-client';
import { TaskTimer, TaskItem } from '@/types/project.types';
import { Button } from '@/components/ui/button';

interface ActiveTimerWidgetProps {
  onTimerStopped?: () => void;
}

export function ActiveTimerWidget({ onTimerStopped }: ActiveTimerWidgetProps) {
  const [activeTimer, setActiveTimer] = React.useState<TaskTimer | null>(null);
  const [availableTasks, setAvailableTasks] = React.useState<TaskItem[]>([]);
  const [selectedTaskId, setSelectedTaskId] = React.useState<string>('');
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Sync active timer from server
  const syncTimer = React.useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || 'current-user';

    const [timerRes, tasksRes] = await Promise.all([
      ProjectFrontendService.getActiveTimer(userId),
      ProjectFrontendService.getTasks({ status: 'in_progress' }),
    ]);

    if (timerRes.data) {
      setActiveTimer(timerRes.data);
      setSelectedTaskId(timerRes.data.task_id);
    } else {
      setActiveTimer(null);
    }

    if (tasksRes.data) {
      setAvailableTasks(tasksRes.data);
      if (!selectedTaskId && tasksRes.data.length > 0) {
        setSelectedTaskId(tasksRes.data[0].id);
      }
    }
    setLoading(false);
  }, [selectedTaskId]);

  React.useEffect(() => {
    syncTimer();
  }, [syncTimer]);

  // Live Authoritative Ticking Calculation
  React.useEffect(() => {
    if (!activeTimer) {
      setElapsedSeconds(0);
      return;
    }

    const calculateCurrentElapsed = () => {
      let total = activeTimer.accumulated_seconds || 0;
      if (activeTimer.status === 'running') {
        const startTime = new Date(activeTimer.start_time).getTime();
        const now = Date.now();
        const liveSec = Math.max(0, Math.floor((now - startTime) / 1000));
        total += liveSec;
      }
      return total;
    };

    setElapsedSeconds(calculateCurrentElapsed());

    if (activeTimer.status === 'running') {
      const interval = setInterval(() => {
        setElapsedSeconds(calculateCurrentElapsed());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeTimer]);

  // Format seconds to HH:MM:SS
  const formatTime = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Actions
  const handleStart = async () => {
    setErrorMsg(null);
    if (!selectedTaskId) {
      setErrorMsg('Please select a task to track time.');
      return;
    }
    const targetTask = availableTasks.find((t) => t.id === selectedTaskId);
    const projectId = targetTask?.project_id || 'proj-1';

    const res = await ProjectFrontendService.startTimer(selectedTaskId, projectId);
    if (res.data?.data) {
      setActiveTimer(res.data.data);
      setSuccessMsg(`Timer started for ${res.data.data.task?.title || 'task'}`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } else if (res.error) {
      setErrorMsg(res.error);
    }
  };

  const handlePause = async () => {
    setErrorMsg(null);
    const res = await ProjectFrontendService.pauseTimer();
    if (res.data?.data) {
      setActiveTimer(res.data.data);
    } else if (res.error) {
      setErrorMsg(res.error);
    }
  };

  const handleResume = async () => {
    setErrorMsg(null);
    const res = await ProjectFrontendService.resumeTimer();
    if (res.data?.data) {
      setActiveTimer(res.data.data);
    } else if (res.error) {
      setErrorMsg(res.error);
    }
  };

  const handleStop = async () => {
    setErrorMsg(null);
    const res = await ProjectFrontendService.stopTimer();
    if (res.data) {
      setSuccessMsg('Timer stopped. Logged directly to weekly timesheet!');
      setActiveTimer(null);
      setElapsedSeconds(0);
      setTimeout(() => setSuccessMsg(null), 4000);
      if (onTimerStopped) onTimerStopped();
    } else if (res.error) {
      setErrorMsg(res.error);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left Side: Live Clock & Status */}
        <div className="flex items-center gap-5 w-full md:w-auto">
          <div
            className={`relative flex items-center justify-center h-20 w-20 rounded-2xl border-2 transition-all duration-300 ${
              activeTimer?.status === 'running'
                ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                : activeTimer?.status === 'paused'
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40'
            }`}
          >
            <Clock
              className={`h-8 w-8 ${
                activeTimer?.status === 'running'
                  ? 'text-blue-600 dark:text-blue-400 animate-pulse'
                  : activeTimer?.status === 'paused'
                  ? 'text-amber-500'
                  : 'text-zinc-400'
              }`}
            />
            {activeTimer?.status === 'running' && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Authoritative Task Timer
              </span>
              {activeTimer && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    activeTimer.status === 'running'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                  }`}
                >
                  {activeTimer.status}
                </span>
              )}
            </div>

            <div className="font-mono text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
              {formatTime(elapsedSeconds)}
            </div>

            <p className="text-xs text-zinc-500 mt-1">
              {activeTimer
                ? `${activeTimer.project?.code} • ${activeTimer.task?.title}`
                : 'Select an assigned task to start tracking productive hours.'}
            </p>
          </div>
        </div>

        {/* Right Side: Task Selector & Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {!activeTimer ? (
            <>
              <div className="w-full sm:w-64">
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-sm font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select task to track...</option>
                  {availableTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.project?.code} — {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                onClick={handleStart}
                className="w-full sm:w-auto h-11 px-6 gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-500/20"
              >
                <Play className="h-4 w-4 fill-current" />
                Start Timer
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              {activeTimer.status === 'running' ? (
                <Button
                  onClick={handlePause}
                  variant="outline"
                  className="flex-1 sm:flex-none h-11 px-5 gap-2 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl font-semibold"
                >
                  <Pause className="h-4 w-4 fill-current" />
                  Pause
                </Button>
              ) : (
                <Button
                  onClick={handleResume}
                  className="flex-1 sm:flex-none h-11 px-5 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-md shadow-emerald-500/20"
                >
                  <Play className="h-4 w-4 fill-current" />
                  Resume
                </Button>
              )}

              <Button
                onClick={handleStop}
                variant="destructive"
                className="flex-1 sm:flex-none h-11 px-5 gap-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold shadow-md shadow-rose-500/20"
              >
                <Square className="h-4 w-4 fill-current" />
                Stop & Log
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
    </div>
  );
}
