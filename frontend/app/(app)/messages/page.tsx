import { ChatWorkspace } from '@/features/messages';

export const metadata = {
  title: 'Messages & Channels | Gola CyberAI',
  description: 'Enterprise secure real-time collaboration with project channels, direct messages, and WebSockets.',
};

export default function MessagesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Real-Time Messages & Channels
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Secured team collaboration with verified memberships, replies, emoji reactions, and live WebSocket streaming.
        </p>
      </div>

      <ChatWorkspace />
    </div>
  );
}