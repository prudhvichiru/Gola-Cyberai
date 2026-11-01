'use client';

import * as React from 'react';
import {
  Hash,
  Plus,
  Send,
  Smile,
  Paperclip,
  Reply,
  Search,
  X,
  ChevronDown,
  AtSign,
  Bold,
  Italic,
  MoreHorizontal,
  MessageSquarePlus,
  Trash2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/components/auth-provider';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ROLE_LABELS, type UserRole } from '@/constants/roles';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  role: UserRole;
  avatar_url?: string | null;
}

interface ConvMember {
  id: string;
  user_id: string;
  role: string;
  profile?: Profile | null;
}

interface Conversation {
  id: string;
  type: 'direct' | 'channel' | 'group';
  name: string | null;
  description: string | null;
  created_by: string | null;
  updated_at: string;
  members: ConvMember[];
  last_message?: Message | null;
  unread_count?: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  reply_to_id: string | null;
  reactions: Record<string, string[]>;
  is_edited: boolean;
  created_at: string;
  sender?: Profile | null;
  reply_to?: { id: string; content: string; sender_name: string } | null;
}

interface OrgUser {
  id: string;
  full_name: string | null;
  email: string;
  role: UserRole;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🚀', '👀', '🎉'];
const ROLE_ORDER: UserRole[] = ['admin', 'hr', 'manager', 'project_manager', 'payroll', 'employee'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name?: string | null) {
  if (!name) return 'U';
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

// ─── Supabase DB helpers (frontend client → user JWT → RLS works) ─────────────

async function loadConversations(userId: string): Promise<Conversation[]> {
  const sb = createClient();

  // Get conversation IDs user belongs to
  const { data: memberships } = await sb
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', userId);

  if (!memberships || memberships.length === 0) return [];
  const convIds = memberships.map((m: any) => m.conversation_id);

  // Load conversations + members
  const { data: convs } = await sb
    .from('conversations')
    .select('*, members:conversation_members(id, user_id, role)')
    .in('id', convIds)
    .order('updated_at', { ascending: false });

  if (!convs) return [];

  // Enrich members with profiles
  const allUserIds = new Set<string>();
  convs.forEach((c: any) => c.members?.forEach((m: any) => allUserIds.add(m.user_id)));

  const { data: profiles } = await sb
    .from('profiles')
    .select('id, full_name, email, role, avatar_url')
    .in('id', Array.from(allUserIds));

  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

  // Last message per conversation
  const { data: lastMsgs } = await sb
    .from('messages')
    .select('id, conversation_id, sender_id, content, created_at')
    .in('conversation_id', convIds)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  const lastMsgMap = new Map<string, any>();
  (lastMsgs || []).forEach((m: any) => {
    if (!lastMsgMap.has(m.conversation_id)) lastMsgMap.set(m.conversation_id, m);
  });

  return convs.map((c: any) => ({
    ...c,
    members: (c.members || []).map((m: any) => ({
      ...m,
      profile: profileMap.get(m.user_id) || null,
    })),
    last_message: lastMsgMap.get(c.id) || null,
    unread_count: 0,
  }));
}

async function loadMessages(convId: string, currentUserId: string): Promise<Message[]> {
  const sb = createClient();
  const { data: msgs } = await sb
    .from('messages')
    .select('*')
    .eq('conversation_id', convId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });

  if (!msgs || msgs.length === 0) return [];

  const senderIds = Array.from(new Set(msgs.map((m: any) => m.sender_id as string)));
  const { data: profiles } = await sb
    .from('profiles')
    .select('id, full_name, email, role, avatar_url')
    .in('id', senderIds);

  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

  const replyIds = msgs.filter((m: any) => m.reply_to_id).map((m: any) => m.reply_to_id);
  const replyMap = new Map<string, any>();
  if (replyIds.length > 0) {
    const { data: replyMsgs } = await sb
      .from('messages')
      .select('id, content, sender_id')
      .in('id', replyIds);
    (replyMsgs || []).forEach((r: any) => {
      const sender = profileMap.get(r.sender_id);
      replyMap.set(r.id, { id: r.id, content: r.content.substring(0, 80), sender_name: sender?.full_name || 'Member' });
    });
  }

  return msgs.map((m: any) => ({
    ...m,
    reactions: m.reactions || {},
    sender: profileMap.get(m.sender_id) || null,
    reply_to: m.reply_to_id ? replyMap.get(m.reply_to_id) || null : null,
  }));
}

async function sendMessageToDB(convId: string, senderId: string, content: string, replyToId?: string): Promise<Message | null> {
  const sb = createClient();
  const { data: msg } = await sb
    .from('messages')
    .insert({ conversation_id: convId, sender_id: senderId, content, reply_to_id: replyToId || null, reactions: {}, is_edited: false, is_deleted: false })
    .select()
    .single();

  if (!msg) return null;

  await sb.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId);

  const { data: profile } = await sb.from('profiles').select('id, full_name, email, role, avatar_url').eq('id', senderId).maybeSingle();
  return { ...msg, reactions: {}, sender: profile || null, reply_to: null };
}

