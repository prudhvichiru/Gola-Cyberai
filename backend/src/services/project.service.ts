import { supabaseAdmin } from '../config/supabase.js';
const supabase = supabaseAdmin;

// Real in-memory stores for runtime data
const PROJECTS_STORE: any[] = [];
const TASKS_STORE: any[] = [];

// Active Task Timers in-memory registry (persists across reloads)
const activeTimers = new Map<string, any>();

export class ProjectService {
  // ==========================================
  // PROJECTS
  // ==========================================
  static async getProjects(filters?: { status?: string; search?: string }) {
    let list = [...PROJECTS_STORE];
    if (filters?.status && filters.status !== 'all') {
      list = list.filter((p) => p.status === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
    }
    return list;
  }

  static async getProjectById(id: string) {
    const proj = PROJECTS_STORE.find((p) => p.id === id);
    if (!proj) throw new Error('Project not found');
    const tasks = TASKS_STORE.filter((t) => t.project_id === id);
    return { ...proj, tasks };
  }

  static async createProject(data: any) {
    const membersList = (data.members && Array.isArray(data.members))
      ? data.members
      : (data.assigned_employee_ids && Array.isArray(data.assigned_employee_ids))
      ? data.assigned_employee_ids.map((empId: string, idx: number) => ({
          id: `pm-${Date.now()}-${idx}`,
          user_id: empId,
          role: idx === 0 ? 'lead' : 'contributor',
          user: {
            id: empId,
            full_name: data.assigned_employee_names?.[empId] || data.members_details?.[empId]?.full_name || 'Assigned Member',
            email: data.members_details?.[empId]?.email || '',
          },
        }))
      : [];

    const newProj = {
      id: `proj-${Date.now()}`,
      name: data.name,
      code: data.code || `PRJ-${Math.floor(100 + Math.random() * 900)}`,
      client_id: data.client_id || null,
      owner_id: data.owner_id || null,
      status: data.status || 'active',
      priority: data.priority || 'medium',
      budget: data.budget ? parseFloat(data.budget) : 0,
      start_date: data.start_date || new Date().toISOString().split('T')[0],
      end_date: data.end_date || null,
      progress: data.progress !== undefined ? data.progress : 0,
      description: data.description || '',
      owner: data.owner_id ? { id: data.owner_id, full_name: data.owner_name || 'Owner', email: '' } : null,
      members: membersList,
      task_count: 0,
      completed_task_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    PROJECTS_STORE.unshift(newProj);
    return newProj;
  }

  static async updateProject(id: string, updates: any) {
    const idx = PROJECTS_STORE.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Project not found');

    if (updates.assigned_employee_ids && Array.isArray(updates.assigned_employee_ids)) {
      updates.members = updates.assigned_employee_ids.map((empId: string, idx: number) => ({
        id: `pm-${Date.now()}-${idx}`,
        user_id: empId,
        role: idx === 0 ? 'lead' : 'contributor',
        user: {
          id: empId,
          full_name: updates.assigned_employee_names?.[empId] || updates.members_details?.[empId]?.full_name || 'Assigned Member',
          email: updates.members_details?.[empId]?.email || '',
        },
      }));
    }

    const updated = { ...PROJECTS_STORE[idx], ...updates, updated_at: new Date().toISOString() };
    PROJECTS_STORE[idx] = updated;
    return updated;
  }

  // ==========================================
  // TASKS & KANBAN
  // ==========================================
  static async getTasks(filters?: { projectId?: string; status?: string; assignedTo?: string; search?: string }) {
    let list = [...TASKS_STORE];
    if (filters?.projectId && filters.projectId !== 'all') {
      list = list.filter((t) => t.project_id === filters.projectId);
    }
    if (filters?.status && filters.status !== 'all') {
      list = list.filter((t) => t.status === filters.status);
    }
    if (filters?.assignedTo && filters.assignedTo !== 'all') {
      list = list.filter((t) => t.assigned_to === filters.assignedTo);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q));
    }
    return list;
  }

