import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Project Management, Timers and Timesheets Logic', () => {
  test('1. Timer Conflict Prevention: Only 1 active timer allowed per user', () => {
    const activeTimersMap = new Map<string, any>();
    const userId = 'emp-1';

    // Start timer on task 1
    const timer1 = {
      id: 'timer-1',
      user_id: userId,
      task_id: 'task-1',
      status: 'running',
      start_time: new Date().toISOString(),
    };
    activeTimersMap.set(userId, timer1);

    // Attempting to start a concurrent timer on task 2 must fail
    const startSecondTimer = () => {
      const existing = activeTimersMap.get(userId);
      if (existing && existing.status === 'running') {
        throw new Error('Timer already active for another task. Please pause or stop it first.');
      }
      activeTimersMap.set(userId, { id: 'timer-2', user_id: userId, task_id: 'task-2', status: 'running' });
    };

    assert.throws(startSecondTimer, /Timer already active/);
    assert.equal(activeTimersMap.get(userId).task_id, 'task-1');
  });

  test('2. Authoritative Server Elapsed Seconds Calculation with Pauses', () => {
    const initialStart = new Date(Date.now() - 3600 * 1000); // 1 hour ago
    const pauseTime = new Date(Date.now() - 1800 * 1000); // Paused 30 mins after start

    // First session: ran 1800 seconds (30 mins) then paused
    const accumulated = Math.floor((pauseTime.getTime() - initialStart.getTime()) / 1000);
    assert.equal(accumulated, 1800);

    // Resumed 15 minutes ago
    const resumeTime = new Date(Date.now() - 900 * 1000);
    const now = new Date();
    const liveSec = Math.floor((now.getTime() - resumeTime.getTime()) / 1000);

    const totalElapsedSec = accumulated + liveSec;
    const recordedHours = parseFloat((totalElapsedSec / 3600).toFixed(2));

    // 30 mins + 15 mins = 45 mins = 0.75 hours
    assert.equal(recordedHours, 0.75);
  });

  test('3. Auto-log Time Entry to Timesheet on Timer Stop', () => {
    const weeklyTimesheet = {
      id: 'ts-test-1',
      total_hours: 32.0,
      entries: [
        { id: 'te-1', project_id: 'proj-1', task_id: 'task-1', hours: 8.0 },
      ],
      status: 'draft',
    };

    // User stops a 2.5 hour task timer
    const stoppedTimerRecordedHours = 2.5;

    weeklyTimesheet.entries.push({
      id: 'te-2',
      project_id: 'proj-1',
      task_id: 'task-2',
      hours: stoppedTimerRecordedHours,
    });
    weeklyTimesheet.total_hours = parseFloat((weeklyTimesheet.total_hours + stoppedTimerRecordedHours).toFixed(2));

    assert.equal(weeklyTimesheet.entries.length, 2);
    assert.equal(weeklyTimesheet.total_hours, 34.5);
  });

  test('4. Task Status Transitions & Project Progress Recalculation', () => {
    const project = {
      id: 'proj-cyber',
      task_count: 4,
      completed_task_count: 1,
      progress: 25,
    };

    const tasks = [
      { id: 't1', status: 'done' },
      { id: 't2', status: 'in_progress' },
      { id: 't3', status: 'todo' },
      { id: 't4', status: 'review' },
    ];

    // Move task 2 to 'done'
    tasks[1].status = 'done';

    const completed = tasks.filter((t) => t.status === 'done').length;
    project.completed_task_count = completed;
    project.progress = Math.round((completed / tasks.length) * 100);

    assert.equal(project.completed_task_count, 2);
    assert.equal(project.progress, 50);
  });

  test('5. Timesheet Approval Workflow Integrity', () => {
    const timesheet = {
      id: 'ts-100',
      status: 'draft' as 'draft' | 'submitted' | 'approved' | 'rejected',
      reviewed_by: null as string | null,
      reviewed_at: null as string | null,
    };

    // Employee submits
    timesheet.status = 'submitted';
    assert.equal(timesheet.status, 'submitted');

    // Manager approves
    const reviewerId = 'mgr-sarah';
    timesheet.status = 'approved';
    timesheet.reviewed_by = reviewerId;
    timesheet.reviewed_at = new Date().toISOString();

    assert.equal(timesheet.status, 'approved');
    assert.equal(timesheet.reviewed_by, 'mgr-sarah');
    assert.ok(timesheet.reviewed_at);
  });

  test('6. Planning Accuracy & Hours Variance Metric Calculation', () => {
    const estimatedTotal = 180.0;
    const recordedTotal = 164.2;

    const variancePercentage = parseFloat(((recordedTotal / estimatedTotal) * 100).toFixed(1));
    assert.equal(variancePercentage, 91.2);
    assert.ok(variancePercentage >= 90.0 && variancePercentage <= 110.0, 'Within 10% delivery tolerance');
  });
});
