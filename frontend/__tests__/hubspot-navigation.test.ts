import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getHubSpotNavigation, hubSpotCategories } from '../lib/navigation';

describe('HubSpot-Style Role-Based Navigation System', () => {
  it('should define all 10 HubSpot core categories with existing routes', () => {
    const expectedCategories = [
      'Dashboard',
      'Projects',
      'People & Teams',
      'Time & Attendance',
      'Work Management',
      'Communication',
      'HR Management',
      'Analytics & Reports',
      'Documents',
      'Settings',
    ];

    assert.strictEqual(hubSpotCategories.length, 10);
    hubSpotCategories.forEach((cat, idx) => {
      assert.strictEqual(cat.label, expectedCategories[idx]);
    });
  });

  it('should verify Administrator has complete access to all categories and sensitive submenus', () => {
    const adminNav = getHubSpotNavigation('admin');
    assert.strictEqual(adminNav.length, 10);

    const hrCat = adminNav.find((c) => c.id === 'hr-management');
    assert.ok(hrCat?.children);
    const hrLabels = hrCat!.children!.map((c) => c.label);
    assert.ok(hrLabels.includes('Employee Directory'));
    assert.ok(hrLabels.includes('Departments'));
    assert.ok(hrLabels.includes('Leave Approvals'));
    assert.ok(hrLabels.includes('Payroll & Payslips'));

    const settingsCat = adminNav.find((c) => c.id === 'settings');
    assert.ok(settingsCat?.children);
    const settingsLabels = settingsCat!.children!.map((c) => c.label);
    assert.ok(settingsLabels.includes('Users & Roles'));
    assert.ok(settingsLabels.includes('Permissions'));
    assert.ok(settingsLabels.includes('Company Settings'));
    assert.ok(settingsLabels.includes('Audit Logs'));
  });

  it('should verify HR role access without administrative system permissions', () => {
    const hrNav = getHubSpotNavigation('hr');
    const settingsCat = hrNav.find((c) => c.id === 'settings');
    const settingsLabels = settingsCat?.children?.map((c) => c.label) || [];

    assert.ok(settingsLabels.includes('Users & Roles'));
    assert.ok(settingsLabels.includes('My Profile'));
    assert.ok(settingsLabels.includes('Security'));
    assert.strictEqual(settingsLabels.includes('Permissions'), false, 'HR cannot access raw permissions');
    assert.strictEqual(settingsLabels.includes('Company Settings'), false, 'HR cannot access company settings');
    assert.strictEqual(settingsLabels.includes('Audit Logs'), false, 'HR cannot access audit logs');
  });

  it('should verify Payroll Officer access strictly limited to payroll and attendance workflows', () => {
    const payrollNav = getHubSpotNavigation('payroll');

    // Payroll should not manage client/sales pipelines or general projects
    assert.strictEqual(payrollNav.some((c) => c.id === 'projects'), false);
    assert.strictEqual(payrollNav.some((c) => c.id === 'people-teams'), false);

    // Should have Time & Attendance, HR (payslips), Analytics & Reports
    const timeCat = payrollNav.find((c) => c.id === 'time-attendance');
    assert.ok(timeCat);

    const hrCat = payrollNav.find((c) => c.id === 'hr-management');
    assert.ok(hrCat);
    const hrLabels = hrCat?.children?.map((c) => c.label) || [];
    assert.ok(hrLabels.includes('Payroll & Payslips'));
    assert.strictEqual(hrLabels.includes('Employee Directory'), false);
    assert.strictEqual(hrLabels.includes('Departments'), false);
    assert.strictEqual(hrLabels.includes('Leave Approvals'), false);

    const analyticsCat = payrollNav.find((c) => c.id === 'analytics-reports');
    assert.ok(analyticsCat, 'Payroll officer has access to analytics reports');
  });

  it('should verify Manager and Team Lead access includes leave approvals and team management', () => {
    const managerNav = getHubSpotNavigation('manager');

    const peopleCat = managerNav.find((c) => c.id === 'people-teams');
    assert.ok(peopleCat);
    const peopleLabels = peopleCat?.children?.map((c) => c.label) || [];
    assert.ok(peopleLabels.includes('Team'));
    assert.ok(peopleLabels.includes('Clients'));

    const hrCat = managerNav.find((c) => c.id === 'hr-management');
    const hrLabels = hrCat?.children?.map((c) => c.label) || [];
    assert.ok(hrLabels.includes('Leave Approvals'), 'Manager must see Leave Approvals');
    assert.strictEqual(hrLabels.includes('Employee Directory'), false, 'Manager cannot manage employee directory');
  });

  it('should verify Employee role only sees authorized personal workspace features', () => {
    const employeeNav = getHubSpotNavigation('employee');

    // Employee does not see Analytics & Reports
    assert.strictEqual(employeeNav.some((c) => c.id === 'analytics-reports'), false);

    // Employee does NOT see HR Management category
    const hrCat = employeeNav.find((c) => c.id === 'hr-management');
    assert.strictEqual(hrCat, undefined, 'Employee must NOT see HR Management category in the sidebar');

    // Employee sees Home
    const homeCat = employeeNav.find((c) => c.id === 'dashboard');
    assert.ok(homeCat);
    assert.strictEqual(homeCat.label, 'Home');
    assert.strictEqual(homeCat.href, '/dashboard');

    // Employee sees Work categories
    const projectsCat = employeeNav.find((c) => c.id === 'projects');
    assert.ok(projectsCat?.children?.some((c) => c.label === 'My Projects' && c.href === '/projects'));

    const peopleCat = employeeNav.find((c) => c.id === 'people-teams');
    assert.ok(peopleCat?.children?.some((c) => c.label === 'Team' && c.href === '/team'));

    const timeCat = employeeNav.find((c) => c.id === 'time-attendance');
    assert.ok(timeCat?.children?.some((c) => c.label === 'My Attendance' && c.href === '/attendance'));
    assert.ok(timeCat?.children?.some((c) => c.label === 'Time Tracking' && c.href === '/time-tracking'));

    const workCat = employeeNav.find((c) => c.id === 'work-management');
    assert.ok(workCat?.children?.some((c) => c.label === 'My Tasks' && c.href === '/tasks'));
    assert.ok(workCat?.children?.some((c) => c.label === 'Leave Management' && c.href === '/hr/leave-requests'));

    // Employee sees Collaboration categories
    const commCat = employeeNav.find((c) => c.id === 'communication');
    assert.ok(commCat?.children?.some((c) => c.label === 'Messages' && c.href === '/messages'));

    const meetingsCat = employeeNav.find((c) => c.id === 'meetings');
    assert.ok(meetingsCat?.children?.some((c) => c.label === 'My Meetings' && c.href === '/meetings'));

    const docCat = employeeNav.find((c) => c.id === 'documents');
    assert.ok(docCat?.children?.some((c) => c.label === 'My Documents' && c.href === '/hr/documents'));
    assert.ok(docCat?.children?.some((c) => c.label === 'My Payslips' && c.href === '/hr/payslips'));

    // Employee sees Personal
    const personalCat = employeeNav.find((c) => c.id === 'personal');
    assert.ok(personalCat?.children?.some((c) => c.label === 'My Profile' && c.href === '/settings/profile'));

    // Employee does not see Admin Settings
    assert.strictEqual(employeeNav.some((c) => c.id === 'settings'), false);
  });
});
