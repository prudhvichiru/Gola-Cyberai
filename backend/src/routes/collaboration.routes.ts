import { Router } from 'express';
import { CollaborationController } from '../controllers/collaboration.controller.js';

export const collaborationRouter = Router();

// Conversations & Channels
collaborationRouter.get('/conversations', CollaborationController.getConversations);
collaborationRouter.post('/conversations', CollaborationController.createConversation);
collaborationRouter.get('/conversations/:id', CollaborationController.getConversationById);

// Messages, Replies & Reactions
collaborationRouter.get('/conversations/:id/messages', CollaborationController.getMessages);
collaborationRouter.post('/conversations/:id/messages', CollaborationController.sendMessage);
collaborationRouter.post('/conversations/:id/messages/:messageId/reactions', CollaborationController.addReaction);

// Meetings & Calendar
collaborationRouter.get('/meetings', CollaborationController.getMeetings);
collaborationRouter.post('/meetings', CollaborationController.createMeeting);
collaborationRouter.post('/meetings/:id/respond', CollaborationController.respondToMeeting);

// Notifications Center
collaborationRouter.get('/notifications', CollaborationController.getNotifications);
collaborationRouter.post('/notifications/:id/read', CollaborationController.markNotificationRead);
