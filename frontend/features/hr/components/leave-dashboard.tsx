'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DataTable, type Column } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { StatCard } from '@/components/shared/stat-card';
import { HRClientService } from '@/services/hr.service';
import type { LeaveBalance, LeaveRequest, CompanyHoliday, LeaveType } from '@/types/hr.types';
import { toast } from 'sonner';
import {
  Calendar,
  Clock,
  Plus,
  CheckCircle2,
  AlertCircle,
  Coffee,
  Sparkles,
  Palmtree,
  CalendarDays,
  FileText,
} from 'lucide-react';

interface LeaveDashboardProps {
  userId: string;
  initialBalances: LeaveBalance[];
  initialRequests: LeaveRequest[];
  holidays: CompanyHoliday[];
  leaveTypes: LeaveType[];
}

export function LeaveDashboard({
  userId,
  initialBalances,
  initialRequests,
  holidays,
  leaveTypes,
}: LeaveDashboardProps) {
  const [balances, setBalances] = useState<LeaveBalance[]>(initialBalances);
  const [requests, setRequests] = useState<LeaveRequest[]>(initialRequests);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    leave_type_id: leaveTypes[0]?.id || '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    is_half_day: false,
    half_day_period: 'first_half' as 'first_half' | 'second_half',
    reason: '',
  });

  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reason.trim()) {
      toast.error('Please specify the reason for your leave');
      return;
    }

    startTransition(async () => {
      const res = await HRClientService.applyLeave({
        userId,
        ...formData,
      });

      if (res.error) {
        toast.error(res.error);
        return;
      }

      if (res.data?.data) {
        setRequests([res.data.data, ...requests]);
        setIsApplyModalOpen(false);
        setFormData({
          leave_type_id: leaveTypes[0]?.id || '',
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          is_half_day: false,
          half_day_period: 'first_half',
          reason: '',
        });
        toast.success('Leave application submitted for manager approval!');
      }
    });
  };

  const columns: Column<LeaveRequest>[] = [
    {
      key: 'leave_type',
      header: 'Leave Type',
      render: (item) => (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-semibold text-xs bg-muted">
            {item.leave_type?.code || 'LV'}
          </Badge>
          <span className="font-medium text-sm text-foreground">
            {item.leave_type?.name || 'Leave'}
          </span>
        </div>
      ),
    },
    {
      key: 'dates',
      header: 'Duration & Period',
      render: (item) => (
        <div>
          <span className="font-mono text-xs font-semibold text-foreground">
            {item.start_date === item.end_date ? item.start_date : `${item.start_date} → ${item.end_date}`}
          </span>
          <p className="text-xs text-muted-foreground">
            {item.is_half_day ? `0.5 Day (${item.half_day_period === 'first_half' ? 'First Half' : 'Second Half'})` : `${item.total_days} ${item.total_days === 1 ? 'Day' : 'Days'}`}
          </p>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (item) => (
        <span className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
          {item.reason}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => {
        if (item.status === 'approved') {
          return (
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs">
              Approved
            </Badge>
          );
        }
        if (item.status === 'pending') {
          return (
            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs animate-pulse">
              Pending Approval
            </Badge>
          );
        }
        if (item.status === 'rejected') {
          return (
            <Badge variant="destructive" className="text-xs">
              Rejected
            </Badge>
          );
        }
        return <Badge variant="outline">{item.status}</Badge>;
      },
    },
    {
      key: 'created_at',
      header: 'Applied On',
      render: (item) => (
        <span className="font-mono text-xs text-muted-foreground">
          {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Leave Balances Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {balances.map((b) => {
          const tone =
            b.leave_type?.code === 'CL'
              ? 'primary'
              : b.leave_type?.code === 'SL'
              ? 'accent'
              : b.leave_type?.code === 'PL'
              ? 'success'
              : 'neutral';

          return (
            <StatCard
              key={b.id}
              label={b.leave_type?.name || 'Leave Balance'}
              value={`${b.available_days} Days`}
              hint={`Allocated: ${b.allocated_days} • Used: ${b.used_days}`}
              icon={Palmtree}
              tone={tone}
            />
          );
        })}
      </div>

      {/* 2. Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">My Leave Applications</h3>
          <p className="text-xs text-muted-foreground">
            Track status of submitted leave requests and supervisor sign-offs.
          </p>
        </div>

        <Button
          onClick={() => setIsApplyModalOpen(true)}
          className="gap-2 bg-primary hover:bg-primary-hover text-white self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Apply for Leave</span>
        </Button>
      </div>

      {/* 3. Leave Requests Table */}
      <DataTable
        columns={columns}
        data={requests}
        emptyTitle="No leave applications submitted"
        emptyDescription="When you apply for casual, sick, or earned leaves, they will appear here."
      />

      {/* 4. Company Holiday Calendar Section */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                Annual Holiday Calendar — 2026
              </CardTitle>
              <CardDescription>
                Company-approved public, national, and festival holidays
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {holidays.length} Holidays
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
            {holidays.map((h) => (
              <div
                key={h.id}
                className="flex flex-col justify-between rounded-xl border border-border/80 bg-muted/20 p-3 hover:bg-muted/40 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-primary">
                      {new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-[11px] text-muted-foreground uppercase">{h.day_of_week}</span>
                  </div>
                  <h4 className="mt-1 text-sm font-semibold text-foreground line-clamp-1">{h.name}</h4>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="capitalize text-muted-foreground">{h.type}</span>
                  <Badge variant="outline" className="text-[10px] bg-background">
                    Holiday
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Apply Leave Modal */}
      <Dialog open={isApplyModalOpen} onOpenChange={setIsApplyModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleApplyLeave}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Apply for Leave
              </DialogTitle>
              <DialogDescription>
                Submit a new leave application to your reporting manager for sign-off.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="leave-type">Leave Category *</Label>
                <select
                  id="leave-type"
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={formData.leave_type_id}
                  onChange={(e) => setFormData({ ...formData, leave_type_id: e.target.value })}
                  required
                >
                  {leaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code}) {t.is_paid ? '• Paid' : '• Unpaid'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="start-date">From Date *</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="end-date">To Date *</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={formData.is_half_day}
                    onChange={(e) => setFormData({ ...formData, is_half_day: e.target.checked })}
                  />
                  <span>Half Day Leave</span>
                </label>

                {formData.is_half_day && (
                  <select
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    value={formData.half_day_period}
                    onChange={(e) =>
                      setFormData({ ...formData, half_day_period: e.target.value as any })
                    }
                  >
                    <option value="first_half">First Half (Morning)</option>
                    <option value="second_half">Second Half (Afternoon)</option>
                  </select>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="leave-reason">Reason *</Label>
                <textarea
                  id="leave-reason"
                  rows={3}
                  className="w-full rounded-md border border-input bg-background p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="State the purpose of your leave (required for audit)..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsApplyModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary-hover text-white">
                {isPending ? 'Submitting…' : 'Submit Application'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
