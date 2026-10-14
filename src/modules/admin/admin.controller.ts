import { Request, Response, NextFunction } from 'express';
import { AdminService } from './admin.service';
import { UpdateTutorVettingInput, AssignTutorInput, GetTutorsQuery, GetStudentsQuery, UpdateEnrollmentPricingInput, UpdateEnrollmentPricingOverrideInput, GetUnmatchedEnrollmentsQuery, SuspendUserInput, AddPaymentNoteInput } from './admin.validation';
import { AuthRequest } from '../../types/express';
import { PerformanceService } from '../performance/performance.service';
import { config } from '../../config/env.config';

export class AdminController {
  private adminService: AdminService;
  private performanceService: PerformanceService;

  constructor() {
    this.adminService = new AdminService();
    this.performanceService = new PerformanceService();
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

  getUnmatchedEnrollments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query: GetUnmatchedEnrollmentsQuery = req.query as any;
      const includeUnpaid = query.includeUnpaid === true;
      const enrollments = await this.adminService.getUnmatchedEnrollments(includeUnpaid);
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

  getTutorById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const tutor = await this.adminService.getTutorById(id);
      res.status(200).json(tutor);
    } catch (error) {
      next(error);
    }
  };

  getTutorStudents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const result = await this.adminService.getTutorStudents(id, page, limit);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getTutorSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const filters = {
        status: req.query.status as string,
        from: req.query.from as string,
        to: req.query.to as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      };
      const result = await this.adminService.getTutorSessions(id, filters);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getTutorGrades = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const filters = {
        status: req.query.status as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      };
      const result = await this.adminService.getTutorGrades(id, filters);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getTutorProgressReports = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const result = await this.adminService.getTutorProgressReports(id, page, limit);
      res.status(200).json(result);
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

  getStudentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const student = await this.adminService.getStudentById(id);
      res.status(200).json(student);
    } catch (error) {
      next(error);
    }
  };

  getStudentEnrollments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const result = await this.adminService.getStudentEnrollments(id, page, limit);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getStudentGrades = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const result = await this.adminService.getStudentGrades(id, page, limit);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getStudentAttendance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const result = await this.adminService.getStudentAttendance(id, page, limit);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getStudentSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const result = await this.adminService.getStudentSessions(id, page, limit);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  regenerateStudentPin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const requestorId = req.user?.userId;
      if (!requestorId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const result = await this.adminService.regenerateStudentPin(id, requestorId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  createSession = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user?.userId;
      if (!adminId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const data: any = req.body;
      const session = await this.adminService.createSession(data, adminId);
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

  getSuspendedUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const users = await this.adminService.getSuspendedUsers(page, limit);
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

  suspendUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user?.userId;
      if (!adminId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const data: SuspendUserInput = req.body;
      const result = await this.adminService.suspendUser(id, data, adminId);
      res.status(200).json(result);
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

  // Parent Directory
  getParents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters = {
        search: req.query.search as string,
        status: req.query.status as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      };
      const result = await this.adminService.getParents(filters);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getParentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const parent = await this.adminService.getParentById(id);
      res.status(200).json(parent);
    } catch (error) {
      next(error);
    }
  };

  getSuggestedTutors = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const tutors = await this.adminService.getSuggestedTutors(id);
      res.status(200).json(tutors);
    } catch (error) {
      next(error);
    }
  };

  // Admin Transactions
  getPayments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters = {
        status: req.query.status as string,
        currency: req.query.currency as string,
        provider: req.query.provider as string,
        parentId: req.query.parentId as string,
        from: req.query.from as string,
        to: req.query.to as string,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      };
      const result = await this.adminService.getPayments(filters);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getPaymentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const payment = await this.adminService.getPaymentById(id);
      res.status(200).json(payment);
    } catch (error) {
      next(error);
    }
  };

  getPaymentsSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters = {
        from: req.query.from as string,
        to: req.query.to as string,
      };
      const summary = await this.adminService.getPaymentsSummary(filters);
      res.status(200).json(summary);
    } catch (error) {
      next(error);
    }
  };

  getStudentPerformance = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user?.userId;
      if (!adminId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id: studentId } = req.params;

      const options = {
        period: req.query.period as 'week' | 'month' | 'quarter' | 'year' | 'all',
        from: req.query.from as string,
        to: req.query.to as string,
        subjectId: req.query.subjectId as string,
        includePending: req.query.includePending === 'true',
      };

      const performance = await this.performanceService.getStudentPerformance(
        studentId,
        adminId,
        'ADMIN',
        options
      );

      res.status(200).json(performance);
    } catch (error) {
      next(error);
    }
  };

  addPaymentNote = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user?.userId;
      if (!adminId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id: paymentId } = req.params;
      const data: AddPaymentNoteInput = req.body;

      const payment = await this.adminService.addPaymentNote(paymentId, data, adminId);
      res.status(200).json(payment);
    } catch (error) {
      next(error);
    }
  };

  reverifyPayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user?.userId;
      if (!adminId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id: paymentId } = req.params;

      const payment = await this.adminService.reverifyPayment(paymentId, adminId);
      res.status(200).json(payment);
    } catch (error) {
      next(error);
    }
  };

  getEmailDiagnostics = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user?.userId;
      if (!adminId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const result = await this.adminService.getEmailDiagnostics();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
