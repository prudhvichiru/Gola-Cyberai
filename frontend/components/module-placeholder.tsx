import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Construction } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ModulePlaceholder({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="animate-in-up">
      <PageHeader
        title={title}
        description={description}
        actions={<Button variant="outline" disabled>Coming soon</Button>}
      />
      <EmptyState
        icon={icon ?? <Construction className="h-6 w-6" />}
        title="This module is being built"
        description="It's part of the Gola CyberAI roadmap and will be available in an upcoming phase. Data, forms, and permissions for this module will be implemented with full database integration."
      />
    </div>
  );
}