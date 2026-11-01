import { Request, Response, NextFunction } from 'express';
import { ProfileService } from '../services/profile.service.js';

export class ProfileController {
  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const profile = await ProfileService.getProfileById(id);
      if (!profile) {
        return res.status(404).json({ error: 'Profile not found.' });
      }
      return res.status(200).json({ profile });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Error fetching profile.' });
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updated = await ProfileService.updateProfile(id, req.body);
      return res.status(200).json({ profile: updated });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Error updating profile.' });
    }
  }

  static async getActiveCount(req: Request, res: Response, next: NextFunction) {
    try {
      const count = await ProfileService.getActiveCount();
      return res.status(200).json({ count });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Error fetching count.' });
    }
  }
}
