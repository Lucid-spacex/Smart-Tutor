import { Request, Response, NextFunction } from 'express';
import { SessionsService } from './sessions.service';
import { UpdateSessionInput, GetSessionsQuery } from './sessions.validation';

export class SessionsController {
  private sessionsService: SessionsService;

  constructor() {
    this.sessionsService = new SessionsService();
  }

  getSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

  updateSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
}
