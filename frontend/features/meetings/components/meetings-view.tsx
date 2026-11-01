'use client';

import * as React from 'react';
import {
  Video,
  Calendar,
  Clock,
  Users,
  Plus,
  CheckCircle2,
  ListTodo,
  X,
  Search,
  AtSign,
  Lock,
} from 'lucide-react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/components/auth-provider';
import type { MeetingItem, MeetingInvitee } from '@/types/collaboration.types';
import type { UserRole } from '@/constants/roles';
import { ROLE_LABELS } from '@/constants/roles';
import { StatCard } from '@/components/shared/stat-card';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// ─── Roles that can CREATE meetings ──────────────────────────────────────────
const CAN_CREATE_MEETING: UserRole[] = ['admin', 'hr', 'manager', 'project_manager'];

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrgUser {
  id: string;
  full_name: string | null;
  email: string;
  role: UserRole;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name?: string | null) {
  if (!name) return 'U';
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  'from-blue-500 to-blue-600',
  'from-violet-500 to-violet-600',
  'from-emerald-500 to-emerald-600',
  'from-rose-500 to-rose-600',
  'from-amber-500 to-amber-600',
  'from-cyan-500 to-cyan-600',
];

function MiniAvatar({ name }: { name?: string | null }) {
  const idx = (name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length;
  return (
    <div
      className={cn(
        'h-7 w-7 rounded-lg bg-gradient-to-br text-white text-[10px] font-bold flex items-center justify-center shrink-0',
        AVATAR_COLORS[idx],
      )}
    >
      {getInitials(name)}
    </div>
  );
}

const ROLE_ORDER: UserRole[] = ['admin', 'hr', 'manager', 'project_manager', 'payroll', 'employee'];

// ─── Direct Supabase helpers (uses authenticated user JWT → RLS works) ─────────

async function fetchMeetingsFromDB(): Promise<MeetingItem[]> {
  const supabase = createClient();

  const { data: meetings, error } = await supabase
    .from('meetings')
    .select(`*, invitees:meeting_invitees(id, meeting_id, user_id, status)`)
    .order('start_time', { ascending: true });

  if (error || !meetings) return [];

  // Collect all user IDs for profile enrichment
  const userIds = new Set<string>();
  meetings.forEach((m: any) => {
    userIds.add(m.organizer_id);
    m.invitees?.forEach((i: any) => userIds.add(i.user_id));
  });

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .in('id', Array.from(userIds));

  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
  const unknown = (id: string) => ({ id, full_name: 'Unknown', email: '', avatar_url: null });

  return meetings.map((m: any) => ({
    ...m,
    organizer: profileMap.get(m.organizer_id) || unknown(m.organizer_id),
    invitees: (m.invitees || []).map((inv: any) => ({
      ...inv,
      user: profileMap.get(inv.user_id) || unknown(inv.user_id),
    })),
  }));
}

async function createMeetingInDB(
  organizerId: string,
  data: {
    title: string;
    agenda: string;
    description: string;
    meeting_link: string;
    start_time: string;
    end_time: string;
    invitee_ids: string[];
  },
) {
  const supabase = createClient();

  const { data: meeting, error } = await supabase
    .from('meetings')
    .insert({
      title: data.title,
      agenda: data.agenda,
      description: data.description,
      meeting_link: data.meeting_link || null,
      start_time: data.start_time,
      end_time: data.end_time,
      organizer_id: organizerId,
      status: 'scheduled',
      action_items: [],
    })
    .select()
    .single();

  if (error || !meeting) throw new Error(error?.message || 'Failed to create meeting');

  // Insert invitees (organizer = accepted, others = pending)
  const allInvitees = Array.from(new Set([organizerId, ...data.invitee_ids]));
  if (allInvitees.length > 0) {
    await supabase.from('meeting_invitees').insert(
      allInvitees.map((id) => ({
        meeting_id: meeting.id,
        user_id: id,
        status: id === organizerId ? 'accepted' : 'pending',
      })),
    );
  }

  // Send notifications to invitees
  const toNotify = data.invitee_ids.filter((id) => id !== organizerId);
  if (toNotify.length > 0) {
    await supabase.from('notifications').insert(
      toNotify.map((uid) => ({
        user_id: uid,
        title: `Meeting Invitation: ${meeting.title}`,
        message: `Scheduled for ${new Date(meeting.start_time).toLocaleString()}`,
        type: 'meeting',
        read: false,
        data: { meetingId: meeting.id },
      })),
    );
  }

  return meeting;
}

async function rsvpMeetingInDB(meetingId: string, userId: string, status: 'accepted' | 'declined' | 'tentative') {
  const supabase = createClient();
  await supabase
    .from('meeting_invitees')
    .upsert(
      { meeting_id: meetingId, user_id: userId, status, updated_at: new Date().toISOString() },
      { onConflict: 'meeting_id,user_id' },
    );
}


// ─── Invitee Picker ───────────────────────────────────────────────────────────

function InviteePicker({
  currentUserId,
  selected,
  onToggle,
}: {
  currentUserId: string;
  selected: Set<string>;
  onToggle: (user: OrgUser) => void;
}) {
  const [users, setUsers] = React.useState<OrgUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('status', 'active')
        .neq('id', currentUserId)
        .order('role').order('full_name');
      setUsers((data as OrgUser[]) || []);
      setLoading(false);
    }
    load();
  }, [currentUserId]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) => (u.full_name || '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [users, search]);

  const grouped = React.useMemo(() => {
    const map = new Map<UserRole, OrgUser[]>();
    ROLE_ORDER.forEach((r) => map.set(r, []));
    filtered.forEach((u) => {
      const arr = map.get(u.role as UserRole) ?? [];
      arr.push(u);
      map.set(u.role as UserRole, arr);
    });
    return Array.from(map.entries()).filter(([, arr]) => arr.length > 0);
  }, [filtered]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
        <input
          type="text"
          placeholder="Search people…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-9 pl-8 pr-3 text-sm rounded-lg bg-zinc-800/60 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
        {loading ? (
          <p className="text-center text-xs text-zinc-500 py-3">Loading…</p>
        ) : grouped.length === 0 ? (
          <p className="text-center text-xs text-zinc-500 py-3">No members found</p>
        ) : (
          grouped.map(([role, roleUsers]) => (
            <div key={role}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-1 mb-1">
                {ROLE_LABELS[role]}
              </p>
              {roleUsers.map((user) => {
                const checked = selected.has(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => onToggle(user)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <MiniAvatar name={user.full_name} />
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm text-zinc-200 font-medium truncate">
                        {user.full_name || user.email}
                      </p>
                      <p className="text-[11px] text-zinc-500 truncate">{user.email}</p>
                    </div>
                    <div
                      className={cn(
                        'h-4 w-4 rounded border flex items-center justify-center transition-colors shrink-0',
                        checked ? 'bg-blue-600 border-blue-600' : 'border-zinc-600',
                      )}
                    >
                      {checked && (
                        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-white fill-current">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    scheduled: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    in_progress: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    completed: 'bg-zinc-700/60 text-zinc-400 border-zinc-700',
    cancelled: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border', styles[status] || styles.completed)}>
      {status.replace('_', ' ')}
    </span>
  );
}

// ─── RSVP Buttons ─────────────────────────────────────────────────────────────

function RSVPButtons({
  meetingId,
  myStatus,
  onRSVP,
}: {
  meetingId: string;
  myStatus: string;
  onRSVP: (id: string, s: 'accepted' | 'declined' | 'tentative') => void;
}) {
  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <span className="text-[11px] text-zinc-500 mr-0.5">RSVP:</span>
      {(['accepted', 'tentative', 'declined'] as const).map((s) => {
        const active = myStatus === s;
        const colors = {
          accepted: active ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10',
          tentative: active ? 'bg-amber-500 text-white' : 'text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10',
          declined: active ? 'bg-rose-600 text-white' : 'text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10',
        };
        const labels = { accepted: 'Accept', tentative: 'Maybe', declined: 'Decline' };
        return (
          <button
            key={s}
            onClick={() => onRSVP(meetingId, s)}
            className={cn('px-2.5 py-1 rounded-md text-xs font-medium transition-colors', colors[s])}
          >
            {labels[s]}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function MeetingsView() {
  const { profile } = useAuth();
  const currentUserId = profile?.id ?? '';
  const userRole = profile?.role as UserRole | undefined;
  const canCreate = userRole ? CAN_CREATE_MEETING.includes(userRole) : false;

  const [meetings, setMeetings] = React.useState<MeetingItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isScheduleOpen, setIsScheduleOpen] = React.useState(false);
  const [selectedMeeting, setSelectedMeeting] = React.useState<MeetingItem | null>(null);

  // Form state
  const [title, setTitle] = React.useState('');
  const [agenda, setAgenda] = React.useState('');
  const [meetingLink, setMeetingLink] = React.useState('');
  const [startTime, setStartTime] = React.useState('');
  const [endTime, setEndTime] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [selectedInvitees, setSelectedInvitees] = React.useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  // ── Fetch from Supabase directly ────────────────────────────────────────────
  const fetchMeetings = React.useCallback(async () => {
    setLoading(true);
    const data = await fetchMeetingsFromDB();
    setMeetings(data);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  // ── Supabase real-time subscription ─────────────────────────────────────────
  React.useEffect(() => {
    if (!currentUserId) return;
    const supabase = createClient();
    const channel = supabase
      .channel('meetings-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, fetchMeetings)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meeting_invitees' }, fetchMeetings)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, fetchMeetings]);

  // ── RSVP ────────────────────────────────────────────────────────────────────
  const handleRSVP = async (meetingId: string, status: 'accepted' | 'declined' | 'tentative') => {
    if (!currentUserId) return;
    await rsvpMeetingInDB(meetingId, currentUserId, status);
    // Realtime will refetch — but also optimistically update
    setMeetings((prev) =>
      prev.map((m) => {
        if (m.id !== meetingId) return m;
        const invitees = (m.invitees || []).map((inv) =>
          inv.user_id === currentUserId ? { ...inv, status } : inv,
        );
        if (!invitees.find((i) => i.user_id === currentUserId)) {
          invitees.push({ id: '', meeting_id: meetingId, user_id: currentUserId, status, updated_at: new Date().toISOString() } as MeetingInvitee);
        }
        return { ...m, invitees };
      }),
    );
    if (selectedMeeting?.id === meetingId) {
      setSelectedMeeting((prev) => {
        if (!prev) return null;
        const invitees = (prev.invitees || []).map((inv) =>
          inv.user_id === currentUserId ? { ...inv, status } : inv,
        );
        return { ...prev, invitees };
      });
    }
  };

  // ── Create meeting ───────────────────────────────────────────────────────────
  const resetForm = () => {
    setTitle(''); setAgenda(''); setMeetingLink('');
    setStartTime(''); setEndTime(''); setDescription('');
    setSelectedInvitees(new Set()); setError('');
  };

  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startTime || !endTime || !currentUserId) return;
    if (new Date(endTime) <= new Date(startTime)) {
      setError('End time must be after start time.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await createMeetingInDB(currentUserId, {
        title,
        agenda,
        description,
        meeting_link: meetingLink,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        invitee_ids: Array.from(selectedInvitees),
      });
      setIsScheduleOpen(false);
      resetForm();
      // Realtime subscription will trigger fetchMeetings automatically
    } catch (err: any) {
      setError(err.message || 'Failed to create meeting.');
    }
    setSubmitting(false);
  };

  const toggleInvitee = (user: OrgUser) => {
    setSelectedInvitees((prev) => {
      const next = new Set(prev);
      if (next.has(user.id)) next.delete(user.id);
      else next.add(user.id);
      return next;
    });
  };

  // ── Derived ──────────────────────────────────────────────────────────────────
  const upcomingCount = meetings.filter((m) => m.status === 'scheduled').length;
  const completedCount = meetings.filter((m) => m.status === 'completed').length;
  const totalActionItems = meetings.reduce((acc, m) => acc + (m.action_items?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Scheduled Meetings" value={upcomingCount} subtitle="Upcoming video sessions" icon={<Video className="h-5 w-5 text-blue-600" />} />
        <StatCard title="Open Action Items" value={totalActionItems} subtitle="Linked to sprint deliverables" icon={<ListTodo className="h-5 w-5 text-amber-600" />} />
        <StatCard title="Past Sessions" value={completedCount} subtitle="Archived with meeting notes" icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />} />
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Company Briefings &amp; Standups</h2>
        </div>

        {canCreate ? (
          <button
            onClick={() => setIsScheduleOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Schedule Meeting
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-xs">
            <Lock className="h-3.5 w-3.5" />
            <span>View &amp; RSVP only</span>
          </div>
        )}
      </div>

      {/* Meetings List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-48 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <LoadingSkeleton count={3} />
            </div>
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <EmptyState
          title="No meetings scheduled"
          description={canCreate ? 'Schedule a team sync, client briefing or sprint retrospective.' : 'No upcoming meetings. You will be notified when one is scheduled.'}
          actionLabel={canCreate ? 'Schedule Meeting' : undefined}
          onAction={canCreate ? () => setIsScheduleOpen(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {meetings.map((meeting) => {
            const myInvitee = meeting.invitees?.find((i) => i.user_id === currentUserId);
            const myStatus = myInvitee?.status || 'pending';
            const isOrganizer = meeting.organizer_id === currentUserId;

            return (
              <div
                key={meeting.id}
                onClick={() => setSelectedMeeting(meeting)}
                className="cursor-pointer group p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md hover:border-blue-500/40 transition-all flex flex-col gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className={cn(
                      'text-xs font-semibold px-2 py-0.5 rounded-full',
                      isOrganizer
                        ? 'bg-violet-50 dark:bg-violet-950 text-violet-600'
                        : 'bg-blue-50 dark:bg-blue-950 text-blue-600',
                    )}>
                      {isOrganizer ? 'Organizer' : (meeting.project_id ? 'Project' : 'General')}
                    </span>
                    <StatusBadge status={meeting.status} />
                  </div>

                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 transition-colors">
                    {meeting.title}
                  </h3>

                  <p className="text-xs text-zinc-500 line-clamp-2">
                    {meeting.description || meeting.agenda || 'Internal team synchronization.'}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        {new Date(meeting.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {' – '}
                        {new Date(meeting.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{new Date(meeting.start_time).toLocaleDateString()}</span>
                    </div>
                    {meeting.invitees && meeting.invitees.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        <span>{meeting.invitees.length} invitees</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2 flex-wrap">
                  {isOrganizer ? (
                    <span className="text-xs text-zinc-500 italic">You organized this</span>
                  ) : (
                    <RSVPButtons meetingId={meeting.id} myStatus={myStatus} onRSVP={handleRSVP} />
                  )}
                  {meeting.meeting_link ? (
                    <a
                      href={meeting.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
                    >
                      <Video className="h-3.5 w-3.5" />
                      Join
                    </a>
                  ) : (
                    <span
                      onClick={(e) => e.stopPropagation()}
                      title="No meeting link added"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-semibold cursor-not-allowed"
                    >
                      <Video className="h-3.5 w-3.5" />
                      No Link
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Meeting Detail Modal ─────────────────────────────────── */}
      <Dialog open={!!selectedMeeting} onOpenChange={(o) => !o && setSelectedMeeting(null)}>
        <DialogContent className="!bg-[#13161f] !border-zinc-800 text-zinc-100 gap-0 p-0 overflow-hidden sm:max-w-lg">
          {selectedMeeting && (
            <>
              <div className="flex items-start justify-between px-6 py-4 border-b border-zinc-800 bg-[#13161f]">
                <div className="space-y-1">
                  <h2 className="text-base font-bold text-zinc-100">{selectedMeeting.title}</h2>
                  <StatusBadge status={selectedMeeting.status} />
                </div>
                <button onClick={() => setSelectedMeeting(null)} className="text-zinc-500 hover:text-zinc-300 transition-colors mt-0.5">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[60vh]">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-zinc-800/50 space-y-0.5">
                    <p className="text-zinc-500 text-[10px] uppercase tracking-wide font-semibold">Start</p>
                    <p className="text-zinc-200 font-semibold">
                      {new Date(selectedMeeting.start_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-800/50 space-y-0.5">
                    <p className="text-zinc-500 text-[10px] uppercase tracking-wide font-semibold">End</p>
                    <p className="text-zinc-200 font-semibold">
                      {new Date(selectedMeeting.end_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-800/50 space-y-0.5 col-span-2">
                    <p className="text-zinc-500 text-[10px] uppercase tracking-wide font-semibold">Organizer</p>
                    <p className="text-zinc-200 font-semibold">
                      {selectedMeeting.organizer?.full_name || 'Unknown'}
                      {selectedMeeting.organizer_id === currentUserId && <span className="ml-1.5 text-blue-400 font-normal">(You)</span>}
                    </p>
                  </div>
                </div>

                {selectedMeeting.agenda && (
                  <div className="space-y-1.5">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Agenda</h4>
                    <p className="text-sm text-zinc-300 whitespace-pre-line p-3 rounded-xl bg-zinc-800/40 border border-zinc-800">{selectedMeeting.agenda}</p>
                  </div>
                )}

                {selectedMeeting.invitees && selectedMeeting.invitees.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                      Attendees ({selectedMeeting.invitees.length})
                    </h4>
                    <div className="space-y-1">
                      {selectedMeeting.invitees.map((inv) => {
                        const statusColor = { accepted: 'text-emerald-400', tentative: 'text-amber-400', declined: 'text-rose-400', pending: 'text-zinc-500' }[inv.status];
                        return (
                          <div key={inv.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/40">
                            <MiniAvatar name={inv.user?.full_name} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-zinc-200 truncate">
                                {inv.user?.full_name || inv.user?.email || 'Unknown'}
                                {inv.user_id === currentUserId && <span className="ml-1.5 text-blue-400 text-xs">(You)</span>}
                              </p>
                            </div>
                            <span className={cn('text-xs font-semibold capitalize', statusColor)}>{inv.status}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {(selectedMeeting.action_items?.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Action Items</h4>
                    <div className="space-y-1">
                      {selectedMeeting.action_items!.map((act) => (
                        <div key={act.id} className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-800 bg-zinc-800/30 text-xs">
                          <span className="text-zinc-200 font-medium">{act.task}</span>
                          <span className="text-zinc-500">{act.assigned_to_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-[#13161f]">
                {selectedMeeting.organizer_id !== currentUserId ? (
                  <RSVPButtons
                    meetingId={selectedMeeting.id}
                    myStatus={selectedMeeting.invitees?.find((i) => i.user_id === currentUserId)?.status || 'pending'}
                    onRSVP={handleRSVP}
                  />
                ) : (
                  <span className="text-xs text-zinc-500 italic">You organized this meeting</span>
                )}
                <div className="flex items-center gap-2">
                  <button onClick={() => setSelectedMeeting(null)} className="px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-sm transition-colors">
                    Close
                  </button>
                  {selectedMeeting.meeting_link ? (
                    <button
                      onClick={() => window.open(selectedMeeting.meeting_link!, '_blank')}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                    >
                      <Video className="h-4 w-4" />
                      Launch Call
                    </button>
                  ) : (
                    <span className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-muted text-muted-foreground text-sm font-semibold cursor-not-allowed" title="No meeting link added">
                      <Video className="h-4 w-4" />
                      No Link Added
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Schedule Meeting Modal ───────────────────────────────── */}
      {canCreate && (
        <Dialog open={isScheduleOpen} onOpenChange={(o) => { if (!o) { setIsScheduleOpen(false); resetForm(); } }}>
          <DialogContent className="!bg-[#13161f] !border-zinc-800 text-zinc-100 gap-0 p-0 overflow-hidden sm:max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#13161f]">
              <h2 className="text-base font-bold text-zinc-100">Schedule Video Conference</h2>
              <button onClick={() => { setIsScheduleOpen(false); resetForm(); }} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleScheduleMeeting} className="px-6 py-5 space-y-4 overflow-y-auto max-h-[70vh]">
              {error && (
                <div className="px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                  Meeting Title <span className="text-rose-400">*</span>
                </label>
                <input
                  autoFocus
                  placeholder="e.g. Threat Intelligence Weekly Briefing"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-lg bg-zinc-800/60 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Start <span className="text-rose-400">*</span></label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    className="w-full h-10 px-3 rounded-lg bg-zinc-800/60 border border-zinc-700 text-zinc-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">End <span className="text-rose-400">*</span></label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    className="w-full h-10 px-3 rounded-lg bg-zinc-800/60 border border-zinc-700 text-zinc-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                  Video Room Link <span className="font-normal normal-case text-zinc-600">(auto-generated if empty)</span>
                </label>
                <input
                  placeholder="https://meet.google.com/... or Teams / Zoom link"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-zinc-800/60 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Agenda</label>
                <textarea
                  rows={3}
                  placeholder={"1. Triage Kerberos alerts\n2. Sandbox containment review"}
                  value={agenda}
                  onChange={(e) => setAgenda(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-zinc-800/60 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
                  <AtSign className="h-3 w-3" />
                  Invite Team Members
                  {selectedInvitees.size > 0 && (
                    <span className="ml-auto normal-case font-normal text-blue-400 text-[11px]">{selectedInvitees.size} selected</span>
                  )}
                </label>
                <InviteePicker
                  currentUserId={currentUserId}
                  selected={selectedInvitees}
                  onToggle={toggleInvitee}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => { setIsScheduleOpen(false); resetForm(); }}
                  className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !title.trim() || !startTime || !endTime}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                >
                  {submitting ? 'Scheduling…' : 'Confirm Meeting'}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
