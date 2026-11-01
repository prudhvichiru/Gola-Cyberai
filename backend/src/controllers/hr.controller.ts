import { Request, Response } from 'express';
import { HRService } from '../services/hr.service.js';

export class HRController {
  // Employees
  static async getEmployees(req: Request, res: Response) {
    try {
      const { search, departmentId, role, status } = req.query;
      const data = await HRService.getEmployees({
        search: search as string,
        departmentId: departmentId as string,
        role: role as string,
        status: status as string,
      });
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error fetching employees' });
    }
  }

  static async getEmployeeById(req: Request, res: Response) {
    try {
      const data = await HRService.getEmployeeById(req.params.id);
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(404).json({ error: err.message || 'Employee not found' });
    }
  }

  static async createEmployee(req: Request, res: Response) {
    try {
      const data = await HRService.createEmployee(req.body);
      return res.status(201).json({ message: 'Employee created successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Error creating employee' });
    }
  }

  static async updateEmployee(req: Request, res: Response) {
    try {
      const requesterRole = (req.headers['x-user-role'] as string) || 'hr';
      const data = await HRService.updateEmployee(req.params.id, req.body, requesterRole);
      return res.status(200).json({ message: 'Employee updated successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Error updating employee' });
    }
  }

  // Departments & Designations
  static async getDepartments(req: Request, res: Response) {
    try {
      const data = await HRService.getDepartments();
      return res.status(200).json({ departments: data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error fetching departments' });
    }
  }

  static async createDepartment(req: Request, res: Response) {
    try {
      const data = await HRService.createDepartment(req.body);
      return res.status(201).json({ message: 'Department created successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Error creating department' });
    }
  }

  static async getDesignations(req: Request, res: Response) {
    try {
      const { departmentId } = req.query;
      const data = await HRService.getDesignations(departmentId as string);
      return res.status(200).json({ designations: data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error fetching designations' });
    }
  }

  static async createDesignation(req: Request, res: Response) {
    try {
      const data = await HRService.createDesignation(req.body);
      return res.status(201).json({ message: 'Designation created successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Error creating designation' });
    }
  }

  // Leaves
  static async getLeaveTypes(req: Request, res: Response) {
    try {
      const data = await HRService.getLeaveTypes();
      return res.status(200).json({ types: data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error fetching leave types' });
    }
  }

  static async getLeaveBalances(req: Request, res: Response) {
    try {
      const userId = (req.query.userId as string) || 'current-user';
      const data = await HRService.getLeaveBalances(userId);
      return res.status(200).json({ balances: data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error fetching leave balances' });
    }
  }

  static async getHolidays(req: Request, res: Response) {
    try {
      const data = await HRService.getHolidays();
      return res.status(200).json({ holidays: data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error fetching holidays' });
    }
  }

  static async getMyLeaveRequests(req: Request, res: Response) {
    try {
      const userId = (req.query.userId as string) || 'current-user';
      const data = await HRService.getMyLeaveRequests(userId);
      return res.status(200).json({ requests: data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error fetching leave requests' });
    }
  }

  static async getApprovalQueue(req: Request, res: Response) {
    try {
      const data = await HRService.getApprovalQueue();
      return res.status(200).json({ queue: data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error fetching approval queue' });
    }
  }

  static async applyLeave(req: Request, res: Response) {
    try {
      const userId = req.body.userId || 'current-user';
      const data = await HRService.applyLeave(userId, req.body);
      return res.status(201).json({ message: 'Leave application submitted successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to apply leave' });
    }
  }

  static async reviewLeave(req: Request, res: Response) {
    try {
      const { requestId, reviewerId, status, rejectionReason } = req.body;
      const data = await HRService.reviewLeave(requestId, reviewerId || 'reviewer-id', status, rejectionReason);
      return res.status(200).json({ message: `Leave request ${status} successfully`, data });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to review leave' });
    }
  }

  // Payslips
  static async getMyPayslips(req: Request, res: Response) {
    try {
      const requesterRole = (req.headers['x-user-role'] as string) || 'employee';
      const requesterUserId = (req.headers['x-user-id'] as string) || (req.query.userId as string) || 'current-user';
      // Strict ownership: Employee can never request another user's payslips
      const targetUserId = requesterRole === 'employee' ? requesterUserId : ((req.query.userId as string) || requesterUserId);
      const data = await HRService.getMyPayslips(targetUserId);
      return res.status(200).json({ payslips: data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error fetching payslips' });
    }
  }

  static async getPayslipById(req: Request, res: Response) {
    try {
      const requesterUserId = (req.headers['x-user-id'] as string) || (req.query.userId as string) || 'current-user';
      const requesterRole = (req.headers['x-user-role'] as string) || 'employee';
      const data = await HRService.getPayslipById(req.params.id, requesterUserId, requesterRole);
      return res.status(200).json(data);
    } catch (err: any) {
      const status = err.message?.includes('Access denied') || err.message?.includes('Unauthorized') ? 403 : 404;
      return res.status(status).json({ error: err.message || 'Payslip not found' });
    }
  }

  static async publishPayslip(req: Request, res: Response) {
    try {
      const requesterRole = (req.headers['x-user-role'] as string) || 'employee';
      if (requesterRole === 'employee') {
        return res.status(403).json({ error: 'Access denied: Employees cannot publish or administer payroll' });
      }
      const data = await HRService.publishPayslip(req.body);
      return res.status(201).json({ message: 'Payslip published successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Error publishing payslip' });
    }
  }

  // Documents
  static async getDocuments(req: Request, res: Response) {
    try {
      const { category } = req.query;
      const data = await HRService.getDocuments(category as string);
      return res.status(200).json({ documents: data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error fetching documents' });
    }
  }

  static async createDocument(req: Request, res: Response) {
    try {
      const data = await HRService.createDocument(req.body);
      return res.status(201).json({ message: 'Document registered successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Error creating document' });
    }
  }
}
