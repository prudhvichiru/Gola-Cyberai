import { fetchApi } from './api';

export interface AnalyticsOverview {
  kpis: {
    totalEmployees: number;
    activeProjects: number;
    monthlyBillableHours: number;
    attendanceAdherenceRate: number;
    avgSprintVelocity: number;
    openTasksCount: number;
  };
  departmentDistribution: Array<{
    department: string;
    count: number;
    billableHours: number;
    adherence: number;
  }>;
  projectBurnRates: Array<{
    projectName: string;
    allocatedHours: number;
    loggedHours: number;
    burnPercentage: number;
    status: string;
  }>;
  weeklyAttendanceTrend: Array<{
    day: string;
    present: number;
    onLeave: number;
    late: number;
  }>;
  leaveBreakdown: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
}

export class AnalyticsFrontendService {
  static async getOverview() {
    return fetchApi<AnalyticsOverview>('/analytics/overview');
  }
}
