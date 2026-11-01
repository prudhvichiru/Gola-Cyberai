import { Router } from 'express';
import { ClientController } from '../controllers/client.controller.js';
import { requireRole } from '../middleware/security.middleware.js';

export const clientRouter = Router();

// Viewing clients is authorized for project managers, managers, sales/leads, and admins
clientRouter.get('/', ClientController.getClients);
clientRouter.get('/:id', ClientController.getClientById);

// Creating & updating clients requires manager or admin privilege
clientRouter.post('/', requireRole(['admin', 'manager']), ClientController.createClient);
clientRouter.put('/:id', requireRole(['admin', 'manager']), ClientController.updateClient);
clientRouter.patch('/:id', requireRole(['admin', 'manager']), ClientController.updateClient);