async function createDMConversation(currentUserId: string, targetUser: OrgUser): Promise<Conversation | null> {
  const sb = createClient();

  // Check for existing DM between these two users
  const { data: myMems } = await sb.from('conversation_members').select('conversation_id').eq('user_id', currentUserId);
  if (myMems && myMems.length > 0) {
    const myIds = myMems.map((m: any) => m.conversation_id);
    const { data: shared } = await sb.from('conversation_members').select('conversation_id').eq('user_id', targetUser.id).in('conversation_id', myIds);
    if (shared && shared.length > 0) {
      const { data: existing } = await sb.from('conversations').select('*').eq('id', shared[0].conversation_id).eq('type', 'direct').maybeSingle();
      if (existing) return buildConversation(existing, currentUserId, targetUser);
    }
  }

  // Create new DM
  const { data: conv, error } = await sb
    .from('conversations')
    .insert({ type: 'direct', name: targetUser.full_name || targetUser.email, created_by: currentUserId })
    .select()
    .single();

  if (!conv) return null;

  const { error: memErr } = await sb.from('conversation_members').insert([
    { conversation_id: conv.id, user_id: currentUserId, role: 'admin' },
    { conversation_id: conv.id, user_id: targetUser.id, role: 'member' },
  ]);
  if (memErr) console.error('[createDM] members insert error:', memErr);

  return buildConversation(conv, currentUserId, targetUser);
}

function buildConversation(conv: any, currentUserId: string, targetUser: OrgUser): Conversation {
  return {
    ...conv,
    members: [
      { id: '', user_id: currentUserId, role: 'admin', profile: null },
      { id: '', user_id: targetUser.id, role: 'member', profile: { id: targetUser.id, full_name: targetUser.full_name, email: targetUser.email, role: targetUser.role } as Profile },
    ],
    last_message: null,
    unread_count: 0,
  };
}

async function createChannel(currentUserId: string, name: string, desc: string): Promise<Conversation | null> {
  const sb = createClient();
  const { data: conv, error } = await sb
    .from('conversations')
    .insert({ type: 'channel', name, description: desc, created_by: currentUserId })
    .select()
    .single();

  if (!conv) return null;

  await sb.from('conversation_members').insert([{ conversation_id: conv.id, user_id: currentUserId, role: 'admin' }]);

  return { ...conv, members: [{ id: '', user_id: currentUserId, role: 'admin', profile: null }], last_message: null, unread_count: 0 };
}

async function toggleReactionInDB(convId: string, msgId: string, userId: string, emoji: string) {
  const sb = createClient();
  const { data: msg } = await sb.from('messages').select('reactions').eq('id', msgId).maybeSingle();
  if (!msg) return;

  const reactions: Record<string, string[]> = msg.reactions || {};
  if (!reactions[emoji]) reactions[emoji] = [];
  const idx = reactions[emoji].indexOf(userId);
  if (idx !== -1) {
    reactions[emoji].splice(idx, 1);
    if (reactions[emoji].length === 0) delete reactions[emoji];
  } else {
    reactions[emoji].push(userId);
  }
  await sb.from('messages').update({ reactions }).eq('id', msgId);
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'from-blue-500 to-blue-600', 'from-violet-500 to-violet-600',
  'from-emerald-500 to-emerald-600', 'from-rose-500 to-rose-600',
  'from-amber-500 to-amber-600', 'from-cyan-500 to-cyan-600',
];

