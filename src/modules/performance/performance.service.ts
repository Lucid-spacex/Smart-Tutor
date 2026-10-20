import prisma from '../../config/database';
import { AppError } from '../../middleware/error-handler.middleware';
import { NewGradesService } from '../grades/grades.service';

export class PerformanceService {
  private gradesService: NewGradesService;

  constructor() {
    this.gradesService = new NewGradesService();
  }

  /**
   * Get performance overview for a student
   * Access: STUDENT (own), PARENT (must own), TUTOR (assigned), ADMIN (all)
   */
  async getStudentPerformance(
    studentId: string,
    requestorId: string,
    requestorRole: string,
    options: {
      period?: 'week' | 'month' | 'quarter' | 'year' | 'all';
      from?: string;
      to?: string;
      subjectId?: string;
      includePending?: boolean;
    } = {}
  ) {
    // Authorization checks
    const student = await prisma.student.findUnique({
      where: { id: studentId, deletedAt: null },
      include: { user: true },
    });

    if (!student) {
      throw new AppError(404, 'Student not found');
    }

    if (requestorRole === 'STUDENT' && student.userId !== requestorId) {
      throw new AppError(403, 'Not authorized to view this student\'s performance');
    }

    if (requestorRole === 'PARENT' && student.parentId !== requestorId) {
      throw new AppError(403, 'Not authorized to view this student\'s performance');
    }

    // For tutors, verify they have at least one assigned enrollment
    if (requestorRole === 'TUTOR') {
      const hasAssignedEnrollment = await prisma.enrollment.findFirst({
        where: {
          studentId,
          tutorId: requestorId,
          deletedAt: null,
        },
      });
      if (!hasAssignedEnrollment) {
        throw new AppError(403, 'Not authorized to view this student\'s performance');
      }
    }

    // Calculate date range based on period
    const { fromDate, toDate, periodLabel } = this.calculateDateRange(
      options.period || 'month',
      options.from,
      options.to,
      student.user.timezone || 'Africa/Lagos'
    );

    // Get enrollments based on role and filters
    const enrollments = await this.getEnrollmentsForPerformance(
      studentId,
      requestorId,
      requestorRole,
      options.subjectId
    );

    if (enrollments.length === 0) {
      return this.buildEmptyResponse(fromDate, toDate, periodLabel);
    }

    const enrollmentIds = enrollments.map(e => e.id);

    // Calculate performance metrics
    const [averageGrade, gradesBySubject, gradeTimeline, attendance, assignments, quizzes, recentGrades] =
      await Promise.all([
        this.calculateAverageGrade(enrollmentIds, fromDate, toDate, options.includePending),
        this.calculateGradesBySubject(enrollmentIds, fromDate, toDate, options.includePending),
        this.calculateGradeTimeline(enrollmentIds, fromDate, toDate, options.period || 'month', student.user.timezone || 'Africa/Lagos', options.includePending),
        this.calculateAttendance(enrollmentIds, fromDate, toDate, student.user.timezone || 'Africa/Lagos'),
        this.calculateAssignments(enrollmentIds, fromDate, toDate),
        this.calculateQuizzes(enrollmentIds, fromDate, toDate),
        this.getRecentGrades(enrollmentIds, 5),
      ]);

    // Calculate trends (compare with previous period)
    const { previousFromDate, previousToDate } = this.calculatePreviousPeriod(fromDate, toDate, options.period || 'month');
    const previousAverageGrade = await this.calculateAverageGrade(enrollmentIds, previousFromDate, previousToDate, options.includePending);
    const previousAttendance = await this.calculateAttendance(enrollmentIds, previousFromDate, previousToDate, student.user.timezone || 'Africa/Lagos');

    const gradeTrend = this.calculateTrend(averageGrade.averagePercentage, previousAverageGrade.averagePercentage);
    const attendanceTrend = this.calculateTrend(attendance.rate, previousAttendance.rate);

    return {
      period: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        label: periodLabel,
      },
      averageGrade: {
        ...averageGrade,
        trend: gradeTrend,
      },
      gradesBySubject,
      gradeTimeline,
      attendance: {
        ...attendance,
        trend: attendanceTrend,
      },
      assignments,
      quizzes,
      recentGrades,
    };
  }

  /**
   * Calculate date range based on period
   */
  private calculateDateRange(
    period: string,
    from?: string,
    to?: string,
    timezone: string = 'Africa/Lagos'
  ) {
    const now = new Date();
    let fromDate: Date;
    let toDate: Date = new Date();
    let periodLabel: string;

    if (from && to) {
      fromDate = new Date(from);
      toDate = new Date(to);
      periodLabel = 'Custom range';
    } else {
      switch (period) {
        case 'week':
          fromDate = new Date(now);
          fromDate.setDate(now.getDate() - 7);
          periodLabel = 'Last 7 days';
          break;
        case 'month':
          fromDate = new Date(now);
          fromDate.setDate(1); // First day of current month
          periodLabel = 'This month';
          break;
        case 'quarter':
          fromDate = new Date(now);
          fromDate.setMonth(now.getMonth() - 3);
          periodLabel = 'Last 3 months';
          break;
        case 'year':
          fromDate = new Date(now);
          fromDate.setFullYear(now.getFullYear() - 1);
          periodLabel = 'Last year';
          break;
        case 'all':
        default:
          fromDate = new Date(0); // Epoch
          periodLabel = 'All time';
          break;
      }
    }

    return { fromDate, toDate, periodLabel };
  }

  /**
   * Calculate previous period for trend comparison
   */
  private calculatePreviousPeriod(fromDate: Date, toDate: Date, period: string) {
    const duration = toDate.getTime() - fromDate.getTime();
    const previousToDate = new Date(fromDate);
    const previousFromDate = new Date(previousToDate.getTime() - duration);
    return { previousFromDate, previousToDate };
  }

  /**
   * Get enrollments based on role and filters
   */
  private async getEnrollmentsForPerformance(
    studentId: string,
    requestorId: string,
    requestorRole: string,
    subjectId?: string
  ) {
    const where: any = {
      studentId,
      deletedAt: null,
    };

    if (subjectId) {
      where.subjectId = subjectId;
    }

    if (requestorRole === 'TUTOR') {
      where.tutorId = requestorId;
    }

    return prisma.enrollment.findMany({
      where,
      include: {
        subject: true,
      },
    });
  }

  /**
   * Calculate average grade for enrollments
   */
  private async calculateAverageGrade(
    enrollmentIds: string[],
    fromDate: Date,
    toDate: Date,
    includePending?: boolean
  ) {
    const where: any = {
      enrollmentId: { in: enrollmentIds },
      createdAt: { gte: fromDate, lte: toDate },
    };

    if (!includePending) {
      where.status = 'APPROVED';
    }

    const grades = await prisma.grade.findMany({
      where,
      select: {
        score: true,
        maxScore: true,
      },
    });

    if (grades.length === 0) {
      return {
        averagePercentage: null,
        gradedCount: 0,
      };
    }

    const percentages = grades.map(g => {
      const maxScore = Number(g.maxScore || 100);
      return (Number(g.score) / maxScore) * 100;
    });

    const averagePercentage = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;

    return {
      averagePercentage: Math.round(averagePercentage * 10) / 10,
      gradedCount: grades.length,
    };
  }

  /**
   * Calculate grades by subject
   */
  private async calculateGradesBySubject(
    enrollmentIds: string[],
    fromDate: Date,
    toDate: Date,
    includePending?: boolean
  ) {
    const enrollments = await prisma.enrollment.findMany({
      where: { id: { in: enrollmentIds } },
      include: { subject: true },
    });

    const results = await Promise.all(
      enrollments.map(async (enrollment) => {
        const where: any = {
          enrollmentId: enrollment.id,
          createdAt: { gte: fromDate, lte: toDate },
        };

        if (!includePending) {
          where.status = 'APPROVED';
        }

        const grades = await prisma.grade.findMany({
          where,
          select: { score: true, maxScore: true },
        });

        if (grades.length === 0) {
          return null;
        }

        const percentages = grades.map(g => {
          const maxScore = Number(g.maxScore || 100);
          return (Number(g.score) / maxScore) * 100;
        });

        const averagePercentage = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;

        return {
          subjectId: enrollment.subjectId,
          subjectName: enrollment.subject.name,
          averagePercentage: Math.round(averagePercentage * 10) / 10,
          gradedCount: grades.length,
        };
      })
    );

    return results.filter(r => r !== null);
  }

  /**
   * Calculate grade timeline with time buckets
   */
  private async calculateGradeTimeline(
    enrollmentIds: string[],
    fromDate: Date,
    toDate: Date,
    period: string,
    timezone: string,
    includePending?: boolean
  ) {
    const where: any = {
      enrollmentId: { in: enrollmentIds },
      createdAt: { gte: fromDate, lte: toDate },
    };

    if (!includePending) {
      where.status = 'APPROVED';
    }

    const grades = await prisma.grade.findMany({
      where,
      select: { score: true, maxScore: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    if (grades.length === 0) {
      return [];
    }

    // Determine bucket size based on period
    const useWeeklyBuckets = ['week', 'month'].includes(period);
    const bucketDays = useWeeklyBuckets ? 7 : 30;

    // Create buckets
    const buckets = new Map<string, { count: number; sum: number }>();
    const currentDate = new Date(fromDate);
    
    while (currentDate <= toDate) {
      const bucketKey = currentDate.toISOString().split('T')[0];
      buckets.set(bucketKey, { count: 0, sum: 0 });
      currentDate.setDate(currentDate.getDate() + bucketDays);
    }

    // Fill buckets
    grades.forEach(grade => {
      const gradeDate = new Date(grade.createdAt);
      const bucketKey = gradeDate.toISOString().split('T')[0];
      const percentage = (Number(grade.score) / Number(grade.maxScore || 100)) * 100;
      
      if (buckets.has(bucketKey)) {
        const bucket = buckets.get(bucketKey)!;
        bucket.count++;
        bucket.sum += percentage;
      }
    });

    // Convert to array
    return Array.from(buckets.entries())
      .map(([bucketStart, data]) => ({
        bucketStart,
        averagePercentage: data.count > 0 ? Math.round((data.sum / data.count) * 10) / 10 : null,
        gradedCount: data.count,
      }))
      .filter(b => b.gradedCount > 0);
  }

  /**
   * Calculate attendance metrics
   */
  private async calculateAttendance(
    enrollmentIds: string[],
    fromDate: Date,
    toDate: Date,
    timezone: string
  ) {
    const sessions = await prisma.sessionParticipant.findMany({
      where: {
        enrollmentId: { in: enrollmentIds },
        session: {
          scheduledAt: { gte: fromDate, lte: toDate },
          status: { in: ['COMPLETED', 'MISSED'] },
        },
      },
      include: {
        session: true,
      },
    });

    if (sessions.length === 0) {
      return {
        rate: null,
        attended: 0,
        missed: 0,
        timeline: [],
      };
    }

    const attended = sessions.filter(sp => sp.session.status === 'COMPLETED').length;
    const missed = sessions.filter(sp => sp.session.status === 'MISSED').length;
    const rate = (attended / sessions.length) * 100;

    // Calculate timeline (weekly buckets)
    const timeline = this.calculateAttendanceTimeline(sessions, fromDate, toDate, timezone);

    return {
      rate: Math.round(rate * 10) / 10,
      attended,
      missed,
      timeline,
    };
  }

  /**
   * Calculate attendance timeline
   */
  private calculateAttendanceTimeline(
    sessions: any[],
    fromDate: Date,
    toDate: Date,
    timezone: string
  ) {
    const buckets = new Map<string, { attended: number; total: number }>();
    const currentDate = new Date(fromDate);
    
    while (currentDate <= toDate) {
      const bucketKey = currentDate.toISOString().split('T')[0];
      buckets.set(bucketKey, { attended: 0, total: 0 });
      currentDate.setDate(currentDate.getDate() + 7);
    }

    sessions.forEach(sp => {
      const sessionDate = new Date(sp.session.scheduledAt);
      const bucketKey = sessionDate.toISOString().split('T')[0];
      
      if (buckets.has(bucketKey)) {
        const bucket = buckets.get(bucketKey)!;
        bucket.total++;
        if (sp.session.status === 'COMPLETED') {
          bucket.attended++;
        }
      }
    });

    return Array.from(buckets.entries())
      .map(([bucketStart, data]) => ({
        bucketStart,
        rate: data.total > 0 ? Math.round((data.attended / data.total) * 100 * 10) / 10 : null,
        sessionCount: data.total,
      }))
      .filter(b => b.sessionCount > 0);
  }

  /**
   * Calculate assignment metrics
   */
  private async calculateAssignments(enrollmentIds: string[], fromDate: Date, toDate: Date) {
    const assignments = await prisma.assignment.findMany({
      where: {
        enrollmentId: { in: enrollmentIds },
        createdAt: { gte: fromDate, lte: toDate },
      },
      include: {
        submissions: true,
      },
    });

    const total = assignments.length;
    const completed = assignments.filter(a => a.status === 'COMPLETED' || a.status === 'GRADED').length;
    const pending = assignments.filter(a => a.status === 'PENDING').length;
    const overdue = assignments.filter(a => a.status === 'PENDING' && new Date(a.dueDate) < new Date()).length;
    const submittedLate = assignments.filter(a => {
      const submission = a.submissions[0];
      return submission && new Date(submission.submittedAt) > new Date(a.dueDate);
    }).length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    return {
      total,
      completed,
      pending,
      overdue,
      submittedLate,
      completionRate: Math.round(completionRate * 10) / 10,
    };
  }

  /**
   * Calculate quiz statistics
   */
  private async calculateQuizzes(enrollmentIds: string[], fromDate: Date, toDate: Date) {
    const quizAttempts = await prisma.quizAttempt.findMany({
      where: {
        assignment: {
          enrollmentId: { in: enrollmentIds },
        },
        completedAt: { gte: fromDate, lte: toDate },
        status: 'COMPLETED',
      },
      include: {
        assignment: true,
      },
    });

    if (quizAttempts.length === 0) {
      return {
        attempts: 0,
        averagePercentage: null,
      };
    }

    const percentages = quizAttempts.map(attempt => {
      const questions = attempt.assignment.type === 'QUIZ' ? 0 : 1; // Simplified - would need to calculate from quiz questions
      return Number(attempt.totalScore || 0); // This would need maxScore calculation
    });

    // For now, calculate percentage assuming maxScore of 100
    const averagePercentage = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;

    return {
      attempts: quizAttempts.length,
      averagePercentage: Math.round(averagePercentage * 10) / 10,
    };
  }

  /**
   * Get recent grades
   */
  private async getRecentGrades(enrollmentIds: string[], limit: number) {
    const where: any = {
      enrollmentId: { in: enrollmentIds },
      status: 'APPROVED',
    };

    const grades = await prisma.grade.findMany({
      where,
      include: {
        enrollment: {
          include: {
            subject: true,
          },
        },
        assignment: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return grades.map(g => ({
      id: g.id,
      score: Number(g.score),
      maxScore: Number(g.maxScore || 100),
      percentage: Math.round((Number(g.score) / Number(g.maxScore || 100)) * 100 * 10) / 10,
      subjectName: g.enrollment.subject.name,
      assignmentTitle: g.assignment?.title || 'N/A',
      createdAt: g.createdAt,
    }));
  }

  /**
   * Calculate trend (change vs previous period)
   */
  private calculateTrend(current: number | null, previous: number | null): number | null {
    if (current === null || previous === null || previous === 0) {
      return null;
    }
    return Math.round((current - previous) * 10) / 10;
  }

  /**
   * Build empty response
   */
  private buildEmptyResponse(fromDate: Date, toDate: Date, periodLabel: string) {
    return {
      period: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        label: periodLabel,
      },
      averageGrade: {
        averagePercentage: null,
        gradedCount: 0,
        trend: null,
      },
      gradesBySubject: [],
      gradeTimeline: [],
      attendance: {
        rate: null,
        attended: 0,
        missed: 0,
        trend: null,
        timeline: [],
      },
      assignments: {
        total: 0,
        completed: 0,
        pending: 0,
        overdue: 0,
        submittedLate: 0,
        completionRate: 0,
      },
      quizzes: {
        attempts: 0,
        averagePercentage: null,
      },
      recentGrades: [],
    };
  }
}
