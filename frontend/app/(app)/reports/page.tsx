import { ReportsDashboard } from '@/features/reports';

export const metadata = {
  title: 'Reports & Telemetry | Gola CyberAI',
  description: 'Enterprise time analytics, attendance reconciliation, variance tracking, and team delivery summaries.',
};

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Executive Reports & Time Analytics
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Unified reporting across net attendance, verified project hours, planning variance, and delivery compliance.
        </p>
      </div>

      <ReportsDashboard />
    </div>
  );
}