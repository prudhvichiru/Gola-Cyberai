import { Router } from 'express';
import { HRController } from '../controllers/hr.controller.js';

export const hrRouter = Router();

// Employees
hrRouter.get('/employees', HRController.getEmployees);
hrRouter.get('/employees/:id', HRController.getEmployeeById);
hrRouter.post('/employees', HRController.createEmployee);
hrRouter.patch('/employees/:id', HRController.updateEmployee);

// Departments & Designations
hrRouter.get('/departments', HRController.getDepartments);
hrRouter.post('/departments', HRController.createDepartment);
hrRouter.get('/designations', HRController.getDesignations);
hrRouter.post('/designations', HRController.createDesignation);

// Leaves
hrRouter.get('/leave/types', HRController.getLeaveTypes);
hrRouter.get('/leave/balances', HRController.getLeaveBalances);
hrRouter.get('/leave/holidays', HRController.getHolidays);
hrRouter.get('/leave/my-requests', HRController.getMyLeaveRequests);
hrRouter.get('/leave/approval-queue', HRController.getApprovalQueue);
hrRouter.post('/leave/apply', HRController.applyLeave);
hrRouter.post('/leave/review', HRController.reviewLeave);

// Payslips
hrRouter.get('/payslips/my', HRController.getMyPayslips);
hrRouter.get('/payslips/:id', HRController.getPayslipById);
hrRouter.post('/payslips/publish', HRController.publishPayslip);

// Documents & Letters
hrRouter.get('/documents', HRController.getDocuments);
hrRouter.post('/documents', HRController.createDocument);