  static async createTask(data: any) {
    const proj = PROJECTS_STORE.find((p) => p.id === data.project_id);
    const newTask = {
      id: `task-${Date.now()}`,
      project_id: data.project_id || (proj ? proj.id : null),
      title: data.title,
      description: data.description || '',
      assigned_to: data.assigned_to || null,
      creator_id: data.creator_id || null,
      status: data.status || 'todo',
      priority: data.priority || 'medium',
      due_date: data.due_date || null,
      estimated_hours: data.estimated_hours ? parseFloat(data.estimated_hours) : 0,
      recorded_hours: 0,
      checklists: data.checklists || [],
      comments: [],
      project: proj ? { id: proj.id, name: proj.name, code: proj.code } : null,
      assignee: data.assigned_to ? { id: data.assigned_to, full_name: data.assignee_name || 'Assigned Member', email: '' } : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    TASKS_STORE.unshift(newTask);
    if (proj) {
      proj.task_count = (proj.task_count || 0) + 1;
    }
    return newTask;
  }

  static async updateTask(id: string, updates: any) {
    const idx = TASKS_STORE.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('Task not found');
    const updated = { ...TASKS_STORE[idx], ...updates, updated_at: new Date().toISOString() };
    TASKS_STORE[idx] = updated;

    // Recalculate project progress if status changed
    const proj = PROJECTS_STORE.find((p) => p.id === updated.project_id);
    if (proj) {
      const pTasks = TASKS_STORE.filter((t) => t.project_id === proj.id);
      const completed = pTasks.filter((t) => t.status === 'done').length;
      proj.completed_task_count = completed;
      proj.progress = pTasks.length > 0 ? Math.round((completed / pTasks.length) * 100) : 0;
    }
    return updated;
  }

  static async addTaskComment(taskId: string, comment: { userId: string; userName: string; content: string }) {
    const task = TASKS_STORE.find((t) => t.id === taskId);
    if (!task) throw new Error('Task not found');
    const newComment = {
      id: `cm-${Date.now()}`,
      user_id: comment.userId,
      user_name: comment.userName,
      content: comment.content,
      created_at: new Date().toISOString(),
    };
    task.comments.push(newComment);
    return newComment;
  }

  static async toggleChecklist(taskId: string, checklistId: string) {
    const task = TASKS_STORE.find((t) => t.id === taskId);
    if (!task) throw new Error('Task not found');
    const item = task.checklists.find((c: any) => c.id === checklistId);
    if (item) {
      item.completed = !item.completed;
    }
    return task;
  }

  // ==========================================
  // LIVE TASK TIMERS (Server Clock Authority)
  // ==========================================
  static async getActiveTimer(userId: string) {
    const timer = activeTimers.get(userId) || null;
    return timer;
  }

  static async startTimer(userId: string, taskId: string, projectId: string) {
    // Prevent conflicting concurrent timers:
    const existing = activeTimers.get(userId);
    if (existing && existing.status === 'running') {
      throw new Error(`Timer already active for task "${existing.task?.title}". Please stop or pause it before starting another.`);
    }

    const task = TASKS_STORE.find((t) => t.id === taskId);
    const project = PROJECTS_STORE.find((p) => p.id === projectId);

    const now = new Date().toISOString();
    const newTimer = {
      id: `timer-${Date.now()}`,
      user_id: userId,
      task_id: taskId,
      project_id: projectId,
      start_time: now,
      paused_time: null,
      accumulated_seconds: existing ? existing.accumulated_seconds : 0,
      status: 'running',
      task: { id: taskId, title: task?.title || 'Active Task' },
      project: { id: projectId, name: project?.name || 'Project', code: project?.code || 'PRJ' },
    };

    activeTimers.set(userId, newTimer);
    return newTimer;
  }

  static async pauseTimer(userId: string) {
    const timer = activeTimers.get(userId);
    if (!timer || timer.status !== 'running') {
      throw new Error('No active running timer found to pause.');
    }

    const now = new Date();
    const start = new Date(timer.start_time);
    const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000);

    timer.accumulated_seconds = (timer.accumulated_seconds || 0) + elapsed;
    timer.status = 'paused';
    timer.paused_time = now.toISOString();

    activeTimers.set(userId, timer);
    return timer;
  }

  static async resumeTimer(userId: string) {
    const timer = activeTimers.get(userId);
    if (!timer || timer.status !== 'paused') {
      throw new Error('No paused timer found to resume.');
    }

    const now = new Date().toISOString();
    timer.start_time = now;
    timer.paused_time = null;
    timer.status = 'running';

    activeTimers.set(userId, timer);
    return timer;
  }

