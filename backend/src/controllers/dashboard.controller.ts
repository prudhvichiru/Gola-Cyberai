import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service.js';

export class DashboardController {
  static async getMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await DashboardService.getMetrics();
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Error fetching dashboard metrics.' });
    }
  }
}
