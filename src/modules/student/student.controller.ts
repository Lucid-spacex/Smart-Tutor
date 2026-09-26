import { Response, NextFunction } from 'express';
import { StudentService } from './student.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export class StudentController {
  private studentService: StudentService;

  constructor() {
    this.studentService = new StudentService();
  }

  getStudentProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const profile = await this.studentService.getStudentProfile(userId);
      res.status(200).json(profile);
    } catch (error) {
      next(error);
    }
  };

  getStudentSchedule = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const schedule = await this.studentService.getStudentSchedule(userId);
      res.status(200).json(schedule);
    } catch (error) {
      next(error);
    }
  };

  getStudentAssignments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const assignments = await this.studentService.getStudentAssignments(userId);
      res.status(200).json(assignments);
    } catch (error) {
      next(error);
    }
  };

  getStudentGrades = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const grades = await this.studentService.getStudentGrades(userId);
      res.status(200).json(grades);
    } catch (error) {
      next(error);
    }
  };

  getStudentProgressReports = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const progressReports = await this.studentService.getStudentProgressReports(userId);
      res.status(200).json(progressReports);
    } catch (error) {
      next(error);
    }
  };

  getStudentNotifications = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const notifications = await this.studentService.getStudentNotifications(userId);
      res.status(200).json(notifications);
    } catch (error) {
      next(error);
    }
  };

  getNextClass = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const nextClass = await this.studentService.getNextClass(userId);
      res.status(200).json(nextClass);
    } catch (error) {
      next(error);
    }
  };

  getMyTutors = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const tutors = await this.studentService.getMyTutors(userId);
      res.status(200).json(tutors);
    } catch (error) {
      next(error);
    }
  };
}
