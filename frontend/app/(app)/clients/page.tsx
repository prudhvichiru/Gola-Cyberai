import { PageHeader } from '@/components/page-header';
import { ClientList } from '@/features/clients/components/client-list';

export default function ClientsPage() {
  return (
    <div className="space-y-6 animate-in-up">
      <PageHeader
        title="Clients"
        description="Manage corporate client organizations, telemetry contracts, and associated project portfolios."
      />
      <ClientList />
    </div>
  );
}