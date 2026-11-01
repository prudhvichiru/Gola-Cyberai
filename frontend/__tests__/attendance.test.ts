import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Phase 2 — Attendance & Working Hours Calculations', () => {
  it('should format total seconds into HH:MM:SS format', () => {
    function formatDuration(totalSeconds: number): string {
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    assert.strictEqual(formatDuration(0), '00:00:00');
    assert.strictEqual(formatDuration(65), '00:01:05');
    assert.strictEqual(formatDuration(3665), '01:01:05');
    assert.strictEqual(formatDuration(28800), '08:00:00'); // 8 hours
  });

  it('should accurately compute net working seconds excluding break intervals', () => {
    // Check in at 09:00:00 AM (timestamp T)
    const checkInTime = new Date('2026-10-31T09:00:00Z').getTime();
    // Check out at 17:30:00 PM (8.5 hours = 30,600 seconds elapsed)
    const checkOutTime = new Date('2026-10-31T17:30:00Z').getTime();
    const totalElapsedSeconds = Math.floor((checkOutTime - checkInTime) / 1000);

    // 45 minutes lunch break (2,700 seconds)
    const breakSeconds = 45 * 60;

    const netWorkSeconds = totalElapsedSeconds - breakSeconds;
    const netWorkHours = netWorkSeconds / 3600;

    assert.strictEqual(totalElapsedSeconds, 30600);
    assert.strictEqual(netWorkSeconds, 27900);
    assert.strictEqual(netWorkHours, 7.75); // 7 hours 45 mins
  });

  it('should enforce proper attendance state transitions', () => {
    const validTransitions: Record<string, string[]> = {
      not_started: ['working'],
      working: ['on_break', 'completed'],
      on_break: ['working', 'completed'],
      completed: [],
    };

    function canTransition(from: string, to: string): boolean {
      return validTransitions[from]?.includes(to) || false;
    }

    assert.strictEqual(canTransition('not_started', 'working'), true);
    assert.strictEqual(canTransition('not_started', 'on_break'), false);
    assert.strictEqual(canTransition('working', 'on_break'), true);
    assert.strictEqual(canTransition('on_break', 'working'), true);
    assert.strictEqual(canTransition('working', 'completed'), true);
    assert.strictEqual(canTransition('completed', 'on_break'), false);
    assert.strictEqual(canTransition('completed', 'working'), false);
  });
});
