import { Request, Response, NextFunction } from 'express';
import { SessionsService } from './sessions.service';
import { UpdateSessionInput, GetSessionsQuery, CreateSessionInput, CreateTutorSessionInput, RescheduleSessionInput } from './sessions.validation';
import { AuthRequest } from '../../middleware/auth.middleware';

export class SessionsController {
  private sessionsService: SessionsService;

  constructor() {
    this.sessionsService = new SessionsService();
  }

  getSessions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const query: GetSessionsQuery = req.query as any;
      const sessions = await this.sessionsService.getSessions(userId, userRole, query);
      res.status(200).json(sessions);
    } catch (error) {
      next(error);
    }
  };

  getTutorSessions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tutorId = req.user?.userId;
      if (!tutorId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const sessions = await this.sessionsService.getSessionsByTutor(tutorId);
      res.status(200).json(sessions);
    } catch (error) {
      next(error);
    }
  };

  updateSession = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tutorId = req.user?.userId;
      if (!tutorId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const data: UpdateSessionInput = req.body;
      const session = await this.sessionsService.updateSession(id, tutorId, data);
      res.status(200).json(session);
    } catch (error) {
      next(error);
    }
  };

  // Admin-only: Create session with multiple participants
  createSession = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: CreateSessionInput = req.body;
      const session = await this.sessionsService.createSession(data);
      res.status(201).json(session);
    } catch (error) {
      next(error);
    }
  };

  // Admin-only: Reschedule session
  rescheduleSession = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const data: RescheduleSessionInput = req.body;
      const session = await this.sessionsService.rescheduleSession(id, data);
      res.status(200).json(session);
    } catch (error) {
      next(error);
    }
  };

  // Tutor-only: Create session for their own assigned student
  createTutorSession = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tutorId = req.user?.userId;
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

  // Tutor-only: Reschedule a session they created
  rescheduleTutorSession = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tutorId = req.user?.userId;
      if (!tutorId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const data: RescheduleSessionInput = req.body;
      const session = await this.sessionsService.rescheduleTutorSession(id, tutorId, data);
      res.status(200).json(session);
    } catch (error) {
      next(error);
    }
  };
}
