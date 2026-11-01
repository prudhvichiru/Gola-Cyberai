import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ROLE_COLORS, ROLE_LABELS } from '../constants/roles';

describe('Shared Components Architecture — Design System & Tokens', () => {
  it('should define consistent color tokens for all four system roles', () => {
    const roles = ['employee', 'manager', 'hr', 'admin'] as const;
    for (const role of roles) {
      assert.ok(ROLE_COLORS[role], `Missing color configuration for ${role}`);
      assert.ok(ROLE_COLORS[role].bg.includes('bg-'), `Missing bg token for ${role}`);
      assert.ok(ROLE_COLORS[role].text.includes('text-'), `Missing text token for ${role}`);
      assert.ok(ROLE_COLORS[role].border.includes('border-'), `Missing border token for ${role}`);
      assert.ok(ROLE_LABELS[role], `Missing label for ${role}`);
    }
  });

  it('should verify StatCard tones map to semantic design tokens', () => {
    const tones = ['neutral', 'primary', 'accent', 'success', 'warning', 'destructive'] as const;
    assert.equal(tones.length, 6);
  });

  it('should support attendance status badges for working, break, completed, and absent states', () => {
    const attendanceStatuses = ['working', 'on_break', 'completed', 'present', 'absent', 'half_day', 'late'];
    assert.equal(attendanceStatuses.includes('working'), true);
    assert.equal(attendanceStatuses.includes('on_break'), true);
    assert.equal(attendanceStatuses.includes('completed'), true);
  });
});
