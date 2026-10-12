import { Response, NextFunction } from 'express';
import { SubjectsService } from './subjects.service';
import { AuthRequest } from '../../types/express';

export class SubjectsController {
  private subjectsService: SubjectsService;

  constructor() {
    this.subjectsService = new SubjectsService();
  }

  getSubjects = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const gradeBandTier = req.query.gradeBandTier as string;
      const category = req.query.category as string;
      const userRole = req.user?.role;

      const subjects = await this.subjectsService.getPublicSubjects(
        { gradeBandTier, category },
        userRole
      );
      res.status(200).json(subjects);
    } catch (error) {
      next(error);
    }
  };

  getPricingQuote = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parentId = req.user?.userId;
      const studentId = req.query.studentId as string;
      const subjectIds = req.query.subjectIds as string;

      if (!parentId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      if (!studentId || !subjectIds) {
        res.status(400).json({ error: 'studentId and subjectIds are required' });
        return;
      }

      const subjectIdArray = subjectIds.split(',');
      const quote = await this.subjectsService.getPricingQuote(studentId, subjectIdArray, parentId);
      res.status(200).json(quote);
    } catch (error) {
      next(error);
    }
  };
}
