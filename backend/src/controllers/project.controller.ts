import { Request, Response } from 'express';
import { ProjectService } from '../services/project.service.js';

export class ProjectController {
  // ==========================================
  // PROJECTS
  // ==========================================
  static async getProjects(req: Request, res: Response) {
    try {
      const { status, search } = req.query;
      const data = await ProjectService.getProjects({
        status: status as string,
        search: search as string,
      });
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error fetching projects' });
    }
  }

  static async getProjectById(req: Request, res: Response) {
    try {
      const data = await ProjectService.getProjectById(req.params.id);
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(404).json({ error: err.message || 'Project not found' });
    }
  }

  static async createProject(req: Request, res: Response) {
    try {
      const data = await ProjectService.createProject(req.body);
      return res.status(201).json({ message: 'Project created successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Error creating project' });
    }
  }

  static async updateProject(req: Request, res: Response) {
    try {
      const data = await ProjectService.updateProject(req.params.id, req.body);
      return res.status(200).json({ message: 'Project updated successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Error updating project' });
    }
  }

  // ==========================================
  // TASKS
  // ==========================================
  static async getTasks(req: Request, res: Response) {
    try {
      const { projectId, status, assignedTo, search } = req.query;
      const data = await ProjectService.getTasks({
        projectId: projectId as string,
        status: status as string,
        assignedTo: assignedTo as string,
        search: search as string,
      });
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error fetching tasks' });
    }
  }

  static async createTask(req: Request, res: Response) {
    try {
      const data = await ProjectService.createTask(req.body);
      return res.status(201).json({ message: 'Task created successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Error creating task' });
    }
  }

  static async updateTask(req: Request, res: Response) {
    try {
      const data = await ProjectService.updateTask(req.params.id, req.body);
      return res.status(200).json({ message: 'Task updated successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Error updating task' });
    }
  }

  static async addTaskComment(req: Request, res: Response) {
    try {
      const requester = (req as any).user;
      const { userId, userName, content } = req.body;
      const data = await ProjectService.addTaskComment(req.params.id, {
        userId: requester?.id || userId || 'user',
        userName: requester?.full_name || userName || 'User',
        content: content || req.body.text || '',
      });
      return res.status(201).json({ message: 'Comment added', data });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Error adding comment' });
    }
  }

  static async toggleChecklist(req: Request, res: Response) {
    try {
      const { taskId, checklistId } = req.params;
      const data = await ProjectService.toggleChecklist(taskId, checklistId);
      return res.status(200).json({ message: 'Checklist toggled', data });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Error toggling checklist' });
    }
  }

  // ==========================================
  // TIMERS (Authoritative server clock)
  // ==========================================
  static async getActiveTimer(req: Request, res: Response) {
    try {
      const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string) || 'current-user';
      const data = await ProjectService.getActiveTimer(userId);
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error fetching active timer' });
    }
  }

  static async startTimer(req: Request, res: Response) {
    try {
      const { userId, taskId, projectId } = req.body;
      const targetUserId = userId || (req.headers['x-user-id'] as string) || 'current-user';
      const data = await ProjectService.startTimer(targetUserId, taskId, projectId);
      return res.status(200).json({ message: 'Timer started', data });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to start timer' });
    }
  }

  static async pauseTimer(req: Request, res: Response) {
    try {
      const { userId } = req.body;
      const targetUserId = userId || (req.headers['x-user-id'] as string) || 'current-user';
      const data = await ProjectService.pauseTimer(targetUserId);
      return res.status(200).json({ message: 'Timer paused', data });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to pause timer' });
    }
  }

  static async resumeTimer(req: Request, res: Response) {
    try {
      const { userId } = req.body;
      const targetUserId = userId || (req.headers['x-user-id'] as string) || 'current-user';
      const data = await ProjectService.resumeTimer(targetUserId);
      return res.status(200).json({ message: 'Timer resumed', data });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to resume timer' });
    }
  }

  static async stopTimer(req: Request, res: Response) {
    try {
      const { userId } = req.body;
      const targetUserId = userId || (req.headers['x-user-id'] as string) || 'current-user';
      const data = await ProjectService.stopTimer(targetUserId);
      return res.status(200).json({ message: 'Timer stopped and time entry logged to timesheet', data });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to stop timer' });
    }
  }

  // ==========================================
  // TIMESHEETS
  // ==========================================
  static async getMyTimesheets(req: Request, res: Response) {
    try {
      const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string) || 'current-user';
      const data = await ProjectService.getMyTimesheets(userId);
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error fetching timesheets' });
    }
  }

  static async submitTimesheet(req: Request, res: Response) {
    try {
      const data = await ProjectService.submitTimesheet(req.params.timesheetId);
      return res.status(200).json({ message: 'Timesheet submitted for approval', data });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to submit timesheet' });
    }
  }

  static async getTimesheetApprovalQueue(req: Request, res: Response) {
    try {
      const data = await ProjectService.getTimesheetApprovalQueue();
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error fetching approval queue' });
    }
  }

  static async reviewTimesheet(req: Request, res: Response) {
    try {
      const { reviewerId, status, reason } = req.body;
      const data = await ProjectService.reviewTimesheet(
        req.params.timesheetId,
        reviewerId || 'emp-1',
        status,
        reason
      );
      return res.status(200).json({ message: `Timesheet ${status} successfully`, data });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to review timesheet' });
    }
  }

  // ==========================================
  // REPORTS DASHBOARD
  // ==========================================
  static async getReportsDashboard(req: Request, res: Response) {
    try {
      const data = await ProjectService.getReportsDashboard();
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error generating reports' });
    }
  }
}
