import { Response, NextFunction } from 'express';
import { NewGradesService } from './grades.service';
import { AuthRequest } from '../../types/express';

export class GradesController {
  private gradesService: NewGradesService;

  constructor() {
    this.gradesService = new NewGradesService();
  }

  // Tutor endpoints

  createDraftGrade = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tutorId = req.user?.userId;
      if (!tutorId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const grade = await this.gradesService.createDraftGrade(tutorId, req.body);
      res.status(201).json(grade);
    } catch (error) {
      next(error);
    }
  };

  updateGrade = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tutorId = req.user?.userId;
      if (!tutorId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const grade = await this.gradesService.updateGrade(id, tutorId, req.body);
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

  submitGrade = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tutorId = req.user?.userId;
      if (!tutorId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const result = await this.gradesService.submitGrade(id, tutorId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  withdrawGrade = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tutorId = req.user?.userId;
      if (!tutorId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const result = await this.gradesService.withdrawGrade(id, tutorId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  previewGrade = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tutorId = req.user?.userId;
      if (!tutorId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const grade = await this.gradesService.previewGrade(id, tutorId);
      res.status(200).json(grade);
    } catch (error) {
      next(error);
    }
  };

  // Admin endpoints

  getAdminGrades = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters = {
        status: req.query.status as string,
        tutorId: req.query.tutorId as string,
        studentId: req.query.studentId as string,
        subjectId: req.query.subjectId as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      };

      const result = await this.gradesService.getAdminGrades(filters);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getAdminGrade = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const grade = await this.gradesService.getAdminGrade(id);
      res.status(200).json(grade);
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

      // Validate reason is required
      if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        res.status(400).json({ error: 'Rejection reason is required' });
        return;
      }

      const grade = await this.gradesService.rejectGrade(id, adminId, reason);
      res.status(200).json(grade);
    } catch (error) {
      next(error);
    }
  };

  bulkApproveGrades = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user?.userId;
      if (!adminId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { gradeIds } = req.body;
      const result = await this.gradesService.bulkApproveGrades(gradeIds, adminId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getGradeById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      if (!userId || !userRole) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const grade = await this.gradesService.getGradeById(id, userId, userRole);
      res.status(200).json(grade);
    } catch (error) {
      next(error);
    }
  };

  // Legacy endpoints (keep for backward compatibility if needed)
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
}
