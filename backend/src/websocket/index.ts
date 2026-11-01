import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

interface ClientSession {
  ws: WebSocket;
  userId: string;
  subscribedConversations: Set<string>;
}

// Map of userId -> Set of active WebSocket sessions
const connectedClients = new Map<string, Set<WebSocket>>();
// Map of ws -> ClientSession
const activeSessions = new Map<WebSocket, ClientSession>();

let wss: WebSocketServer | null = null;

export function initWebSocketServer(server: HttpServer) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    // Parse user ID from URL query: e.g. ws://localhost:5000/ws?userId=emp-1
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const userId = url.searchParams.get('userId') || 'current-user';

    const session: ClientSession = {
      ws,
      userId,
      subscribedConversations: new Set(),
    };

    activeSessions.set(ws, session);

    if (!connectedClients.has(userId)) {
      connectedClients.set(userId, new Set());
    }
    connectedClients.get(userId)!.add(ws);

    console.log(`[WebSocket] Client connected: user=${userId}. Total active users: ${connectedClients.size}`);

    // Send welcome / connected handshake
    ws.send(JSON.stringify({
      type: 'connected',
      payload: { userId, timestamp: new Date().toISOString() },
    }));

    // Handle incoming client frames
    ws.on('message', (data: string) => {
      try {
        const message = JSON.parse(data.toString());
        handleClientMessage(ws, session, message);
      } catch (err) {
        console.error('[WebSocket] Failed to parse client message:', err);
      }
    });

    ws.on('close', () => {
      activeSessions.delete(ws);
      const userSessions = connectedClients.get(userId);
      if (userSessions) {
        userSessions.delete(ws);
        if (userSessions.size === 0) {
          connectedClients.delete(userId);
        }
      }
      console.log(`[WebSocket] Client disconnected: user=${userId}`);
    });

    ws.on('error', (error) => {
      console.error(`[WebSocket] Error for user=${userId}:`, error);
    });
  });

  return wss;
}

// Client message handler
function handleClientMessage(ws: WebSocket, session: ClientSession, msg: { type: string; payload: any }) {
  switch (msg.type) {
    case 'subscribe_conversation': {
      const { conversationId } = msg.payload;
      if (conversationId) {
        session.subscribedConversations.add(conversationId);
        ws.send(JSON.stringify({
          type: 'subscribed',
          payload: { conversationId, success: true },
        }));
      }
      break;
    }

    case 'unsubscribe_conversation': {
      const { conversationId } = msg.payload;
      if (conversationId) {
        session.subscribedConversations.delete(conversationId);
      }
      break;
    }

    case 'typing': {
      const { conversationId, isTyping } = msg.payload;
      broadcastToConversation(conversationId, {
        type: 'typing',
        payload: {
          conversationId,
          userId: session.userId,
          isTyping,
        },
      }, session.userId);
      break;
    }

    case 'ping': {
      ws.send(JSON.stringify({ type: 'pong', payload: { timestamp: Date.now() } }));
      break;
    }

    default:
      console.log('[WebSocket] Unhandled client message type:', msg.type);
  }
}

// Broadcast an event to all users currently subscribed to a conversation
export function broadcastToConversation(conversationId: string, event: { type: string; payload: any }, excludeUserId?: string) {
  if (!wss) return;

  activeSessions.forEach((session) => {
    if (session.subscribedConversations.has(conversationId)) {
      if (excludeUserId && session.userId === excludeUserId) {
        return;
      }
      if (session.ws.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify(event));
      }
    }
  });
}

// Direct notification broadcast to a specific user
export function sendNotificationToUser(userId: string, notification: any) {
  const sessions = connectedClients.get(userId);
  if (sessions) {
    const payload = JSON.stringify({
      type: 'notification',
      payload: notification,
    });
    sessions.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }
}
