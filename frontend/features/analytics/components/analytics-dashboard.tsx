'use client';

import React, { useState, useEffect } from 'react';
import { AnalyticsOverview, AnalyticsFrontendService } from '@/services/analytics.service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatCard } from '@/components/shared/stat-card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  FolderKanban,
  Clock,
  TrendingUp,
  Activity,
  CheckCircle2,
  Calendar,
  AlertCircle,
  BarChart2,
} from 'lucide-react';

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await AnalyticsFrontendService.getOverview();
        if (res.data) setData(res.data);
      } catch (err) {
        console.error('Failed to load analytics overview:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading || !data) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        Loading organizational analytics and telemetry...
      </div>
    );
  }

  const { kpis, departmentDistribution, projectBurnRates, weeklyAttendanceTrend, leaveBreakdown } = data;

  return (
    <div className="space-y-6">
      {/* 6 Key Enterprise Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Workforce"
          value={kpis.totalEmployees}
          hint="Active personnel across departments"
          icon={<Users className="h-5 w-5" />}
          tone="primary"
        />
        <StatCard
          label="Active Projects"
          value={kpis.activeProjects}
          hint="In active development & audit"
          icon={<FolderKanban className="h-5 w-5" />}
          tone="info"
        />
        <StatCard
          label="Monthly Billable Hours"
          value={`${kpis.monthlyBillableHours} hrs`}
          hint="Target: 6,000 hrs (107%)"
          icon={<Clock className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Attendance Adherence"
          value={`${kpis.attendanceAdherenceRate}%`}
          hint="Organizational compliance"
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Sprint Velocity"
          value={`${kpis.avgSprintVelocity} pts`}
          hint="Story points per 2-week cycle"
          icon={<TrendingUp className="h-5 w-5" />}
          tone="primary"
        />
        <StatCard
          label="Open Tasks In Progress"
          value={kpis.openTasksCount}
          hint="Across Kanban boards"
          icon={<Activity className="h-5 w-5" />}
          tone="warning"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Department Telemetry */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Department Headcount & Utilization
            </CardTitle>
            <CardDescription>
              Cross-department staffing, monthly billable hours, and attendance adherence.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {departmentDistribution.map((dept) => (
                <div key={dept.department} className="py-3 first:pt-0 last:pb-0 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-foreground">{dept.department}</span>
                    <span className="text-xs text-muted-foreground font-medium">
                      {dept.count} personnel • {dept.billableHours} hrs
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all"
                        style={{ width: `${dept.adherence}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono font-medium text-muted-foreground">
                      {dept.adherence}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Project Burn Rates */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-primary" />
              Project Hours vs Budget Burn
            </CardTitle>
            <CardDescription>
              Real-time comparison between budgeted effort and logged timesheets.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {projectBurnRates.map((proj) => (
                <div key={proj.projectName} className="py-3 first:pt-0 last:pb-0 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-foreground">{proj.projectName}</span>
                    <Badge
                      variant={proj.burnPercentage > 90 ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {proj.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {proj.loggedHours} / {proj.allocatedHours} hrs logged
                    </span>
                    <span className="font-mono font-semibold">{proj.burnPercentage}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        proj.burnPercentage > 90
                          ? 'bg-destructive'
                          : proj.burnPercentage > 80
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(proj.burnPercentage, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Weekly Attendance Distribution */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-primary" />
              Weekly Attendance & Presence
            </CardTitle>
            <CardDescription>Daily present, on-leave, and late arrivals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2 text-center">
              {weeklyAttendanceTrend.map((day) => (
                <div key={day.day} className="rounded-lg bg-muted/40 p-3 space-y-2">
                  <div className="text-xs font-bold text-foreground">{day.day}</div>
                  <div className="text-xl font-black text-emerald-600">{day.present}</div>
                  <div className="text-[11px] text-muted-foreground">Present</div>
                  <div className="pt-2 border-t border-border/60 text-[10px] space-y-0.5">
                    <div className="text-amber-600 font-medium">{day.onLeave} Leave</div>
                    <div className="text-muted-foreground">{day.late} Late</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Leave Type Breakdown */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Monthly Leave Distribution
            </CardTitle>
            <CardDescription>Leave applications by category for this period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leaveBreakdown.map((item) => (
                <div key={item.type} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{item.type}</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {item.count} days ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
