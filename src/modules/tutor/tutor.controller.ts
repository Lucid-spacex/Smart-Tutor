import { Request, Response, NextFunction } from 'express';
import { TutorService } from './tutor.service';
import { CreateTutorProfileInput, UpdateAvailabilityInput } from './tutor.validation';

export class TutorController {
  private tutorService: TutorService;

  constructor() {
    this.tutorService = new TutorService();
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
}
