import { Request, Response } from 'express';
import { CollaborationService } from '../services/collaboration.service.js';

export class CollaborationController {
  // ==========================================
  // CONVERSATIONS
  // ==========================================
  static async getConversations(req: Request, res: Response) {
    try {
      const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string) || 'current-user';
      const data = await CollaborationService.getConversations(userId);
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error fetching conversations' });
    }
  }

  static async getConversationById(req: Request, res: Response) {
    try {
      const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string) || 'current-user';
      const data = await CollaborationService.getConversationById(userId, req.params.id);
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(403).json({ error: err.message || 'Access denied' });
    }
  }

  static async createConversation(req: Request, res: Response) {
    try {
      const userId = (req.body.userId as string) || (req.headers['x-user-id'] as string) || 'current-user';
      const data = await CollaborationService.createConversation(userId, req.body);
      return res.status(201).json({ message: 'Conversation created successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Error creating conversation' });
    }
  }

  // ==========================================
  // MESSAGES
  // ==========================================
  static async getMessages(req: Request, res: Response) {
    try {
      const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string) || 'current-user';
      const data = await CollaborationService.getMessages(userId, req.params.id);
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(403).json({ error: err.message || 'Error retrieving messages' });
    }
  }

  static async sendMessage(req: Request, res: Response) {
    try {
      const userId = (req.body.userId as string) || (req.headers['x-user-id'] as string) || 'current-user';
      const data = await CollaborationService.sendMessage(userId, req.params.id, req.body);
      return res.status(201).json({ message: 'Message sent', data });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to send message' });
    }
  }

  static async addReaction(req: Request, res: Response) {
    try {
      const userId = (req.body.userId as string) || (req.headers['x-user-id'] as string) || 'current-user';
      const { emoji } = req.body;
      const data = await CollaborationService.addReaction(userId, req.params.id, req.params.messageId, emoji);
      return res.status(200).json({ message: 'Reaction updated', data });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Error adding reaction' });
    }
  }

  // ==========================================
  // MEETINGS & CALENDAR
  // ==========================================
  static async getMeetings(req: Request, res: Response) {
    try {
      const { status, projectId } = req.query;
      const data = await CollaborationService.getMeetings({
        status: status as string,
        projectId: projectId as string,
      });
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error fetching meetings' });
    }
  }

  static async createMeeting(req: Request, res: Response) {
    try {
      const userId = (req.body.userId as string) || (req.headers['x-user-id'] as string) || 'current-user';
      const data = await CollaborationService.createMeeting(userId, req.body);
      return res.status(201).json({ message: 'Meeting scheduled successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Error scheduling meeting' });
    }
  }

  static async respondToMeeting(req: Request, res: Response) {
    try {
      const userId = (req.body.userId as string) || (req.headers['x-user-id'] as string) || 'current-user';
      const { status } = req.body;
      const data = await CollaborationService.respondToMeeting(userId, req.params.id, status);
      return res.status(200).json({ message: `RSVP updated to ${status}`, data });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Error updating RSVP' });
    }
  }

  // ==========================================
  // NOTIFICATIONS
  // ==========================================
  static async getNotifications(req: Request, res: Response) {
    try {
      const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string) || 'current-user';
      const data = await CollaborationService.getNotifications(userId);
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error fetching notifications' });
    }
  }

  static async markNotificationRead(req: Request, res: Response) {
    try {
      const userId = (req.body.userId as string) || (req.headers['x-user-id'] as string) || 'current-user';
      const data = await CollaborationService.markNotificationRead(userId, req.params.id);
      return res.status(200).json({ message: 'Marked as read', data });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Error updating notification' });
    }
  }
}
