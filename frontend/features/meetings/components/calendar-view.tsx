'use client';

import * as React from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Video,
} from 'lucide-react';
import { createClient } from '@/lib/supabase-client';
import { CollaborationFrontendService } from '@/services/collaboration.service';
import { MeetingItem } from '@/types/collaboration.types';
import { Button } from '@/components/ui/button';

export function CalendarView() {
  const [currentDate, setCurrentDate] = React.useState(() => new Date());
  const [meetings, setMeetings] = React.useState<MeetingItem[]>([]);
  const [selectedMeeting, setSelectedMeeting] = React.useState<MeetingItem | null>(null);

  const fetchMeetings = React.useCallback(async () => {
    const res = await CollaborationFrontendService.getMeetings();
    if (res.data) setMeetings(res.data);
  }, []);

  React.useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  // Real-time sync when meetings change
  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('calendar-meetings-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, fetchMeetings)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchMeetings]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = () => setCurrentDate(new Date());

  // Calendar calculations
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sun
  const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Mon is 0
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const daysArray = Array.from({ length: totalDaysInMonth }, (_, i) => i + 1);
  const emptyPrefix = Array.from({ length: adjustedFirstDay }, (_, i) => i);

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{monthName}</h2>
            <p className="text-xs text-zinc-500">Corporate event calendar & synchronized video conferences</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={today} className="text-xs h-8">
            Today
          </Button>
          <div className="flex items-center border border-zinc-200 dark:border-zinc-800 rounded-lg">
            <button
              onClick={prevMonth}
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-l-lg text-zinc-600"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-r-lg text-zinc-600"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 7-Day Grid */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-center text-xs font-semibold text-zinc-500 py-3">
          {DAYS.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        {/* Days Cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-zinc-200 dark:divide-zinc-800">
          {/* Empty prefix cells */}
          {emptyPrefix.map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[110px] bg-zinc-50/30 dark:bg-zinc-900/40 p-2" />
          ))}

          {/* Month Days */}
          {daysArray.map((day) => {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayMeetings = meetings.filter((m) => m.start_time.startsWith(dateStr));
            const now = new Date();
            const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();

            return (
              <div
                key={day}
                className={`min-h-[110px] p-2 transition-colors hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 ${
                  isToday ? 'bg-blue-50/20 dark:bg-blue-950/20' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-xs font-bold h-6 w-6 rounded-full flex items-center justify-center ${
                      isToday
                        ? 'bg-blue-600 text-white'
                        : 'text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {day}
                  </span>
                </div>

                {/* Day events pills */}
                <div className="space-y-1">
                  {dayMeetings.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMeeting(m)}
                      className="cursor-pointer truncate text-[11px] font-semibold px-2 py-1 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 hover:bg-blue-100 transition-colors"
                      title={m.title}
                    >
                      <span className="font-mono text-[9px] mr-1 opacity-70">
                        {new Date(m.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {m.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
