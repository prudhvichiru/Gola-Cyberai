import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';

export class AuthController {
  static async signIn(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }
      const data = await AuthService.signIn(email, password);
      return res.status(200).json({
        message: 'Sign in successful',
        data,
      });
    } catch (error: any) {
      return res.status(401).json({
        error: error.message || 'Invalid login credentials.',
      });
    }
  }

  static async signUp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, firstName, lastName } = req.body;
      if (!email || !password || !firstName) {
        return res.status(400).json({ error: 'Email, password, and first name are required.' });
      }
      const data = await AuthService.signUp(email, password, firstName, lastName);
      return res.status(201).json({
        message: 'Account created successfully',
        data,
      });
    } catch (error: any) {
      return res.status(400).json({
        error: error.message || 'Error creating account.',
      });
    }
  }

  static async getSession(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization token required.' });
      }
      const token = authHeader.split(' ')[1];
      const user = await AuthService.getUser(token);
      return res.status(200).json({ user });
    } catch (error: any) {
      return res.status(401).json({ error: error.message || 'Invalid or expired token.' });
    }
  }

  static async requestAccess(req: Request, res: Response) {
    try {
      const { fullName, email, department, requestedRole, reason } = req.body;
      if (!fullName || !email || !reason) {
        return res.status(400).json({ error: 'Full name, email, and reason are required.' });
      }
      const data = await AuthService.requestAccess({
        fullName,
        email,
        department,
        requestedRole: requestedRole || 'employee',
        reason,
      });
      return res.status(201).json({
        message: 'Access request successfully registered. IT Administrator has been notified.',
        data,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to submit access request.' });
    }
  }
}
