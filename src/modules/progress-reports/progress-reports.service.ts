import prisma from '../../config/database';
import { CreateProgressReportInput, GetProgressReportsQuery } from './progress-reports.validation';

export class ProgressReportsService {
  async createProgressReport(tutorId: string, data: CreateProgressReportInput) {
    // Verify enrollment has this tutor assigned
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: data.enrollmentId },
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    if (enrollment.tutorId !== tutorId) {
      throw new Error('Not authorized to create report for this enrollment');
    }

    return prisma.progressReport.create({
      data: {
        enrollmentId: data.enrollmentId,
        period: data.period,
        summary: data.summary,
        strengths: data.strengths,
        areasToImprove: data.areasToImprove,
        createdBy: tutorId,
      },
      include: {
        enrollment: {
          include: {
            student: true,
            subject: true,
          },
        },
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  async getProgressReports(userId: string, userRole: string, query: GetProgressReportsQuery) {
    const where: any = {};

    if (query.enrollmentId) {
      where.enrollmentId = query.enrollmentId;
    }

    // Filter based on user role
    if (userRole === 'PARENT') {
      where.enrollment = {
        student: {
          parentId: userId,
        },
      };
    } else if (userRole === 'TUTOR') {
      where.createdBy = userId;
    }

    return prisma.progressReport.findMany({
      where,
      include: {
        enrollment: {
          include: {
            student: true,
            subject: true,
          },
        },
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
