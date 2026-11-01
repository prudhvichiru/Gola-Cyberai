import * as React from 'react';
import { Suspense } from 'react';
import { TaskKanban } from '@/features/tasks';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';

export const metadata = {
  title: 'Tasks & Kanban | Gola CyberAI',
  description: 'Track sprint tasks, subtask checklists, and task timers with Kanban and list views.',
};

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Tasks & Sprint Board
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Interactive Kanban workflow with subtask verification, comments audit trail, and authoritative timers.
        </p>
      </div>

      <Suspense fallback={<LoadingSkeleton count={6} />}>
        <TaskKanban />
      </Suspense>
    </div>
  );
}