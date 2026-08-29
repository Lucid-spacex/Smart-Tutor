import { Request, Response, NextFunction } from 'express';
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentInput, GetEnrollmentsQuery } from './enrollments.validation';

export class EnrollmentsController {
  private enrollmentsService: EnrollmentsService;

  constructor() {
    this.enrollmentsService = new EnrollmentsService();
  }

  createEnrollment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parentId = (req as any).user?.userId;
      if (!parentId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const data: CreateEnrollmentInput = req.body;
      const enrollment = await this.enrollmentsService.createEnrollment(parentId, data);
      res.status(201).json(enrollment);
    } catch (error) {
      next(error);
    }
  };

  getEnrollments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      const userRole = (req as any).user?.role;
      if (!userId || !userRole) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const query: GetEnrollmentsQuery = req.query as any;
      let enrollments;

      if (userRole === 'PARENT') {
        enrollments = await this.enrollmentsService.getEnrollmentsByParent(userId, query);
      } else if (userRole === 'TUTOR') {
        enrollments = await this.enrollmentsService.getEnrollmentsByTutor(userId, query);
      } else {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      res.status(200).json(enrollments);
    } catch (error) {
      next(error);
    }
  };

  getEnrollmentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      const userRole = (req as any).user?.role;
      if (!userId || !userRole) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const enrollment = await this.enrollmentsService.getEnrollmentById(id, userId, userRole);
      res.status(200).json(enrollment);
    } catch (error) {
      next(error);
    }
  };
}
