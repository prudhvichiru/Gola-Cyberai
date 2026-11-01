'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Check, X, Lock } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { AccessRestrictedCard } from '@/components/settings/access-restricted-card';

interface MatrixRow {
  module: string;
  action: string;
  admin: boolean;
  manager: boolean;
  hr: boolean;
  payroll: boolean;
  employee: boolean;
  scopeNote: string;
}

const PERMISSION_MATRIX: MatrixRow[] = [
  {
    module: 'Employee Directory',
    action: 'View Profiles & Dossiers',
    admin: true,
    manager: true,
    hr: true,
    payroll: false,
    employee: true,
    scopeNote: 'Employees view sanitized public info; Managers view assigned team; HR views full org dossier.',
  },
  {
    module: 'Employee Directory',
    action: 'Create & Onboard Personnel',
    admin: true,
    manager: false,
    hr: true,
    payroll: false,
    employee: false,
    scopeNote: 'Restricted to HR Executives and System Administrators.',
  },
  {
    module: 'Attendance & Timers',
    action: 'Check-In & Run Live Task Timers',
    admin: true,
    manager: true,
    hr: true,
    payroll: true,
    employee: true,
    scopeNote: 'All authenticated personnel on server clock.',
  },
  {
    module: 'Attendance & Timers',
    action: 'Approve Timesheets & Regularizations',
    admin: true,
    manager: true,
    hr: true,
    payroll: false,
    employee: false,
    scopeNote: 'Managers approve team; HR approves escalations.',
  },
  {
    module: 'Projects & Tasks',
    action: 'Create Projects & Milestones',
    admin: true,
    manager: true,
    hr: false,
    payroll: false,
    employee: false,
    scopeNote: 'Project Leads and Administrators.',
  },
  {
    module: 'Projects & Tasks',
    action: 'Update Task Status & Comments',
    admin: true,
    manager: true,
    hr: true,
    payroll: true,
    employee: true,
    scopeNote: 'Assigned assignees and project members.',
  },
  {
    module: 'Leave Management',
    action: 'Apply for Leave & View Balances',
    admin: true,
    manager: true,
    hr: true,
    payroll: true,
    employee: true,
    scopeNote: 'Personal balance calculations.',
  },
  {
    module: 'Leave Management',
    action: 'Approve / Reject Leave Applications',
    admin: true,
    manager: true,
    hr: true,
    payroll: false,
    employee: false,
    scopeNote: 'Reporting managers approve first level; HR handles policy exceptions.',
  },
  {
    module: 'Payroll & Compensation',
    action: 'View Own Monthly Payslips',
    admin: true,
    manager: true,
    hr: true,
    payroll: true,
    employee: true,
    scopeNote: 'Strictly self-service only. Direct object reference checks prevent cross-user access.',
  },
  {
    module: 'Payroll & Compensation',
    action: 'Process Payroll Runs & Publish Payslips',
    admin: true,
    manager: false,
    hr: false,
    payroll: true,
    employee: false,
    scopeNote: 'Strictly Payroll Officers. HR Executives cannot access salary amounts without explicit permission.',
  },
  {
    module: 'Settings & Audit',
    action: 'Access System Health & Live Audit Logs',
    admin: true,
    manager: false,
    hr: false,
    payroll: false,
    employee: false,
    scopeNote: 'Strictly Platform Administrators.',
  },
];

export default function PermissionsSettingsPage() {
  const { profile } = useAuth();
  const role = profile?.role || 'employee';

  if (role !== 'admin') {
    return <AccessRestrictedCard moduleName="Permissions Matrix" />;
  }

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Centralized RBAC Permissions Matrix
              </CardTitle>
              <CardDescription>
                System-enforced access controls across all modules, sensitive resources, and operational actions.
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 font-mono text-xs">
              Enforced at API Gateway
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground uppercase font-semibold border-y border-border">
                <tr>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Protected Action</th>
                  <th className="px-3 py-3 text-center">Admin</th>
                  <th className="px-3 py-3 text-center">Manager</th>
                  <th className="px-3 py-3 text-center">HR</th>
                  <th className="px-3 py-3 text-center">Payroll</th>
                  <th className="px-3 py-3 text-center">Employee</th>
                  <th className="px-4 py-3">Data Scope & Constraints</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {PERMISSION_MATRIX.map((row, idx) => (
                  <tr key={idx} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                      {row.module}
                    </td>
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">{row.action}</td>
                    <td className="px-3 py-3 text-center">
                      {row.admin ? (
                        <Check className="h-4 w-4 text-emerald-600 inline" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/40 inline" />
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {row.manager ? (
                        <Check className="h-4 w-4 text-emerald-600 inline" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/40 inline" />
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {row.hr ? (
                        <Check className="h-4 w-4 text-emerald-600 inline" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/40 inline" />
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {row.payroll ? (
                        <Check className="h-4 w-4 text-emerald-600 inline" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/40 inline" />
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {row.employee ? (
                        <Check className="h-4 w-4 text-emerald-600 inline" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/40 inline" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-[11px] leading-relaxed">
                      {row.scopeNote}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}