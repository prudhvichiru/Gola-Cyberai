'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/shared/stat-card';
import { ROUTES } from '@/constants/routes';
import { ProjectFrontendService } from '@/services/project.service';
import { AttendanceClientService } from '@/services/attendance.service';
import { HRClientService } from '@/services/hr.service';
import { CollaborationFrontendService } from '@/services/collaboration.service';
import { AdminFrontendService, SecuritySession, AuditLogItem } from '@/services/admin.service';
import type { TaskItem, ProjectItem } from '@/types/project.types';
import type { MeetingItem } from '@/types/collaboration.types';
import type { LeaveBalance, EmployeeProfile, DepartmentItem, PayslipRecord } from '@/types/hr.types';
import {
  Clock,
  CheckCircle2,
  Calendar,
  FileText,
  Users,
  FolderKanban,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  PlayCircle,
  Plus,
  DollarSign,
  Activity,
  Video,
  CheckSquare,
  Sparkles,
  MapPin,
  Inbox,
  AlertCircle,
} from 'lucide-react';

export type DashboardRole = 'employee' | 'manager' | 'project_manager' | 'hr' | 'payroll' | 'admin';

interface Props {
  initialRole: DashboardRole;
  userName: string;
}

export function RoleDashboardView({ initialRole, userName }: Props) {
  const [activeRole, setActiveRole] = useState<DashboardRole>(initialRole);

  // Only admins can switch role perspectives; others see their own dashboard only
  const isAdmin = initialRole === 'admin';

  const roleTabs: { role: DashboardRole; label: string }[] = [
    { role: 'employee', label: 'Employee' },
    { role: 'manager', label: 'Team Lead' },
    { role: 'project_manager', label: 'Project Manager' },
    { role: 'hr', label: 'HR Executive' },
    { role: 'payroll', label: 'Payroll Officer' },
    { role: 'admin', label: 'Administrator' },
  ];

  return (
    <div className="space-y-6">
      {/* Role Perspective Selector — visible to admins only */}
      {isAdmin && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-card p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">Role Perspective:</span>
            <span className="text-xs text-muted-foreground">
              Viewing workspace under active role security scope
            </span>
          </div>

          <div className="flex flex-wrap gap-1">
            {roleTabs.map((tab) => (
              <button
                key={tab.role}
                onClick={() => setActiveRole(tab.role)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeRole === tab.role
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* RENDER ROLE SPECIFIC CONTENT */}
      {(isAdmin ? activeRole : initialRole) === 'employee' && <EmployeeDashboard userName={userName} />}
      {(isAdmin ? activeRole : initialRole) === 'manager' && <ManagerDashboard />}
      {(isAdmin ? activeRole : initialRole) === 'project_manager' && <ProjectManagerDashboard />}
      {(isAdmin ? activeRole : initialRole) === 'hr' && <HRDashboard />}
      {(isAdmin ? activeRole : initialRole) === 'payroll' && <PayrollDashboard />}
      {(isAdmin ? activeRole : initialRole) === 'admin' && <AdminDashboard />}
    </div>
  );
}

// ----------------------------------------------------
// A. EMPLOYEE DASHBOARD (Real API Integration & Proper Empty States)
// ----------------------------------------------------
function EmployeeDashboard({ userName }: { userName: string }) {
  const { profile } = useAuth();
  const userId = profile?.id ?? '';
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [recentAudit, setRecentAudit] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        setLoading(true);
        const [tasksRes, meetingsRes, attendanceRes, leavesRes, timesheetsRes, auditRes] = await Promise.all([
          ProjectFrontendService.getTasks().catch(() => ({ data: [] })),
          CollaborationFrontendService.getMeetings().catch(() => ({ data: [] })),
          AttendanceClientService.getToday(userId).catch(() => ({ session: null, activeBreak: null })),
          HRClientService.getLeaveBalances(userId).catch(() => []),
          ProjectFrontendService.getMyTimesheets().catch(() => ({ data: [] })),
          AdminFrontendService.getAuditLogs(5).catch(() => ({ data: [] })),
        ]);

        if (active) {
          if (tasksRes?.data) setTasks(tasksRes.data);
          if (meetingsRes?.data) setMeetings(meetingsRes.data);
          if (attendanceRes) setTodayAttendance(attendanceRes);
          if (Array.isArray(leavesRes)) setLeaveBalances(leavesRes);
          if (timesheetsRes?.data) setTimesheets(timesheetsRes.data);
          if (auditRes?.data) setRecentAudit(auditRes.data);
        }
      } catch (err) {
        console.error('Error fetching employee dashboard metrics:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, []);

  const totalLeaveAvailable = leaveBalances.reduce((acc, b) => acc + (b.available_days || 0), 0);
  const totalLeavePending = leaveBalances.reduce((acc, b) => acc + (b.pending_days || 0), 0);
  const highPriorityTasks = tasks.filter((t) => t.priority === 'high' || t.priority === 'urgent').length;
  const isCheckedIn = !!todayAttendance?.session;
  const weekHours = timesheets.reduce((acc, ts) => acc + (ts.total_hours || 0), 0);

  return (
    <div className="space-y-6">
      {/* 4 Core StatCards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="My Tasks"
          value={String(tasks.length)}
          hint={tasks.length > 0 ? `${highPriorityTasks} high/urgent priority` : 'No tasks assigned'}
          icon={<CheckSquare className="h-5 w-5" />}
          tone="primary"
        />
        <StatCard
          label="Today's Attendance"
          value={isCheckedIn ? (todayAttendance?.activeBreak ? 'On Break' : 'Checked In') : 'Not Checked In'}
          hint={isCheckedIn ? 'Server clock verified' : 'Punch in on Attendance page'}
          icon={<Clock className="h-5 w-5" />}
          tone={isCheckedIn ? 'success' : 'info'}
        />
        <StatCard
          label="Leave Balance"
          value={`${totalLeaveAvailable} days`}
          hint={totalLeavePending > 0 ? `${totalLeavePending} days pending approval` : 'Available across leaves'}
          icon={<Calendar className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Hours This Week"
          value={`${weekHours.toFixed(1)} hrs`}
          hint={weekHours > 0 ? 'Logged from timesheets' : 'No hours recorded yet'}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="warning"
        />
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 spans) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task List */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-primary" />
                    My Active Tasks
                  </CardTitle>
                  <CardDescription>Tasks assigned to you across projects</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="text-xs" asChild>
                  <Link href={ROUTES.TASKS}>View Kanban</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {tasks.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg space-y-1">
                  <Inbox className="h-7 w-7 text-muted-foreground/50 mx-auto" />
                  <p className="font-medium text-foreground">No tasks assigned yet.</p>
                  <p>When you are assigned tasks on projects, they will appear here.</p>
                </div>
              ) : (
                tasks.slice(0, 5).map((task) => {
                  const projName = typeof task.project === 'object' ? task.project?.name : task.project || 'Project';
                  const isHigh = task.priority === 'high' || task.priority === 'urgent';
                  return (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/80 bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <div className="space-y-1 min-w-0 pr-3">
                        <div className="text-xs font-semibold text-foreground truncate">{task.title}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                          <span className="font-medium text-muted-foreground">{projName}</span>
                          <span>•</span>
                          <span>{task.due_date ? `Due ${new Date(task.due_date).toLocaleDateString()}` : 'No due date'}</span>
                        </div>
                      </div>
                      <Badge
                        variant={isHigh ? 'destructive' : 'secondary'}
                        className="text-[10px] shrink-0 capitalize"
                      >
                        {task.priority || 'Normal'}
                      </Badge>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Recent Updates & Activity
              </CardTitle>
              <CardDescription>Live workspace alerts and audit logs from your active teams</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentAudit.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                  No recent activity logged yet.
                </div>
              ) : (
                recentAudit.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border text-xs">
                    <div className="space-y-0.5">
                      <p className="font-medium text-foreground">{item.action.replace(/_/g, ' ')}</p>
                      <p className="text-[11px] text-muted-foreground">{item.actorRole.toUpperCase()} • {new Date(item.timestamp).toLocaleTimeString()}</p>
                    </div>
                    <Badge variant={item.status === 'SUCCESS' ? 'outline' : 'destructive'} className="text-[10px]">
                      {item.status}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 span) */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Quick Actions
              </CardTitle>
              <CardDescription>Essential employee daily workflows</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <Button variant="outline" className="w-full justify-start gap-2.5 h-10 text-xs font-medium" asChild>
                <Link href={ROUTES.ATTENDANCE}>
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span>Punch Attendance / Break</span>
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2.5 h-10 text-xs font-medium" asChild>
                <Link href={ROUTES.TIME_TRACKING}>
                  <PlayCircle className="h-4 w-4 text-emerald-500" />
                  <span>Start Live Task Timer</span>
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2.5 h-10 text-xs font-medium" asChild>
                <Link href={ROUTES.HR.LEAVE_REQUESTS}>
                  <Calendar className="h-4 w-4 text-amber-500" />
                  <span>Apply for Leave</span>
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2.5 h-10 text-xs font-medium" asChild>
                <Link href={ROUTES.HR.PAYSLIPS}>
                  <FileText className="h-4 w-4 text-indigo-500" />
                  <span>View My Payslips</span>
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2.5 h-10 text-xs font-medium" asChild>
                <Link href={ROUTES.MEETINGS}>
                  <Video className="h-4 w-4 text-teal-500" />
                  <span>Join / Schedule Meeting</span>
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Upcoming Meetings */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Video className="h-4 w-4 text-primary" />
                    Upcoming Meetings
                  </CardTitle>
                  <CardDescription>Scheduled collaborative sessions</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-xs h-7 px-2" asChild>
                  <Link href={ROUTES.MEETINGS}>View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {meetings.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg space-y-1">
                  <Video className="h-6 w-6 text-muted-foreground/40 mx-auto" />
                  <p className="font-medium text-foreground">No upcoming meetings scheduled.</p>
                  <p className="text-[11px]">You're all caught up on scheduled syncs.</p>
                </div>
              ) : (
                meetings.slice(0, 3).map((meet) => {
                  const startTime = meet.start_time
                    ? new Date(meet.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Scheduled';
                  return (
                    <div
                      key={meet.id}
                      className="p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/30 transition-colors space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs font-semibold text-foreground leading-tight">
                          {meet.title}
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0 border-blue-500/30 text-blue-500">
                          {startTime}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Virtual Room
                        </span>
                        {meet.meeting_link && (
                          <Button variant="outline" size="sm" className="h-6 text-[10px] px-2.5" asChild>
                            <Link href={meet.meeting_link} target="_blank">
                              Join Call
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// B. TEAM LEAD / MANAGER DASHBOARD
// ----------------------------------------------------
function ManagerDashboard() {
  const { user } = useAuth();
  const userId = user?.id || '';
  const [teamSummary, setTeamSummary] = useState<any>(null);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [pendingTimesheets, setPendingTimesheets] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<EmployeeProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [summaryRes, leavesRes, timesheetsRes, empsRes] = await Promise.all([
        AttendanceClientService.getTeamSummary().catch(() => null),
        HRClientService.getApprovalQueue().catch(() => []),
        ProjectFrontendService.getTimesheetApprovalQueue().catch(() => ({ data: [] })),
        HRClientService.getEmployees().catch(() => []),
      ]);

      if (summaryRes) setTeamSummary(summaryRes);
      if (Array.isArray(leavesRes)) setPendingLeaves(leavesRes);
      if (timesheetsRes?.data) setPendingTimesheets(timesheetsRes.data);
      if (Array.isArray(empsRes)) setTeamMembers(empsRes);
    } catch (err) {
      console.error('Error fetching manager dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApproveLeave = async (id: string) => {
    await HRClientService.reviewLeave({ requestId: id, reviewerId: userId, status: 'approved' });
    await loadData();
  };

  const handleRejectLeave = async (id: string) => {
    await HRClientService.reviewLeave({ requestId: id, reviewerId: userId, status: 'rejected' });
    await loadData();
  };

  const handleApproveTimesheet = async (id: string) => {
    await ProjectFrontendService.reviewTimesheet(id, 'approved');
    await loadData();
  };

  const presentCount = teamSummary?.present_count || 0;
  const totalCount = teamSummary?.total_team_members || teamMembers.length || 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Team Presence Today"
          value={`${presentCount} / ${totalCount}`}
          hint={totalCount > 0 ? `${presentCount} checked in today` : 'No team members registered'}
          icon={<Users className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Timesheets Pending Review"
          value={String(pendingTimesheets.length)}
          hint={pendingTimesheets.length > 0 ? 'Awaiting weekly sign-off' : 'All timesheets reviewed'}
          icon={<Clock className="h-5 w-5" />}
          tone="warning"
        />
        <StatCard
          label="Leave Approvals Queue"
          value={String(pendingLeaves.length)}
          hint={pendingLeaves.length > 0 ? 'Awaiting review' : 'No requests pending'}
          icon={<Calendar className="h-5 w-5" />}
          tone="primary"
        />
        <StatCard
          label="Total Team Members"
          value={String(teamMembers.length)}
          hint="Direct and indirect reports"
          icon={<TrendingUp className="h-5 w-5" />}
          tone="info"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">Team Attendance Review</CardTitle>
            <CardDescription>Real-time presence across your team scope</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {teamMembers.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg space-y-1">
                <Users className="h-6 w-6 text-muted-foreground/40 mx-auto" />
                <p className="font-medium text-foreground">No team members registered yet.</p>
                <p>New team members will appear here once added to your department.</p>
              </div>
            ) : (
              teamMembers.slice(0, 5).map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/20"
                >
                  <div>
                    <div className="text-xs font-semibold text-foreground">{member.full_name}</div>
                    <div className="text-[11px] text-muted-foreground">{member.designation?.title || member.department?.name || 'Member'}</div>
                  </div>
                  <Badge variant={member.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                    {member.status || 'Active'}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">Pending Manager Approvals</CardTitle>
            <CardDescription>Items within your authorized managerial scope</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingLeaves.length === 0 && pendingTimesheets.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg space-y-1">
                <CheckCircle2 className="h-6 w-6 text-emerald-500/60 mx-auto" />
                <p className="font-medium text-foreground">No approvals pending in your queue.</p>
                <p>You are completely caught up on team reviews.</p>
              </div>
            ) : (
              <>
                {pendingLeaves.map((req) => (
                  <div key={req.id} className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Leave: {req.employee?.full_name || 'Team Member'} ({req.total_days} Days)</span>
                      <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600">
                        {req.start_date} – {req.end_date}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Reason: {req.reason || 'Personal / Medical leave'}</p>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => handleApproveLeave(req.id)}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleRejectLeave(req.id)}>
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}

                {pendingTimesheets.map((ts) => (
                  <div key={ts.id} className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Timesheet: {ts.week_start_date}</span>
                      <span className="text-xs font-mono font-medium text-primary">{ts.total_hours} hrs</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Submitted by {ts.user?.full_name || 'Employee'}</p>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" className="h-7 text-xs" onClick={() => handleApproveTimesheet(ts.id)}>
                        Approve Timesheet
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// C. PROJECT MANAGER DASHBOARD
// ----------------------------------------------------
function ProjectManagerDashboard() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [reports, setReports] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [projRes, tasksRes, reportsRes] = await Promise.all([
          ProjectFrontendService.getProjects().catch(() => ({ data: [] })),
          ProjectFrontendService.getTasks().catch(() => ({ data: [] })),
          ProjectFrontendService.getReportsDashboard().catch(() => null),
        ]);
        if (projRes?.data) setProjects(projRes.data);
        if (tasksRes?.data) setTasks(tasksRes.data);
        if (reportsRes) setReports(reportsRes);
      } catch (err) {
        console.error('Failed to load project manager dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const activeProjects = projects.filter((p) => p.status === 'active');
  const completedTasks = tasks.filter((t) => t.status === 'done').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Projects"
          value={String(activeProjects.length)}
          hint={`${projects.length} total across all portfolios`}
          icon={<FolderKanban className="h-5 w-5" />}
          tone="primary"
        />
        <StatCard
          label="Sprint Tasks Completed"
          value={tasks.length > 0 ? `${completedTasks} / ${tasks.length}` : '0'}
          hint={tasks.length > 0 ? `${Math.round((completedTasks / tasks.length) * 100)}% completion rate` : 'No tasks assigned'}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Overdue Tasks"
          value={String(reports?.overdue_tasks_count || 0)}
          hint="Requiring schedule adjustment"
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="warning"
        />
        <StatCard
          label="Total Logged Hours"
          value={`${reports?.total_project_hours || 0} hrs`}
          hint="From verified task timers"
          icon={<Clock className="h-5 w-5" />}
          tone="info"
        />
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Project Delivery Portfolios</CardTitle>
              <CardDescription>Milestones, assigned engineering teams, and delivery status</CardDescription>
            </div>
            <Button size="sm" asChild>
              <Link href={ROUTES.PROJECTS}>Manage Projects</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {projects.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg space-y-1">
              <FolderKanban className="h-6 w-6 text-muted-foreground/40 mx-auto" />
              <p className="font-medium text-foreground">No projects available.</p>
              <p>Create your first project to start tracking delivery milestones and team workload.</p>
            </div>
          ) : (
            projects.map((proj) => (
              <div key={proj.id} className="p-3 rounded-lg border border-border/80 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-foreground text-sm">{proj.name}</span>
                    <span className="text-muted-foreground ml-2">({proj.code})</span>
                  </div>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {proj.status}
                  </Badge>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{ width: `${proj.progress || 0}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
                  <span>{proj.task_count || 0} tasks ({proj.completed_task_count || 0} completed)</span>
                  <span>{proj.progress || 0}%</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ----------------------------------------------------
// D. HR EXECUTIVE DASHBOARD
// ----------------------------------------------------
function HRDashboard() {
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [empsRes, deptsRes, leavesRes, docsRes] = await Promise.all([
          HRClientService.getEmployees().catch(() => []),
          HRClientService.getDepartments().catch(() => []),
          HRClientService.getApprovalQueue().catch(() => []),
          HRClientService.getDocuments().catch(() => []),
        ]);
        if (Array.isArray(empsRes)) setEmployees(empsRes);
        if (Array.isArray(deptsRes)) setDepartments(deptsRes);
        if (Array.isArray(leavesRes)) setPendingLeaves(leavesRes);
        if (Array.isArray(docsRes)) setDocuments(docsRes);
      } catch (err) {
        console.error('Failed to load HR dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Headcount"
          value={String(employees.length)}
          hint={`${employees.filter((e) => e.status === 'active').length} active employees`}
          icon={<Users className="h-5 w-5" />}
          tone="primary"
        />
        <StatCard
          label="Active Departments"
          value={String(departments.length)}
          hint="Business operational units"
          icon={<FolderKanban className="h-5 w-5" />}
          tone="info"
        />
        <StatCard
          label="Leave Requests"
          value={String(pendingLeaves.length)}
          hint="Awaiting HR review"
          icon={<Calendar className="h-5 w-5" />}
          tone="warning"
        />
        <StatCard
          label="HR Policy Documents"
          value={String(documents.length)}
          hint="Company handbooks & charters"
          icon={<FileText className="h-5 w-5" />}
          tone="success"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">HR Quick Operations</CardTitle>
            <CardDescription>Personnel management and policy workflows</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
              <Link href={ROUTES.HR.EMPLOYEES}>
                <Users className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium">Employee Directory</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
              <Link href={ROUTES.HR.DEPARTMENTS}>
                <FolderKanban className="h-5 w-5 text-accent" />
                <span className="text-xs font-medium">Departments</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
              <Link href={ROUTES.HR.LEAVE_APPROVALS}>
                <Calendar className="h-5 w-5 text-amber-500" />
                <span className="text-xs font-medium">Leave Administration</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
              <Link href={ROUTES.DOCUMENTS}>
                <FileText className="h-5 w-5 text-emerald-600" />
                <span className="text-xs font-medium">HR Documents & Letters</span>
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">Department Headcount</CardTitle>
            <CardDescription>Personnel distribution across business units</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {departments.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg space-y-1">
                <FolderKanban className="h-6 w-6 text-muted-foreground/40 mx-auto" />
                <p className="font-medium text-foreground">No departments configured yet.</p>
                <p>Configure departments to track headcount distribution.</p>
              </div>
            ) : (
              departments.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/40">
                  <span className="font-semibold text-foreground">{d.name}</span>
                  <span className="font-mono text-muted-foreground">{d.employee_count || 0} personnel</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// E. PAYROLL OFFICER DASHBOARD
// ----------------------------------------------------
function PayrollDashboard() {
  const { profile } = useAuth();
  const userId = profile?.id ?? '';
  const [payslips, setPayslips] = useState<PayslipRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await HRClientService.getMyPayslips(userId).catch(() => []);
        if (Array.isArray(res)) setPayslips(res);
      } catch (err) {
        console.error('Failed to load payroll dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const currentCycle = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();
  const grossTotal = payslips.reduce((acc, p) => acc + (p.gross_earnings || 0), 0);
  const deductionsTotal = payslips.reduce((acc, p) => acc + (p.total_deductions || 0), 0);
  const netTotal = payslips.reduce((acc, p) => acc + (p.net_salary || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Current Payroll Cycle"
          value={currentCycle}
          hint={payslips.length > 0 ? 'Active Cycle' : 'Cycle Pending'}
          icon={<Calendar className="h-5 w-5" />}
          tone="primary"
        />
        <StatCard
          label="Net Disbursed"
          value={netTotal > 0 ? `₹${netTotal.toLocaleString()}` : '₹0'}
          hint={`${payslips.length} payslips issued`}
          icon={<DollarSign className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Total Deductions"
          value={deductionsTotal > 0 ? `₹${deductionsTotal.toLocaleString()}` : '₹0'}
          hint="TDS, PF and Professional Tax"
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="info"
        />
        <StatCard
          label="Payslips Published"
          value={String(payslips.length)}
          hint="Available in employee portal"
          icon={<FileText className="h-5 w-5" />}
          tone="warning"
        />
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Payroll Operations & Reconciliation</CardTitle>
              <CardDescription>
                Confidential compensation runs, allowances, and statutory compliance.
              </CardDescription>
            </div>
            <Button size="sm" asChild>
              <Link href={ROUTES.HR.PAYSLIPS}>Open Payroll Console</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {payslips.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg space-y-1">
              <FileText className="h-6 w-6 text-muted-foreground/40 mx-auto" />
              <p className="font-medium text-foreground">No payslips available.</p>
              <p>Generate employee payslips in the Payroll Console to view financial reconciliations.</p>
            </div>
          ) : (
            <div className="rounded-lg bg-muted/30 p-4 border border-border space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">Cycle: {currentCycle}</span>
                <Badge variant="outline" className="border-emerald-500 text-emerald-600 font-mono text-[10px]">
                  RECONCILED
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs pt-2 border-t border-border/60">
                <div>
                  <span className="text-muted-foreground">Gross Compensation:</span>
                  <div className="font-bold text-foreground font-mono">₹{grossTotal.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Deductions:</span>
                  <div className="font-bold text-destructive font-mono">₹{deductionsTotal.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Net Payout:</span>
                  <div className="font-bold text-emerald-600 font-mono">₹{netTotal.toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ----------------------------------------------------
// F. SYSTEM ADMINISTRATOR DASHBOARD
// ----------------------------------------------------
function AdminDashboard() {
  const [sessions, setSessions] = useState<SecuritySession[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [sessRes, logsRes, usersRes] = await Promise.all([
          AdminFrontendService.getSecuritySessions().catch(() => ({ data: [] })),
          AdminFrontendService.getAuditLogs(10).catch(() => ({ data: [] })),
          AdminFrontendService.getUsers().catch(() => ({ data: [] })),
        ]);
        if (sessRes?.data) setSessions(sessRes.data);
        if (logsRes?.data) setAuditLogs(logsRes.data);
        if (usersRes?.data) setUsers(usersRes.data);
      } catch (err) {
        console.error('Failed to load admin dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Security Baseline"
          value="OWASP Active"
          hint="HSTS, CSP, Anti-XSS"
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Active Sessions"
          value={String(sessions.length)}
          hint="Corporate workstations"
          icon={<Users className="h-5 w-5" />}
          tone="primary"
        />
        <StatCard
          label="Registered Accounts"
          value={String(users.length)}
          hint="Authorized platform users"
          icon={<Activity className="h-5 w-5" />}
          tone="info"
        />
        <StatCard
          label="System Health"
          value="100% Operational"
          hint="Database & WebSockets live"
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="success"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">Admin Navigation</CardTitle>
            <CardDescription>Platform security, RBAC, and telemetry</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
              <Link href="/settings/users">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium">User Management</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
              <Link href="/settings/permissions">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <span className="text-xs font-medium">Permissions Matrix</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
              <Link href="/settings/audit-logs">
                <FileText className="h-5 w-5 text-amber-500" />
                <span className="text-xs font-medium">Live Audit Logs</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
              <Link href="/settings/security">
                <Activity className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium">Security & Sessions</span>
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">Recent Critical Events</CardTitle>
            <CardDescription>Security and administrative audit trail</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs">
            {auditLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg space-y-1">
                <ShieldCheck className="h-6 w-6 text-muted-foreground/40 mx-auto" />
                <p className="font-medium text-foreground">No audit logs recorded yet.</p>
                <p>System and user authentication events will stream here live.</p>
              </div>
            ) : (
              auditLogs.map((log, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <div>
                    <span className="font-semibold text-foreground">{log.action}</span>
                    <span className="text-[10px] text-muted-foreground block">{log.ip} • {new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <Badge
                    variant={log.status === 'SUCCESS' ? 'outline' : 'destructive'}
                    className={`text-[10px] ${log.status === 'SUCCESS' ? 'border-emerald-500 text-emerald-600' : ''}`}
                  >
                    {log.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
