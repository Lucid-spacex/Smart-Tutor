import prisma from '../../config/database';
import { CreateStudentInput } from './students.validation';
import { hashPassword } from '../../utils/password.util';
import { sendStudentCredentialsEmail, sendPasswordResetEmail } from '../../utils/email.util';
import crypto from 'crypto';
import { logger } from '../../config/logger';

// ActualGrade → GradeBandTier mapping.
// This is the deterministic, authoritative mapping for pricing-tier resolution.
// It replaces the legacy fuzzy regex for any student created with actualGrade set.
const ACTUAL_GRADE_TO_BAND: Record<string, 'PRESCHOOL_TO_G1' | 'G2_TO_G4' | 'G5_TO_G8' | 'G9_TO_G12'> = {
  PRESCHOOL:   'PRESCHOOL_TO_G1',
  KINDERGARTEN:'PRESCHOOL_TO_G1',
  GRADE_1:     'PRESCHOOL_TO_G1',
  GRADE_2:     'G2_TO_G4',
  GRADE_3:     'G2_TO_G4',
  GRADE_4:     'G2_TO_G4',
  GRADE_5:     'G5_TO_G8',
  GRADE_6:     'G5_TO_G8',
  GRADE_7:     'G5_TO_G8',
  GRADE_8:     'G5_TO_G8',
  GRADE_9:     'G9_TO_G12',
  GRADE_10:    'G9_TO_G12',
  GRADE_11:    'G9_TO_G12',
  GRADE_12:    'G9_TO_G12',
};

export class StudentsService {
  /**
   * Deterministic mapping from ActualGrade enum to GradeBandTier.
   * Used when actualGrade is provided — takes precedence over the legacy regex.
   */
  private mapActualGradeToBand(
    actualGrade: string,
  ): 'PRESCHOOL_TO_G1' | 'G2_TO_G4' | 'G5_TO_G8' | 'G9_TO_G12' {
    const band = ACTUAL_GRADE_TO_BAND[actualGrade];
    if (!band) {
      // Should never happen if Zod validation passed, but guard anyway.
      throw new Error(`Unknown actualGrade value: ${actualGrade}`);
    }
    return band;
  }

  /**
   * Legacy fuzzy regex mapper \u2014 retained as fallback when actualGrade is absent.
   * Used for backward compat with existing callers that only supply gradeLevel.
   */
  private mapGradeToBand(gradeLevel: string): 'PRESCHOOL_TO_G1' | 'G2_TO_G4' | 'G5_TO_G8' | 'G9_TO_G12' {
    const normalizedGrade = gradeLevel.toLowerCase().trim();

    if (normalizedGrade.match(/^(preschool|pre-?k|kindergarten|kg|reception|nursery|grade\s*0|grade\s*1|g1|class\s*1|year\s*1)$/)) {
      return 'PRESCHOOL_TO_G1';
    }

    if (normalizedGrade.match(/^(grade\s*[2-4]|g[2-4]|class\s*[2-4]|year\s*[2-4])$/)) {
      return 'G2_TO_G4';
    }

    if (normalizedGrade.match(/^(grade\s*[5-8]|g[5-8]|class\s*[5-8]|year\s*[5-8]|middle\s*school|j(?:unior)?\s*high)$/)) {
      return 'G5_TO_G8';
    }

    return 'G9_TO_G12';
  }

  // Generate a unique student code (8+ alphanumeric characters, case-insensitive)
  private generateStudentCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Remove confusing characters like I, 1, O, 0
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Generate a 6-digit numeric PIN for student login
  private generatePin(): string {
    const length = 6;
    let pin = '';
    for (let i = 0; i < length; i++) {
      pin += Math.floor(Math.random() * 10).toString();
    }
    return pin;
  }

  // Ensure student code is unique (retry on collision)
  private async getUniqueStudentCode(): Promise<string> {
    let code: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      code = this.generateStudentCode();
      const existing = await prisma.user.findFirst({
        where: { studentCode: code },
      });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new Error('Failed to generate unique student code after multiple attempts');
    }

