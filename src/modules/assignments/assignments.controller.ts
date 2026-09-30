import { Response, NextFunction } from 'express';
import { AssignmentsService } from './assignments.service';
import { AuthRequest } from '../../types/express';

export class AssignmentsController {
  private assignmentsService: AssignmentsService;

  constructor() {
    this.assignmentsService = new AssignmentsService();
  }

  createAssignment = async (req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tutorId = req.user?.userId;
      if (!tutorId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const data = req.body;
      
      // Handle file attachment if present (convert to base64 for Cloudinary)
      if (req.file) {
        data.attachmentBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      }

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

  updateAssignment = async (req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tutorId = req.user?.userId;
      if (!tutorId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const data = req.body;
      
      // Handle file attachment if present (convert to base64 for Cloudinary)
      if (req.file) {
        data.attachmentBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      }

      const assignment = await this.assignmentsService.updateAssignment(id, tutorId, data);
      res.status(200).json(assignment);
    } catch (error) {
      next(error);
    }
  };

  deleteAssignment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tutorId = req.user?.userId;
      if (!tutorId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      await this.assignmentsService.deleteAssignment(id, tutorId);
      res.status(200).json({ message: 'Assignment deleted successfully' });
    } catch (error) {
      next(error);
    }
  };

  submitAssignment = async (req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const data = req.body;
      
      // Handle file attachment if present (convert to base64 for Cloudinary)
      if (req.file) {
        data.attachmentBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      }

      const submission = await this.assignmentsService.submitAssignment(id, userId, data);
      res.status(201).json(submission);
    } catch (error) {
      next(error);
    }
  };

  provideFeedback = async (req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tutorId = req.user?.userId;
      if (!tutorId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id, submissionId } = req.params;
      const data = req.body;
      
      // Handle file attachment if present (convert to base64 for Cloudinary)
      if (req.file) {
        data.feedbackAttachmentBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      }

      const submission = await this.assignmentsService.provideFeedback(id, submissionId, tutorId, data);
      res.status(200).json(submission);
    } catch (error) {
      next(error);
    }
  };
}
