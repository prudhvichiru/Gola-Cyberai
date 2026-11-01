'use client';

import * as React from 'react';
import {
  Bell,
  CheckCircle2,
  MessageSquare,
  Video,
  ListTodo,
  FileCheck,
  Check,
} from 'lucide-react';
import { CollaborationFrontendService } from '@/services/collaboration.service';
import { NotificationItem, NotificationType } from '@/types/collaboration.types';
import { Button } from '@/components/ui/button';

export function NotificationCenter() {
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeFilter, setActiveFilter] = React.useState<string>('all');

  const fetchNotifs = React.useCallback(async () => {
    const res = await CollaborationFrontendService.getNotifications();
    if (res.data) {
      setNotifications(res.data);
    }
  }, []);

  React.useEffect(() => {
    fetchNotifs();
  }, [fetchNotifs]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkRead = async (id: string) => {
    await CollaborationFrontendService.markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'all') return true;
    return n.type === activeFilter;
  });

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="h-4 w-4 text-blue-600" />;
      case 'meeting':
        return <Video className="h-4 w-4 text-purple-600" />;
      case 'task':
        return <ListTodo className="h-4 w-4 text-amber-600" />;
      case 'approval':
        return <FileCheck className="h-4 w-4 text-emerald-600" />;
    }
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Flyout Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          {/* Header */}
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600">
                  {unreadCount} new
                </span>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs text-zinc-400 hover:text-zinc-600"
            >
              ✕
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 p-2 bg-zinc-50 dark:bg-zinc-800/40 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-medium overflow-x-auto">
            {['all', 'message', 'meeting', 'approval'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`px-2.5 py-1 rounded-md capitalize transition-colors ${
                  activeFilter === tab
                    ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
            {filteredNotifications.map((n) => (
              <div
                key={n.id}
                className={`p-3.5 flex items-start gap-3 transition-colors ${
                  !n.read ? 'bg-blue-50/40 dark:bg-blue-950/20' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                }`}
              >
                <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 shrink-0">
                  {getIcon(n.type)}
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{n.title}</h4>
                    <span className="text-[10px] text-zinc-400">
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">{n.message}</p>
                </div>
                {!n.read && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    title="Mark read"
                    className="p-1 rounded text-zinc-400 hover:text-blue-600"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}

            {filteredNotifications.length === 0 && (
              <div className="py-8 text-center text-xs text-zinc-400">
                No notifications in this category
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
