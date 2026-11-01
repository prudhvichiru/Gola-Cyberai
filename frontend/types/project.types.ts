export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

export interface ProjectMember {
  id: string;
  user_id: string;
  role: 'lead' | 'contributor' | 'reviewer' | 'viewer';
  user?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string | null;
  };
}

export interface ProjectItem {
  id: string;
  name: string;
  code: string;
  client_id?: string | null;
  owner_id?: string | null;
  status: ProjectStatus;
  priority: PriorityLevel;
  budget: number;
  start_date: string;
  end_date?: string | null;
  progress: number; // 0 - 100
  description?: string | null;
  owner?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  members?: ProjectMember[];
  task_count?: number;
  completed_task_count?: number;
  created_at: string;
  updated_at: string;
}

export interface TaskChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface TaskComment {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
}

export interface TaskItem {
  id: string;
  project_id: string;
  title: string;
  description?: string | null;
  assigned_to?: string | null;
  creator_id?: string | null;
  status: TaskStatus;
  priority: PriorityLevel;
  due_date?: string | null;
  estimated_hours: number;
  recorded_hours: number;
  checklists: TaskChecklistItem[];
  comments: TaskComment[];
  project?: {
    id: string;
    name: string;
    code: string;
  } | null;
  assignee?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string | null;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface TaskTimer {
  id: string;
  user_id: string;
  task_id: string;
  project_id: string;
  start_time: string;
  paused_time?: string | null;
  accumulated_seconds: number;
  status: 'running' | 'paused' | 'stopped';
  description?: string | null;
  task?: {
    id: string;
    title: string;
  };
  project?: {
    id: string;
    name: string;
    code: string;
  };
}

export interface TimesheetEntry {
  id: string;
  timesheet_id: string;
  user_id: string;
  project_id: string;
  task_id?: string | null;
  date: string; // YYYY-MM-DD
  hours: number;
  description?: string | null;
  project?: { name: string; code: string };
  task?: { title: string };
}

export interface TimesheetRecord {
  id: string;
  user_id: string;
  week_start_date: string;
  week_end_date: string;
  total_hours: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  entries: TimesheetEntry[];
  user?: {
    id: string;
    full_name: string;
    email: string;
    department?: { name: string };
  };
  created_at: string;
  updated_at: string;
}

export interface ReportsSummary {
  net_attendance_hours: number;
  total_break_hours: number;
  total_project_hours: number;
  total_task_hours: number;
  estimated_vs_recorded: {
    estimated_total: number;
    recorded_total: number;
    variance_percentage: number;
  };
  overdue_tasks_count: number;
  pending_timesheets_count: number;
  active_projects_count: number;
  completed_projects_count: number;
  project_progress_distribution: Array<{
    name: string;
    code: string;
    progress: number;
    status: ProjectStatus;
    total_hours: number;
  }>;
}
