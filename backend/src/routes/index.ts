import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { profileRouter } from './profile.routes.js';
import { departmentRouter } from './department.routes.js';
import { dashboardRouter } from './dashboard.routes.js';
import { attendanceRouter } from './attendance.routes.js';
import { hrRouter } from './hr.routes.js';
import {
  projectsRouter,
  tasksRouter,
  timersRouter,
  timesheetsRouter,
  reportsRouter,
} from './project.routes.js';
import { collaborationRouter } from './collaboration.routes.js';
import { clientRouter } from './client.routes.js';
import { analyticsRouter } from './analytics.routes.js';
import { adminRouter } from './admin.routes.js';

export const apiRouter = Router();

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount modular sub-routes
apiRouter.use('/auth', authRouter);
apiRouter.use('/profile', profileRouter);
apiRouter.use('/departments', departmentRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/attendance', attendanceRouter);
apiRouter.use('/hr', hrRouter);
apiRouter.use('/projects', projectsRouter);
apiRouter.use('/tasks', tasksRouter);
apiRouter.use('/timers', timersRouter);
apiRouter.use('/timesheets', timesheetsRouter);
apiRouter.use('/reports', reportsRouter);
apiRouter.use('/collaboration', collaborationRouter);
apiRouter.use('/clients', clientRouter);
apiRouter.use('/analytics', analyticsRouter);
apiRouter.use('/admin', adminRouter);

