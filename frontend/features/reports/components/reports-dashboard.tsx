'use client';

import * as React from 'react';
import {
  BarChart3,
  Clock,
  Coffee,
  Briefcase,
  AlertTriangle,
  FileCheck,
  TrendingUp,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { ProjectFrontendService } from '@/services/project.service';
import { ReportsSummary } from '@/types/project.types';
import { StatCard } from '@/components/shared/stat-card';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';

export function ReportsDashboard() {
  const [reports, setReports] = React.useState<ReportsSummary | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadReports() {
      setLoading(false);
      const res = await ProjectFrontendService.getReportsDashboard();
      if (res.data) {
        setReports(res.data);
      }
      setLoading(false);
    }
    loadReports();
  }, []);

  if (loading || !reports) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <LoadingSkeleton count={3} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Executive Summary Metrics */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Telemetry & Hours Telemetry</h2>
          <p className="text-xs text-zinc-500">
            Authoritative reconciliation across server attendance logs, task clocks, and weekly submissions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Net Attendance"
            value={`${reports.net_attendance_hours} hrs`}
            subtitle="Calculated work duration"
            icon={<Clock className="h-5 w-5 text-blue-600" />}
          />
          <StatCard
            title="Total Break Duration"
            value={`${reports.total_break_hours} hrs`}
            subtitle="Conforming break policy"
            icon={<Coffee className="h-5 w-5 text-amber-600" />}
          />
          <StatCard
            title="Task Productive Time"
            value={`${reports.total_task_hours} hrs`}
            subtitle="Authoritative task timers"
            icon={<Briefcase className="h-5 w-5 text-emerald-600" />}
          />
          <StatCard
            title="Project Tracked Time"
            value={`${reports.total_project_hours} hrs`}
            subtitle="Logged against delivery plans"
            icon={<Layers className="h-5 w-5 text-indigo-600" />}
          />
        </div>
      </div>

      {/* Variance & Operational Quality Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Estimated vs Recorded Gauge Card */}
        <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Estimated vs Recorded Time</h3>
              <p className="text-xs text-zinc-500">Delivery planning accuracy metric</p>
            </div>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-mono font-extrabold text-zinc-900 dark:text-zinc-100">
                {reports.estimated_vs_recorded.variance_percentage}%
              </span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                Within 10% Tolerance
              </span>
            </div>

            <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, reports.estimated_vs_recorded.variance_percentage)}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                <span className="text-zinc-400">Total Estimated</span>
                <p className="font-mono font-bold text-sm text-zinc-800 dark:text-zinc-200 mt-0.5">
                  {reports.estimated_vs_recorded.estimated_total} hrs
                </p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                <span className="text-zinc-400">Actual Recorded</span>
                <p className="font-mono font-bold text-sm text-zinc-800 dark:text-zinc-200 mt-0.5">
                  {reports.estimated_vs_recorded.recorded_total} hrs
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Audit & Compliance Card */}
        <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Audit & Discrepancies</h3>
              <p className="text-xs text-zinc-500">Double-counting guardrails</p>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>Overdue Tasks</span>
              </div>
              <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                {reports.overdue_tasks_count}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                <FileCheck className="h-4 w-4 text-blue-500" />
                <span>Pending Timesheets</span>
              </div>
              <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                {reports.pending_timesheets_count}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Double-Counting Guard</span>
              </div>
              <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                Enforced
              </span>
            </div>
          </div>
        </div>

        {/* Project Pipeline Card */}
        <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Project Pipeline</h3>
              <p className="text-xs text-zinc-500">Active vs Delivered</p>
            </div>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
              <Layers className="h-5 w-5" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 text-center">
              <span className="text-3xl font-mono font-extrabold text-blue-600 dark:text-blue-400">
                {reports.active_projects_count}
              </span>
              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mt-1">Active Projects</p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-center">
              <span className="text-3xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                {reports.completed_projects_count}
              </span>
              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mt-1">Completed</p>
            </div>
          </div>

          <p className="text-xs text-zinc-400 pt-2 leading-relaxed">
            All project hours are locked against verified member timesheets and manager approvals.
          </p>
        </div>
      </div>

      {/* Project Progress Distribution Breakdown */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Project Progress Distribution</h3>
            <p className="text-xs text-zinc-500">Live progress indicators and billable recorded hours</p>
          </div>
        </div>

        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {reports.project_progress_distribution?.map((p) => (
            <div key={p.code} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
              <div className="space-y-1 sm:w-1/3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                    {p.code}
                  </span>
                  <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{p.name}</h4>
                </div>
                <span className="text-xs text-zinc-400 capitalize">Status: {p.status}</span>
              </div>

              {/* Progress bar */}
              <div className="flex-1 w-full sm:w-auto px-0 sm:px-6">
                <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                  <span className="text-zinc-500">Progress</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-bold">{p.progress}%</span>
                </div>
                <div className="h-2.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      p.progress >= 70 ? 'bg-emerald-500' : p.progress >= 40 ? 'bg-blue-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${p.progress}%` }}
                  />
                </div>
              </div>

              <div className="text-right sm:w-32">
                <span className="text-xs text-zinc-400">Tracked Time</span>
                <p className="font-mono font-bold text-sm text-zinc-800 dark:text-zinc-200">{p.total_hours} hrs</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
