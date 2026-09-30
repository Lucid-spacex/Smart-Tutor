import { Response, NextFunction } from 'express';
import { GradesService } from './grades.service';
import { AuthRequest } from '../../types/express';

export class GradesController {
  private gradesService: GradesService;

  constructor() {
    this.gradesService = new GradesService();
  }

  createGrade = async (req: any, res: Response, next: NextFunction): Promise<void> => {
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

      const grade = await this.gradesService.createGrade(tutorId, data);
      res.status(201).json(grade);
    } catch (error) {
      next(error);
    }
  };

  getGrades = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      if (!userId || !userRole) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const filters = req.query as any;
      const grades = await this.gradesService.getGrades(userId, userRole, filters);
      res.status(200).json(grades);
    } catch (error) {
      next(error);
    }
  };

  getPendingGrades = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const grades = await this.gradesService.getPendingGrades();
      res.status(200).json(grades);
    } catch (error) {
      next(error);
    }
  };

  approveGrade = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user?.userId;
      if (!adminId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const grade = await this.gradesService.approveGrade(id, adminId);
      res.status(200).json(grade);
    } catch (error) {
      next(error);
    }
  };

  rejectGrade = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user?.userId;
      if (!adminId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const { reason } = req.body;
      const grade = await this.gradesService.rejectGrade(id, adminId, reason);
      res.status(200).json(grade);
    } catch (error) {
      next(error);
    }
  };

  updateGrade = async (req: any, res: Response, next: NextFunction): Promise<void> => {
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

      const grade = await this.gradesService.updateGrade(id, tutorId, data);
      res.status(200).json(grade);
    } catch (error) {
      next(error);
    }
  };

  deleteGrade = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tutorId = req.user?.userId;
      if (!tutorId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      await this.gradesService.deleteGrade(id, tutorId);
      res.status(200).json({ message: 'Grade deleted successfully' });
    } catch (error) {
      next(error);
    }
  };
}
