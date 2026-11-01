export type ConversationType = 'direct' | 'group' | 'channel';

export interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  last_read_at: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string | null;
    status?: string;
  };
}

export interface ConversationItem {
  id: string;
  type: ConversationType;
  name?: string | null;
  project_id?: string | null;
  description?: string | null;
  created_by?: string | null;
  members: ConversationMember[];
  last_message?: MessageItem | null;
  unread_count?: number;
  project?: {
    id: string;
    name: string;
    code: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface MessageAttachment {
  id: string;
  name: string;
  size: number;
  url: string;
  mimeType: string;
}

export interface MessageItem {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  reply_to_id?: string | null;
  reply_to?: {
    id: string;
    content: string;
    sender_name: string;
  } | null;
  attachments?: MessageAttachment[];
  reactions?: Record<string, string[]>; // { "👍": ["emp-1", "emp-2"] }
  mentions?: string[]; // array of userIds
  is_edited?: boolean;
  is_deleted?: boolean;
  sender?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string | null;
  } | null;
  created_at: string;
  updated_at?: string;
}

export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type InviteeStatus = 'pending' | 'accepted' | 'declined' | 'tentative';

export interface MeetingActionItem {
  id: string;
  task: string;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  completed: boolean;
  linked_task_id?: string | null;
}

export interface MeetingInvitee {
  id: string;
  meeting_id: string;
  user_id: string;
  status: InviteeStatus;
  user?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string | null;
  };
}

export interface MeetingItem {
  id: string;
  title: string;
  description?: string | null;
  agenda?: string | null;
  meeting_link?: string | null;
  start_time: string; // ISO string
  end_time: string;   // ISO string
  organizer_id: string;
  project_id?: string | null;
  status: MeetingStatus;
  notes?: string | null;
  action_items?: MeetingActionItem[];
  organizer?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  invitees?: MeetingInvitee[];
  created_at: string;
  updated_at: string;
}

export type NotificationType = 'message' | 'meeting' | 'task' | 'approval';

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  data?: Record<string, any>;
  created_at: string;
}

export interface WebSocketEvent {
  type: 'message' | 'reaction' | 'typing' | 'read' | 'presence';
  payload: any;
}
