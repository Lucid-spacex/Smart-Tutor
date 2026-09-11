import prisma from '../../config/database';
import { UpdateTutorVettingInput, AssignTutorInput, UpdateEnrollmentPricingInput } from './admin.validation';
import { hashPassword } from '../../utils/password.util';
import { sendStudentCredentialsEmail } from '../../utils/email.util';
import { logger } from '../../config/logger';
import crypto from 'crypto';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { SessionsService } from '../sessions/sessions.service';
import { GradesService } from '../grades/grades.service';

export class AdminService {
  private enrollmentsService: EnrollmentsService;
  private sessionsService: SessionsService;
  private gradesService: GradesService;

  // Generate a strong random password (12+ chars, mixed case + digits + symbol)
  private generatePassword(): string {
    const length = 12;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  constructor() {
    this.enrollmentsService = new EnrollmentsService();
    this.sessionsService = new SessionsService();
    this.gradesService = new GradesService();
  }

  async getPendingTutors() {
    return prisma.user.findMany({
      where: {
        role: 'TUTOR',
        status: 'PENDING_VETTING',
      },
      include: {
        tutorProfile: true,
      },
    });
  }

  async getTutors(filters?: { status?: string }) {
    const where: any = {
      role: 'TUTOR',
    };

    // Default to APPROVED if no status filter provided (useful for assign-tutor use case)
    if (filters?.status) {
      where.status = filters.status;
    } else {
      where.status = 'APPROVED';
    }

    return prisma.user.findMany({
      where,
      include: {
        tutorProfile: true,
      },
      orderBy: {
        fullName: 'asc',
      },
    });
  }

  async updateTutorVetting(tutorId: string, data: UpdateTutorVettingInput) {
    const user = await prisma.user.findUnique({
      where: { id: tutorId },
      include: { tutorProfile: true },
    });

    if (!user) {
      throw new Error('Tutor not found');
    }

    if (user.role !== 'TUTOR') {
      throw new Error('User is not a tutor');
    }

    // Update both user status and tutor profile vetting status
    const userStatus = data.vettingStatus === 'APPROVED' ? 'APPROVED' : 'REJECTED';

    await prisma.user.update({
      where: { id: tutorId },
      data: { status: userStatus },
    });

    const updatedProfile = await prisma.tutorProfile.update({
      where: { userId: tutorId },
      data: { vettingStatus: data.vettingStatus },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            status: true,
          },
        },
      },
    });

    return updatedProfile;
  }

  async getUnmatchedEnrollments() {
    return prisma.enrollment.findMany({
      where: {
        tutorId: null,
        status: 'ACTIVE',
      },
      include: {
        student: {
          include: {
            parent: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        subject: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async assignTutor(enrollmentId: string, data: AssignTutorInput) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    if (enrollment.tutorId) {
      throw new Error('Enrollment already has a tutor assigned');
    }

    // Verify tutor exists and is approved
    const tutor = await prisma.user.findUnique({
      where: { id: data.tutorId },
      include: { tutorProfile: true },
    });

    if (!tutor || tutor.role !== 'TUTOR') {
      throw new Error('Tutor not found');
    }

    if (tutor.status !== 'APPROVED' || !tutor.tutorProfile || tutor.tutorProfile.vettingStatus !== 'APPROVED') {
      throw new Error('Tutor is not approved for tutoring');
    }

    return prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { tutorId: data.tutorId },
      include: {
        student: true,
        subject: true,
        tutor: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  async getFailedPayments() {
    return prisma.payment.findMany({
      where: {
        status: 'FAILED',
      },
      include: {
        parent: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        enrollment: {
          include: {
            student: true,
            subject: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOverviewReport() {
    // Use raw SQL for complex aggregate queries as specified
    const activeStudents = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT s.id) as count
      FROM "Student" s
      INNER JOIN "Enrollment" e ON s.id = e."studentId"
      WHERE e.status = 'ACTIVE'
    `;

    const activeTutors = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM "User" u
      INNER JOIN "TutorProfile" tp ON u.id = tp."userId"
      WHERE u.role = 'TUTOR' AND u.status = 'APPROVED' AND tp."vettingStatus" = 'APPROVED'
    `;

    const revenueThisMonth = await prisma.$queryRaw<Array<{ total: bigint }>>`
      SELECT COALESCE(SUM(p.amount), 0) as total
      FROM "Payment" p
      WHERE p.status = 'SUCCESS'
      AND p."paidAt" >= DATE_TRUNC('month', CURRENT_DATE)
      AND p."paidAt" < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
    `;

    const totalEnrollments = await prisma.enrollment.count({
      where: { status: 'ACTIVE' },
    });

    const pendingVetting = await prisma.user.count({
      where: {
        role: 'TUTOR',
        status: 'PENDING_VETTING',
      },
    });

    return {
      activeStudents: Number(activeStudents[0]?.count || 0),
      activeTutors: Number(activeTutors[0]?.count || 0),
      revenueThisMonth: Number(revenueThisMonth[0]?.total || 0),
      totalEnrollments,
      pendingVetting,
    };
  }

  async getStudents(filters?: { parentId?: string }) {
    const where: any = {};

    if (filters?.parentId) {
      where.parentId = filters.parentId;
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            studentCode: true,
            status: true,
          },
        },
      },
      orderBy: {
        fullName: 'asc',
      },
    });

    // Fetch parent User records for all students in one query
    const parentIds = [...new Set(students.map(s => s.parentId).filter(Boolean))];
    const parents = await prisma.user.findMany({
      where: { id: { in: parentIds } },
      select: { id: true, fullName: true, email: true },
    });
    const parentMap = new Map(parents.map(p => [p.id, p]));

    // Transform to match expected response format with parentName and studentCode
    return students.map(student => ({
      id: student.id,
      parentId: student.parentId,
      parentName: parentMap.get(student.parentId)?.fullName ?? null,
      fullName: student.fullName,
      studentCode: student.user.studentCode,
      dateOfBirth: student.dateOfBirth,
      gradeLevel: student.gradeLevel,
      school: student.school,
      notes: student.notes,
      status: student.user.status,
      createdAt: student.createdAt,
      parent: parentMap.get(student.parentId) ?? null,
    }));
  }

  async regenerateStudentPassword(studentId: string, adminId: string) {
    // Get the student with their linked user account
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: {
          select: { id: true, studentCode: true },
        },
      },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    // Generate new password
    const plainPassword = this.generatePassword();
    const passwordHash = await hashPassword(plainPassword);

    // Update the user's password
    await prisma.user.update({
      where: { id: student.userId },
      data: { passwordHash },
    });

    // Revoke all refresh tokens for security
    await prisma.refreshToken.deleteMany({
      where: { userId: student.userId },
    });

    // Fetch parent separately (Student has no parent relation, only parentId scalar)
    const parent = await prisma.user.findUnique({
      where: { id: student.parentId },
      select: { email: true, fullName: true },
    });

    if (parent?.email && parent.fullName) {
      await sendStudentCredentialsEmail(
        parent.email,
        parent.fullName,
        student.fullName,
        student.user.studentCode!,
        plainPassword
      );
    }

    logger.info({ studentId, adminId }, 'Admin regenerated student password');

    return {
      message: 'Password regenerated successfully. New credentials sent to parent email.',
    };
  }

  async getEnrollmentPricing(enrollmentId: string) {
    return this.enrollmentsService.getEnrollmentPricing(enrollmentId);
  }

  async updateEnrollmentPricing(enrollmentId: string, data: UpdateEnrollmentPricingInput) {
    return this.enrollmentsService.updateEnrollmentPricing(enrollmentId, data);
  }

  async createSession(data: any) {
    return this.sessionsService.createSession(data);
  }

  async rescheduleSession(sessionId: string, data: any) {
    return this.sessionsService.rescheduleSession(sessionId, data);
  }

  async getSuspendedUsers() {
    return prisma.user.findMany({
      where: {
        status: 'SUSPENDED',
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        studentCode: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async reactivateUser(userId: string, adminId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.status !== 'SUSPENDED') {
      throw new Error('User is not suspended');
    }

    // Tutors go to APPROVED if reactivated, otherwise ACTIVE
    const newStatus = user.role === 'TUTOR' ? 'APPROVED' : 'ACTIVE';

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status: newStatus },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
      },
    });

    logger.info({ userId, adminId, newStatus }, 'User reactivated by admin');
    return updated;
  }

  async getPendingGrades() {
    return this.gradesService.getPendingGrades();
  }

  async approveGrade(gradeId: string, adminId: string) {
    return this.gradesService.approveGrade(gradeId, adminId);
  }

  async rejectGrade(gradeId: string, adminId: string, reason?: string) {
    return this.gradesService.rejectGrade(gradeId, adminId, reason);
  }
}
