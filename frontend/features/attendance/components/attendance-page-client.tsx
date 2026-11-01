'use client';

import * as React from 'react';
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AttendanceClockCard } from './attendance-clock-card';
import { AttendanceStatsGrid } from './attendance-stats-grid';
import { AttendanceHistoryTable } from './attendance-history-table';
import { TeamAttendanceWidget } from './team-attendance-widget';
import { ShiftPolicyCard } from './shift-policy-card';
import { TodayActivityTimeline } from './today-activity-timeline';
import { MonthlyAttendanceCalendar } from './monthly-attendance-calendar';
import { AttendanceRegularizationModal } from './attendance-regularization-modal';
import { AttendanceClientService } from '@/services/attendance.service';
import type {
  AttendanceSession,
  AttendanceBreak,
  TeamAttendanceSummary,
} from '@/types/attendance.types';
import type { UserRole } from '@/constants/roles';
import {
  Clock,
  Calendar,
  ListFilter,
  Users,
  FileCheck2,
  Sparkles,
} from 'lucide-react';

interface AttendancePageClientProps {
  userId: string;
  role: UserRole;
  initialSession: AttendanceSession | null;
  initialActiveBreak: AttendanceBreak | null;
  initialHistory: AttendanceSession[];
  initialTeamSummary: TeamAttendanceSummary | null;
}

export function AttendancePageClient({
  userId,
  role,
  initialSession,
  initialActiveBreak,
  initialHistory,
  initialTeamSummary,
}: AttendancePageClientProps) {
  const [currentSession, setCurrentSession] = useState<AttendanceSession | null>(initialSession);
  const [history, setHistory] = useState<AttendanceSession[]>(initialHistory);
  const [teamSummary, setTeamSummary] = useState<TeamAttendanceSummary | null>(initialTeamSummary);
  const [isRegularizeModalOpen, setIsRegularizeModalOpen] = useState(false);

  const canViewTeam = role === 'manager' || role === 'hr' || role === 'admin';

  // Refresh history and team whenever session is checked in, on break, or checked out
  const handleSessionUpdate = async (updated: AttendanceSession | null) => {
    setCurrentSession(updated);

    const refreshedHistory = await AttendanceClientService.getHistory(userId);
    setHistory(refreshedHistory);

    if (canViewTeam) {
      const refreshedTeam = await AttendanceClientService.getTeamSummary();
      setTeamSummary(refreshedTeam);
    }
  };

  return (
    <div className="space-y-6 animate-in-up">
      {/* 1. Office Shift & Network Information Banner */}
      <ShiftPolicyCard />

      {/* 2. Top Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Attendance & Work Hours Desk
          </h2>
          <p className="text-xs text-muted-foreground">
            Real-time biometric shift logging, break management, and attendance regularizations.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => setIsRegularizeModalOpen(true)}
          className="gap-2 self-start sm:self-auto border-border hover:bg-muted"
        >
          <FileCheck2 className="h-4 w-4 text-primary" />
          Request Regularization
        </Button>
      </div>

      {/* 3. Quick Metrics Grid */}
      <AttendanceStatsGrid session={currentSession} />

      {/* 4. Enterprise Tabs Navigation */}
      <Tabs defaultValue="today" className="space-y-4">
        <TabsList className="bg-muted/60 p-1 border border-border">
          <TabsTrigger value="today" className="gap-2 text-xs font-semibold">
            <Clock className="h-4 w-4" />
            Today's Punch & Clock
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2 text-xs font-semibold">
            <Calendar className="h-4 w-4" />
            Monthly Register View
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2 text-xs font-semibold">
            <ListFilter className="h-4 w-4" />
            Attendance Logs (30 Days)
          </TabsTrigger>
          {canViewTeam && (
            <TabsTrigger value="team" className="gap-2 text-xs font-semibold">
              <Users className="h-4 w-4" />
              Team Floor Board
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab 1: Today's Punch & Clock */}
        <TabsContent value="today" className="space-y-6">
          <AttendanceClockCard
            userId={userId}
            initialSession={currentSession}
            initialActiveBreak={initialActiveBreak}
            onSessionUpdate={handleSessionUpdate}
          />
          <TodayActivityTimeline session={currentSession} />
        </TabsContent>

        {/* Tab 2: Monthly Calendar Register */}
        <TabsContent value="calendar" className="space-y-4">
          <MonthlyAttendanceCalendar records={history} />
        </TabsContent>

        {/* Tab 3: Detailed Logs */}
        <TabsContent value="logs" className="space-y-4">
          <AttendanceHistoryTable records={history} />
        </TabsContent>

        {/* Tab 4: Team Floor Board (Managers/HR/Admin) */}
        {canViewTeam && (
          <TabsContent value="team" className="space-y-4">
            <TeamAttendanceWidget summary={teamSummary} />
          </TabsContent>
        )}
      </Tabs>

      {/* Regularization Modal */}
      <AttendanceRegularizationModal
        open={isRegularizeModalOpen}
        onOpenChange={setIsRegularizeModalOpen}
        userId={userId}
      />
    </div>
  );
}