function Avatar({ name, size = 'md', online }: { name?: string | null; size?: 'sm' | 'md' | 'lg'; online?: boolean }) {
  const idx = (name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length;
  const sz = size === 'sm' ? 'h-7 w-7 text-[10px]' : size === 'lg' ? 'h-10 w-10 text-sm' : 'h-8 w-8 text-xs';
  return (
    <div className="relative inline-block shrink-0">
      <div className={cn('rounded-xl bg-gradient-to-br text-white font-bold flex items-center justify-center', sz, AVATAR_COLORS[idx])}>
        {getInitials(name)}
      </div>
      {online !== undefined && (
        <span className={cn('absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-[#0f1117]', size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5', online ? 'bg-emerald-400' : 'bg-zinc-500')} />
      )}
    </div>
  );
}

// ─── Message Content (text / image / file) ───────────────────────────────────

function MessageContent({ content, isMe }: { content: string; isMe: boolean }) {
  const imageMatch = content.match(/^\[IMAGE\|(.+?)\|(.+?)\]$/);
  const fileMatch = content.match(/^\[FILE\|(.+?)\|(.+?)\|(.+?)\]$/);

  if (imageMatch) {
    const [, name, url] = imageMatch;
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block max-w-xs rounded-xl overflow-hidden border border-zinc-700 hover:opacity-90 transition-opacity">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={name} className="w-full object-cover max-h-64" />
        <div className={cn('px-3 py-1.5 text-xs truncate', isMe ? 'bg-blue-700 text-blue-100' : 'bg-zinc-800 text-zinc-400')}>{name}</div>
      </a>
    );
  }

  if (fileMatch) {
    const [, name, url, size] = fileMatch;
    const ext = name.split('.').pop()?.toUpperCase() || 'FILE';
    const extColors: Record<string, string> = { PDF: 'bg-red-500', DOCX: 'bg-blue-500', DOC: 'bg-blue-500', XLSX: 'bg-green-500', XLS: 'bg-green-500', TXT: 'bg-zinc-500', PNG: 'bg-purple-500', JPG: 'bg-purple-500' };
    const color = extColors[ext] || 'bg-zinc-600';
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" download={name}
        className={cn('flex items-center gap-3 px-4 py-3 rounded-2xl max-w-xs border transition-opacity hover:opacity-90', isMe ? 'bg-blue-700 border-blue-600' : 'bg-[#1e2330] border-zinc-700')}>
        <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0', color)}>{ext}</div>
        <div className="min-w-0">
          <p className={cn('text-sm font-semibold truncate', isMe ? 'text-white' : 'text-zinc-100')}>{name}</p>
          <p className={cn('text-[11px]', isMe ? 'text-blue-200' : 'text-zinc-400')}>{size} · Click to download</p>
        </div>
      </a>
    );
  }

  return (
    <div className={cn('max-w-xl px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words', isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-[#1e2330] text-zinc-100 rounded-tl-sm')}>
      {content}
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg, isMe, grouped, onReply, onReact, onDelete }: {
  msg: Message; isMe: boolean; grouped: boolean;
  onReply: (m: Message) => void; onReact: (msgId: string, emoji: string) => void;
  onDelete: (msgId: string) => void;
}) {
  const [showActions, setShowActions] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  return (
    <div
      className="group relative px-4 py-0.5 hover:bg-white/5 transition-colors"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={cn('flex items-start gap-3', isMe && 'flex-row-reverse')}>
        {grouped ? (
          <div className="w-8 shrink-0 flex items-center justify-center">
            {showActions && <span className="text-[10px] text-zinc-500 select-none">{formatTime(msg.created_at)}</span>}
          </div>
        ) : (
          <Avatar name={msg.sender?.full_name} online={!isMe} />
        )}
        <div className={cn('flex-1 min-w-0 space-y-1', isMe && 'flex flex-col items-end')}>
          {!grouped && (
            <div className={cn('flex items-baseline gap-2', isMe && 'flex-row-reverse')}>
              <span className="text-sm font-semibold text-zinc-100">
                {isMe ? 'You' : (msg.sender?.full_name || 'Team Member')}
              </span>
              <span className="text-[11px] text-zinc-500">{formatTime(msg.created_at)}</span>
              {isMe && <span className="text-[10px] text-zinc-600 capitalize">{msg.sender?.role}</span>}
            </div>
          )}
          {msg.reply_to && (
            <div className={cn('flex items-start gap-2 max-w-md px-3 py-1.5 rounded-lg border-l-2 border-blue-500 bg-blue-500/5', isMe && 'ml-auto')}>
              <Reply className="h-3 w-3 text-blue-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-blue-400">{msg.reply_to.sender_name}</span>
                <p className="text-[11px] text-zinc-400 truncate">{msg.reply_to.content}</p>
              </div>
            </div>
          )}
          <MessageContent content={msg.content} isMe={isMe} />
          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
            <div className={cn('flex flex-wrap gap-1 pt-0.5', isMe && 'justify-end')}>
              {Object.entries(msg.reactions).map(([emoji, userIds]) => (
                <button
                  key={emoji}
                  onClick={() => onReact(msg.id, emoji)}
                  className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all', userIds.includes('current') ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' : 'bg-[#1e2330] border-zinc-700 text-zinc-300 hover:border-zinc-500')}
                >
                  <span>{emoji}</span>
                  <span className="font-bold text-[10px]">{userIds.length}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {showActions && (
        <div className={cn('absolute top-0 z-10 flex items-center gap-0.5 p-1 rounded-xl bg-[#1a1f2e] border border-zinc-700 shadow-xl', isMe ? 'left-4' : 'right-4')}>
          {QUICK_EMOJIS.slice(0, 4).map((emoji) => (
            <button key={emoji} onClick={() => onReact(msg.id, emoji)} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-zinc-700 text-sm transition-colors">{emoji}</button>
          ))}
          <div className="w-px h-5 bg-zinc-700 mx-0.5" />
          <button onClick={() => onReply(msg)} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors" title="Reply">
            <Reply className="h-3.5 w-3.5" />
          </button>
          {isMe && (
            confirmDelete ? (
              <div className="flex items-center gap-1 px-2">
                <span className="text-[10px] text-zinc-400">Delete?</span>
                <button onClick={() => { onDelete(msg.id); setConfirmDelete(false); }} className="text-[10px] text-red-400 hover:text-red-300 font-semibold">Yes</button>
                <button onClick={() => setConfirmDelete(false)} className="text-[10px] text-zinc-500 hover:text-zinc-300">No</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors" title="Delete message">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ─── Date Divider ─────────────────────────────────────────────────────────────

function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex-1 h-px bg-zinc-800" />
      <span className="text-[11px] font-semibold text-zinc-500 px-2 py-0.5 rounded-full border border-zinc-800 bg-[#0f1117]">{label}</span>
      <div className="flex-1 h-px bg-zinc-800" />
    </div>
  );
}

// ─── Conversation Row ─────────────────────────────────────────────────────────

function ConvRow({ conv, active, currentUserId, onClick }: { conv: Conversation; active: boolean; currentUserId: string; onClick: () => void }) {
  const isDM = conv.type === 'direct';
  const other = isDM ? conv.members.find((m) => m.user_id !== currentUserId) : null;
  const label = isDM ? (other?.profile?.full_name || conv.name || 'Unknown') : (conv.name || 'Channel');

  return (
    <button
      onClick={onClick}
      className={cn('w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-left transition-all', active ? 'bg-blue-600/20 text-zinc-100' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200')}
    >
      {isDM ? (
        <Avatar name={other?.profile?.full_name} size="sm" online />
      ) : (
        <div className={cn('flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold shrink-0', active ? 'bg-blue-500/30 text-blue-300' : 'bg-zinc-800 text-zinc-400')}>#</div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={cn('text-sm truncate', active && 'font-semibold text-zinc-100')}>{label}</span>
          {conv.last_message && <span className="text-[10px] text-zinc-600 shrink-0 ml-1">{formatTime(conv.last_message.created_at)}</span>}
        </div>
        {conv.last_message && <p className="text-[11px] text-zinc-500 truncate">{conv.last_message.content}</p>}
      </div>
    </button>
  );
}

// ─── User Picker ─────────────────────────────────────────────────────────────

function UserPicker({ currentUserId, onSelect, onClose }: { currentUserId: string; onSelect: (u: OrgUser) => void; onClose: () => void }) {
  const [users, setUsers] = React.useState<OrgUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    async function fetch() {
      const sb = createClient();
      const { data, error } = await sb
        .from('profiles')
        .select('id, full_name, email, role, avatar_url')
        .neq('id', currentUserId)
        .order('role').order('full_name');
      if (error) console.error('[UserPicker] profiles error:', error);
      setUsers((data as OrgUser[]) || []);
      setLoading(false);
    }
    fetch();
  }, [currentUserId]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter((u) => (u.full_name || '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q));
  }, [users, search]);

  const grouped = React.useMemo(() => {
    const map = new Map<UserRole, OrgUser[]>();
    ROLE_ORDER.forEach((r) => map.set(r, []));
    filtered.forEach((u) => { const arr = map.get(u.role as UserRole) ?? []; arr.push(u); map.set(u.role as UserRole, arr); });
    return Array.from(map.entries()).filter(([, arr]) => arr.length > 0);
  }, [filtered]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <h2 className="text-base font-bold text-zinc-100">New Direct Message</h2>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors"><X className="h-4 w-4" /></button>
      </div>
      <div className="px-6 py-3 border-b border-zinc-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <input
            autoFocus
            type="text"
            placeholder="Search by name, email or role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-sm rounded-lg bg-zinc-800/60 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">Loading team members…</div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-zinc-500">
            <span className="text-sm">No members found</span>
          </div>
        ) : (
          grouped.map(([role, roleUsers]) => (
            <div key={role} className="mb-3">
              <div className="px-2 mb-1 flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{ROLE_LABELS[role]}</span>
                <span className="text-[10px] text-zinc-600">{roleUsers.length}</span>
              </div>
              <div className="space-y-0.5">
                {roleUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => onSelect(user)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left"
                  >
                    <Avatar name={user.full_name} size="md" online />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-200 truncate">{user.full_name || user.email}</span>
                        <span className={cn('shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                          role === 'admin' ? 'bg-rose-500/20 text-rose-400' :
                          role === 'hr' ? 'bg-amber-500/20 text-amber-400' :
                          role === 'manager' ? 'bg-teal-500/20 text-teal-400' : 'bg-blue-500/20 text-blue-400'
                        )}>{ROLE_LABELS[role]}</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 truncate">{user.email}</p>
                    </div>
                    <AtSign className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Channel Create Form ──────────────────────────────────────────────────────

function ChannelCreateForm({ onSubmit, onClose }: { onSubmit: (name: string, desc: string) => void; onClose: () => void }) {
  const [name, setName] = React.useState('');
  const [desc, setDesc] = React.useState('');
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <h2 className="text-base font-bold text-zinc-100">Create a Channel</h2>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors"><X className="h-4 w-4" /></button>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(name, desc); }} className="px-6 py-5 space-y-4">
        <div className="space-y-1.5">
          <label className="text-zinc-400 text-xs font-semibold uppercase tracking-wide">Channel Name</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-bold">#</span>
            <input
              autoFocus
              placeholder="e.g. project-alpha, announcements"
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              required
              className="w-full h-10 pl-8 pr-3 rounded-lg bg-zinc-800/60 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-zinc-400 text-xs font-semibold uppercase tracking-wide">Description <span className="normal-case font-normal text-zinc-600">(optional)</span></label>
          <input
            placeholder="What is this channel about?"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="w-full h-10 px-3 rounded-lg bg-zinc-800/60 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors">Cancel</button>
          <button type="submit" disabled={!name.trim()} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors">
            Create Channel
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Main ChatWorkspace ───────────────────────────────────────────────────────

type ModalMode = null | 'dm' | 'channel';

export function ChatWorkspace() {
  const { profile } = useAuth();
  const currentUserId = profile?.id ?? '';
  const currentUserName = profile?.full_name || profile?.email?.split('@')[0] || 'You';

  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [inputText, setInputText] = React.useState('');
  const [replyingTo, setReplyingTo] = React.useState<Message | null>(null);
  const [sending, setSending] = React.useState(false);
  const [channelsOpen, setChannelsOpen] = React.useState(true);
  const [dmsOpen, setDmsOpen] = React.useState(true);
  const [modal, setModal] = React.useState<ModalMode>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
  const [showMentionPicker, setShowMentionPicker] = React.useState(false);
  const [mentionSearch, setMentionSearch] = React.useState('');
  const [orgUsers, setOrgUsers] = React.useState<OrgUser[]>([]);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // ── Load conversations ────────────────────────────────────────────────────
  const fetchConversations = React.useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    const data = await loadConversations(currentUserId);
    setConversations(data);
    if (data.length > 0 && !activeConvId) setActiveConvId(data[0].id);
    setLoading(false);
  }, [currentUserId, activeConvId]);

  React.useEffect(() => {
    fetchConversations();
  }, [currentUserId]); // eslint-disable-line

  // ── Load messages ─────────────────────────────────────────────────────────
  const fetchMessages = React.useCallback(async () => {
    if (!activeConvId || !currentUserId) return;
    const data = await loadMessages(activeConvId, currentUserId);
    setMessages(data);
  }, [activeConvId, currentUserId]);

  React.useEffect(() => {
    setMessages([]);
    fetchMessages();
  }, [activeConvId]); // eslint-disable-line

  // ── Supabase real-time ────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!currentUserId) return;
    const sb = createClient();

    const channel = sb
      .channel(`chat-${currentUserId}`)
      // New messages in any conversation
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as any;
        if (msg.conversation_id === activeConvId) {
          // Enrich sender and add to messages
          sb.from('profiles').select('id, full_name, email, role, avatar_url').eq('id', msg.sender_id).maybeSingle()
            .then(({ data: sender }) => {
              setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, { ...msg, reactions: msg.reactions || {}, sender, reply_to: null }]);
            });
        }
        // Update last message in conversation list
        setConversations((prev) =>
          prev.map((c) => c.id === msg.conversation_id ? { ...c, last_message: msg } : c),
        );
      })
      // Reaction updates
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        const updated = payload.new as any;
        if (updated.conversation_id === activeConvId) {
          setMessages((prev) => prev.map((m) => m.id === updated.id ? { ...m, reactions: updated.reactions || {} } : m));
        }
      })
      // New conversation member (someone added you to a conversation)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_members', filter: `user_id=eq.${currentUserId}` }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, [currentUserId, activeConvId, fetchConversations]);

  // Auto-scroll
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeConv = conversations.find((c) => c.id === activeConvId);

  const filteredConvs = React.useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) => {
      const other = c.members.find((m) => m.user_id !== currentUserId);
      const label = c.type === 'direct' ? (other?.profile?.full_name || c.name || '') : (c.name || '');
      return label.toLowerCase().includes(q);
    });
  }, [conversations, searchQuery, currentUserId]);

  const channels = filteredConvs.filter((c) => c.type === 'channel');
  const dms = filteredConvs.filter((c) => c.type === 'direct');

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!inputText.trim() || !activeConvId || sending || !currentUserId) return;
    setSending(true);
    const text = inputText.trim();
    const replyId = replyingTo?.id;
    setInputText('');
    setReplyingTo(null);

    const sent = await sendMessageToDB(activeConvId, currentUserId, text, replyId);
    if (sent) {
      setMessages((prev) => prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]);
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleReact = async (msgId: string, emoji: string) => {
    if (!activeConvId || !currentUserId) return;
    await toggleReactionInDB(activeConvId, msgId, currentUserId, emoji);
  };

  const handleDelete = async (msgId: string) => {
    const sb = createClient();
    await sb.from('messages').update({ is_deleted: true, content: 'This message was deleted.' }).eq('id', msgId).eq('sender_id', currentUserId);
    setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: 'This message was deleted.', is_deleted: true } : m));
  };

  // ── Toolbar: wrap selected text with markdown ──────────────────────────────
  const wrapSelection = (before: string, after: string) => {
    const el = inputRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = inputText.slice(start, end);
    const newText = inputText.slice(0, start) + before + (selected || 'text') + after + inputText.slice(end);
    setInputText(newText);
    setTimeout(() => {
      el.focus();
      const cursor = start + before.length + (selected || 'text').length;
      el.setSelectionRange(cursor, cursor);
    }, 0);
  };

  // ── Toolbar: insert emoji ─────────────────────────────────────────────────
  const insertEmoji = (emoji: string) => {
    const el = inputRef.current;
    if (!el) return;
    const pos = el.selectionStart;
    setInputText((t) => t.slice(0, pos) + emoji + t.slice(pos));
    setShowEmojiPicker(false);
    setTimeout(() => { el.focus(); el.setSelectionRange(pos + emoji.length, pos + emoji.length); }, 0);
  };

  // ── Toolbar: load org users for mention ───────────────────────────────────
  React.useEffect(() => {
    if (!currentUserId) return;
    const sb = createClient();
    sb.from('profiles').select('id, full_name, email, role').neq('id', currentUserId).then(({ data }) => {
      setOrgUsers((data as OrgUser[]) || []);
    });
  }, [currentUserId]);

  const insertMention = (user: OrgUser) => {
    const el = inputRef.current;
    if (!el) return;
    const pos = el.selectionStart;
    const name = `@${user.full_name || user.email} `;
    setInputText((t) => t.slice(0, pos) + name + t.slice(pos));
    setShowMentionPicker(false);
    setTimeout(() => { el.focus(); el.setSelectionRange(pos + name.length, pos + name.length); }, 0);
  };

  const filteredMentionUsers = React.useMemo(() => {
    if (!mentionSearch.trim()) return orgUsers.slice(0, 6);
    const q = mentionSearch.toLowerCase();
    return orgUsers.filter((u) => (u.full_name || '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q)).slice(0, 6);
  }, [orgUsers, mentionSearch]);

  // ── Toolbar: file upload to Supabase Storage ──────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConvId || !currentUserId) return;
    const maxMB = 20;
    if (file.size > maxMB * 1024 * 1024) { alert(`File too large. Max ${maxMB}MB.`); return; }

    const ext = file.name.split('.').pop();
    const path = `${currentUserId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const sb = createClient();

    setSending(true);
    const { data: uploaded, error } = await sb.storage.from('chat-attachments').upload(path, file, { upsert: false });
    if (error || !uploaded) { alert('Upload failed: ' + (error?.message || 'Unknown error')); setSending(false); return; }

    const { data: urlData } = sb.storage.from('chat-attachments').getPublicUrl(path);
    const publicUrl = urlData?.publicUrl || '';

    const isImage = file.type.startsWith('image/');
    const content = isImage
      ? `[IMAGE|${file.name}|${publicUrl}]`
      : `[FILE|${file.name}|${publicUrl}|${(file.size / 1024).toFixed(0)}KB]`;

    const sent = await sendMessageToDB(activeConvId, currentUserId, content);
    if (sent) setMessages((prev) => prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]);

    setSending(false);
    e.target.value = '';
    inputRef.current?.focus();
  };

  const ALL_EMOJIS = ['😀','😂','🥰','😎','🤔','😅','😭','😍','🤣','😊','😘','😁','🥳','🙄','😤','😢',
    '👍','👎','👏','🙏','🤝','💪','👀','🫡','🤦','🤷','❤️','🔥','⭐','✅','❌','💯',
    '🚀','💡','📌','📎','🗂️','📊','📈','🎯','⚡','🛠️','🏆','🎉','💬','📧','🔔'];

  // ── Start DM ──────────────────────────────────────────────────────────────
  const handleSelectDMUser = async (user: OrgUser) => {
    setModal(null);
    const conv = await createDMConversation(currentUserId, user);
    if (conv) {
      setConversations((prev) => {
        const exists = prev.find((c) => c.id === conv.id);
        return exists ? prev : [conv, ...prev];
      });
      setActiveConvId(conv.id);
    }
  };

  // ── Create channel ────────────────────────────────────────────────────────
  const handleCreateChannel = async (name: string, desc: string) => {
    setModal(null);
    const conv = await createChannel(currentUserId, name, desc);
    if (conv) {
      setConversations((prev) => [conv, ...prev]);
      setActiveConvId(conv.id);
    }
  };

  // ── Group messages ────────────────────────────────────────────────────────
  const groupedMessages = React.useMemo(() => {
    return messages.map((msg, i) => {
      const prev = messages[i - 1];
      const grouped = !!prev && prev.sender_id === msg.sender_id && new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000;
      const showDate = !prev || !isSameDay(prev.created_at, msg.created_at);
      return { msg, grouped, showDate };
    });
  }, [messages]);

  const convTitle = React.useMemo(() => {
    if (!activeConv) return '';
    if (activeConv.type === 'channel') return activeConv.name || 'Channel';
    const other = activeConv.members.find((m) => m.user_id !== currentUserId);
    return other?.profile?.full_name || activeConv.name || 'Direct Message';
  }, [activeConv, currentUserId]);

  const convSubtitle = React.useMemo(() => {
    if (!activeConv || activeConv.type !== 'direct') return null;
    const other = activeConv.members.find((m) => m.user_id !== currentUserId);
    if (!other?.profile) return null;
    return ROLE_LABELS[other.profile.role] || other.profile.email;
  }, [activeConv, currentUserId]);

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[600px] rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl bg-[#0f1117]">

      {/* ── Left Sidebar ────────────────────────────────────────── */}
      <div className="w-72 shrink-0 flex flex-col bg-[#13161f] border-r border-zinc-800">
        <div className="flex items-center justify-between px-4 h-14 border-b border-zinc-800 shrink-0">
          <span className="font-bold text-zinc-100 text-sm tracking-tight">Messages</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setModal('dm')} title="New DM" className="h-7 w-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors">
              <AtSign className="h-4 w-4" />
            </button>
            <button onClick={() => setModal('channel')} title="New Channel" className="h-7 w-7 flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-3 py-2.5 border-b border-zinc-800/60">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search conversations…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 space-y-1">
          {/* Channels */}
          <div>
            <button onClick={() => setChannelsOpen((v) => !v)} className="w-full flex items-center gap-1 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors">
              <ChevronDown className={cn('h-3 w-3 transition-transform', !channelsOpen && '-rotate-90')} />
              Channels
              <span className="ml-auto text-zinc-600 font-normal normal-case">{channels.length}</span>
            </button>
            {channelsOpen && (
              <div className="mt-0.5 space-y-0.5 px-2">
                {channels.map((c) => <ConvRow key={c.id} conv={c} active={c.id === activeConvId} currentUserId={currentUserId} onClick={() => setActiveConvId(c.id)} />)}
                <button onClick={() => setModal('channel')} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-300 rounded-lg hover:bg-white/5 transition-colors">
                  <Plus className="h-3.5 w-3.5" />Add channel
                </button>
              </div>
            )}
          </div>

          {/* Direct Messages */}
          <div>
            <button onClick={() => setDmsOpen((v) => !v)} className="w-full flex items-center gap-1 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors">
              <ChevronDown className={cn('h-3 w-3 transition-transform', !dmsOpen && '-rotate-90')} />
              Direct Messages
              <span className="ml-auto text-zinc-600 font-normal normal-case">{dms.length}</span>
            </button>
            {dmsOpen && (
              <div className="mt-0.5 space-y-0.5 px-2">
                {dms.length === 0 ? <p className="px-3 py-2 text-xs text-zinc-600 italic">No DMs yet</p> : dms.map((c) => <ConvRow key={c.id} conv={c} active={c.id === activeConvId} currentUserId={currentUserId} onClick={() => setActiveConvId(c.id)} />)}
                <button onClick={() => setModal('dm')} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-300 rounded-lg hover:bg-white/5 transition-colors">
                  <Plus className="h-3.5 w-3.5" />New message
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Current user footer */}
        <div className="shrink-0 border-t border-zinc-800 px-3 py-3">
          <div className="flex items-center gap-2.5">
            <Avatar name={currentUserName} size="sm" online />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-200 truncate">{currentUserName}</p>
              <p className="text-[10px] text-zinc-500 capitalize">{ROLE_LABELS[profile?.role as UserRole] || 'Member'}</p>
            </div>
            <div className="ml-auto h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
          </div>
        </div>
      </div>

      {/* ── Right: Chat Panel ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0f1117]">
        {activeConv ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 h-14 border-b border-zinc-800 shrink-0">
              <div className="flex items-center gap-3">
                {activeConv.type === 'channel' ? (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400 font-bold text-base">#</div>
                ) : (
                  <Avatar name={activeConv.members.find((m) => m.user_id !== currentUserId)?.profile?.full_name} online />
                )}
                <div>
                  <h3 className="font-bold text-sm text-zinc-100 leading-none">{convTitle}</h3>
                  {convSubtitle && <p className="text-[11px] text-zinc-500 mt-0.5 leading-none">{convSubtitle}</p>}
                  {activeConv.type === 'direct' && <p className="text-[11px] text-emerald-400 mt-0.5 leading-none flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />Online</p>}
                </div>
              </div>
              {activeConv.type === 'channel' && (
                <div className="flex -space-x-1.5">
                  {activeConv.members.slice(0, 5).map((m, i) => <Avatar key={i} name={m.profile?.full_name} size="sm" />)}
                  <span className="ml-3 text-xs text-zinc-500 self-center">{activeConv.members.length} members</span>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto py-2">
              {groupedMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-8">
                  <div className="h-16 w-16 rounded-2xl bg-zinc-800/60 flex items-center justify-center">
                    <MessageSquarePlus className="h-8 w-8 text-zinc-600" />
                  </div>
                  <div>
                    <p className="font-bold text-zinc-300 text-base">
                      {activeConv.type === 'channel' ? `Welcome to #${convTitle}` : `Start a conversation with ${convTitle}`}
                    </p>
                    <p className="text-sm text-zinc-500 mt-1">Send the first message to get things started.</p>
                  </div>
                </div>
              ) : (
                groupedMessages.map(({ msg, grouped, showDate }) => (
                  <React.Fragment key={msg.id}>
                    {showDate && <DateDivider label={formatDate(msg.created_at)} />}
                    <MessageBubble msg={msg} isMe={msg.sender_id === currentUserId} grouped={grouped} onReply={setReplyingTo} onReact={handleReact} onDelete={handleDelete} />
                  </React.Fragment>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply banner */}
            {replyingTo && (
              <div className="mx-4 mb-1 flex items-center justify-between px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Reply className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span className="text-blue-300 font-semibold shrink-0">Replying to {replyingTo.sender?.full_name || 'message'}:</span>
                  <span className="text-zinc-400 truncate">{replyingTo.content}</span>
                </div>
                <button onClick={() => setReplyingTo(null)} className="text-zinc-500 hover:text-zinc-300 shrink-0 ml-2"><X className="h-3.5 w-3.5" /></button>
              </div>
            )}

            {/* Input */}
            <div className="px-4 pb-4 pt-1 shrink-0">
              {/* Mention picker */}
              {showMentionPicker && (
                <div className="mb-1 rounded-xl border border-zinc-700 bg-[#1a1f2e] overflow-hidden shadow-xl">
                  <div className="px-3 py-2 border-b border-zinc-800">
                    <input autoFocus value={mentionSearch} onChange={(e) => setMentionSearch(e.target.value)} placeholder="Search team member…" className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none" />
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    {filteredMentionUsers.length === 0 ? <p className="px-3 py-2 text-xs text-zinc-500">No members found</p> : filteredMentionUsers.map((u) => (
                      <button key={u.id} onClick={() => insertMention(u)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors text-left">
                        <Avatar name={u.full_name} size="sm" />
                        <div>
                          <p className="text-sm text-zinc-200 font-semibold">{u.full_name || u.email}</p>
                          <p className="text-[10px] text-zinc-500 capitalize">{u.role}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Emoji picker */}
              {showEmojiPicker && (
                <div className="mb-1 rounded-xl border border-zinc-700 bg-[#1a1f2e] p-3 shadow-xl">
                  <div className="grid grid-cols-9 gap-1">
                    {ALL_EMOJIS.map((em) => (
                      <button key={em} onClick={() => insertEmoji(em)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-lg transition-colors">{em}</button>
                    ))}
                  </div>
                </div>
              )}
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" />
              <div className="flex flex-col rounded-xl border border-zinc-700 bg-[#1a1f2e] focus-within:border-zinc-500 transition-colors">
                <textarea
                  ref={inputRef}
                  rows={1}
                  placeholder={`Message ${activeConv.type === 'channel' ? '#' : ''}${convTitle}…`}
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    if (showEmojiPicker) setShowEmojiPicker(false);
                    if (showMentionPicker) setShowMentionPicker(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') { setShowEmojiPicker(false); setShowMentionPicker(false); }
                    handleKeyDown(e);
                  }}
                  className="w-full resize-none bg-transparent px-4 pt-3 pb-1 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none leading-relaxed max-h-32"
                />
                <div className="flex items-center justify-between px-3 pb-2 pt-1">
                  <div className="flex items-center gap-0.5">
                    <button title="Attach file" onClick={() => fileInputRef.current?.click()} className="h-7 w-7 flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors">
                      <Paperclip className="h-4 w-4" />
                    </button>
                    <button title="Emoji" onClick={() => { setShowEmojiPicker((v) => !v); setShowMentionPicker(false); }} className={cn('h-7 w-7 flex items-center justify-center rounded-md transition-colors', showEmojiPicker ? 'text-yellow-400 bg-yellow-400/10' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5')}>
                      <Smile className="h-4 w-4" />
                    </button>
                    <button title="Mention someone" onClick={() => { setShowMentionPicker((v) => !v); setShowEmojiPicker(false); setMentionSearch(''); }} className={cn('h-7 w-7 flex items-center justify-center rounded-md transition-colors', showMentionPicker ? 'text-blue-400 bg-blue-400/10' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5')}>
                      <AtSign className="h-4 w-4" />
                    </button>
                    <div className="h-4 w-px bg-zinc-700 mx-1" />
                    <button title="Bold (wrap selected text)" onClick={() => wrapSelection('**', '**')} className="h-7 w-7 flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors font-bold text-sm">
                      B
                    </button>
                    <button title="Italic (wrap selected text)" onClick={() => wrapSelection('_', '_')} className="h-7 w-7 flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors italic text-sm">
                      I
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-600 hidden sm:block">Enter to send · Shift+Enter for newline</span>
                    <button
                      onClick={handleSend}
                      disabled={!inputText.trim() || sending}
                      className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all', inputText.trim() ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-zinc-700/50 text-zinc-500 cursor-not-allowed')}
                    >
                      <Send className="h-3.5 w-3.5" />Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
            <div className="h-20 w-20 rounded-2xl bg-zinc-800/60 flex items-center justify-center">
              <MessageSquarePlus className="h-10 w-10 text-zinc-600" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-200 text-lg">Your messages</h3>
              <p className="text-sm text-zinc-500 mt-1 max-w-xs">Select a conversation or start a new message with any team member.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setModal('dm')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors">
                <AtSign className="h-4 w-4" />New Message
              </button>
              <button onClick={() => setModal('channel')} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-700 hover:border-zinc-600 text-zinc-300 hover:text-zinc-100 text-sm font-semibold transition-colors">
                <Hash className="h-4 w-4" />New Channel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── DM User Picker Modal ─────────────────────────────────── */}
      <Dialog open={modal === 'dm'} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="!bg-[#13161f] !border-zinc-800 text-zinc-100 gap-0 p-0 overflow-hidden sm:max-w-lg max-h-[80vh] flex flex-col">
          <UserPicker currentUserId={currentUserId} onSelect={handleSelectDMUser} onClose={() => setModal(null)} />
        </DialogContent>
      </Dialog>

      {/* ── Channel Create Modal ─────────────────────────────────── */}
      <Dialog open={modal === 'channel'} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="!bg-[#13161f] !border-zinc-800 text-zinc-100 gap-0 p-0 overflow-hidden sm:max-w-md">
          <ChannelCreateForm onSubmit={handleCreateChannel} onClose={() => setModal(null)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
