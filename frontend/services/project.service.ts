import { fetchApi } from './api';
import {
  ProjectItem,
  TaskItem,
  TaskTimer,
  TimesheetRecord,
  ReportsSummary,
} from '@/types/project.types';

export class ProjectFrontendService {
  // ==========================================
  // PROJECTS
  // ==========================================
  static async getProjects(params?: { status?: string; search?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);

    const qs = searchParams.toString();
    return fetchApi<ProjectItem[]>(`/projects${qs ? `?${qs}` : ''}`);
  }

  static async getProjectById(id: string) {
    return fetchApi<ProjectItem>(`/projects/${id}`);
  }

  static async createProject(payload: Partial<ProjectItem>) {
    return fetchApi<{ message: string; data: ProjectItem }>('/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  static async updateProject(id: string, payload: Partial<ProjectItem>) {
    return fetchApi<{ message: string; data: ProjectItem }>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  // ==========================================
  // TASKS
  // ==========================================
  static async getTasks(params?: {
    projectId?: string;
    status?: string;
    assignedTo?: string;
    search?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.projectId) searchParams.set('projectId', params.projectId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.assignedTo) searchParams.set('assignedTo', params.assignedTo);
    if (params?.search) searchParams.set('search', params.search);

    const qs = searchParams.toString();
    return fetchApi<TaskItem[]>(`/tasks${qs ? `?${qs}` : ''}`);
  }

  static async createTask(payload: Partial<TaskItem>) {
    return fetchApi<{ message: string; data: TaskItem }>('/tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  static async updateTask(id: string, payload: Partial<TaskItem>) {
    return fetchApi<{ message: string; data: TaskItem }>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  static async addTaskComment(taskId: string, comment: { userId?: string; userName?: string; content: string }) {
    return fetchApi<{ message: string; data: any }>(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify(comment),
    });
  }

  static async toggleChecklist(taskId: string, checklistId: string) {
    return fetchApi<{ message: string; data: TaskItem }>(`/tasks/${taskId}/checklists/${checklistId}/toggle`, {
      method: 'POST',
    });
  }

  // ==========================================
  // TIMERS
  // ==========================================
  static async getActiveTimer(userId = 'current-user') {
    return fetchApi<TaskTimer | null>(`/timers/active?userId=${userId}`);
  }

  static async startTimer(taskId: string, projectId: string, userId = 'current-user') {
    return fetchApi<{ message: string; data: TaskTimer }>('/timers/start', {
      method: 'POST',
      body: JSON.stringify({ userId, taskId, projectId }),
    });
  }

  static async pauseTimer(userId = 'current-user') {
    return fetchApi<{ message: string; data: TaskTimer }>('/timers/active/pause', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  static async resumeTimer(userId = 'current-user') {
    return fetchApi<{ message: string; data: TaskTimer }>('/timers/active/resume', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  static async stopTimer(userId = 'current-user') {
    return fetchApi<{ message: string; data: any }>('/timers/active/stop', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  // ==========================================
  // TIMESHEETS
  // ==========================================
  static async getMyTimesheets(userId = 'current-user') {
    return fetchApi<TimesheetRecord[]>(`/timesheets/my?userId=${userId}`);
  }

  static async submitTimesheet(timesheetId: string) {
    return fetchApi<{ message: string; data: TimesheetRecord }>(`/timesheets/${timesheetId}/submit`, {
      method: 'POST',
    });
  }

  static async getTimesheetApprovalQueue() {
    return fetchApi<TimesheetRecord[]>('/timesheets/approvals');
  }

  static async reviewTimesheet(
    timesheetId: string,
    status: 'approved' | 'rejected',
    reason?: string,
    reviewerId = 'emp-1'
  ) {
    return fetchApi<{ message: string; data: TimesheetRecord }>(`/timesheets/${timesheetId}/review`, {
      method: 'POST',
      body: JSON.stringify({ reviewerId, status, reason }),
    });
  }

  // ==========================================
  // REPORTS
  // ==========================================
  static async getReportsDashboard() {
    return fetchApi<ReportsSummary>('/reports/dashboard');
  }
}
