import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import { PerformanceService } from '../performance/performance.service';
import { AuthRequest } from '../../types/express';

export class ParentController {
  private performanceService: PerformanceService;

  constructor() {
    this.performanceService = new PerformanceService();
  }

  getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  };

  getStudentPerformance = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
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
        userId,
        'PARENT',
        options
      );

      res.status(200).json(performance);
    } catch (error) {
      next(error);
    }
  };
}
