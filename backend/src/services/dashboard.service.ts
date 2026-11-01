import { DepartmentService } from './department.service.js';
import { ProfileService } from './profile.service.js';

export class DashboardService {
  static async getMetrics() {
    const [departmentCount, activeEmployeeCount] = await Promise.all([
      DepartmentService.getCount(),
      ProfileService.getActiveCount(),
    ]);

    const stats = [
      {
        id: 'working-hours',
        label: 'Working hours today',
        value: '0h 00m',
        hint: 'No active session',
        tone: 'primary',
      },
      {
        id: 'tasks-completed',
        label: 'Tasks completed',
        value: '0',
        hint: 'No tasks yet',
        tone: 'success',
      },
      {
        id: 'upcoming-meetings',
        label: 'Upcoming meetings',
        value: '0',
        hint: 'Nothing scheduled',
        tone: 'accent',
      },
      {
        id: 'unread-messages',
        label: 'Unread messages',
        value: '0',
        hint: 'Inbox empty',
        tone: 'neutral',
      },
    ];

    return {
      stats,
      departmentCount,
      activeEmployeeCount,
    };
  }
}
