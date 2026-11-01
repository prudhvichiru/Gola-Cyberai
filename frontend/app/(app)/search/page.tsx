import { ModulePlaceholder } from '@/components/module-placeholder';
import { Search } from 'lucide-react';

export default function Page() {
  return <ModulePlaceholder title="Search" description="Find people, projects, documents, and tasks across your workspace." icon={<Search className="h-6 w-6" />} />;
}