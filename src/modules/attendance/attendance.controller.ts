import { Response, NextFunction } from 'express';
import { AttendanceService } from './attendance.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export class AttendanceController {
  private attendanceService: AttendanceService;

  constructor() {
    this.attendanceService = new AttendanceService();
  }

  getStudentAttendance = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const requestorId = req.user?.userId;
      const requestorRole = req.user?.role;
      if (!requestorId || !requestorRole) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const attendance = await this.attendanceService.getStudentAttendance(id, requestorId, requestorRole);
      res.status(200).json(attendance);
    } catch (error) {
      next(error);
    }
  };

  getMyAttendance = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const attendance = await this.attendanceService.getMyAttendance(userId);
      res.status(200).json(attendance);
    } catch (error) {
      next(error);
    }
  };
}
