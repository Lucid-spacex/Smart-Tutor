import { Response, NextFunction } from 'express';
import { ScoredItemsService } from './scored-items.service';
import { AuthRequest } from '../../types/express';
import { ScoredItemType } from '@prisma/client';

export class ScoredItemsController {
  private scoredItemsService: ScoredItemsService;

  constructor() {
    this.scoredItemsService = new ScoredItemsService();
  }

  getStudentScoredItems = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tutorId = req.user?.userId;
      if (!tutorId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { studentId } = req.params;
      const filters = {
        enrollmentId: req.query.enrollmentId as string,
        type: req.query.type as ScoredItemType,
        unassigned: req.query.unassigned === 'true',
      };

      const result = await this.scoredItemsService.getStudentScoredItems(studentId, tutorId, filters);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  createScoredItem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tutorId = req.user?.userId;
      if (!tutorId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const result = await this.scoredItemsService.createScoredItem(tutorId, req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  updateScoredItem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tutorId = req.user?.userId;
      if (!tutorId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const result = await this.scoredItemsService.updateScoredItem(id, tutorId, req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  deleteScoredItem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tutorId = req.user?.userId;
      if (!tutorId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      await this.scoredItemsService.deleteScoredItem(id, tutorId);
      res.status(200).json({ message: 'Scored item deleted' });
    } catch (error) {
      next(error);
    }
  };
}
