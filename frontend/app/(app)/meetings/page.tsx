import { MeetingsView } from '@/features/meetings';

export const metadata = {
  title: 'Meetings & Video Calls | Gola CyberAI',
  description: 'Schedule video conferences, manage agendas, capture meeting notes and track action items.',
};

export default function MeetingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Meetings & Video Conferencing
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Coordinate team syncs, record agendas, capture meeting notes, and sync action items to sprint tasks.
        </p>
      </div>

      <MeetingsView />
    </div>
  );
}