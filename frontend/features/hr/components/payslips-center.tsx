'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog';
import { DataTable, type Column } from '@/components/shared/data-table';
import { StatCard } from '@/components/shared/stat-card';
import type { PayslipRecord, EmployeeProfile } from '@/types/hr.types';
import { toast } from 'sonner';
import { createBrowserClient } from '@supabase/ssr';
import {
  FileText,
  Download,
  Eye,
  CreditCard,
  Plus,
  Calendar,
  Printer,
  ShieldCheck,
  Send,
  User,
  Coins,
  ChevronDown,
} from 'lucide-react';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

interface PayslipsCenterProps {
  userId: string;
  initialPayslips: PayslipRecord[];
  employees?: EmployeeProfile[];
  canPublish?: boolean;
}

export function PayslipsCenter({
  userId,
  initialPayslips,
  employees = [],
  canPublish = false,
}: PayslipsCenterProps) {
  const [payslips, setPayslips] = useState<PayslipRecord[]>(initialPayslips);
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipRecord | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [publishForm, setPublishForm] = useState({
    user_id: employees[0]?.id || userId,
    month: MONTHS[new Date().getMonth()],
    year: new Date().getFullYear(),
    basic_salary: '',
    hra: '',
    special_allowance: '',
  });
  const [publishError, setPublishError] = useState('');

  const latestSlip = payslips[0];

  const basic = parseFloat(publishForm.basic_salary as string) || 0;
  const hra = parseFloat(publishForm.hra as string) || 0;
  const special = parseFloat(publishForm.special_allowance as string) || 0;
  const gross = basic + hra + special;
  const pf = Math.round(basic * 0.12);
  const pt = 200;
  const tds = Math.round(gross * 0.05);
  const totalDed = pf + pt + tds;
  const net = gross - totalDed;

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    setPublishError('');
    if (!publishForm.user_id) { setPublishError('Please select an employee.'); return; }
    if (!publishForm.basic_salary) { setPublishError('Basic salary is required.'); return; }

    startTransition(async () => {
      const sb = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const payPeriod = `${publishForm.month} ${publishForm.year}`;
      const { data, error } = await sb.from('payslips').insert({
        user_id: publishForm.user_id,
        month: publishForm.month,
        year: publishForm.year,
        pay_period: payPeriod,
        basic_salary: basic,
        hra,
        special_allowance: special,
        gross_earnings: gross,
        pf_deduction: pf,
        professional_tax: pt,
        tds_deduction: tds,
        total_deductions: totalDed,
        net_salary: net,
      }).select('*, employee:profiles(id, full_name, email, employee_id)').single();

      if (error) { setPublishError(error.message); return; }
      setPayslips([{ ...data, gross_earnings: gross, total_deductions: totalDed, net_salary: net }, ...payslips]);
      setIsPublishOpen(false);
      setPublishForm({ user_id: employees[0]?.id || userId, month: MONTHS[new Date().getMonth()], year: new Date().getFullYear(), basic_salary: '', hra: '', special_allowance: '' });
      toast.success(`Payslip for ${payPeriod} published successfully!`);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const columns: Column<PayslipRecord>[] = [
    {
      key: 'pay_period',
      header: 'Pay Period',
      render: (item) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <span className="font-semibold text-sm text-foreground">{item.pay_period}</span>
            <p className="text-xs text-muted-foreground">{item.month} {item.year}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'gross_earnings',
      header: 'Gross Salary',
      render: (item) => (
        <span className="font-mono text-xs font-semibold text-foreground">
          ₹{item.gross_earnings.toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'total_deductions',
      header: 'Total Deductions',
      render: (item) => (
        <span className="font-mono text-xs text-muted-foreground">
          ₹{item.total_deductions.toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'net_salary',
      header: 'Net Take-Home Pay',
      render: (item) => (
        <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
          ₹{item.net_salary.toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'payment_status',
      header: 'Disbursement',
      render: (item) => (
        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs">
          Paid on {item.paid_on ? new Date(item.paid_on).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'End of Month'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedPayslip(item);
              setIsViewOpen(true);
            }}
            className="h-8 gap-1.5"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>View Slip</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSelectedPayslip(item);
              setIsViewOpen(true);
              setTimeout(() => window.print(), 300);
            }}
            className="h-8 w-8 p-0"
            title="Download PDF"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Metric Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Latest Net Salary"
          value={latestSlip ? `₹${latestSlip.net_salary.toLocaleString('en-IN')}` : '—'}
          hint={latestSlip ? `Disbursed for ${latestSlip.pay_period}` : 'No slips issued'}
          icon={CreditCard}
          tone="success"
        />
        <StatCard
          label="Total Payslips Issued"
          value={payslips.length}
          hint="Digitally signed records"
          icon={FileText}
          tone="primary"
        />
        <StatCard
          label="Statutory Deductions"
          value={latestSlip ? `₹${latestSlip.total_deductions.toLocaleString('en-IN')}` : '—'}
          hint="PF + PT + Income Tax TDS"
          icon={ShieldCheck}
          tone="neutral"
        />
      </div>

      {/* 2. Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">Employee Payslip Repository</h3>
          <p className="text-xs text-muted-foreground">
            Confidential salary statements, tax deduction summaries and downloadable PDF slips.
          </p>
        </div>

        {canPublish && (
          <Button
            onClick={() => setIsPublishOpen(true)}
            className="gap-2 bg-primary hover:bg-primary-hover text-white self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Generate / Publish Payslip</span>
          </Button>
        )}
      </div>

      {/* 3. Payslips Table */}
      <DataTable
        columns={columns}
        data={payslips}
        emptyTitle="No payslips generated"
        emptyDescription="Payslips published by the payroll department will be accessible here."
      />

      {/* 4. Enterprise Salary Slip Modal / Print Layout */}
      {selectedPayslip && (
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="sm:max-w-[620px] print:p-0">
            <div className="p-2 print:p-6" id="printable-payslip">
              {/* Slip Header */}
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white font-bold text-lg">
                    G
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground">Gola CyberAI Technologies Pvt Ltd</h3>
                    <p className="text-xs text-muted-foreground">Cyber Tower, Outer Ring Rd, Bangalore 560103</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="font-bold uppercase tracking-wider text-xs bg-muted">
                    Payslip
                  </Badge>
                  <p className="font-mono text-xs text-muted-foreground mt-1">Period: {selectedPayslip.pay_period}</p>
                </div>
              </div>

              {/* Employee Summary Matrix */}
              <div className="grid grid-cols-2 gap-3 my-4 p-3 rounded-xl bg-muted/30 border border-border/60 text-xs">
                <div>
                  <span className="text-muted-foreground">Employee Name:</span>
                  <p className="font-semibold">{selectedPayslip.employee?.full_name || 'Authorized Employee'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Employee ID:</span>
                  <p className="font-mono font-semibold">{selectedPayslip.employee?.employee_id || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Department:</span>
                  <p className="font-semibold">{selectedPayslip.employee?.department?.name || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Designation:</span>
                  <p className="font-semibold">{selectedPayslip.employee?.designation?.title || '—'}</p>
                </div>
              </div>

              {/* Earnings vs Deductions Breakdown */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                {/* Earnings */}
                <div className="space-y-1.5 border border-border/80 rounded-xl p-3 bg-card">
                  <span className="font-bold text-emerald-600 uppercase tracking-wider text-[11px] block pb-1 border-b">
                    Earnings (A)
                  </span>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Basic Salary</span>
                    <span className="font-mono font-semibold">₹{selectedPayslip.basic_salary.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">House Rent Allowance (HRA)</span>
                    <span className="font-mono font-semibold">₹{selectedPayslip.hra.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Special Allowance</span>
                    <span className="font-mono font-semibold">₹{selectedPayslip.special_allowance.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between pt-2 font-bold text-foreground">
                    <span>Gross Earnings</span>
                    <span className="font-mono">₹{selectedPayslip.gross_earnings.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Deductions */}
                <div className="space-y-1.5 border border-border/80 rounded-xl p-3 bg-card">
                  <span className="font-bold text-rose-600 uppercase tracking-wider text-[11px] block pb-1 border-b">
                    Deductions (B)
                  </span>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Provident Fund (PF)</span>
                    <span className="font-mono font-semibold">₹{selectedPayslip.pf_deduction.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Professional Tax (PT)</span>
                    <span className="font-mono font-semibold">₹{selectedPayslip.professional_tax.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Income Tax (TDS)</span>
                    <span className="font-mono font-semibold">₹{selectedPayslip.tds_deduction.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between pt-2 font-bold text-foreground">
                    <span>Total Deductions</span>
                    <span className="font-mono">₹{selectedPayslip.total_deductions.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Net Pay Banner */}
              <div className="mt-4 flex items-center justify-between p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <div>
                  <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                    Net Take-Home Pay (A - B)
                  </span>
                  <p className="text-xs text-muted-foreground">Disbursed via Direct Bank Transfer</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xl font-black text-emerald-600 dark:text-emerald-400">
                    ₹{selectedPayslip.net_salary.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <p className="mt-4 text-center text-[11px] text-muted-foreground">
                This is a digitally generated document authorized by Gola CyberAI Payroll Operations. No physical signature required.
              </p>
            </div>

            <DialogFooter className="print:hidden">
              <Button variant="outline" onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                <span>Print / Save as PDF</span>
              </Button>
              <Button onClick={() => setIsViewOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Publish Payslip Modal */}
      <Dialog open={isPublishOpen} onOpenChange={setIsPublishOpen}>
        <DialogContent className="sm:max-w-[560px] p-0 gap-0 flex flex-col max-h-[92vh]">
          <form onSubmit={handlePublish} className="flex flex-col min-h-0 flex-1">
            {/* ── Header ── */}
            <div className="flex items-start gap-4 px-7 pt-7 pb-5 flex-shrink-0">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-foreground leading-tight">Publish Employee Payslip</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Issue and authenticate salary slip for the selected pay period.</p>
              </div>
            </div>

            <div className="space-y-5 px-7 pb-5 overflow-y-auto flex-1">
              {/* Employee */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">
                  Employee <span className="text-red-500">*</span>
                </Label>
                <div className="relative flex items-center rounded-md border border-input bg-background focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                  <User className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <select
                    className="w-full h-11 bg-transparent pl-9 pr-8 text-sm appearance-none focus:outline-none"
                    value={publishForm.user_id}
                    onChange={(e) => setPublishForm({ ...publishForm, user_id: e.target.value })}
                  >
                    <option value="">Select Employee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.employee_id || emp.id.slice(0, 6).toUpperCase()})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Month / Year */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-foreground">
                    Month <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative flex items-center rounded-md border border-input bg-background focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                    <Calendar className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <select
                      className="w-full h-11 bg-transparent pl-9 pr-8 text-sm appearance-none focus:outline-none"
                      value={publishForm.month}
                      onChange={(e) => setPublishForm({ ...publishForm, month: e.target.value })}
                    >
                      {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-foreground">
                    Year <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative flex items-center rounded-md border border-input bg-background focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                    <Calendar className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <select
                      className="w-full h-11 bg-transparent pl-9 pr-8 text-sm appearance-none focus:outline-none"
                      value={publishForm.year}
                      onChange={(e) => setPublishForm({ ...publishForm, year: parseInt(e.target.value, 10) })}
                    >
                      {[2023,2024,2025,2026,2027].map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Basic Salary */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">
                  Basic Salary (₹) <span className="text-red-500">*</span>
                </Label>
                <div className="flex rounded-md border border-input bg-background focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 overflow-hidden">
                  <span className="flex items-center px-3 bg-muted border-r border-input text-sm font-medium text-muted-foreground select-none">₹</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={publishForm.basic_salary}
                    onChange={(e) => setPublishForm({ ...publishForm, basic_salary: e.target.value })}
                    className="flex-1 h-11 px-3 text-sm bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              {/* HRA + Special Allowance */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-foreground">
                    HRA (₹) <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex rounded-md border border-input bg-background focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 overflow-hidden">
                    <span className="flex items-center px-3 bg-muted border-r border-input text-sm font-medium text-muted-foreground select-none">₹</span>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={publishForm.hra}
                      onChange={(e) => setPublishForm({ ...publishForm, hra: e.target.value })}
                      className="flex-1 h-11 px-3 text-sm bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-foreground">
                    Special Allowance (₹) <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex rounded-md border border-input bg-background focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 overflow-hidden">
                    <span className="flex items-center px-3 bg-muted border-r border-input text-sm font-medium text-muted-foreground select-none">₹</span>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={publishForm.special_allowance}
                      onChange={(e) => setPublishForm({ ...publishForm, special_allowance: e.target.value })}
                      className="flex-1 h-11 px-3 text-sm bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Earnings Summary Panel */}
              <div className="flex rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800/60 overflow-hidden">
                {/* Left: icon + title */}
                <div className="flex flex-col justify-center gap-1.5 px-5 py-4 w-[48%] border-r border-blue-100 dark:border-blue-800/60">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/60">
                    <Coins className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="font-semibold text-sm text-foreground mt-1">Earnings Summary</p>
                  <p className="text-xs text-muted-foreground leading-snug">Total earnings for the selected pay period</p>
                </div>
                {/* Right: breakdown */}
                <div className="flex-1 px-5 py-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Basic Salary</span>
                    <span className="font-medium text-foreground">₹ {basic.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">HRA</span>
                    <span className="font-medium text-foreground">₹ {hra.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Special Allowance</span>
                    <span className="font-medium text-foreground">₹ {special.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="border-t border-blue-200 dark:border-blue-700 pt-2 flex justify-between">
                    <span className="text-sm font-bold text-foreground">Total Earnings</span>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">₹ {gross.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {publishError && (
                <p className="text-xs text-red-500 font-medium">{publishError}</p>
              )}
            </div>

            {/* Footer — always visible */}
            <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-border flex-shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setIsPublishOpen(false); setPublishError(''); }}
                className="px-6"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="gap-2 px-6 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Send className="h-4 w-4" />
                {isPending ? 'Publishing…' : 'Publish Payslip'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
