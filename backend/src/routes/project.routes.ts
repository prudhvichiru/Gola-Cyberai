import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller.js';

export const projectsRouter = Router();
export const tasksRouter = Router();
export const timersRouter = Router();
export const timesheetsRouter = Router();
export const reportsRouter = Router();

// ==========================================
// PROJECTS ROUTES (/api/projects)
// ==========================================
projectsRouter.get('/', ProjectController.getProjects);
projectsRouter.post('/', ProjectController.createProject);
projectsRouter.get('/:id', ProjectController.getProjectById);
projectsRouter.put('/:id', ProjectController.updateProject);

// ==========================================
// TASKS ROUTES (/api/tasks)
// ==========================================
tasksRouter.get('/', ProjectController.getTasks);
tasksRouter.post('/', ProjectController.createTask);
tasksRouter.put('/:id', ProjectController.updateTask);
tasksRouter.post('/:id/comments', ProjectController.addTaskComment);
tasksRouter.post('/:taskId/checklists/:checklistId/toggle', ProjectController.toggleChecklist);

// ==========================================
// TIMERS ROUTES (/api/timers)
// ==========================================
timersRouter.get('/active', ProjectController.getActiveTimer);
timersRouter.post('/start', ProjectController.startTimer);
timersRouter.post('/pause', ProjectController.pauseTimer);
timersRouter.post('/:timerId/pause', ProjectController.pauseTimer);
timersRouter.post('/resume', ProjectController.resumeTimer);
timersRouter.post('/:timerId/resume', ProjectController.resumeTimer);
timersRouter.post('/stop', ProjectController.stopTimer);
timersRouter.post('/:timerId/stop', ProjectController.stopTimer);

// ==========================================
// TIMESHEETS ROUTES (/api/timesheets)
// ==========================================
timesheetsRouter.get('/my', ProjectController.getMyTimesheets);
timesheetsRouter.post('/:timesheetId/submit', ProjectController.submitTimesheet);
timesheetsRouter.get('/approvals', ProjectController.getTimesheetApprovalQueue);
timesheetsRouter.post('/:timesheetId/review', ProjectController.reviewTimesheet);

// ==========================================
// REPORTS ROUTES (/api/reports)
// ==========================================
reportsRouter.get('/dashboard', ProjectController.getReportsDashboard);
