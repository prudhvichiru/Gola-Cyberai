'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';

const ActiveTimerWidget = dynamic(
  () => import('@/features/time-tracking/components/active-timer-widget').then((m) => m.ActiveTimerWidget),
  { ssr: false, loading: () => <div className="h-32 rounded-2xl bg-muted animate-pulse" /> }
);

const TimesheetGrid = dynamic(
  () => import('@/features/time-tracking/components/timesheet-grid').then((m) => m.TimesheetGrid),
  { ssr: false, loading: () => <div className="h-64 rounded-2xl bg-muted animate-pulse" /> }
);

export default function TimeTrackingPage() {
  const [refreshKey, setRefreshKey] = React.useState(0);

  const handleTimerStopped = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Time Tracking & Timesheets
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Server-authoritative task timers, single-active timer protection, and auditable weekly approval workflows.
        </p>
      </div>

      <ActiveTimerWidget onTimerStopped={handleTimerStopped} />

      <div className="pt-2">
        <TimesheetGrid key={refreshKey} />
      </div>
    </div>
  );
}
