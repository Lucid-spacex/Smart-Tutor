import { Request, Response, NextFunction } from 'express';
import { PerformanceService } from './performance.service';
import { AuthRequest } from '../../types/express';
import prisma from '../../config/database';

export class PerformanceController {
  private performanceService: PerformanceService;

  constructor() {
    this.performanceService = new PerformanceService();
  }

  getStudentPerformance = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const requestorId = req.user?.userId;
      const requestorRole = req.user?.role;

      if (!requestorId || !requestorRole) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { studentId } = req.params;
      const options = {
        period: req.query.period as 'week' | 'month' | 'quarter' | 'year' | 'all',
        from: req.query.from as string,
        to: req.query.to as string,
        subjectId: req.query.subjectId as string,
        includePending: req.query.includePending === 'true',
      };

      const performance = await this.performanceService.getStudentPerformance(
        studentId,
        requestorId,
        requestorRole,
        options
      );

      res.status(200).json(performance);
    } catch (error) {
      next(error);
    }
  };

  getMyPerformance = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const requestorId = req.user?.userId;
      const requestorRole = req.user?.role;

      if (!requestorId || !requestorRole) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      if (requestorRole !== 'STUDENT') {
        res.status(403).json({ error: 'Only students can access their own performance' });
        return;
      }

      // Get student ID from user
      const student = await prisma.student.findUnique({
        where: { userId: requestorId },
      });

      if (!student) {
        res.status(404).json({ error: 'Student profile not found' });
        return;
      }

      const options = {
        period: req.query.period as 'week' | 'month' | 'quarter' | 'year' | 'all',
        from: req.query.from as string,
        to: req.query.to as string,
        subjectId: req.query.subjectId as string,
        includePending: req.query.includePending === 'true',
      };

      const performance = await this.performanceService.getStudentPerformance(
        student.id,
        requestorId,
        requestorRole,
        options
      );

      res.status(200).json(performance);
    } catch (error) {
      next(error);
    }
  };
}
