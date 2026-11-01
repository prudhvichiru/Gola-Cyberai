import { ProjectList } from '@/features/projects';

export const metadata = {
  title: 'Projects | Gola CyberAI',
  description: 'Manage enterprise project delivery pipelines, budgets, and member roles.',
};

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Projects Management
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Plan, track, and deliver security operations and engineering initiatives on schedule.
        </p>
      </div>

      <ProjectList />
    </div>
  );
}