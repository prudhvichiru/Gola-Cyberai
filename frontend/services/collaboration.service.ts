import { fetchApi } from './api';
import {
  ConversationItem,
  MessageItem,
  MeetingItem,
  NotificationItem,
  WebSocketEvent,
} from '@/types/collaboration.types';

export class CollaborationFrontendService {
  // ==========================================
  // CONVERSATIONS
  // ==========================================
  static async getConversations(userId = 'current-user') {
    return fetchApi<ConversationItem[]>(`/collaboration/conversations?userId=${userId}`);
  }

  static async getConversationById(id: string, userId = 'current-user') {
    return fetchApi<ConversationItem>(`/collaboration/conversations/${id}?userId=${userId}`);
  }

  static async createConversation(payload: {
    type: 'direct' | 'group' | 'channel';
    name?: string;
    memberIds: string[];
    projectId?: string;
    description?: string;
  }, userId = 'current-user') {
    return fetchApi<{ message: string; data: ConversationItem }>('/collaboration/conversations', {
      method: 'POST',
      body: JSON.stringify({ ...payload, userId }),
    });
  }

  // ==========================================
  // MESSAGES
  // ==========================================
  static async getMessages(conversationId: string, userId = 'current-user') {
    return fetchApi<MessageItem[]>(`/collaboration/conversations/${conversationId}/messages?userId=${userId}`);
  }

  static async sendMessage(
    conversationId: string,
    payload: { content: string; replyToId?: string; attachments?: any[]; mentions?: string[] },
    userId = 'current-user'
  ) {
    return fetchApi<{ message: string; data: MessageItem }>(`/collaboration/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ ...payload, userId }),
    });
  }

  static async addReaction(
    conversationId: string,
    messageId: string,
    emoji: string,
    userId = 'current-user'
  ) {
    return fetchApi<{ message: string; data: MessageItem }>(
      `/collaboration/conversations/${conversationId}/messages/${messageId}/reactions`,
      {
        method: 'POST',
        body: JSON.stringify({ emoji, userId }),
      }
    );
  }

  // ==========================================
  // MEETINGS & CALENDAR
  // ==========================================
  static async getMeetings(filters?: { status?: string; projectId?: string }) {
    const searchParams = new URLSearchParams();
    if (filters?.status) searchParams.set('status', filters.status);
    if (filters?.projectId) searchParams.set('projectId', filters.projectId);

    const qs = searchParams.toString();
    return fetchApi<MeetingItem[]>(`/collaboration/meetings${qs ? `?${qs}` : ''}`);
  }

  static async createMeeting(payload: Partial<MeetingItem> & { invitee_ids?: string[] }, userId = 'current-user') {
    return fetchApi<{ message: string; data: MeetingItem }>('/collaboration/meetings', {
      method: 'POST',
      body: JSON.stringify({ ...payload, userId }),
    });
  }

  static async respondToMeeting(meetingId: string, status: 'accepted' | 'declined' | 'tentative', userId = 'current-user') {
    return fetchApi<{ message: string; data: MeetingItem }>(`/collaboration/meetings/${meetingId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ status, userId }),
    });
  }

  // ==========================================
  // NOTIFICATIONS
  // ==========================================
  static async getNotifications(userId = 'current-user') {
    return fetchApi<NotificationItem[]>(`/collaboration/notifications?userId=${userId}`);
  }

  static async markNotificationRead(notificationId: string, userId = 'current-user') {
    return fetchApi<{ message: string; data: NotificationItem }>(`/collaboration/notifications/${notificationId}/read`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  // ==========================================
  // REAL-TIME WEBSOCKET SUBSCRIPTION
  // ==========================================
  static connectWebSocket(
    userId = 'current-user',
    onEvent: (event: WebSocketEvent) => void
  ): { disconnect: () => void; subscribeConversation: (id: string) => void; sendTyping: (id: string, isTyping: boolean) => void } {
    if (typeof window === 'undefined') {
      return { disconnect: () => {}, subscribeConversation: () => {}, sendTyping: () => {} };
    }

    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const wsBase = apiBase.replace(/^http/, 'ws');
    const wsUrl = `${wsBase}/ws?userId=${encodeURIComponent(userId)}`;
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let isExplicitlyClosed = false;
    const pendingSubscriptions = new Set<string>();

    const connect = () => {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        // Resubscribe to any active rooms
        pendingSubscriptions.forEach((id) => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'subscribe_conversation', payload: { conversationId: id } }));
          }
        });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onEvent(data);
        } catch (err) {
          console.error('[WebSocket Client] Failed to parse event:', err);
        }
      };

      ws.onclose = () => {
        if (!isExplicitlyClosed) {
          reconnectTimeout = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();

    return {
      disconnect: () => {
        isExplicitlyClosed = true;
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        ws?.close();
      },
      subscribeConversation: (id: string) => {
        pendingSubscriptions.add(id);
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'subscribe_conversation', payload: { conversationId: id } }));
        }
      },
      sendTyping: (id: string, isTyping: boolean) => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'typing', payload: { conversationId: id, isTyping } }));
        }
      },
    };
  }
}
