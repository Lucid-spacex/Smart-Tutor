import { Request, Response, NextFunction } from 'express';
import { AdminService } from './admin.service';
import { UpdateTutorVettingInput, AssignTutorInput, GetTutorsQuery, GetStudentsQuery, UpdateEnrollmentPricingInput, UpdatePricingTierInput, UpdateEnrollmentPricingOverrideInput } from './admin.validation';
import { AuthRequest } from '../../middleware/auth.middleware';

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

  getEnrollmentPricing = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const pricing = await this.adminService.getEnrollmentPricing(id);
      res.status(200).json(pricing);
    } catch (error) {
      next(error);
    }
  };

  updateEnrollmentPricing = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const data: UpdateEnrollmentPricingInput = req.body;
      const result = await this.adminService.updateEnrollmentPricing(id, data);
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

  getTutors = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query: GetTutorsQuery = req.query as any;
      const tutors = await this.adminService.getTutors(query);
      res.status(200).json(tutors);
    } catch (error) {
      next(error);
    }
  };

  getStudents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query: GetStudentsQuery = req.query as any;
      const students = await this.adminService.getStudents(query);
      res.status(200).json(students);
    } catch (error) {
      next(error);
    }
  };

  regenerateStudentPassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const requestorId = req.user?.userId;
      if (!requestorId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const result = await this.adminService.regenerateStudentPassword(id, requestorId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  createSession = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: any = req.body;
      const session = await this.adminService.createSession(data);
      res.status(201).json(session);
    } catch (error) {
      next(error);
    }
  };

  rescheduleSession = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const data: any = req.body;
      const session = await this.adminService.rescheduleSession(id, data);
      res.status(200).json(session);
    } catch (error) {
      next(error);
    }
  };

  getPendingGrades = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const grades = await this.adminService.getPendingGrades();
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
      const grade = await this.adminService.approveGrade(id, adminId);
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
      const grade = await this.adminService.rejectGrade(id, adminId, reason);
      res.status(200).json(grade);
    } catch (error) {
      next(error);
    }
  };

  getSuspendedUsers = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const users = await this.adminService.getSuspendedUsers();
      res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  };

  reactivateUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user?.userId;
      if (!adminId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const user = await this.adminService.reactivateUser(id, adminId);
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  };

  // Pricing Tier Management
  getPricingTiers = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tiers = await this.adminService.getPricingTiers();
      res.status(200).json(tiers);
    } catch (error) {
      next(error);
    }
  };

  updatePricingTier = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user?.userId;
      if (!adminId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { gradeBandTier } = req.params;
      const data: UpdatePricingTierInput = req.body;
      const tier = await this.adminService.updatePricingTier(gradeBandTier as any, data, adminId);
      res.status(200).json(tier);
    } catch (error) {
      next(error);
    }
  };

  updateEnrollmentPricingOverride = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user?.userId;
      if (!adminId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const data: UpdateEnrollmentPricingOverrideInput = req.body;
      const enrollment = await this.adminService.updateEnrollmentPricingOverride(id, data, adminId);
      res.status(200).json(enrollment);
    } catch (error) {
      next(error);
    }
  };

  getEnrollmentPricingOverride = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const pricing = await this.adminService.getEnrollmentPricingOverride(id);
      res.status(200).json(pricing);
    } catch (error) {
      next(error);
    }
  };

  getCurrentExchangeRate = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rate = await this.adminService.getCurrentExchangeRate();
      res.status(200).json(rate);
    } catch (error) {
      next(error);
    }
  };
}
