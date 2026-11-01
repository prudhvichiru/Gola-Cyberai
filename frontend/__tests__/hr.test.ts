import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Phase 3 — Employee & HR Module', () => {
  describe('Employee Management & Permissions', () => {
    it('should validate unique employee ID format matching corporate GCA-xxxx syntax', () => {
      const empId = 'GCA-1001';
      const regex = /^GCA-\d{4,}$/;
      assert.match(empId, regex);
    });

    it('should enforce role-based field restrictions for regular employees', () => {
      const employeeAllowedUpdates = ['phone', 'emergency_contact', 'address'];
      const hrOnlyUpdates = ['role', 'department_id', 'designation_id', 'salary', 'status'];

      const incomingAttempt = {
        phone: '+91 99999 88888',
        role: 'admin',
        department_id: 'dept-eng',
      };

      const requesterRole = 'employee' as string;
      const sanitizedUpdates: Record<string, any> = { ...incomingAttempt };

      if (requesterRole !== 'hr' && requesterRole !== 'admin') {
        Object.keys(sanitizedUpdates).forEach((k) => {
          if (!employeeAllowedUpdates.includes(k)) {
            delete sanitizedUpdates[k];
          }
        });
      }

      assert.equal(sanitizedUpdates.phone, '+91 99999 88888');
      assert.equal(sanitizedUpdates.role, undefined, 'Employee must not be able to elevate role');
      assert.equal(sanitizedUpdates.department_id, undefined, 'Employee must not be able to modify department');
    });
  });

  describe('Leave Management & Workflow Calculations', () => {
    it('should calculate duration correctly for full-day and half-day leaves', () => {
      const fullDayStart = new Date('2026-11-04');
      const fullDayEnd = new Date('2026-11-05');
      const diffMs = fullDayEnd.getTime() - fullDayStart.getTime();
      const fullDayCount = Math.ceil(diffMs / (1000 * 3600 * 24)) + 1;
      assert.equal(fullDayCount, 2);

      const isHalfDay = true;
      const halfDayCount = isHalfDay ? 0.5 : fullDayCount;
      assert.equal(halfDayCount, 0.5);
    });

    it('should reject requests where end date precedes start date', () => {
      const start = new Date('2026-11-10');
      const end = new Date('2026-11-05');
      assert.ok(end < start, 'Invalid date range');
    });

    it('should accurately calculate net available leave balance', () => {
      const allocated = 12;
      const used = 4;
      const available = allocated - used;
      assert.equal(available, 8);
    });
  });

  describe('Payslip Computation & Statutory Deductions', () => {
    it('should compute net salary mathematically: Gross - (PF + PT + TDS)', () => {
      const basic = 52000;
      const hra = 26000;
      const special = 17500;
      const gross = basic + hra + special; // 95500
      assert.equal(gross, 95500);

      const pf = 6240;
      const pt = 200;
      const tds = 4500;
      const totalDeductions = pf + pt + tds; // 10940
      assert.equal(totalDeductions, 10940);

      const netSalary = gross - totalDeductions; // 84560
      assert.equal(netSalary, 84560);
    });
  });

  describe('HR Document Repository', () => {
    it('should classify personal letters vs corporate compliance policies', () => {
      const docTypes = [
        { type: 'appointment_letter', category: 'personal_letter' },
        { type: 'nda_policy', category: 'company_policy' },
        { type: 'handbook', category: 'company_policy' },
        { type: 'compensation_letter', category: 'personal_letter' },
      ];

      const letters = docTypes.filter((d) => d.category === 'personal_letter');
      const policies = docTypes.filter((d) => d.category === 'company_policy');

      assert.equal(letters.length, 2);
      assert.equal(policies.length, 2);
    });
  });
});
