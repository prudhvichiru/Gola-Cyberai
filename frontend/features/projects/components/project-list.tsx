'use client';

import * as React from 'react';
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  Briefcase,
  AlertCircle,
  MoreVertical,
  ArrowUpRight,
  Edit2,
  UserCheck,
} from 'lucide-react';
import { ProjectFrontendService } from '@/services/project.service';
import { HRClientService } from '@/services/hr.service';
import { ProjectItem, ProjectStatus, PriorityLevel } from '@/types/project.types';
import { StatCard } from '@/components/shared/stat-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export function ProjectList() {
  const [projects, setProjects] = React.useState<ProjectItem[]>([]);
  const [employees, setEmployees] = React.useState<{ id: string; full_name: string; email: string }[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingProject, setEditingProject] = React.useState<ProjectItem | null>(null);
  const [selectedProject, setSelectedProject] = React.useState<ProjectItem | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // New project form state
  const [formData, setFormData] = React.useState({
    name: '',
    code: '',
    priority: 'medium' as PriorityLevel,
    budget: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    description: '',
    assigned_employee_ids: [] as string[],
  });

  // Edit project form state
  const [editFormData, setEditFormData] = React.useState({
    name: '',
    code: '',
    status: 'active' as ProjectStatus,
    priority: 'medium' as PriorityLevel,
    budget: '',
    progress: 0,
    start_date: '',
    end_date: '',
    description: '',
    assigned_employee_ids: [] as string[],
  });

  const fetchProjects = React.useCallback(async () => {
    setLoading(true);
    const res = await ProjectFrontendService.getProjects({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      search: searchQuery || undefined,
    });
    if (res.data) {
      setProjects(res.data);
    }
    setLoading(false);
  }, [statusFilter, searchQuery]);

  React.useEffect(() => {
    fetchProjects();
    async function loadEmps() {
      try {
        const emps = await HRClientService.getEmployees();
        if (emps && emps.length > 0) {
          setEmployees(emps.map((e) => ({ id: e.id, full_name: e.full_name, email: e.email })));
        }
      } catch (err) {
        console.error('Failed to load employees for project assignment:', err);
      }
    }
    loadEmps();
  }, [fetchProjects]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    setSubmitting(true);

    const nameMap: Record<string, string> = {};
    employees.forEach((emp) => {
      nameMap[emp.id] = emp.full_name;
    });

    const res = await ProjectFrontendService.createProject({
      name: formData.name,
      code: formData.code || `PRJ-${Math.floor(100 + Math.random() * 900)}`,
      priority: formData.priority,
      budget: formData.budget ? parseFloat(formData.budget) : 0,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      description: formData.description,
      status: 'active',
      assigned_employee_ids: formData.assigned_employee_ids,
      assigned_employee_names: nameMap,
    } as any);

    setSubmitting(false);
    if (!res.error) {
      setIsCreateOpen(false);
      setFormData({
        name: '',
        code: '',
        priority: 'medium',
        budget: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        description: '',
        assigned_employee_ids: ['emp-1'],
      });
      fetchProjects();
    }
  };

  const openEditModal = (proj: ProjectItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingProject(proj);
    const currentMemberIds = proj.members ? proj.members.map((m) => m.user_id) : [];
    setEditFormData({
      name: proj.name,
      code: proj.code,
      status: proj.status,
      priority: proj.priority,
      budget: proj.budget ? proj.budget.toString() : '',
      progress: proj.progress || 0,
      start_date: proj.start_date || '',
      end_date: proj.end_date || '',
      description: proj.description || '',
      assigned_employee_ids: currentMemberIds.length > 0 ? currentMemberIds : ['emp-1'],
    });
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editFormData.name) return;
    setSubmitting(true);

    const nameMap: Record<string, string> = {};
    employees.forEach((emp) => {
      nameMap[emp.id] = emp.full_name;
    });

    const res = await ProjectFrontendService.updateProject(editingProject.id, {
      name: editFormData.name,
      code: editFormData.code,
      status: editFormData.status,
      priority: editFormData.priority,
      budget: editFormData.budget ? parseFloat(editFormData.budget) : 0,
      progress: Number(editFormData.progress),
      start_date: editFormData.start_date,
      end_date: editFormData.end_date || null,
      description: editFormData.description,
      assigned_employee_ids: editFormData.assigned_employee_ids,
      assigned_employee_names: nameMap,
    } as any);

    setSubmitting(false);
    if (!res.error) {
      setEditingProject(null);
      fetchProjects();
    }
  };

  const toggleCreateMember = (empId: string) => {
    setFormData((prev) => {
      const exists = prev.assigned_employee_ids.includes(empId);
      return {
        ...prev,
        assigned_employee_ids: exists
          ? prev.assigned_employee_ids.filter((id) => id !== empId)
          : [...prev.assigned_employee_ids, empId],
      };
    });
  };

  const toggleEditMember = (empId: string) => {
    setEditFormData((prev) => {
      const exists = prev.assigned_employee_ids.includes(empId);
      return {
        ...prev,
        assigned_employee_ids: exists
          ? prev.assigned_employee_ids.filter((id) => id !== empId)
          : [...prev.assigned_employee_ids, empId],
      };
    });
  };

  const activeCount = projects.filter((p) => p.status === 'active').length;
  const completedCount = projects.filter((p) => p.status === 'completed').length;
  const totalTasks = projects.reduce((acc, p) => acc + (p.task_count || 0), 0);
  const avgProgress =
    projects.length > 0
      ? Math.round(projects.reduce((acc, p) => acc + (p.progress || 0), 0) / projects.length)
      : 0;

  return (
    <div className="space-y-6">
      {/* Metric Cards Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Projects"
          value={projects.length}
          hint={`${activeCount} active in delivery`}
          icon={<FolderKanban className="h-5 w-5" />}
          tone="primary"
        />
        <StatCard
          label="Active Deliverables"
          value={activeCount}
          hint="Across all engineering squads"
          icon={<Clock className="h-5 w-5" />}
          tone="info"
        />
        <StatCard
          label="Sprint Tasks"
          value={totalTasks}
          hint="Tracked on Kanban boards"
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Avg Pipeline Velocity"
          value={`${avgProgress}%`}
          hint={`${completedCount} projects finalized`}
          icon={<Users className="h-5 w-5" />}
          tone="accent"
        />
      </div>

      {/* Action and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects by code or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card"
            />
          </div>

          <div className="flex items-center gap-1.5 border border-border bg-card p-1 rounded-lg">
            {['all', 'active', 'planning', 'completed'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          className="gap-2 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>New Project</span>
        </Button>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 p-5 rounded-xl border border-border bg-card">
              <LoadingSkeleton count={4} />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects found"
          description="Create your first project or adjust your search filter to see active deliverables."
          action={{
            label: 'Create Project',
            onClick: () => setIsCreateOpen(true),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((proj) => (
            <div
              key={proj.id}
              onClick={() => setSelectedProject(proj)}
              className="group cursor-pointer rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md hover:border-primary/50 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      {proj.code}
                    </span>
                    <h3 className="text-base font-semibold text-foreground mt-2 group-hover:text-primary transition-colors">
                      {proj.name}
                    </h3>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                      proj.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        : proj.status === 'planning'
                        ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {proj.status.replace('_', ' ')}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2">
                  {proj.description || 'Enterprise project delivery pipeline with continuous telemetry.'}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-border space-y-3">
                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="text-foreground font-semibold">{proj.progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        proj.progress >= 70
                          ? 'bg-emerald-500'
                          : proj.progress >= 40
                          ? 'bg-primary'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${proj.progress}%` }}
                    />
                  </div>
                </div>

                {/* Meta details */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5" />
                    <span>{proj.completed_task_count || 0}/{proj.task_count || 0} Tasks</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{proj.end_date ? new Date(proj.end_date).toLocaleDateString() : 'Ongoing'}</span>
                  </div>
                </div>

                {/* Team members & Edit Action */}
                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  <div className="flex items-center gap-1.5">
                    {proj.members && proj.members.length > 0 ? (
                      <div className="flex -space-x-2">
                        {proj.members.slice(0, 3).map((m, idx) => (
                          <div
                            key={idx}
                            title={m.user?.full_name}
                            className="h-6 w-6 rounded-full border-2 border-card bg-primary text-primary-foreground font-bold text-[10px] flex items-center justify-center uppercase shadow-sm"
                          >
                            {m.user?.full_name?.charAt(0) || 'E'}
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {(proj.members?.length || 0)} Assigned
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => openEditModal(proj, e)}
                    className="h-7 px-2.5 text-xs gap-1 border-border hover:bg-muted"
                  >
                    <Edit2 className="h-3 w-3 text-muted-foreground" />
                    <span>Edit</span>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateProject} className="space-y-3 py-1">
            <div>
              <Label className="text-xs">Project Name *</Label>
              <Input
                required
                placeholder="e.g. Zero Trust Network Migration"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Project Code</Label>
                <Input
                  placeholder="e.g. ZTN-2026"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="mt-1 h-9 text-xs font-mono uppercase"
                />
              </div>
              <div>
                <Label className="text-xs">Priority</Label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as PriorityLevel })}
                  className="mt-1 h-9 w-full rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Assign Employees Multi-Select */}
            <div>
              <Label className="text-xs font-semibold">Assign Team Members (Employees) *</Label>
              <p className="text-[11px] text-muted-foreground mb-1">Select personnel assigned to this project.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-28 overflow-y-auto p-2 border border-border rounded-lg bg-muted/20">
                {employees.map((emp) => {
                  const isChecked = formData.assigned_employee_ids.includes(emp.id);
                  return (
                    <label
                      key={emp.id}
                      className={`flex items-center gap-2 p-1 rounded cursor-pointer text-xs transition-colors ${
                        isChecked ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCreateMember(emp.id)}
                        className="rounded border-border text-primary"
                      />
                      <span className="truncate">{emp.full_name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Start Date</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Target End Date</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Budget (₹ INR)</Label>
              <Input
                type="number"
                placeholder="e.g. 1500000"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                className="mt-1 h-9 text-xs font-mono"
              />
            </div>

            <div>
              <Label className="text-xs">Description</Label>
              <textarea
                rows={2}
                placeholder="Scope, objectives, deliverables..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 w-full rounded-md border border-border bg-card p-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Project'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      {editingProject && (
        <Dialog open={!!editingProject} onOpenChange={() => setEditingProject(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Project Details</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleUpdateProject} className="space-y-3 py-1">
              <div>
                <Label className="text-xs">Project Name *</Label>
                <Input
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Code</Label>
                  <Input
                    value={editFormData.code}
                    onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value })}
                    className="mt-1 h-9 text-xs font-mono uppercase"
                  />
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as ProjectStatus })}
                    className="mt-1 h-9 w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary capitalize"
                  >
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Priority</Label>
                  <select
                    value={editFormData.priority}
                    onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value as PriorityLevel })}
                    className="mt-1 h-9 w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary capitalize"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Edit Assigned Employees */}
              <div>
                <Label className="text-xs font-semibold">Assigned Team Members (Employees)</Label>
                <p className="text-[11px] text-muted-foreground mb-1">Manage which personnel are assigned to this project.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-28 overflow-y-auto p-2 border border-border rounded-lg bg-muted/20">
                  {employees.map((emp) => {
                    const isChecked = editFormData.assigned_employee_ids.includes(emp.id);
                    return (
                      <label
                        key={emp.id}
                        className={`flex items-center gap-2 p-1 rounded cursor-pointer text-xs transition-colors ${
                          isChecked ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleEditMember(emp.id)}
                          className="rounded border-border text-primary"
                        />
                        <span className="truncate">{emp.full_name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Progress (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={editFormData.progress}
                    onChange={(e) => setEditFormData({ ...editFormData, progress: Number(e.target.value) })}
                    className="mt-1 h-9 text-xs font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs">Budget (₹ INR)</Label>
                  <Input
                    type="number"
                    value={editFormData.budget}
                    onChange={(e) => setEditFormData({ ...editFormData, budget: e.target.value })}
                    className="mt-1 h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Start Date</Label>
                  <Input
                    type="date"
                    value={editFormData.start_date}
                    onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Target End Date</Label>
                  <Input
                    type="date"
                    value={editFormData.end_date}
                    onChange={(e) => setEditFormData({ ...editFormData, end_date: e.target.value })}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Description</Label>
                <textarea
                  rows={2}
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-card p-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingProject(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Project Details Dialog */}
      {selectedProject && (
        <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    {selectedProject.code}
                  </span>
                  <DialogTitle>{selectedProject.name}</DialogTitle>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => openEditModal(selectedProject, e)}
                  className="gap-1.5 text-xs"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </Button>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                {selectedProject.description || 'No description provided.'}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-muted/40 rounded-lg text-xs">
                <div>
                  <span className="text-muted-foreground">Owner</span>
                  <p className="font-semibold text-foreground mt-0.5">
                    {selectedProject.owner?.full_name || 'Unassigned'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Priority</span>
                  <p className="font-semibold capitalize text-foreground mt-0.5">
                    {selectedProject.priority}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Budget</span>
                  <p className="font-semibold text-foreground mt-0.5">
                    ₹{selectedProject.budget?.toLocaleString() || '0'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Start Date</span>
                  <p className="font-semibold text-foreground mt-0.5">
                    {selectedProject.start_date}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Target Delivery</span>
                  <p className="font-semibold text-foreground mt-0.5">
                    {selectedProject.end_date || 'TBD'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Task Completion</span>
                  <p className="font-semibold text-foreground mt-0.5">
                    {selectedProject.completed_task_count || 0} / {selectedProject.task_count || 0}
                  </p>
                </div>
              </div>

              {selectedProject.members && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Assigned Project Personnel ({selectedProject.members.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedProject.members.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-2 rounded-lg border border-border bg-card"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center">
                            {m.user?.full_name?.charAt(0) || 'E'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{m.user?.full_name}</p>
                            <p className="text-xs text-muted-foreground">{m.user?.email}</p>
                          </div>
                        </div>
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                          {m.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedProject(null)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  window.location.href = `/tasks?projectId=${selectedProject.id}`;
                }}
                className="gap-1.5"
              >
                Go to Project Tasks <ArrowUpRight className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
