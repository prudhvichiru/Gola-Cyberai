import { Request, Response, NextFunction } from 'express';
import { DepartmentService } from '../services/department.service.js';

export class DepartmentController {
  static async getDepartments(req: Request, res: Response, next: NextFunction) {
    try {
      const departments = await DepartmentService.getDepartments();
      return res.status(200).json({ departments });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Error fetching departments.' });
    }
  }

  static async getCount(req: Request, res: Response, next: NextFunction) {
    try {
      const count = await DepartmentService.getCount();
      return res.status(200).json({ count });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Error fetching count.' });
    }
  }

  static async createDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description, head_id } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Department name is required.' });
      }
      const department = await DepartmentService.createDepartment(name, description, head_id);
      return res.status(201).json({ department });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Error creating department.' });
    }
  }
}
