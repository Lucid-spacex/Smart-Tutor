import { Response, NextFunction } from 'express';
import { AssignmentsService } from './assignments.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export class AssignmentsController {
  private assignmentsService: AssignmentsService;

  constructor() {
    this.assignmentsService = new AssignmentsService();
  }

  createAssignment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tutorId = req.user?.userId;
      if (!tutorId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const data = req.body;
      const assignment = await this.assignmentsService.createAssignment(tutorId, data);
      res.status(201).json(assignment);
    } catch (error) {
      next(error);
    }
  };

  getAssignments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      if (!userId || !userRole) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const filters = req.query as any;
      const assignments = await this.assignmentsService.getAssignments(userId, userRole, filters);
      res.status(200).json(assignments);
    } catch (error) {
      next(error);
    }
  };

  updateAssignment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tutorId = req.user?.userId;
      if (!tutorId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const { status } = req.body;
      const assignment = await this.assignmentsService.updateAssignmentStatus(id, tutorId, status);
      res.status(200).json(assignment);
    } catch (error) {
      next(error);
    }
  };
}