    return code!;
  }

  async createStudent(parentId: string, data: CreateStudentInput) {
    // Generate credentials for the student's login account.
    // studentCode is always generated regardless of whether data.email is provided.
    // The student contact email (data.email) is notification metadata only —
    // it does NOT become an alternate login credential.
    const studentCode = await this.getUniqueStudentCode();
    const plainPin = this.generatePin();
    const passwordHash = await hashPassword(plainPin);

    // Create User account first (required FK for Student)
    const user = await prisma.user.create({
      data: {
        fullName: data.fullName,
        passwordHash,
        role: 'STUDENT' as const,
        status: 'ACTIVE' as const,
        studentCode,
        parentId,
      },
    });

    // Resolve gradeBandTier:
    // 1. actualGrade (structured enum) \u2014 deterministic, authoritative for pricing.
    // 2. gradeLevel (free text) \u2014 legacy fuzzy regex, used as fallback only.
    const gradeBandTier = data.actualGrade
      ? this.mapActualGradeToBand(data.actualGrade)
      : this.mapGradeToBand(data.gradeLevel);

    // Create the Student profile linked to the User account
    const student = await prisma.student.create({
      data: {
        userId: user.id,
        parentId,
        fullName: data.fullName,
        dateOfBirth: new Date(data.dateOfBirth),
        actualGrade: data.actualGrade ?? null,
        gradeLevel: data.gradeLevel,
        gradeBandTier,
        gender: data.gender ?? null,
        email: data.email ?? null,
        preferredStartDate: data.preferredStartDate ? new Date(data.preferredStartDate) : null,
        school: data.school,
        notes: data.notes,
      },
    });

    // Get parent email for sending credentials
    const parent = await prisma.user.findUnique({
      where: { id: parentId },
      select: { email: true, fullName: true },
    });

    if (parent?.email) {
      await sendStudentCredentialsEmail(
        parent.email,
        parent.fullName,
        data.fullName,
        studentCode,
        plainPin
      );
    }

    logger.info({ parentId, studentId: student.id, studentCode, gradeBandTier }, 'Student created with credentials');

    return {
      id: student.id,
      fullName: student.fullName,
      studentCode, // Safe to return \u2014 it's a login identifier, not a secret
      actualGrade: student.actualGrade,
      gradeBandTier: student.gradeBandTier,
      gender: student.gender,
      email: student.email,
      preferredStartDate: student.preferredStartDate,
      // Never return the password
    };
  }

  async getStudentsByParent(parentId: string) {
    return prisma.student.findMany({
      where: { parentId },
      include: {
        user: {
          select: {
            id: true,
            studentCode: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStudentById(id: string, parentId: string) {
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            studentCode: true,
            status: true,
          },
        },
        enrollments: {
          include: {
            subject: true,
            tutor: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    if (student.parentId !== parentId) {
      // Return generic error to prevent information disclosure
      throw new Error('Student not found');
    }

    return student;
  }

  async regenerateStudentPin(studentId: string, requestorId: string, isAdmin: boolean = false) {
    // Get student and their linked user account
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

    // Authorization check
    if (!isAdmin && student.parentId !== requestorId) {
      throw new Error('Access denied');
    }

    // Generate new PIN
    const plainPin = this.generatePin();
    const passwordHash = await hashPassword(plainPin);

    // Update the user's password
    await prisma.user.update({
      where: { id: student.user.id },
      data: { passwordHash },
    });

    // Revoke all refresh tokens for security
    await prisma.refreshToken.deleteMany({
      where: { userId: student.user.id },
    });

    // Fetch parent separately (Student has no `parent` relation, only parentId scalar)
    const parent = await prisma.user.findUnique({
      where: { id: student.parentId },
      select: { email: true, fullName: true },
    });

    if (parent?.email && parent.fullName) {
      await sendPasswordResetEmail(
        parent.email,
        parent.fullName,
        plainPin
      );
    }

    logger.info({ studentId, requestorId, isAdmin }, 'Student PIN regenerated');

    return {
      message: 'PIN regenerated successfully. New credentials sent to parent email.',
    };
  }

  async getStudentActivity(studentId: string, requestorId: string, isAdmin: boolean = false) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    // Authorization check
    if (!isAdmin && student.parentId !== requestorId) {
      throw new Error('Access denied');
    }

    // Get comprehensive data for the student
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId },
      include: {
        subject: true,
        tutor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            tutorProfile: {
              select: {
                bio: true,
                subjects: true,
              },
            },
          },
        },
        sessionParticipants: {
          include: {
            session: {
              select: {
                id: true,
                scheduledAt: true,
                durationMinutes: true,
                status: true,
                zoomLink: true,
              },
            },
          },
        },
        assignments: {
          include: {
            creator: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
        grades: {
          where: { 
            status: 'APPROVED',
            visibleToStudent: true,
          },
          include: {
            grader: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
        progressReports: {
          include: {
            creator: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
      },
    });

    // Calculate statistics
    const totalSessions = enrollments.reduce((sum, e) => sum + (e.sessionParticipants?.length || 0), 0);
    const attendedSessions = enrollments.reduce(
      (sum, e) => sum + (e.sessionParticipants?.filter((sp: any) => sp.attended === true).length || 0),
      0
    );
    const missedSessions = enrollments.reduce(
      (sum, e) => sum + (e.sessionParticipants?.filter((sp: any) => sp.attended === false).length || 0),
      0
    );

    const pendingAssignments = enrollments.reduce(
      (sum, e) => sum + (e.assignments?.filter((a: any) => a.status === 'PENDING').length || 0),
      0
    );
    const completedAssignments = enrollments.reduce(
      (sum, e) => sum + (e.assignments?.filter((a: any) => a.status === 'COMPLETED').length || 0),
      0
    );

    const grades = enrollments.flatMap(e => e.grades || []);
    const averageScore = grades.length > 0
      ? grades.reduce((sum, g) => sum + Number(g.score), 0) / grades.length
      : 0;

    // Get upcoming sessions (scheduled in the future)
    const now = new Date();
    const upcomingSessions = enrollments
      .flatMap(e => 
        e.sessionParticipants
          .filter((sp: any) => sp.session.status === 'SCHEDULED' && new Date(sp.session.scheduledAt) > now)
          .map((sp: any) => ({
            id: sp.session.id,
            scheduledAt: sp.session.scheduledAt,
            durationMinutes: sp.session.durationMinutes,
            zoomLink: sp.session.zoomLink,
            subject: e.subject?.name,
            tutor: e.tutor?.fullName,
          }))
      )
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    // Get pending assignments
    const pendingAssignmentsList = enrollments
      .flatMap(e => 
        e.assignments
          .filter((a: any) => a.status === 'PENDING')
          .map((a: any) => ({
            id: a.id,
            title: a.title,
            description: a.description,
            type: a.type,
            dueDate: a.dueDate,
            subject: e.subject?.name,
            createdBy: a.creator?.fullName,
          }))
      )
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    // Get recent approved grades
    const recentGrades = grades
      .map((g: any) => ({
        id: g.id,
        score: Number(g.score),
        comments: g.comments,
        gradedAt: g.createdAt,
        subject: enrollments.find(e => e.id === g.enrollmentId)?.subject?.name,
        gradedBy: g.grader?.fullName,
      }))
      .sort((a, b) => new Date(b.gradedAt).getTime() - new Date(a.gradedAt).getTime());

    // Get progress reports
    const progressReports = enrollments
      .flatMap(e => 
        e.progressReports
          .map((pr: any) => ({
            id: pr.id,
            period: pr.period,
            summary: pr.summary,
            strengths: pr.strengths,
            areasToImprove: pr.areasToImprove,
            createdAt: pr.createdAt,
            createdBy: pr.creator?.fullName,
            subject: e.subject?.name,
          }))
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      student: {
        id: student.id,
        fullName: student.fullName,
        gradeLevel: student.gradeLevel,
        actualGrade: student.actualGrade,
        gradeBandTier: student.gradeBandTier,
      },
      statistics: {
        totalEnrollments: enrollments.length,
        totalSessions,
        attendedSessions,
        missedSessions,
        attendanceRate: totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0,
        pendingAssignments,
        completedAssignments,
        totalGrades: grades.length,
        averageScore,
      },
      enrollments: enrollments.map(e => ({
        id: e.id,
        subject: {
          id: e.subject?.id,
          name: e.subject?.name,
        },
        status: e.status,
        tutor: e.tutor ? {
          id: e.tutor.id,
          fullName: e.tutor.fullName,
          email: e.tutor.email,
          bio: e.tutor.tutorProfile?.bio,
          subjects: e.tutor.tutorProfile?.subjects,
        } : null,
      })),
      upcomingSessions,
      pendingAssignments: pendingAssignmentsList,
      recentGrades,
      progressReports,
    };
  }
}
