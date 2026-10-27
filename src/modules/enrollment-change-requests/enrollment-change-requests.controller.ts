import { Response, NextFunction } from 'express';
import { EnrollmentChangeRequestService } from './enrollment-change-requests.service';
import { AuthRequest } from '../../types/express';

export class EnrollmentChangeRequestController {
  private changeRequestService: EnrollmentChangeRequestService;

  constructor() {
    this.changeRequestService = new EnrollmentChangeRequestService();
  }

  // Parent endpoints

  createChangeRequest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parentId = req.user?.userId;
      if (!parentId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { enrollmentId } = req.params;
      const { requestedValues } = req.body;
      const changeRequest = await this.changeRequestService.createChangeRequest(enrollmentId, parentId, { requestedValues });
      res.status(201).json(changeRequest);
    } catch (error) {
      next(error);
    }
  };

  getChangeRequests = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parentId = req.user?.userId;
      if (!parentId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id: enrollmentId } = req.params;
      const changeRequests = await this.changeRequestService.getChangeRequests(enrollmentId, parentId);
      res.status(200).json(changeRequests);
    } catch (error) {
      next(error);
    }
  };

  cancelChangeRequest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parentId = req.user?.userId;
      if (!parentId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const changeRequest = await this.changeRequestService.cancelChangeRequest(id, parentId);
      res.status(200).json(changeRequest);
    } catch (error) {
      next(error);
    }
  };

  // Admin endpoints

  getAdminChangeRequests = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters = {
        status: req.query.status as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      };

      const result = await this.changeRequestService.getAdminChangeRequests(filters);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getAdminChangeRequest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const changeRequest = await this.changeRequestService.getAdminChangeRequest(id);
      res.status(200).json(changeRequest);
    } catch (error) {
      next(error);
    }
  };

  approveChangeRequest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user?.userId;
      if (!adminId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const changeRequest = await this.changeRequestService.approveChangeRequest(id, adminId);
      res.status(200).json(changeRequest);
    } catch (error) {
      next(error);
    }
  };

  rejectChangeRequest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user?.userId;
      if (!adminId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const { reason } = req.body;
      const changeRequest = await this.changeRequestService.rejectChangeRequest(id, adminId, reason);
      res.status(200).json(changeRequest);
    } catch (error) {
      next(error);
    }
  };
}
