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
import { HRClientService } from '@/services/hr.service';
import type { LeaveRequest } from '@/types/hr.types';
import { toast } from 'sonner';
import {
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';

interface LeaveApprovalQueueProps {
  reviewerId: string;
  initialQueue: LeaveRequest[];
}

export function LeaveApprovalQueue({ reviewerId, initialQueue }: LeaveApprovalQueueProps) {
  const [queue, setQueue] = useState<LeaveRequest[]>(initialQueue);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleApprove = (req: LeaveRequest) => {
    startTransition(async () => {
      const res = await HRClientService.reviewLeave({
        requestId: req.id,
        reviewerId,
        status: 'approved',
      });

      if (res.error) {
        toast.error(res.error);
        return;
      }

      setQueue(queue.filter((item) => item.id !== req.id));
      toast.success(`Leave request for ${req.employee?.full_name || 'employee'} approved!`);
    });
  };

  const handleReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    startTransition(async () => {
      const res = await HRClientService.reviewLeave({
        requestId: selectedRequest.id,
        reviewerId,
        status: 'rejected',
        rejectionReason,
      });

      if (res.error) {
        toast.error(res.error);
        return;
      }

      setQueue(queue.filter((item) => item.id !== selectedRequest.id));
      setIsRejectModalOpen(false);
      setRejectionReason('');
      setSelectedRequest(null);
      toast.info(`Leave request rejected.`);
    });
  };

  const columns: Column<LeaveRequest>[] = [
    {
      key: 'employee',
      header: 'Applicant',
      render: (item) => (
        <div>
          <span className="font-semibold text-sm text-foreground">
            {item.employee?.full_name || 'Team Member'}
          </span>
          <p className="text-xs text-muted-foreground">{item.employee?.department?.name || 'General'}</p>
        </div>
      ),
    },
    {
      key: 'leave_type',
      header: 'Leave Type',
      render: (item) => (
        <Badge variant="outline" className="font-semibold text-xs">
          {item.leave_type?.name || 'Leave'}
        </Badge>
      ),
    },
    {
      key: 'duration',
      header: 'Dates & Days',
      render: (item) => (
        <div>
          <span className="font-mono text-xs font-semibold text-foreground">
            {item.start_date === item.end_date ? item.start_date : `${item.start_date} → ${item.end_date}`}
          </span>
          <p className="text-xs text-muted-foreground">
            {item.is_half_day ? '0.5 Day' : `${item.total_days} Days`}
          </p>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Applicant Reason',
      render: (item) => (
        <span className="text-xs text-muted-foreground line-clamp-2 max-w-sm">
          {item.reason}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Decision',
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedRequest(item);
              setIsRejectModalOpen(true);
            }}
            disabled={isPending}
            className="h-8 gap-1 text-destructive hover:bg-destructive/10 border-destructive/30"
          >
            <XCircle className="h-3.5 w-3.5" />
            <span>Reject</span>
          </Button>

          <Button
            size="sm"
            onClick={() => handleApprove(item)}
            disabled={isPending}
            className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            <span>Approve</span>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Team Leave Approval Queue</h3>
          <p className="text-xs text-muted-foreground">
            Pending leave applications awaiting your management authorization.
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          {queue.length} Pending
        </Badge>
      </div>

      <DataTable
        columns={columns}
        data={queue}
        emptyTitle="No pending leave applications"
        emptyDescription="All team leave applications have been reviewed and processed."
      />

      {/* Reject Modal */}
      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <form onSubmit={handleReject}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Reject Leave Application
              </DialogTitle>
              <DialogDescription>
                Provide a business or staffing reason for rejecting this leave request.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="reject-reason">Rejection Remarks *</Label>
                <textarea
                  id="reject-reason"
                  rows={3}
                  className="w-full rounded-md border border-input bg-background p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="e.g. Critical project sprint deadline, insufficient team coverage..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRejectModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={isPending}>
                {isPending ? 'Processing…' : 'Confirm Rejection'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
