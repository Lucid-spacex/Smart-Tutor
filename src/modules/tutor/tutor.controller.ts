import { Request, Response, NextFunction } from 'express';
import { TutorService } from './tutor.service';
import { CreateTutorProfileInput, UpdateAvailabilityInput } from './tutor.validation';
import { SessionsService } from '../sessions/sessions.service';
import { CreateTutorSessionInput, RescheduleTutorSessionInput } from '../sessions/sessions.validation';

export class TutorController {
  private tutorService: TutorService;
  private sessionsService: SessionsService;

  constructor() {
    this.tutorService = new TutorService();
    this.sessionsService = new SessionsService();
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
}
