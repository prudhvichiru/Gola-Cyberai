'use client';

import * as React from 'react';
import {
  Kanban,
  List,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Play,
  MessageSquare,
  CheckSquare,
  AlertCircle,
  Paperclip,
  Calendar,
  MoreVertical,
  User,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { ProjectFrontendService } from '@/services/project.service';
import { TaskItem, TaskStatus, PriorityLevel, ProjectItem } from '@/types/project.types';
import { StatCard } from '@/components/shared/stat-card';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/auth-provider';

const COLUMNS: { id: TaskStatus; label: string; dotColor: string; bgColor: string }[] = [
  { id: 'todo', label: 'To Do', dotColor: 'bg-zinc-400', bgColor: 'bg-zinc-50 dark:bg-zinc-900/40' },
  { id: 'in_progress', label: 'In Progress', dotColor: 'bg-blue-500', bgColor: 'bg-blue-50/30 dark:bg-blue-950/20' },
  { id: 'review', label: 'In Review', dotColor: 'bg-amber-500', bgColor: 'bg-amber-50/30 dark:bg-amber-950/20' },
  { id: 'done', label: 'Completed', dotColor: 'bg-emerald-500', bgColor: 'bg-emerald-50/30 dark:bg-emerald-950/20' },
];

export function TaskKanban({ defaultProjectId }: { defaultProjectId?: string }) {
  const { profile, user } = useAuth();
  const [tasks, setTasks] = React.useState<TaskItem[]>([]);
  const [projects, setProjects] = React.useState<ProjectItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [viewMode, setViewMode] = React.useState<'kanban' | 'list'>('kanban');
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>(defaultProjectId || 'all');
  const [selectedStatus, setSelectedStatus] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [activeTask, setActiveTask] = React.useState<TaskItem | null>(null);
  const [newCommentText, setNewCommentText] = React.useState('');

  // New task form state
  const [formProjectId, setFormProjectId] = React.useState('');
  const [formTitle, setFormTitle] = React.useState('');
  const [formDesc, setFormDesc] = React.useState('');
  const [formPriority, setFormPriority] = React.useState<PriorityLevel>('medium');
  const [formEstimatedHours, setFormEstimatedHours] = React.useState('8');
  const [formDueDate, setFormDueDate] = React.useState('');
  const [newChecklistInput, setNewChecklistInput] = React.useState('');
  const [formChecklists, setFormChecklists] = React.useState<{ id: string; text: string; completed: boolean }[]>([]);
  const [submitting, setSubmitting] = React.useState(false);

  // Timer alert
  const [timerSuccessMsg, setTimerSuccessMsg] = React.useState<string | null>(null);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    const [taskRes, projRes] = await Promise.all([
      ProjectFrontendService.getTasks({
        projectId: selectedProjectId !== 'all' ? selectedProjectId : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        search: searchQuery || undefined,
      }),
      ProjectFrontendService.getProjects(),
    ]);

    if (taskRes.data) setTasks(taskRes.data);
    if (projRes.data) {
      setProjects(projRes.data);
      if (!formProjectId && projRes.data.length > 0) {
        setFormProjectId(projRes.data[0].id);
      }
    }
    setLoading(false);
  }, [selectedProjectId, selectedStatus, searchQuery, formProjectId]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle task status transition
  const handleMoveStatus = async (taskId: string, nextStatus: TaskStatus) => {
    const updatedTasks = tasks.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t));
    setTasks(updatedTasks);
    if (activeTask && activeTask.id === taskId) {
      setActiveTask({ ...activeTask, status: nextStatus });
    }
    await ProjectFrontendService.updateTask(taskId, { status: nextStatus });
  };

  // Checklist toggle
  const handleToggleChecklist = async (taskId: string, checklistId: string) => {
    const res = await ProjectFrontendService.toggleChecklist(taskId, checklistId);
    if (res.data?.data) {
      const updatedTask = res.data.data;
      setTasks(tasks.map((t) => (t.id === taskId ? updatedTask : t)));
      if (activeTask && activeTask.id === taskId) {
        setActiveTask(updatedTask);
      }
    }
  };

  // Add comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTask || !newCommentText.trim()) return;
    const authorName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Team Member';
    const authorId = user?.id || 'current-user';
    const res = await ProjectFrontendService.addTaskComment(activeTask.id, {
      userId: authorId,
      userName: authorName,
      content: newCommentText.trim(),
    });
    if (res.data?.data) {
      const newComment = res.data.data;
      const updatedComments = [...(activeTask.comments || []), newComment];
      const updated = { ...activeTask, comments: updatedComments };
      setActiveTask(updated);
      setTasks(tasks.map((t) => (t.id === activeTask.id ? updated : t)));
      setNewCommentText('');
    }
  };

  // Start timer for task
  const handleStartTimer = async (task: TaskItem) => {
    const res = await ProjectFrontendService.startTimer(task.id, task.project_id);
    if (res.data) {
      setTimerSuccessMsg(`Active timer started for "${task.title}". Ticking live on server!`);
      setTimeout(() => setTimerSuccessMsg(null), 4000);
    } else if (res.error) {
      alert(res.error);
    }
  };

  // Create task handler
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formProjectId) return;
    setSubmitting(true);
    const res = await ProjectFrontendService.createTask({
      project_id: formProjectId,
      title: formTitle,
      description: formDesc,
      priority: formPriority,
      estimated_hours: parseFloat(formEstimatedHours) || 0,
      due_date: formDueDate || null,
      checklists: formChecklists,
      status: 'todo',
    });
    setSubmitting(false);
    if (!res.error) {
      setIsCreateOpen(false);
      setFormTitle('');
      setFormDesc('');
      setFormChecklists([]);
      fetchData();
    }
  };

  const addChecklistItem = () => {
    if (!newChecklistInput.trim()) return;
    setFormChecklists([
      ...formChecklists,
      { id: `chk-${Date.now()}`, text: newChecklistInput.trim(), completed: false },
    ]);
    setNewChecklistInput('');
  };

  const removeChecklistItem = (id: string) => {
    setFormChecklists(formChecklists.filter((c) => c.id !== id));
  };

  const completedCount = tasks.filter((t) => t.status === 'done').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const reviewCount = tasks.filter((t) => t.status === 'review').length;
  const todoCount = tasks.filter((t) => t.status === 'todo').length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {timerSuccessMsg && (
        <div className="p-3 bg-emerald-500 text-white text-sm font-medium rounded-lg shadow-md flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{timerSuccessMsg}</span>
          </div>
          <button onClick={() => setTimerSuccessMsg(null)} className="text-white/80 hover:text-white font-bold">
            ✕
          </button>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="To Do"
          value={todoCount}
          subtitle="Backlog items"
          icon={<Clock className="h-5 w-5 text-zinc-500" />}
        />
        <StatCard
          title="In Progress"
          value={inProgressCount}
          subtitle="Active sprint tasks"
          icon={<Play className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          title="Under Review"
          value={reviewCount}
          subtitle="Pending QA & peer sign-off"
          icon={<AlertCircle className="h-5 w-5 text-amber-600" />}
        />
        <StatCard
          title="Completed"
          value={completedCount}
          subtitle="Shipped and verified"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        />
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex flex-1 flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search tasks, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-zinc-50 dark:bg-zinc-800/50"
            />
          </div>

          {/* Project filter */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-sm font-medium text-zinc-700 dark:text-zinc-200"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.name}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-sm font-medium text-zinc-700 dark:text-zinc-200"
          >
            <option value="all">All Columns</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="review">In Review</option>
            <option value="done">Completed</option>
          </select>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {/* View toggle */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
          </div>

          <Button
            onClick={() => setIsCreateOpen(true)}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-80 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <LoadingSkeleton count={5} />
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          title="No tasks match your filters"
          description="Create a new task to assign deliverables or change the selected project."
          actionLabel="Add Task"
          onAction={() => setIsCreateOpen(true)}
        />
      ) : viewMode === 'kanban' ? (
        /* KANBAN VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                className={`flex flex-col rounded-xl border border-zinc-200 dark:border-zinc-800 ${col.bgColor} p-3.5 min-h-[500px]`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-200/60 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${col.dotColor}`} />
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{col.label}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium">
                      {colTasks.length}
                    </span>
                  </div>
                </div>

                {/* Column Cards */}
                <div className="space-y-3 flex-1">
                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => setActiveTask(task)}
                      className="group cursor-pointer rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs hover:shadow-md hover:border-blue-500/50 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          {task.project?.code || 'PRJ'}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${
                            task.priority === 'urgent'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                              : task.priority === 'high'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                              : task.priority === 'medium'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                          }`}
                        >
                          {task.priority}
                        </span>
                      </div>

                      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {task.title}
                      </h4>

                      {task.description && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      {/* Checklist Summary */}
                      {task.checklists && task.checklists.length > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                          <CheckSquare className="h-3.5 w-3.5" />
                          <span>
                            {task.checklists.filter((c) => c.completed).length}/{task.checklists.length} done
                          </span>
                        </div>
                      )}

                      {/* Card Footer */}
                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {task.recorded_hours || 0}h / {task.estimated_hours || 0}h
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            title="Start Timer for this task"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartTimer(task);
                            }}
                            className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-950 text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            <Play className="h-3.5 w-3.5 fill-current" />
                          </button>
                          {task.comments && task.comments.length > 0 && (
                            <div className="flex items-center gap-0.5 text-zinc-400">
                              <MessageSquare className="h-3 w-3" />
                              <span className="text-[10px]">{task.comments.length}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {colTasks.length === 0 && (
                    <div className="h-24 flex items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-400">
                      Empty column
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Task & Project</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Assignee</th>
                <th className="py-3 px-4">Logged / Est</th>
                <th className="py-3 px-4">Checklist</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  onClick={() => setActiveTask(task)}
                  className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors"
                >
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        {task.project?.code}
                      </span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">{task.title}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <select
                      value={task.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleMoveStatus(task.id, e.target.value as TaskStatus)}
                      className="text-xs font-medium px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="review">In Review</option>
                      <option value="done">Completed</option>
                    </select>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${
                        task.priority === 'urgent'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                          : task.priority === 'high'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                      }`}
                    >
                      {task.priority}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-zinc-600 dark:text-zinc-400">
                    {task.assignee?.full_name || 'Unassigned'}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-zinc-600 dark:text-zinc-400">
                    {task.recorded_hours || 0}h / {task.estimated_hours || 0}h
                  </td>
                  <td className="py-3.5 px-4 text-xs text-zinc-500">
                    {task.checklists && task.checklists.length > 0 ? (
                      <span>
                        {task.checklists.filter((c) => c.completed).length}/{task.checklists.length}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 text-xs text-blue-600 hover:text-blue-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartTimer(task);
                      }}
                    >
                      <Play className="h-3 w-3 fill-current" />
                      Timer
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Task Details Modal */}
      {activeTask && (
        <Dialog open={!!activeTask} onOpenChange={() => setActiveTask(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  {activeTask.project?.code}
                </span>
                <span className="text-xs text-zinc-400">/</span>
                <span className="text-xs text-zinc-500">{activeTask.project?.name}</span>
              </div>
              <DialogTitle className="text-xl font-bold">{activeTask.title}</DialogTitle>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* Status and Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-500">Status:</span>
                  <select
                    value={activeTask.status}
                    onChange={(e) => handleMoveStatus(activeTask.id, e.target.value as TaskStatus)}
                    className="text-xs font-semibold px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">In Review</option>
                    <option value="done">Completed</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleStartTimer(activeTask)}
                    className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
                  >
                    <Play className="h-3 w-3 fill-current" />
                    Start Timer
                  </Button>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Description</h4>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed bg-zinc-50/50 dark:bg-zinc-800/30 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
                  {activeTask.description || 'No detailed instructions provided.'}
                </p>
              </div>

              {/* Key Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <span className="text-zinc-400">Assignee</span>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">
                    {activeTask.assignee?.full_name || 'Unassigned'}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <span className="text-zinc-400">Priority</span>
                  <p className="font-semibold capitalize text-zinc-800 dark:text-zinc-200 mt-0.5">
                    {activeTask.priority}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <span className="text-zinc-400">Time Logged</span>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">
                    {activeTask.recorded_hours || 0}h / {activeTask.estimated_hours || 0}h
                  </p>
                </div>
                <div className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <span className="text-zinc-400">Due Date</span>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">
                    {activeTask.due_date || 'No deadline'}
                  </p>
                </div>
              </div>

              {/* Checklists */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Checklist (
                    {activeTask.checklists?.filter((c) => c.completed).length || 0}/
                    {activeTask.checklists?.length || 0})
                  </h4>
                </div>
                <div className="space-y-1.5">
                  {activeTask.checklists?.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-2.5 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    >
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => handleToggleChecklist(activeTask.id, item.id)}
                        className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span
                        className={`text-sm ${
                          item.completed ? 'line-through text-zinc-400' : 'text-zinc-800 dark:text-zinc-200'
                        }`}
                      >
                        {item.text}
                      </span>
                    </label>
                  ))}
                  {(!activeTask.checklists || activeTask.checklists.length === 0) && (
                    <p className="text-xs text-zinc-400 italic">No checklist items defined.</p>
                  )}
                </div>
              </div>

              {/* Comments & Audit Trail */}
              <div className="space-y-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Activity & Comments ({activeTask.comments?.length || 0})
                </h4>

                <div className="space-y-2.5 max-h-48 overflow-y-auto">
                  {activeTask.comments?.map((comment) => (
                    <div
                      key={comment.id}
                      className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800 space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{comment.user_name}</span>
                        <span className="text-zinc-400">{new Date(comment.created_at).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300">{comment.content}</p>
                    </div>
                  ))}
                </div>

                {/* Add comment form */}
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <Input
                    placeholder="Write a comment or status update..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="text-xs h-9"
                  />
                  <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9">
                    Send
                  </Button>
                </form>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setActiveTask(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Task Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Project Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Target Project *</Label>
              <select
                value={formProjectId}
                onChange={(e) => setFormProjectId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-sm"
                required
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Task Title *</Label>
              <Input
                placeholder="e.g. Implement WebAuthn biometrics passkey authentication"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value as PriorityLevel)}
                  className="w-full h-10 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Estimated Hours</Label>
                <Input
                  type="number"
                  placeholder="8"
                  value={formEstimatedHours}
                  onChange={(e) => setFormEstimatedHours(e.target.value)}
                />
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <textarea
                rows={2}
                placeholder="Technical criteria, deliverables, and acceptance standards..."
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                className="w-full p-2.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Checklist Builder */}
            <div className="space-y-2">
              <Label>Checklists & Subtasks</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add item e.g. Unit tests passing"
                  value={newChecklistInput}
                  onChange={(e) => setNewChecklistInput(e.target.value)}
                  className="text-xs h-9"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addChecklistItem();
                    }
                  }}
                />
                <Button type="button" size="sm" onClick={addChecklistItem} variant="outline" className="text-xs h-9">
                  Add
                </Button>
              </div>

              {formChecklists.length > 0 && (
                <div className="space-y-1 pt-1">
                  {formChecklists.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-xs p-1.5 bg-zinc-50 dark:bg-zinc-800 rounded">
                      <span>• {c.text}</span>
                      <button
                        type="button"
                        onClick={() => removeChecklistItem(c.id)}
                        className="text-zinc-400 hover:text-rose-500"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                {submitting ? 'Creating...' : 'Add Task'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
