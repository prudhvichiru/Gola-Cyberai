'use client';

import * as React from 'react';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  AlertCircle,
  FileText,
  User,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ProjectFrontendService } from '@/services/project.service';
import { TimesheetRecord, TimesheetEntry } from '@/types/project.types';
import { StatCard } from '@/components/shared/stat-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export function TimesheetGrid() {
  const [activeTab, setActiveTab] = React.useState<'my' | 'approvals'>('my');
  const [timesheets, setTimesheets] = React.useState<TimesheetRecord[]>([]);
  const [approvalQueue, setApprovalQueue] = React.useState<TimesheetRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  // Rejection modal
  const [rejectingTimesheet, setRejectingTimesheet] = React.useState<TimesheetRecord | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState('');

  // Toast feedback
  const [notification, setNotification] = React.useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchTimesheets = React.useCallback(async () => {
    setLoading(true);
    const [myRes, queueRes] = await Promise.all([
      ProjectFrontendService.getMyTimesheets(),
      ProjectFrontendService.getTimesheetApprovalQueue(),
    ]);

    if (myRes.data) setTimesheets(myRes.data);
    if (queueRes.data) setApprovalQueue(queueRes.data);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    fetchTimesheets();
  }, [fetchTimesheets]);

  const currentTimesheet = timesheets[0] || null;

  // Submit timesheet
  const handleSubmitTimesheet = async (timesheetId: string) => {
    setSubmitting(true);
    const res = await ProjectFrontendService.submitTimesheet(timesheetId);
    setSubmitting(false);
    if (res.data) {
      setNotification({ text: 'Timesheet submitted for manager approval!', type: 'success' });
      fetchTimesheets();
      setTimeout(() => setNotification(null), 4000);
    } else {
      setNotification({ text: res.error || 'Failed to submit timesheet', type: 'error' });
    }
  };

  // Approve timesheet
  const handleApproveTimesheet = async (timesheetId: string) => {
    const res = await ProjectFrontendService.reviewTimesheet(timesheetId, 'approved');
    if (res.data) {
      setNotification({ text: 'Timesheet approved successfully!', type: 'success' });
      fetchTimesheets();
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // Reject timesheet
  const handleConfirmReject = async () => {
    if (!rejectingTimesheet) return;
    const res = await ProjectFrontendService.reviewTimesheet(
      rejectingTimesheet.id,
      'rejected',
      rejectionReason || 'Timesheet requires corrections'
    );
    if (res.data) {
      setNotification({ text: 'Timesheet rejected with feedback.', type: 'success' });
      setRejectingTimesheet(null);
      setRejectionReason('');
      fetchTimesheets();
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-6">
      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-3 text-sm font-medium rounded-xl shadow-md flex items-center justify-between animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          <span>{notification.text}</span>
          <button onClick={() => setNotification(null)} className="font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Tabs navigation */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('my')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'my'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            My Weekly Timesheet
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'approvals'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <span>Manager Approvals Queue</span>
            {approvalQueue.length > 0 && (
              <span className="h-5 px-1.5 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
                {approvalQueue.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'my' && currentTimesheet && (
          <div className="flex items-center gap-3">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
                currentTimesheet.status === 'approved'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                  : currentTimesheet.status === 'submitted'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                  : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
              }`}
            >
              {currentTimesheet.status}
            </span>

            {currentTimesheet.status === 'draft' && (
              <Button
                onClick={() => handleSubmitTimesheet(currentTimesheet.id)}
                disabled={submitting}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm text-xs h-9"
              >
                <Send className="h-3.5 w-3.5" />
                Submit for Approval
              </Button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <LoadingSkeleton count={5} />
        </div>
      ) : activeTab === 'my' ? (
        /* MY TIMESHEET VIEW */
        <div className="space-y-6">
          {currentTimesheet ? (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
              {/* Header */}
              <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-zinc-50/50 dark:bg-zinc-800/30">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                      Work Period: {currentTimesheet.week_start_date} to {currentTimesheet.week_end_date}
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Standard working policy: 40.0 hours / week • Verified server telemetry
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-zinc-400 uppercase font-semibold">Total Logged</span>
                  <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                    {currentTimesheet.total_hours.toFixed(1)} hrs
                  </div>
                </div>
              </div>

              {/* 7-Day Matrix Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4 min-w-[200px]">Project & Task</th>
                      <th className="py-3 px-4 min-w-[200px]">Description</th>
                      {DAYS.map((day) => (
                        <th key={day} className="py-3 px-3 text-center w-16">
                          {day}
                        </th>
                      ))}
                      <th className="py-3 px-4 text-right w-20">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {currentTimesheet.entries?.map((entry) => (
                      <tr key={entry.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30">
                        <td className="py-3.5 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                          <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 mr-2">
                            {entry.project_id === 'proj-1' ? 'CYBER-2.0' : 'SOC-ENGINE'}
                          </span>
                          <span className="text-xs text-zinc-600 dark:text-zinc-400">
                            {entry.task_id === 'task-1'
                              ? 'Role Guards & Middleware'
                              : entry.task_id === 'task-2'
                              ? 'Sidebar Flyout Nav'
                              : 'Feature Delivery'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-zinc-500 max-w-xs truncate">
                          {entry.description || 'Logged via authoritative task timer'}
                        </td>
                        {/* 7 Day Matrix cells */}
                        {DAYS.map((day, idx) => {
                          // Simple mapping based on entry date day of week
                          const entryDayIndex = new Date(entry.date).getDay(); // 0 is Sun, 1 is Mon
                          const adjustedIndex = entryDayIndex === 0 ? 6 : entryDayIndex - 1;
                          const isMatch = adjustedIndex === idx;
                          return (
                            <td key={day} className="py-3.5 px-3 text-center font-mono text-xs">
                              {isMatch ? (
                                <span className="font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-1 rounded">
                                  {entry.hours.toFixed(1)}h
                                </span>
                              ) : (
                                <span className="text-zinc-300 dark:text-zinc-700">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          {entry.hours.toFixed(1)}h
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer Audit Information */}
              <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-800/20 text-xs text-zinc-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span>
                  Audit Reference: TS-{currentTimesheet.id} • Created: {new Date(currentTimesheet.created_at).toLocaleDateString()}
                </span>
                {currentTimesheet.reviewed_by && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    Reviewed & verified by {currentTimesheet.reviewed_by} at {new Date(currentTimesheet.reviewed_at!).toLocaleString()}
                  </span>
                )}
                {currentTimesheet.rejection_reason && (
                  <span className="text-rose-600 dark:text-rose-400 font-medium">
                    Rejection note: {currentTimesheet.rejection_reason}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <EmptyState
              title="No active timesheet found"
              description="Your weekly timesheet will automatically generate as you track time on project tasks."
            />
          )}
        </div>
      ) : (
        /* MANAGER APPROVALS QUEUE */
        <div className="space-y-4">
          {approvalQueue.length === 0 ? (
            <EmptyState
              title="No timesheets pending review"
              description="All submitted employee timesheets have been verified and processed."
            />
          ) : (
            <div className="space-y-4">
              {approvalQueue.map((ts) => (
                <div
                  key={ts.id}
                  className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                        {ts.user?.full_name?.charAt(0) || 'E'}
                      </div>
                      <div>
                        <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">{ts.user?.full_name}</h4>
                        <p className="text-xs text-zinc-500">
                          {ts.user?.department?.name || 'Engineering'} • {ts.user?.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-zinc-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Week: {ts.week_start_date} to {ts.week_end_date}
                      </span>
                      <span className="flex items-center gap-1 font-mono font-bold text-zinc-800 dark:text-zinc-200">
                        <Clock className="h-3.5 w-3.5 text-blue-600" />
                        {ts.total_hours.toFixed(1)} Total Hours Logged
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 w-full md:w-auto">
                    <Button
                      onClick={() => handleApproveTimesheet(ts.id)}
                      className="flex-1 md:flex-none gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => setRejectingTimesheet(ts)}
                      variant="outline"
                      className="flex-1 md:flex-none gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 text-xs h-9"
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rejection Modal */}
      <Dialog open={!!rejectingTimesheet} onOpenChange={() => setRejectingTimesheet(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Timesheet</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Provide feedback explaining why this timesheet requires revision by {rejectingTimesheet?.user?.full_name}:
            </p>
            <div className="space-y-1.5">
              <Label>Reason for Rejection *</Label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Overlapping attendance telemetry or hours logged exceeding project scope..."
                className="w-full p-2.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingTimesheet(null)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmReject} variant="destructive">
              Reject Timesheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
