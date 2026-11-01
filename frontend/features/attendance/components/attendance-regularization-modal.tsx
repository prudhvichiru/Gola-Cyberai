'use client';

import * as React from 'react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Calendar, Clock, FileText, CheckCircle2 } from 'lucide-react';

interface AttendanceRegularizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export function AttendanceRegularizationModal({
  open,
  onOpenChange,
  userId,
}: AttendanceRegularizationModalProps) {
  const [date, setDate] = useState('2026-10-30');
  const [inTime, setInTime] = useState('09:30');
  const [outTime, setOutTime] = useState('18:30');
  const [reason, setReason] = useState('Biometric Machine Error / Web Clock Network Issue');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onOpenChange(false);
      toast.success('Regularization request submitted to HR & Reporting Manager for approval!');
    }, 600);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Apply for Attendance Regularization
            </DialogTitle>
            <DialogDescription>
              Submit missed punch correction or on-duty shift approval for manager sign-off.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reg-date">Shift Date</Label>
              <Input
                id="reg-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="in-time">Correct In Time</Label>
                <Input
                  id="in-time"
                  type="time"
                  value={inTime}
                  onChange={(e) => setInTime(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="out-time">Correct Out Time</Label>
                <Input
                  id="out-time"
                  type="time"
                  value={outTime}
                  onChange={(e) => setOutTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Regularization</Label>
              <select
                id="reason"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                <option value="Biometric Machine Error / Web Clock Network Issue">
                  Biometric Machine Error / Web Clock Network Issue
                </option>
                <option value="On-Duty / Client Meeting Visit">On-Duty / Client Meeting Visit</option>
                <option value="Forgot to Web Punch Out">Forgot to Web Punch Out</option>
                <option value="Work From Home / Remote Technical Glitch">
                  Work From Home / Remote Technical Glitch
                </option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? 'Submitting…' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