  static async stopTimer(userId: string) {
    const timer = activeTimers.get(userId);
    if (!timer) {
      throw new Error('No active timer to stop.');
    }

    const now = new Date();
    let totalSec = timer.accumulated_seconds || 0;
    if (timer.status === 'running') {
      const start = new Date(timer.start_time);
      totalSec += Math.floor((now.getTime() - start.getTime()) / 1000);
    }

    const recordedHours = parseFloat((totalSec / 3600).toFixed(2));

    // Update task recorded hours
    const task = TASKS_STORE.find((t) => t.id === timer.task_id);
    if (task) {
      task.recorded_hours = parseFloat(((task.recorded_hours || 0) + recordedHours).toFixed(2));
    }

    // Auto-create or append timesheet entry in Supabase
    const today = now.toISOString().split('T')[0];
    // Get monday of current week as week_start
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    // Upsert timesheet for this week
    const { data: ts } = await supabaseAdmin
      .from('timesheets')
      .upsert(
        { user_id: userId, week_start_date: weekStartStr, week_end_date: weekEndStr, status: 'draft' },
        { onConflict: 'user_id,week_start_date', ignoreDuplicates: false }
      )
      .select()
      .single();

    if (ts) {
      // Insert timesheet entry
      await supabaseAdmin.from('timesheet_entries').insert({
        timesheet_id: ts.id,
        user_id: userId,
        project_id: timer.project_id,
        task_id: timer.task_id || null,
        date: today,
        hours: recordedHours,
        description: `Timer logged: ${task?.title || 'Development work'}`,
      });
      // Update total_hours on timesheet
      await supabaseAdmin
        .from('timesheets')
        .update({ total_hours: (ts.total_hours || 0) + recordedHours, updated_at: new Date().toISOString() })
        .eq('id', ts.id);
    }

    activeTimers.delete(userId);
    return {
      stoppedTimer: timer,
      totalSeconds: totalSec,
      recordedHours,
    };
  }

  // ==========================================
  // TIMESHEETS
  // ==========================================
  static async getMyTimesheets(userId: string) {
    const { data, error } = await supabaseAdmin
      .from('timesheets')
      .select('*, entries:timesheet_entries(*)')
      .eq('user_id', userId)
      .order('week_start_date', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }

  static async submitTimesheet(timesheetId: string) {
    const { data, error } = await supabaseAdmin
      .from('timesheets')
      .update({ status: 'submitted', updated_at: new Date().toISOString() })
      .eq('id', timesheetId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Timesheet not found');
    return data;
  }

  static async getTimesheetApprovalQueue() {
    const { data, error } = await supabaseAdmin
      .from('timesheets')
      .select('*, user:profiles!timesheets_user_id_fkey(id, full_name, email), entries:timesheet_entries(*)')
      .eq('status', 'submitted')
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
  }

  static async reviewTimesheet(timesheetId: string, reviewerId: string, status: 'approved' | 'rejected', reason?: string) {
    const { data, error } = await supabaseAdmin
      .from('timesheets')
      .update({
        status,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        ...(reason ? { rejection_reason: reason } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', timesheetId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Timesheet not found');
    return data;
  }

  // ==========================================
  // REPORTS DASHBOARD
  // ==========================================
  static async getReportsDashboard() {
    const totalRecordedHours = TASKS_STORE.reduce((acc, t) => acc + (t.recorded_hours || 0), 0);
    const totalEstimatedHours = TASKS_STORE.reduce((acc, t) => acc + (t.estimated_hours || 0), 0);
    const variance = totalEstimatedHours > 0 ? Math.round((totalRecordedHours / totalEstimatedHours) * 100) : 0;
    const now = new Date().toISOString().split('T')[0];
    const overdueTasks = TASKS_STORE.filter((t) => t.status !== 'done' && t.due_date && t.due_date < now).length;

    return {
      net_attendance_hours: totalRecordedHours,
      total_break_hours: 0,
      total_project_hours: totalRecordedHours,
      total_task_hours: totalRecordedHours,
      estimated_vs_recorded: {
        estimated_total: totalEstimatedHours,
        recorded_total: totalRecordedHours,
        variance_percentage: variance,
      },
      overdue_tasks_count: overdueTasks,
      pending_timesheets_count: 0,
      active_projects_count: PROJECTS_STORE.filter((p) => p.status === 'active').length,
      completed_projects_count: PROJECTS_STORE.filter((p) => p.status === 'completed').length,
      project_progress_distribution: PROJECTS_STORE.map((p) => ({
        name: p.name,
        code: p.code,
        progress: p.progress,
        status: p.status,
        total_hours: TASKS_STORE.filter((t) => t.project_id === p.id).reduce((sum, t) => sum + (t.recorded_hours || 0), 0),
      })),
    };
  }
}
