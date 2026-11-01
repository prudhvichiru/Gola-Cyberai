import { supabaseAdmin as supabase } from '../config/supabase.js';
import { broadcastToConversation, sendNotificationToUser } from '../websocket/index.js';

// ── Profile helper ────────────────────────────────────────────────────────────

async function fetchProfiles(ids: string[]) {
  if (ids.length === 0) return new Map<string, any>();
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .in('id', ids);
  return new Map((data || []).map((p: any) => [p.id, p]));
}

function unknownUser(id: string) {
  return { id, full_name: 'Unknown', email: '', avatar_url: null };
}

export class CollaborationService {
  // ==========================================
  // CONVERSATIONS & CHANNELS
  // ==========================================

  static async getConversations(userId: string) {
    // Get all conversations the user is a member of
    const { data: memberships, error: memErr } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', userId);

    if (memErr) throw new Error(memErr.message);
    if (!memberships || memberships.length === 0) return [];

    const convIds = memberships.map((m: any) => m.conversation_id);

    const { data: conversations, error: convErr } = await supabase
      .from('conversations')
      .select(`
        *,
        members:conversation_members(id, conversation_id, user_id, role, joined_at, last_read_at)
      `)
      .in('id', convIds)
      .order('updated_at', { ascending: false });

    if (convErr) throw new Error(convErr.message);
    if (!conversations) return [];

    // Collect all user IDs for profile lookup
    const userIds = new Set<string>();
    conversations.forEach((c: any) =>
      c.members?.forEach((m: any) => userIds.add(m.user_id)),
    );
    const profileMap = await fetchProfiles(Array.from(userIds));

    // Fetch last message per conversation
    const { data: lastMsgs } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, content, created_at')
      .in('conversation_id', convIds)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    const lastMsgMap = new Map<string, any>();
    (lastMsgs || []).forEach((m: any) => {
      if (!lastMsgMap.has(m.conversation_id)) lastMsgMap.set(m.conversation_id, m);
    });

    return conversations.map((c: any) => ({
      ...c,
      members: (c.members || []).map((m: any) => ({
        ...m,
        user: profileMap.get(m.user_id) || unknownUser(m.user_id),
      })),
      last_message: lastMsgMap.get(c.id) || null,
      unread_count: 0,
    }));
  }

  static async getConversationById(userId: string, conversationId: string) {
    const { data: membership } = await supabase
      .from('conversation_members')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!membership) throw new Error('Access denied: You are not a member of this conversation.');

    const { data: conv, error } = await supabase
      .from('conversations')
      .select(`*, members:conversation_members(id, conversation_id, user_id, role, joined_at, last_read_at)`)
      .eq('id', conversationId)
      .maybeSingle();

