import { Request, Response, NextFunction } from 'express';
import { AdminService } from './admin.service';
import { UpdateTutorVettingInput, AssignTutorInput } from './admin.validation';

export class AdminController {
  private adminService: AdminService;

  constructor() {
    this.adminService = new AdminService();
  }

  getPendingTutors = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tutors = await this.adminService.getPendingTutors();
      res.status(200).json(tutors);
    } catch (error) {
      next(error);
    }
  };

  updateTutorVetting = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const data: UpdateTutorVettingInput = req.body;
      const result = await this.adminService.updateTutorVetting(id, data);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getUnmatchedEnrollments = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const enrollments = await this.adminService.getUnmatchedEnrollments();
      res.status(200).json(enrollments);
    } catch (error) {
      next(error);
    }
  };

  assignTutor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const data: AssignTutorInput = req.body;
      const result = await this.adminService.assignTutor(id, data);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getFailedPayments = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payments = await this.adminService.getFailedPayments();
      res.status(200).json(payments);
    } catch (error) {
      next(error);
    }
  };

  getOverviewReport = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const report = await this.adminService.getOverviewReport();
      res.status(200).json(report);
    } catch (error) {
      next(error);
    }
  };
}
