import { Router } from 'express';
import { AttendanceController } from '../controllers/attendance.controller.js';

export const attendanceRouter = Router();

attendanceRouter.get('/today', AttendanceController.getToday);
attendanceRouter.post('/check-in', AttendanceController.checkIn);
attendanceRouter.post('/break/start', AttendanceController.startBreak);
attendanceRouter.post('/break/end', AttendanceController.endBreak);
attendanceRouter.post('/check-out', AttendanceController.checkOut);
attendanceRouter.get('/history', AttendanceController.getHistory);
attendanceRouter.get('/team-summary', AttendanceController.getTeamSummary);
