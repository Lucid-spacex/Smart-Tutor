import { Response, NextFunction } from 'express';
import { ComplaintsService } from './complaints.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export class ComplaintsController {
  private complaintsService: ComplaintsService;

  constructor() {
    this.complaintsService = new ComplaintsService();
  }

  createComplaint = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      if (!userId || !userRole) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const data = req.body;
      const complaint = await this.complaintsService.createComplaint(userId, userRole, data);
      res.status(201).json(complaint);
    } catch (error) {
      next(error);
    }
  };

  getComplaints = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      if (!userId || !userRole) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const complaints = await this.complaintsService.getComplaints(userId, userRole);
      res.status(200).json(complaints);
    } catch (error) {
      next(error);
    }
  };

  resolveComplaint = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user?.userId;
      if (!adminId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const { reply } = req.body;
      const complaint = await this.complaintsService.resolveComplaint(id, adminId, reply);
      res.status(200).json(complaint);
    } catch (error) {
      next(error);
    }
  };
}
