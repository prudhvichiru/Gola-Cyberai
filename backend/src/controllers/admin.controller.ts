import { Request, Response } from 'express';
import { AdminService } from '../services/admin.service.js';

export class AdminController {
  static async getUsers(req: Request, res: Response) {
    try {
      const users = await AdminService.getUsers();
      return res.status(200).json(users);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error fetching users' });
    }
  }

  static async updateUserRole(req: Request, res: Response) {
    try {
      const { role } = req.body;
      const user = await AdminService.updateUserRole(req.params.id, role);
      return res.status(200).json({ message: 'User role updated successfully', data: user });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Error updating user role' });
    }
  }

  static async getCompanySettings(req: Request, res: Response) {
    try {
      const settings = await AdminService.getCompanySettings();
      return res.status(200).json(settings);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error fetching company settings' });
    }
  }

  static async updateCompanySettings(req: Request, res: Response) {
    try {
      const settings = await AdminService.updateCompanySettings(req.body);
      return res.status(200).json({ message: 'Company settings updated successfully', data: settings });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Error updating company settings' });
    }
  }

  static async getSecuritySessions(req: Request, res: Response) {
    try {
      const sessions = await AdminService.getSecuritySessions();
      return res.status(200).json(sessions);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error fetching security sessions' });
    }
  }

  static async revokeSession(req: Request, res: Response) {
    try {
      const result = await AdminService.revokeSession(req.params.id);
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Error revoking session' });
    }
  }

  static async getAuditLogs(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const logs = await AdminService.getAuditLogs(limit);
      return res.status(200).json(logs);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error fetching audit logs' });
    }
  }
}
