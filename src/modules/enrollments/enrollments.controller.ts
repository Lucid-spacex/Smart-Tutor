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
      const parentId = req.user?.userId;
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
      const parentId = req.user?.userId;
      if (!parentId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const query: GetEnrollmentsQuery = req.query as any;
      const enrollments = await this.enrollmentsService.getEnrollmentsByParent(parentId, query);
      res.status(200).json(enrollments);
    } catch (error) {
      next(error);
    }
  };

  getEnrollmentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parentId = req.user?.userId;
      if (!parentId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const enrollment = await this.enrollmentsService.getEnrollmentById(id, parentId);
      res.status(200).json(enrollment);
    } catch (error) {
      next(error);
    }
  };
}
