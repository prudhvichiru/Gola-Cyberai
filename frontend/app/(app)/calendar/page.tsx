import { CalendarView } from '@/features/meetings';

export const metadata = {
  title: 'Corporate Calendar | Gola CyberAI',
  description: 'Enterprise visual calendar tracking meetings, sprint deadlines, and company schedules.',
};

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Organization Calendar
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Interactive monthly schedule combining project milestones, scheduled video standups, and company events.
        </p>
      </div>

      <CalendarView />
    </div>
  );
}