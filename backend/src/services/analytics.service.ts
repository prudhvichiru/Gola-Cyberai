
export class AnalyticsService {
  static async getOverviewMetrics() {
    return {
      kpis: {
        totalEmployees: 48,
        activeProjects: 6,
        monthlyBillableHours: 6420,
        attendanceAdherenceRate: 96.4,
        avgSprintVelocity: 42,
        openTasksCount: 38,
      },
      departmentDistribution: [
        { department: 'Engineering & CyberAI', count: 22, billableHours: 3200, adherence: 97.2 },
        { department: 'Security Operations (SOC)', count: 12, billableHours: 1850, adherence: 98.5 },
        { department: 'Product & Design', count: 6, billableHours: 720, adherence: 94.0 },
        { department: 'Human Resources', count: 4, billableHours: 350, adherence: 95.8 },
        { department: 'Finance & Operations', count: 4, billableHours: 300, adherence: 96.5 },
      ],
      projectBurnRates: [
        { projectName: 'Zero Trust Network Overhaul', allocatedHours: 1200, loggedHours: 890, burnPercentage: 74, status: 'On Track' },
        { projectName: 'Cloud SIEM AI Migration', allocatedHours: 850, loggedHours: 710, burnPercentage: 83, status: 'Active' },
        { projectName: 'Autonomous Threat Agent v2', allocatedHours: 1600, loggedHours: 1420, burnPercentage: 88, status: 'Review' },
        { projectName: 'Client Portal SSO Integration', allocatedHours: 400, loggedHours: 395, burnPercentage: 98, status: 'Near Cap' },
      ],
      weeklyAttendanceTrend: [
        { day: 'Mon', present: 46, onLeave: 2, late: 1 },
        { day: 'Tue', present: 47, onLeave: 1, late: 0 },
        { day: 'Wed', present: 45, onLeave: 3, late: 2 },
        { day: 'Thu', present: 48, onLeave: 0, late: 1 },
        { day: 'Fri', present: 46, onLeave: 2, late: 0 },
      ],
      leaveBreakdown: [
        { type: 'Paid Annual Leave', count: 18, percentage: 56 },
        { type: 'Casual Leave', count: 8, percentage: 25 },
        { type: 'Sick / Emergency Leave', count: 6, percentage: 19 },
      ],
    };
  }
}
