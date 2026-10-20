import { Response, NextFunction } from 'express';
import { SubjectsService } from '../subjects/subjects.service';
import { AuthRequest } from '../../types/express';

export class AdminSubjectsController {
  private subjectsService: SubjectsService;

  constructor() {
    this.subjectsService = new SubjectsService();
  }

  getSubjects = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const category = req.query.category as string;

      const subjects = await this.subjectsService.getAdminSubjects({
        includeInactive,
        category,
      });
      res.status(200).json(subjects);
    } catch (error) {
      next(error);
    }
  };

  createSubject = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user?.userId;
      if (!adminId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const data = req.body;
      const subject = await this.subjectsService.createSubject(data, adminId);
      res.status(201).json(subject);
    } catch (error: any) {
      // Handle Prisma unique constraint error
      if (error.code === 'P2002') {
        res.status(409).json({
          error: 'DUPLICATE_SUBJECT',
          message: 'A subject with this name already exists. Please use a different name or update the existing subject.',
        });
        return;
      }

      next(error);
    }
  };

  updateSubject = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const data = req.body;

      const subject = await this.subjectsService.updateSubject(id, data);
      res.status(200).json(subject);
    } catch (error: any) {
      // Handle Prisma unique constraint error
      if (error.code === 'P2002') {
        res.status(409).json({
          error: 'DUPLICATE_SUBJECT',
          message: 'A subject with this name already exists. Please use a different name.',
        });
        return;
      }

      next(error);
    }
  };

  upsertSubjectPrice = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user?.userId;
      if (!adminId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const { gradeBandTier } = req.params;
      const data = req.body;

      const price = await this.subjectsService.upsertSubjectPrice(
        id,
        gradeBandTier as any,
        data,
        adminId
      );
      res.status(200).json(price);
    } catch (error) {
      next(error);
    }
  };

  deleteSubject = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.subjectsService.deleteSubject(id);

      if (result.isActive === false) {
        res.status(200).json({
          message: 'Subject soft-deleted (set to inactive) because it has active enrollments',
          subject: result,
        });
      } else {
        res.status(200).json({
          message: 'Subject hard-deleted',
          subject: result,
        });
      }
    } catch (error) {
      next(error);
    }
  };
}
