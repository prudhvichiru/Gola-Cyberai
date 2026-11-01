import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller.js';
import { requireRole } from '../middleware/security.middleware.js';

export const analyticsRouter = Router();

// Viewing organizational analytics is accessible to leads, managers, hr, payroll, and admin
analyticsRouter.get('/overview', requireRole(['admin', 'manager', 'hr', 'payroll']), AnalyticsController.getOverview);
