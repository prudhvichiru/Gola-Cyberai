import { Request, Response } from 'express';
import { AttendanceService } from '../services/attendance.service.js';

export class AttendanceController {
  static async getToday(req: Request, res: Response) {
    try {
      const userId = (req.query.userId as string) || (req.body.userId as string);
      if (!userId) {
        return res.status(400).json({ error: 'userId query or body parameter is required.' });
      }
      const data = await AttendanceService.getTodaySession(userId);
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Error fetching today attendance.' });
    }
  }

  static async checkIn(req: Request, res: Response) {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: 'userId is required.' });
      }
      const data = await AttendanceService.checkIn(userId);
      return res.status(200).json({ message: 'Checked in successfully', data });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Check in failed.' });
    }
  }

  static async startBreak(req: Request, res: Response) {
    try {
      const { userId, breakType } = req.body;
      if (!userId) {
        return res.status(400).json({ error: 'userId is required.' });
      }
      const data = await AttendanceService.startBreak(userId, breakType || 'break');
      return res.status(200).json({ message: 'Break started', data });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Starting break failed.' });
    }
  }

  static async endBreak(req: Request, res: Response) {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: 'userId is required.' });
      }
      const data = await AttendanceService.endBreak(userId);
      return res.status(200).json({ message: 'Break ended, resumed work', data });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Ending break failed.' });
    }
  }

  static async checkOut(req: Request, res: Response) {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: 'userId is required.' });
      }
      const data = await AttendanceService.checkOut(userId);
      return res.status(200).json({ message: 'Checked out successfully', data });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Check out failed.' });
    }
  }

  static async getHistory(req: Request, res: Response) {
    try {
      const userId = (req.query.userId as string) || (req.body.userId as string);
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 30;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required.' });
      }
      const data = await AttendanceService.getHistory(userId, limit);
      return res.status(200).json({ records: data });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Error fetching history.' });
    }
  }

  static async getTeamSummary(req: Request, res: Response) {
    try {
      const data = await AttendanceService.getTeamSummary();
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Error fetching team summary.' });
    }
  }
}