    if (error || !conv) throw new Error('Conversation not found');
    return conv;
  }

  static async createConversation(
    userId: string,
    data: { type: string; name?: string; memberIds: string[]; projectId?: string; description?: string },
  ) {
    const allMemberIds = Array.from(new Set([userId, ...(data.memberIds || [])]));

    // Insert conversation
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({
        type: data.type || 'direct',
        name: data.name || (data.type === 'direct' ? 'Direct Message' : 'New Group'),
        project_id: data.projectId || null,
        description: data.description || '',
        created_by: userId,
      })
      .select()
      .single();

    if (convErr || !conv) throw new Error(convErr?.message || 'Failed to create conversation');

    // Insert members
    const memberRows = allMemberIds.map((mId) => ({
      conversation_id: conv.id,
      user_id: mId,
      role: mId === userId ? 'admin' : 'member',
    }));

    const { error: memErr } = await supabase
      .from('conversation_members')
      .insert(memberRows);

    if (memErr) throw new Error(memErr.message);

    // Fetch profiles for members
    const profileMap = await fetchProfiles(allMemberIds);

    const { data: members } = await supabase
      .from('conversation_members')
      .select('id, conversation_id, user_id, role, joined_at, last_read_at')
      .eq('conversation_id', conv.id);

    return {
      ...conv,
      members: (members || []).map((m: any) => ({
        ...m,
        user: profileMap.get(m.user_id) || unknownUser(m.user_id),
      })),
      last_message: null,
      unread_count: 0,
    };
  }

  // ==========================================
  // MESSAGES
  // ==========================================

  static async getMessages(userId: string, conversationId: string) {
    await this.getConversationById(userId, conversationId);

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    if (!messages || messages.length === 0) return [];

    // Enrich with sender profiles
    const senderIds = [...new Set(messages.map((m: any) => m.sender_id))];
    const profileMap = await fetchProfiles(senderIds);

    // Enrich reply_to
    const replyIds = messages.filter((m: any) => m.reply_to_id).map((m: any) => m.reply_to_id);
    const replyMap = new Map<string, any>();
    if (replyIds.length > 0) {
      const { data: replyMsgs } = await supabase
        .from('messages')
        .select('id, content, sender_id')
        .in('id', replyIds);
      const replyProfileMap = await fetchProfiles(
        (replyMsgs || []).map((r: any) => r.sender_id),
      );
      (replyMsgs || []).forEach((r: any) => {
        const sender = replyProfileMap.get(r.sender_id) || unknownUser(r.sender_id);
        replyMap.set(r.id, {
          id: r.id,
          content: r.content.substring(0, 80),
          sender_name: sender.full_name || 'Member',
        });
      });
    }

    return messages.map((m: any) => ({
      ...m,
      sender: profileMap.get(m.sender_id) || unknownUser(m.sender_id),
      reply_to: m.reply_to_id ? replyMap.get(m.reply_to_id) || null : null,
    }));
  }

  static async sendMessage(
    userId: string,
    conversationId: string,
    payload: { content: string; replyToId?: string; attachments?: any[]; mentions?: string[] },
  ) {
    await this.getConversationById(userId, conversationId);

    const { data: msg, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: payload.content,
        reply_to_id: payload.replyToId || null,
        attachments: payload.attachments || [],
        reactions: {},
        mentions: payload.mentions || [],
        is_edited: false,
        is_deleted: false,
      })
      .select()
      .single();

    if (error || !msg) throw new Error(error?.message || 'Failed to send message');

    // Update conversation updated_at
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    // Build reply_to context
    let replyTo = null;
    if (payload.replyToId) {
      const { data: parent } = await supabase
        .from('messages')
        .select('id, content, sender_id')
        .eq('id', payload.replyToId)
        .maybeSingle();
      if (parent) {
        const parentProfileMap = await fetchProfiles([parent.sender_id]);
        const sender = parentProfileMap.get(parent.sender_id) || unknownUser(parent.sender_id);
        replyTo = {
          id: parent.id,
          content: parent.content.substring(0, 80),
          sender_name: sender.full_name || 'Member',
        };
      }
    }

    const profileMap = await fetchProfiles([userId]);
    const enrichedMsg = {
      ...msg,
      sender: profileMap.get(userId) || unknownUser(userId),
      reply_to: replyTo,
    };

    // Broadcast via WebSocket
    broadcastToConversation(conversationId, { type: 'message', payload: enrichedMsg });

    // Notify mentions
    if (payload.mentions && payload.mentions.length > 0) {
      for (const mId of payload.mentions) {
        if (mId !== userId) {
          const { data: notif } = await supabase
            .from('notifications')
            .insert({
              user_id: mId,
              title: 'You were mentioned',
              message: `${enrichedMsg.sender.full_name}: ${payload.content.substring(0, 60)}`,
              type: 'message',
              read: false,
              data: { conversationId, messageId: msg.id },
            })
            .select()
            .single();
          if (notif) sendNotificationToUser(mId, notif);
        }
      }
    }

    return enrichedMsg;
  }

  static async addReaction(userId: string, conversationId: string, messageId: string, emoji: string) {
    await this.getConversationById(userId, conversationId);

    const { data: msg, error } = await supabase
      .from('messages')
      .select('reactions')
      .eq('id', messageId)
      .maybeSingle();

    if (error || !msg) throw new Error('Message not found');

    const reactions: Record<string, string[]> = msg.reactions || {};
    if (!reactions[emoji]) reactions[emoji] = [];

    const idx = reactions[emoji].indexOf(userId);
    if (idx !== -1) {
      reactions[emoji].splice(idx, 1);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji].push(userId);
    }

    const { data: updated } = await supabase
      .from('messages')
      .update({ reactions })
      .eq('id', messageId)
      .select()
      .single();

    broadcastToConversation(conversationId, {
      type: 'reaction',
      payload: { messageId, reactions },
    });

    return updated;
  }

  // ==========================================
  // MEETINGS & CALENDAR
  // ==========================================

  static async getMeetings(filters?: { status?: string; projectId?: string }) {
    let query = supabase
      .from('meetings')
      .select(`
        *,
        invitees:meeting_invitees(id, meeting_id, user_id, status)
      `)
      .order('start_time', { ascending: true });

    if (filters?.status && filters.status !== 'all') {
      query = (query as any).eq('status', filters.status);
    }
    if (filters?.projectId && filters.projectId !== 'all') {
      query = (query as any).eq('project_id', filters.projectId);
    }

    const { data: meetings, error } = await query;
    if (error) throw new Error(error.message);
    if (!meetings) return [];

    // Collect all user IDs
    const userIds = new Set<string>();
    meetings.forEach((m: any) => {
      userIds.add(m.organizer_id);
      m.invitees?.forEach((i: any) => userIds.add(i.user_id));
    });

    const profileMap = await fetchProfiles(Array.from(userIds));

    return meetings.map((m: any) => ({
      ...m,
      organizer: profileMap.get(m.organizer_id) || unknownUser(m.organizer_id),
      invitees: (m.invitees || []).map((inv: any) => ({
        ...inv,
        user: profileMap.get(inv.user_id) || unknownUser(inv.user_id),
      })),
    }));
  }

  static async createMeeting(
    userId: string,
    data: {
      title: string;
      description?: string;
      agenda?: string;
      meeting_link?: string;
      start_time: string;
      end_time: string;
      project_id?: string;
      invitee_ids?: string[];
      notes?: string;
    },
  ) {
    if (!data.title || !data.start_time || !data.end_time) {
      throw new Error('Title, start time, and end time are required.');
    }

    if (new Date(data.end_time) <= new Date(data.start_time)) {
      throw new Error('Meeting end time must be after start time.');
    }

    // Insert meeting
    const { data: meeting, error: meetErr } = await supabase
      .from('meetings')
      .insert({
        title: data.title,
        description: data.description || '',
        agenda: data.agenda || '',
        meeting_link: data.meeting_link || null,
        start_time: data.start_time,
        end_time: data.end_time,
        organizer_id: userId,
        project_id: data.project_id || null,
        status: 'scheduled',
        notes: data.notes || '',
        action_items: [],
      })
      .select()
      .single();

    if (meetErr || !meeting) throw new Error(meetErr?.message || 'Failed to create meeting');

    // Insert invitees (organizer always accepted)
    const inviteeIds = Array.from(new Set([userId, ...(data.invitee_ids || [])]));
    if (inviteeIds.length > 0) {
      await supabase.from('meeting_invitees').insert(
        inviteeIds.map((id) => ({
          meeting_id: meeting.id,
          user_id: id,
          status: id === userId ? 'accepted' : 'pending',
        })),
      );
    }

    // Send notifications to invitees (not organizer)
    const inviteesOnly = (data.invitee_ids || []).filter((id) => id !== userId);
    for (const invId of inviteesOnly) {
      const { data: notif } = await supabase
        .from('notifications')
        .insert({
          user_id: invId,
          title: `Meeting Invitation: ${meeting.title}`,
          message: `Scheduled for ${new Date(meeting.start_time).toLocaleString()}`,
          type: 'meeting',
          read: false,
          data: { meetingId: meeting.id },
        })
        .select()
        .single();
      if (notif) sendNotificationToUser(invId, notif);
    }

    // Return enriched meeting
    const profileMap = await fetchProfiles(inviteeIds);
    const { data: invitees } = await supabase
      .from('meeting_invitees')
      .select('id, meeting_id, user_id, status')
      .eq('meeting_id', meeting.id);

    return {
      ...meeting,
      organizer: profileMap.get(userId) || unknownUser(userId),
      invitees: (invitees || []).map((inv: any) => ({
        ...inv,
        user: profileMap.get(inv.user_id) || unknownUser(inv.user_id),
      })),
    };
  }

  static async respondToMeeting(
    userId: string,
    meetingId: string,
    status: 'accepted' | 'declined' | 'tentative',
  ) {
    // Upsert invitee status
    const { error: upsertErr } = await supabase
      .from('meeting_invitees')
      .upsert(
        { meeting_id: meetingId, user_id: userId, status, updated_at: new Date().toISOString() },
        { onConflict: 'meeting_id,user_id' },
      );

    if (upsertErr) throw new Error(upsertErr.message);

    // Return updated meeting
    const meetings = await CollaborationService.getMeetings();
    const updated = meetings.find((m: any) => m.id === meetingId);
    if (!updated) throw new Error('Meeting not found');
    return updated;
  }

  // ==========================================
  // NOTIFICATIONS
  // ==========================================

  static async getNotifications(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);
    return data || [];
  }

  static async markNotificationRead(userId: string, notificationId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
}
