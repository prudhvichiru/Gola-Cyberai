import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service.js';

export class AnalyticsController {
  static async getOverview(req: Request, res: Response) {
    try {
      const data = await AnalyticsService.getOverviewMetrics();
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error fetching analytics overview' });
    }
  }
}
