import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { requireRole } from '../middleware/security.middleware.js';

export const adminRouter = Router();

// Only admin users are authorized for administrative settings and audit logs
adminRouter.use(requireRole(['admin']));

adminRouter.get('/users', AdminController.getUsers);
adminRouter.patch('/users/:id/role', AdminController.updateUserRole);

adminRouter.get('/company', AdminController.getCompanySettings);
adminRouter.put('/company', AdminController.updateCompanySettings);

adminRouter.get('/security/sessions', AdminController.getSecuritySessions);
adminRouter.post('/security/sessions/:id/revoke', AdminController.revokeSession);

adminRouter.get('/audit-logs', AdminController.getAuditLogs);
