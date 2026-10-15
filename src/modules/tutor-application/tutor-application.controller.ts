import { Request, Response, NextFunction } from 'express';
import { TutorApplicationService } from './tutor-application.service';
import { AuthRequest } from '../../types/express';

export class TutorApplicationController {
  private tutorApplicationService: TutorApplicationService;

  constructor() {
    this.tutorApplicationService = new TutorApplicationService();
  }

  getApplication = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const application = await this.tutorApplicationService.getApplication(userId);
      res.status(200).json(application);
    } catch (error) {
      next(error);
    }
  };

  updateApplication = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const data = req.body;
      const application = await this.tutorApplicationService.updateApplication(userId, data);
      res.status(200).json(application);
    } catch (error) {
      next(error);
    }
  };

  uploadDocument = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const document = await this.tutorApplicationService.uploadDocument(userId, req.file);
      res.status(201).json(document);
    } catch (error) {
      next(error);
    }
  };

  getDocumentUrl = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const role = req.user?.role;
      if (!userId || !role) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id: documentId } = req.params;
      const document = await this.tutorApplicationService.getDocumentSignedUrl(documentId, userId, role);
      res.status(200).json(document);
    } catch (error) {
      next(error);
    }
  };

  deleteDocument = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id: documentId } = req.params;
      const result = await this.tutorApplicationService.deleteDocument(documentId, userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  submitApplication = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const application = await this.tutorApplicationService.submitApplication(userId);
      res.status(200).json(application);
    } catch (error) {
      next(error);
    }
  };
}
