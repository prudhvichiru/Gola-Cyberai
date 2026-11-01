import { PageHeader } from '@/components/page-header';
import { AnalyticsDashboard } from '@/features/analytics/components/analytics-dashboard';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6 animate-in-up">
      <PageHeader
        title="Organizational Analytics"
        description="Comprehensive telemetry across departmental workforce, billable utilization, and project burn rates."
      />
      <AnalyticsDashboard />
    </div>
  );
}