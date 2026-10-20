import { Response, NextFunction } from 'express';
import { ClassRemindersService } from './class-reminders.service';
import { AuthRequest } from '../../types/express';

export class ClassRemindersController {
  private classRemindersService: ClassRemindersService;

  constructor() {
    this.classRemindersService = new ClassRemindersService();
  }

  // Tutor endpoint

  getTutorUpcomingClasses = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tutorId = req.user?.userId;
      if (!tutorId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const filters = {
        from: req.query.from as string,
        to: req.query.to as string,
      };

      const classes = await this.classRemindersService.getTutorUpcomingClasses(tutorId, filters);
      res.status(200).json(classes);
    } catch (error) {
      next(error);
    }
  };

  // Admin endpoint

  getAdminClassSchedule = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters = {
        tutorId: req.query.tutorId as string,
        status: req.query.status as string,
        from: req.query.from as string,
        to: req.query.to as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      };

      const result = await this.classRemindersService.getAdminClassSchedule(filters);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
