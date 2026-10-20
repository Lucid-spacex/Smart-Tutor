import { Request, Response, NextFunction } from 'express';
import { TutorService } from './tutor.service';
import { CreateTutorProfileInput, UpdateAvailabilityInput } from './tutor.validation';
import { SessionsService } from '../sessions/sessions.service';
import { CreateTutorSessionInput, RescheduleTutorSessionInput } from '../sessions/sessions.validation';
import { PerformanceService } from '../performance/performance.service';
import { ScoredItemsService } from '../scored-items/scored-items.service';
import { AuthRequest } from '../../types/express';

export class TutorController {
  private tutorService: TutorService;
  private sessionsService: SessionsService;
  private performanceService: PerformanceService;
  private scoredItemsService: ScoredItemsService;

  constructor() {
    this.tutorService = new TutorService();
    this.sessionsService = new SessionsService();
    this.performanceService = new PerformanceService();
    this.scoredItemsService = new ScoredItemsService();
  }

  createTutorProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tutorId = (req as any).user?.userId;
      if (!tutorId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const data: CreateTutorProfileInput = req.body;
      const profile = await this.tutorService.createTutorProfile(tutorId, data);
      res.status(201).json(profile);
    } catch (error) {
      next(error);
    }
  };

  updateAvailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tutorId = (req as any).user?.userId;
      if (!tutorId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const data: UpdateAvailabilityInput = req.body;
      const profile = await this.tutorService.updateAvailability(tutorId, data);
      res.status(200).json(profile);
    } catch (error) {
      next(error);
    }
  };

  updateAvailabilityStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tutorId = (req as any).user?.userId;
      if (!tutorId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const data = req.body;
      const profile = await this.tutorService.updateAvailabilityStatus(tutorId, data);
      res.status(200).json(profile);
    } catch (error) {
      next(error);
    }
  };

  getAssignedStudents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tutorId = (req as any).user?.userId;
      if (!tutorId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const students = await this.tutorService.getAssignedStudents(tutorId);
      res.status(200).json(students);
    } catch (error) {
      next(error);
    }
  };

  getTutorSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tutorId = (req as any).user?.userId;
      if (!tutorId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const sessions = await this.tutorService.getTutorSessions(tutorId);
      res.status(200).json(sessions);
    } catch (error) {
      next(error);
    }
  };

  getTutorProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tutorId = (req as any).user?.userId;
      if (!tutorId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const profile = await this.tutorService.getTutorProfile(tutorId);
      res.status(200).json(profile);
    } catch (error) {
      next(error);
    }
  };

  getStudentDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tutorId = (req as any).user?.userId;
      if (!tutorId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { studentId } = req.params;
      const studentDetail = await this.tutorService.getStudentDetail(tutorId, studentId);
      res.status(200).json(studentDetail);
    } catch (error) {
      next(error);
    }
  };

  createTutorSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tutorId = (req as any).user?.userId;
      if (!tutorId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const data: CreateTutorSessionInput = req.body;
      const session = await this.sessionsService.createTutorSession(tutorId, data);
      res.status(201).json(session);
    } catch (error) {
      next(error);
    }
  };

  rescheduleTutorSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tutorId = (req as any).user?.userId;
      if (!tutorId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const data: RescheduleTutorSessionInput = req.body;
      const session = await this.sessionsService.rescheduleTutorSession(id, tutorId, data);
      res.status(200).json(session);
    } catch (error) {
      next(error);
    }
  };

  deleteTutorSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tutorId = (req as any).user?.userId;
      if (!tutorId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      await this.sessionsService.deleteSession(id, tutorId);
      res.status(200).json({ message: 'Session deleted successfully' });
    } catch (error) {
      next(error);
    }
  };

  getStudentPerformance = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tutorId = req.user?.userId;
      if (!tutorId) {
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
        tutorId,
        'TUTOR',
        options
      );

      res.status(200).json(performance);
    } catch (error) {
      next(error);
    }
  };

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
        type: req.query.type as any,
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
