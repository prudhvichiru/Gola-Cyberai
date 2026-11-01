'use client';

import * as React from 'react';
import { ActiveTimerWidget, TimesheetGrid } from '@/features/time-tracking';

export default function TimeTrackingPage() {
  const [refreshKey, setRefreshKey] = React.useState(0);

  const handleTimerStopped = () => {
    // Refresh timesheet entries automatically when a timer is stopped
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

      {/* Live Server Timer Widget */}
      <ActiveTimerWidget onTimerStopped={handleTimerStopped} />

      {/* Weekly Timesheet & Manager Approvals */}
      <div className="pt-2">
        <TimesheetGrid key={refreshKey} />
      </div>
    </div>
  );
}