import { Request, Response, NextFunction } from 'express';
import { ProgressReportsService } from './progress-reports.service';
import { CreateProgressReportInput, GetProgressReportsQuery } from './progress-reports.validation';

export class ProgressReportsController {
  private progressReportsService: ProgressReportsService;

  constructor() {
    this.progressReportsService = new ProgressReportsService();
  }

  createProgressReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tutorId = req.user?.userId;
      if (!tutorId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const data: CreateProgressReportInput = req.body;
      const report = await this.progressReportsService.createProgressReport(tutorId, data);
      res.status(201).json(report);
    } catch (error) {
      next(error);
    }
  };

  getProgressReports = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const query: GetProgressReportsQuery = req.query as any;
      const reports = await this.progressReportsService.getProgressReports(userId, userRole, query);
      res.status(200).json(reports);
    } catch (error) {
      next(error);
    }
  };
}
