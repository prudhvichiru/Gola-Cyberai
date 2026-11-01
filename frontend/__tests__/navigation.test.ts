import { describe, it } from 'node:test';
import assert from 'node:assert';
import { navItems, filterNavItems } from '../lib/navigation';

describe('Gola CyberAI Navigation System', () => {
  it('should have exactly 15 primary navigation items in the master prompt order', () => {
    const expectedOrder = [
      'Dashboard',
      'Projects',
      'Team',
      'Clients',
      'Analytics',
      'Calendar',
      'Messages',
      'Attendance',
      'Time Tracking',
      'Tasks',
      'HR Management',
      'Meetings',
      'Documents',
      'Reports',
      'Settings',
    ];

    assert.strictEqual(navItems.length, 15);
    navItems.forEach((item, index) => {
      assert.strictEqual(
        item.label,
        expectedOrder[index],
        `Expected nav item ${index + 1} to be ${expectedOrder[index]}, got ${item.label}`,
      );
    });
  });

  it('should restrict Employee role from administrative HR & Settings routes', () => {
    const employeeItems = filterNavItems('employee');

    // HR Management checks
    const hrItem = employeeItems.find((i) => i.label === 'HR Management');
    assert.ok(hrItem, 'HR Management group should exist for employees');
    const hrChildren = hrItem.children?.map((c) => c.label) || [];
    assert.strictEqual(
      hrChildren.includes('Leave Approvals'),
      false,
      'Employees should not see Leave Approvals',
    );
    assert.ok(hrChildren.includes('Leave Requests'), 'Employees must see Leave Requests');
    assert.ok(hrChildren.includes('Payslips'), 'Employees must see Payslips');

    // Settings checks
    const settingsItem = employeeItems.find((i) => i.label === 'Settings');
    assert.ok(settingsItem, 'Settings group should exist for employees');
    const settingsChildren = settingsItem.children?.map((c) => c.label) || [];
    assert.strictEqual(settingsChildren.includes('Users & Roles'), false);
    assert.strictEqual(settingsChildren.includes('Permissions'), false);
    assert.strictEqual(settingsChildren.includes('Audit Logs'), false);
    assert.ok(settingsChildren.includes('My Profile'));
    assert.ok(settingsChildren.includes('Security'));
  });

  it('should grant Administrator role access to all routes and submenus', () => {
    const adminItems = filterNavItems('admin');

    const hrItem = adminItems.find((i) => i.label === 'HR Management');
    const hrChildren = hrItem?.children?.map((c) => c.label) || [];
    assert.ok(hrChildren.includes('Leave Approvals'));

    const settingsItem = adminItems.find((i) => i.label === 'Settings');
    const settingsChildren = settingsItem?.children?.map((c) => c.label) || [];
    assert.ok(settingsChildren.includes('Users & Roles'));
    assert.ok(settingsChildren.includes('Permissions'));
    assert.ok(settingsChildren.includes('Company Settings'));
    assert.ok(settingsChildren.includes('Audit Logs'));
  });

  it('should grant Manager role access to team leave approvals but not admin settings', () => {
    const managerItems = filterNavItems('manager');

    const hrItem = managerItems.find((i) => i.label === 'HR Management');
    const hrChildren = hrItem?.children?.map((c) => c.label) || [];
    assert.ok(hrChildren.includes('Leave Approvals'), 'Managers must see Leave Approvals');

    const settingsItem = managerItems.find((i) => i.label === 'Settings');
    const settingsChildren = settingsItem?.children?.map((c) => c.label) || [];
    assert.strictEqual(settingsChildren.includes('Permissions'), false);
    assert.strictEqual(settingsChildren.includes('Audit Logs'), false);
  });
});
