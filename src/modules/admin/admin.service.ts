import prisma from '../../config/database';
import { UpdateTutorVettingInput, AssignTutorInput, UpdateEnrollmentPricingInput, UpdatePricingTierInput, UpdateEnrollmentPricingOverrideInput, SuspendUserInput, AddPaymentNoteInput } from './admin.validation';
import { hashPassword } from '../../utils/password.util';
import { sendPasswordResetEmail } from '../../utils/email.util';
import { logger } from '../../config/logger';
import crypto from 'crypto';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { SessionsService } from '../sessions/sessions.service';
import { GradesService } from '../grades/grades.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PerformanceService } from '../performance/performance.service';
import { TutorApplicationService } from '../tutor-application/tutor-application.service';
import { GradeBandTier } from '@prisma/client';
import { CreateSessionInput, RescheduleSessionInput } from '../sessions/sessions.validation';
import { config } from '../../config/env.config';

export class AdminService {
  private enrollmentsService: EnrollmentsService;
  private sessionsService: SessionsService;
  private gradesService: GradesService;
  private notificationsService: NotificationsService;
  private performanceService: PerformanceService;
  private tutorApplicationService: TutorApplicationService;

  constructor() {
    this.enrollmentsService = new EnrollmentsService();
    this.sessionsService = new SessionsService();
    this.gradesService = new GradesService();
    this.notificationsService = new NotificationsService();
    this.performanceService = new PerformanceService();
    this.tutorApplicationService = new TutorApplicationService();
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

  async getTutors(filters?: {
    status?: string;
    applicationStatus?: string;
    vettingStatus?: string;
    availabilityStatus?: string;
    subjectId?: string;
    hasCapacity?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, applicationStatus, vettingStatus, availabilityStatus, subjectId, hasCapacity, search, page = 1, limit = 20 } = filters || {};
    const skip = (page - 1) * limit;

    const where: any = {
      role: 'TUTOR',
    };

    // Default to APPROVED if no status filter provided (useful for assign-tutor use case)
    if (status) {
      where.status = status;
    } else {
      where.status = 'APPROVED';
    }

    if (applicationStatus) {
      where.tutorApplication = {
        status: applicationStatus,
      };
    }

    if (vettingStatus) {
      where.tutorProfile = {
        ...where.tutorProfile,
        vettingStatus,
      };
    }

    if (availabilityStatus) {
      where.tutorProfile = {
        ...where.tutorProfile,
        availabilityStatus,
      };
    }

    if (subjectId) {
      where.tutorProfile = {
        ...where.tutorProfile,
        tutorSubjects: {
          some: {
            subjectId,
          },
        },
      };
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // When hasCapacity is true, we need to fetch all matching tutors first to filter by capacity
    // Then apply pagination to the filtered results
    if (hasCapacity) {
      const allTutors = await prisma.user.findMany({
        where,
        include: {
          tutorProfile: {
            include: {
              tutorSubjects: {
                include: {
                  subject: true,
                },
              },
            },
          },
          tutorApplication: true,
        },
        orderBy: {
          fullName: 'asc',
        },
      });

      // Add current student count for each tutor
      const enrichedTutors = await Promise.all(
        allTutors.map(async (tutor) => {
          const currentStudentCount = await prisma.enrollment.count({
            where: {
              tutorId: tutor.id,
              status: 'ACTIVE',
            },
          });

          return {
            ...tutor,
            currentStudentCount,
          };
        })
      );

      // Filter by capacity
      const filteredTutors = enrichedTutors.filter(tutor => {
        const maxStudents = tutor.tutorProfile?.maxStudents;
        if (!maxStudents) return true; // No limit set
        return tutor.currentStudentCount < maxStudents;
      });

      // Apply pagination to filtered results
      const paginatedTutors = filteredTutors.slice(skip, skip + limit);

      return {
        data: paginatedTutors,
        page,
        limit,
        total: filteredTutors.length,
      };
    }

    // Normal pagination without capacity filter
    const [tutors, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          tutorProfile: {
            include: {
              tutorSubjects: {
                include: {
                  subject: true,
                },
              },
            },
          },
          tutorApplication: true,
        },
        orderBy: {
          fullName: 'asc',
        },
        skip,
        take: Math.min(limit, 100),
      }),
      prisma.user.count({ where }),
    ]);

    // Add current student count for each tutor
    const enrichedTutors = await Promise.all(
      tutors.map(async (tutor) => {
        const currentStudentCount = await prisma.enrollment.count({
          where: {
            tutorId: tutor.id,
            status: 'ACTIVE',
          },
        });

        return {
          ...tutor,
          currentStudentCount,
        };
      })
    );

    return {
      data: enrichedTutors,
      page,
      limit,
      total,
    };
  }

  async getTutorById(tutorId: string) {
    const tutor = await prisma.user.findUnique({
      where: { id: tutorId, role: 'TUTOR' },
      include: {
        tutorProfile: {
          include: {
            tutorSubjects: {
              include: {
                subject: true,
              },
            },
          },
        },
        tutorApplication: {
          include: {
            subjects: {
              include: {
                subject: true,
              },
            },
            documents: true,
          },
        },
      },
    });

    if (!tutor) {
      throw new Error('Tutor not found');
    }

    // Calculate metrics
    const [
      studentsCount,
      sessionsCompleted,
      sessionsMissed,
      sessionsCancelled,
      avgStudentGradePercentage,
      avgStudentAttendanceRate,
      reportsSubmitted,
      assignmentsCreated,
    ] = await Promise.all([
      prisma.enrollment.count({
        where: { tutorId, status: 'ACTIVE' },
      }),
      prisma.session.count({
        where: { tutorId, status: 'COMPLETED' },
      }),
      prisma.session.count({
        where: { tutorId, status: 'MISSED' },
      }),
      prisma.session.count({
        where: { tutorId, status: 'CANCELLED' },
      }),
      // Average student grade percentage (approved grades only, using maxScore)
      prisma.$queryRaw<Array<{ avg: number }>>`
        SELECT COALESCE(AVG((g.score::float / NULLIF(g."maxScore", 100)) * 100), 0) as avg
        FROM "Grade" g
        INNER JOIN "Enrollment" e ON g."enrollmentId" = e.id
        WHERE e."tutorId" = ${tutorId}
        AND g.status = 'APPROVED'
      `,
      // Average student attendance rate
      prisma.$queryRaw<Array<{ rate: number }>>`
        SELECT COALESCE(
          (COUNT(CASE WHEN sp.attended = true THEN 1 END)::float / NULLIF(COUNT(*), 0)) * 100,
          0
        ) as rate
        FROM "SessionParticipant" sp
        INNER JOIN "Session" s ON sp."sessionId" = s.id
        WHERE s."tutorId" = ${tutorId}
        AND s.status IN ('COMPLETED', 'MISSED')
      `,
      prisma.progressReport.count({
        where: { createdBy: tutorId },
      }),
      prisma.assignment.count({
        where: { createdBy: tutorId },
      }),
    ]);

    const currentStudentCount = studentsCount;

    return {
      user: {
        id: tutor.id,
        firstName: tutor.firstName,
        lastName: tutor.lastName,
        middleName: tutor.middleName,
        fullName: tutor.fullName,
        email: tutor.email,
        phone: tutor.phone,
        address: tutor.address,
        status: tutor.status,
        profilePictureUrl: tutor.profilePicture,
        timezone: tutor.timezone,
        createdAt: tutor.createdAt,
        updatedAt: tutor.updatedAt,
      },
      application: tutor.tutorApplication ? {
        status: tutor.tutorApplication.status,
        birthDay: tutor.tutorApplication.birthDay,
        birthMonth: tutor.tutorApplication.birthMonth,
        country: tutor.tutorApplication.country,
        city: tutor.tutorApplication.city,
        highestQualification: tutor.tutorApplication.highestQualification,
        subjects: tutor.tutorApplication.subjects.map(s => ({
          id: s.subject.id,
          name: s.subject.name,
          category: s.subject.category,
        })),
        levels: tutor.tutorApplication.levels,
        yearsOfExperience: tutor.tutorApplication.yearsOfExperience,
        whyTeach: tutor.tutorApplication.whyTeach,
        howHeard: tutor.tutorApplication.howHeard,
        aboutYou: tutor.tutorApplication.aboutYou,
        documents: tutor.tutorApplication.documents.map(d => ({
          id: d.id,
          name: d.originalName,
          mimeType: d.mimeType,
          sizeBytes: d.sizeBytes,
          url: d.publicId, // Cloudinary public ID (for generating signed URLs)
          expiresAt: null, // Documents don't expire, but signed URLs do
        })),
        submittedAt: tutor.tutorApplication.submittedAt,
        reviewedAt: tutor.tutorApplication.reviewedAt,
        reviewedBy: tutor.tutorApplication.reviewedBy,
        rejectionReason: tutor.tutorApplication.rejectionReason,
      } : null,
      profile: tutor.tutorProfile ? {
        bio: tutor.tutorProfile.bio,
        hourlyRate: Number(tutor.tutorProfile.hourlyRate),
        availability: tutor.tutorProfile.availability,
        availabilityStatus: tutor.tutorProfile.availabilityStatus,
        maxStudents: tutor.tutorProfile.maxStudents,
        statusNote: tutor.tutorProfile.statusNote,
        statusUpdatedAt: tutor.tutorProfile.statusUpdatedAt,
        currentStudentCount,
        vettingStatus: tutor.tutorProfile.vettingStatus,
        subjects: tutor.tutorProfile.tutorSubjects.map(ts => ({
          id: ts.subject.id,
          name: ts.subject.name,
          category: ts.subject.category,
        })),
      } : null,
      metrics: {
        studentsCount,
        sessionsCompleted,
        sessionsMissed,
        sessionsCancelled,
        avgStudentGradePercentage: Number(avgStudentGradePercentage[0]?.avg || 0),
        avgStudentAttendanceRate: Number(avgStudentAttendanceRate[0]?.rate || 0),
        reportsSubmitted,
        assignmentsCreated,
      },
    };
  }

  async getTutorStudents(tutorId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [enrollments, total] = await Promise.all([
      prisma.enrollment.findMany({
        where: { tutorId, status: 'ACTIVE', deletedAt: null },
        include: {
          student: {
            include: {
              user: {
                select: {
                  status: true,
                },
              },
            },
          },
          subject: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Math.min(limit, 100),
      }),
      prisma.enrollment.count({
        where: { tutorId, status: 'ACTIVE', deletedAt: null },
      }),
    ]);

    return {
      data: enrollments.map(e => ({
        enrollmentId: e.id,
        student: {
          id: e.student.id,
          fullName: e.student.fullName,
          gradeLevel: e.student.gradeLevel,
          gradeBandTier: e.student.gradeBandTier,
        },
        subject: {
          id: e.subject.id,
          name: e.subject.name,
        },
        sessionFrequency: e.sessionFrequency,
        startDate: e.startDate,
      })),
      page,
      limit,
      total,
    };
  }

  async getTutorSessions(tutorId: string, filters?: { status?: string; from?: string; to?: string; page?: number; limit?: number }) {
    const { status, from, to, page = 1, limit = 20 } = filters || {};
    const skip = (page - 1) * limit;

    const where: any = { tutorId };

    if (status) {
      where.status = status;
    }

    if (from || to) {
      where.scheduledAt = {};
      if (from) {
        where.scheduledAt.gte = new Date(from);
      }
      if (to) {
        where.scheduledAt.lte = new Date(to);
      }
    }

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        include: {
          participants: {
            include: {
              enrollment: {
                include: {
                  student: true,
                  subject: true,
                },
              },
            },
          },
        },
        orderBy: { scheduledAt: 'desc' },
        skip,
        take: Math.min(limit, 100),
      }),
      prisma.session.count({ where }),
    ]);

    return {
      data: sessions,
      page,
      limit,
      total,
    };
  }

  async getTutorGrades(tutorId: string, filters?: { status?: string; page?: number; limit?: number }) {
    const { status, page = 1, limit = 20 } = filters || {};
    const skip = (page - 1) * limit;

    const where: any = {
      enrollment: {
        tutorId,
      },
    };

    if (status) {
      where.status = status;
    }

    const [grades, total] = await Promise.all([
      prisma.grade.findMany({
        where,
        include: {
          enrollment: {
            include: {
              student: true,
              subject: true,
            },
          },
          assignment: true,
          grader: {
            select: {
              id: true,
              fullName: true,
            },
          },
          approver: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Math.min(limit, 100),
      }),
      prisma.grade.count({ where }),
    ]);

    return {
      data: grades,
      page,
      limit,
      total,
    };
  }

  async getTutorProgressReports(tutorId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      prisma.progressReport.findMany({
        where: { createdBy: tutorId },
        include: {
          enrollment: {
            include: {
              student: true,
              subject: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Math.min(limit, 100),
      }),
      prisma.progressReport.count({
        where: { createdBy: tutorId },
      }),
    ]);

    return {
      data: reports,
      page,
      limit,
      total,
    };
  }

  async updateTutorVetting(tutorId: string, data: UpdateTutorVettingInput, adminId: string) {
    // Use TutorApplicationService to review the application
    await this.tutorApplicationService.reviewApplication(
      tutorId,
      adminId,
      data.vettingStatus,
      data.rejectionReason
    );

    // Return updated user for response
    const user = await prisma.user.findUnique({
      where: { id: tutorId },
      include: {
        tutorProfile: true,
        tutorApplication: true,
      },
    });

    if (!user) {
      throw new Error('Tutor not found');
    }

    return user;
  }

  async getUnmatchedEnrollments(includeUnpaid: boolean = false) {
    const where: any = {
      tutorId: null,
    };

    // By default, exclude PENDING_PAYMENT enrollments from tutor assignment queue
    if (!includeUnpaid) {
      where.status = 'ACTIVE';
    } else {
      // When including unpaid, show both ACTIVE and PENDING_PAYMENT
      where.status = { in: ['ACTIVE', 'PENDING_PAYMENT'] };
    }

    return prisma.enrollment.findMany({
      where,
      include: {
        student: true,
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

    // Check availability and capacity unless force is true
    if (!data.force) {
      if (tutor.tutorProfile?.availabilityStatus === 'UNAVAILABLE') {
        throw new Error('Tutor is currently unavailable. Use force: true to override.');
      }

      const currentStudentCount = await prisma.enrollment.count({
        where: {
          tutorId: data.tutorId,
          status: 'ACTIVE',
        },
      });

      const maxStudents = tutor.tutorProfile?.maxStudents;
      if (maxStudents && currentStudentCount >= maxStudents) {
        throw new Error(`Tutor is at capacity (${currentStudentCount}/${maxStudents}). Use force: true to override.`);
      }
    }

    const updatedEnrollment = await prisma.enrollment.update({
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

    // Create notifications for both parent and student
    await this.notificationsService.createTutorAssignedNotification(enrollmentId, data.tutorId);

    return updatedEnrollment;
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
    // Total users (User model does not have deletedAt)
    const totalUsers = await prisma.user.count();

    // Total parents
    const totalParents = await prisma.user.count({
      where: { role: 'PARENT' },
    });

    // Total students (exclude soft-deleted)
    const totalStudents = await prisma.student.count({
      where: { deletedAt: null },
    });

    // Total tutors
    const totalTutors = await prisma.user.count({
      where: { role: 'TUTOR' },
    });

    // Pending tutors (PENDING_VETTING status)
    const pendingTutors = await prisma.user.count({
      where: {
        role: 'TUTOR',
        status: 'PENDING_VETTING',
      },
    });

    // Active enrollments (exclude soft-deleted)
    const activeEnrollments = await prisma.enrollment.count({
      where: { status: 'ACTIVE', deletedAt: null },
    });

    // Pending payment enrollments (exclude soft-deleted)
    const pendingPaymentEnrollments = await prisma.enrollment.count({
      where: { status: 'PENDING_PAYMENT', deletedAt: null },
    });

    // Unmatched enrollments (PAID/ACTIVE with no tutor, exclude soft-deleted)
    const unmatchedEnrollments = await prisma.enrollment.count({
      where: {
        status: 'ACTIVE',
        tutorId: null,
        deletedAt: null,
      },
    });

    // Total revenue NGN (sum of successfully charged NGN amounts, exclude soft-deleted)
    const totalRevenueNGN = await prisma.payment.aggregate({
      where: {
        status: 'SUCCESS',
        currency: 'NGN',
        deletedAt: null,
      },
      _sum: { amount: true },
    });

    // Revenue this month NGN (exclude soft-deleted)
    const revenueThisMonthNGN = await prisma.$queryRaw<Array<{ total: bigint }>>`
      SELECT COALESCE(SUM(p.amount), 0) as total
      FROM "Payment" p
      WHERE p.status = 'SUCCESS'
      AND p.currency = 'NGN'
      AND p."deletedAt" IS NULL
      AND p."paidAt" >= DATE_TRUNC('month', CURRENT_DATE)
      AND p."paidAt" < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
    `;

    // Failed payments (exclude soft-deleted)
    const failedPayments = await prisma.payment.count({
      where: { status: 'FAILED', deletedAt: null },
    });

    // Pending grades (Grade model does not have deletedAt)
    const pendingGrades = await prisma.grade.count({
      where: { status: 'PENDING_APPROVAL' },
    });

    // Open complaints (Complaint model does not have deletedAt, only OPEN and RESOLVED statuses)
    const openComplaints = await prisma.complaint.count({
      where: { status: 'OPEN' },
    });

    // Suspended users (User model does not have deletedAt)
    const suspendedUsers = await prisma.user.count({
      where: { status: 'SUSPENDED' },
    });

    return {
      totalUsers: totalUsers || 0,
      totalParents: totalParents || 0,
      totalStudents: totalStudents || 0,
      totalTutors: totalTutors || 0,
      pendingTutors: pendingTutors || 0,
      activeEnrollments: activeEnrollments || 0,
      pendingPaymentEnrollments: pendingPaymentEnrollments || 0,
      unmatchedEnrollments: unmatchedEnrollments || 0,
      totalRevenueNGN: Number(totalRevenueNGN._sum.amount || 0),
      revenueThisMonthNGN: Number(revenueThisMonthNGN[0]?.total || 0),
      totalRevenue: Number(totalRevenueNGN._sum.amount || 0), // Deprecated alias
      failedPayments: failedPayments || 0,
      pendingGrades: pendingGrades || 0,
      openComplaints: openComplaints || 0,
      suspendedUsers: suspendedUsers || 0,
    };
  }

  async getStudents(filters?: {
    parentId?: string;
    search?: string;
    status?: string;
    gradeBandTier?: string;
    enrolled?: boolean;
    assigned?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { parentId, search, status, gradeBandTier, enrolled, assigned, page = 1, limit = 20 } = filters || {};
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (parentId) {
      where.parentId = parentId;
    }

    if (gradeBandTier) {
      where.gradeBandTier = gradeBandTier;
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.user = {
        ...where.user,
        status,
      };
    }

    if (enrolled !== undefined) {
      if (enrolled) {
        where.enrollments = {
          some: { deletedAt: null },
        };
      } else {
        where.enrollments = {
          none: { deletedAt: null },
        };
      }
    }

    if (assigned !== undefined) {
      if (assigned) {
        where.enrollments = {
          ...where.enrollments,
          some: {
            tutorId: { not: null },
            deletedAt: null,
          },
        };
      } else {
        where.enrollments = {
          ...where.enrollments,
          every: {
            tutorId: null,
          },
        };
      }
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              status: true,
              // Explicitly exclude studentCode - admins must never see student codes
            },
          },
        },
        orderBy: {
          fullName: 'asc',
        },
        skip,
        take: Math.min(limit, 100),
      }),
      prisma.student.count({ where }),
    ]);

    // Fetch parent User records for all students in one query
    const parentIds = [...new Set(students.map(s => s.parentId).filter(Boolean))];
    const parents = await prisma.user.findMany({
      where: { id: { in: parentIds } },
      select: { id: true, fullName: true, email: true },
    });
    const parentMap = new Map(parents.map(p => [p.id, p]));

    // Transform to match expected response format with parentName
    const data = students.map(student => ({
      id: student.id,
      parentId: student.parentId,
      parentName: parentMap.get(student.parentId)?.fullName ?? null,
      fullName: student.fullName,
      dateOfBirth: student.dateOfBirth,
      gradeLevel: student.gradeLevel,
      gradeBandTier: student.gradeBandTier,
      school: student.school,
      notes: student.notes,
      status: student.user.status,
      createdAt: student.createdAt,
      parent: parentMap.get(student.parentId) ?? null,
    }));

    return {
      data,
      page,
      limit,
      total,
    };
  }

  async getStudentById(studentId: string, adminId: string, period: 'week' | 'month' | 'quarter' | 'year' | 'all' = 'month') {
    const student = await prisma.student.findUnique({
      where: { id: studentId, deletedAt: null },
      include: {
        user: {
          select: {
            status: true,
            email: true,
            timezone: true,
            profilePicture: true,
            // Explicitly exclude studentCode - admins must never see student codes
          },
        },
      },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    // Get parent summary - NO email/phone for security
    const parent = await prisma.user.findUnique({
      where: { id: student.parentId },
      select: {
        id: true,
        fullName: true,
        profilePicture: true,
      },
    });

    // Get enrollments with tutor info and effective pricing
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId, deletedAt: null },
      include: {
        subject: true,
        tutor: {
          select: {
            id: true,
            fullName: true,
            profilePicture: true,
          },
        },
        payments: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get unique tutor IDs
    const tutorIds = Array.from(new Set(enrollments.filter(e => e.tutorId).map(e => e.tutorId!)));

    // Fetch tutors with their subjects from TutorSubject relation
    const tutorsWithSubjects = await prisma.user.findMany({
      where: { id: { in: tutorIds } },
      include: {
        tutorProfile: {
          include: {
            tutorSubjects: {
              include: {
                subject: true,
              },
            },
          },
        },
      },
    });

    // Create tutors map with subjects
    const tutorsMap = new Map(
      tutorsWithSubjects.map(t => [
        t.id,
        {
          id: t.id,
          fullName: t.fullName,
          profilePicture: t.profilePicture,
          subjects: t.tutorProfile?.tutorSubjects.map(ts => ts.subject) || [],
        },
      ])
    );

    // Enrich enrollments with effective pricing and payment status
    const enrichedEnrollments = await Promise.all(
      enrollments.map(async (enrollment) => {
        let effectivePriceNGN: number | null = null;
        let effectivePriceUSD: number | null = null;
        let priceSource: string = 'error';

        if (enrollment.yearlyPriceNGN && enrollment.yearlyPriceUSD) {
          effectivePriceNGN = Number(enrollment.yearlyPriceNGN);
          effectivePriceUSD = Number(enrollment.yearlyPriceUSD);
          priceSource = 'custom_override';
        } else {
          const subjectPrice = await prisma.subjectPrice.findUnique({
            where: {
              subjectId_gradeBandTier: {
                subjectId: enrollment.subjectId,
                gradeBandTier: student.gradeBandTier,
              },
            },
          });

          if (subjectPrice && subjectPrice.isActive) {
            effectivePriceNGN = Number(subjectPrice.yearlyPriceNGN);
            effectivePriceUSD = Number(subjectPrice.yearlyPriceUSD);
            priceSource = 'subject_price';
          }
        }

        const paymentStatus = enrollment.payments[0]?.status || 'PENDING';
        const tutorInfo = enrollment.tutorId ? tutorsMap.get(enrollment.tutorId) : null;

        return {
          id: enrollment.id,
          subject: enrollment.subject,
          status: enrollment.status,
          tutor: tutorInfo,
          sessionFrequency: enrollment.sessionFrequency,
          availableDays: enrollment.availableDays,
          preferredStartHour: enrollment.preferredStartHour,
          preferredEndHour: enrollment.preferredEndHour,
          billingFrequency: enrollment.billingFrequency,
          effectivePriceNGN,
          effectivePriceUSD,
          priceSource,
          paymentStatus,
        };
      })
    );

    // Unique tutors list
    const uniqueTutors = Array.from(tutorsMap.values());

    // Get recent sessions (latest 20, upcoming first) with full details
    const sessions = await prisma.session.findMany({
      where: {
        participants: {
          some: {
            enrollment: { studentId },
          },
        },
      },
      include: {
        tutor: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
      take: 20,
    });

    const enrichedSessions = sessions.map(session => ({
      id: session.id,
      scheduledAt: session.scheduledAt,
      durationMinutes: session.durationMinutes,
      status: session.status,
      zoomLink: session.zoomLink,
      zoomMeetingId: session.zoomMeetingId,
      recordingUrl: session.recordingUrl,
      recordingStatus: session.recordingStatus,
      tutorNotes: session.tutorNotes,
      homeworkAssigned: session.homeworkAssigned,
      tutor: session.tutor,
    }));

    // Get attendance summary and recent records
    const [attendedCount, missedCount, recentAttendance] = await Promise.all([
      prisma.sessionParticipant.count({
        where: {
          enrollment: { studentId },
          attended: true,
          session: { status: { in: ['COMPLETED', 'MISSED'] } },
        },
      }),
      prisma.sessionParticipant.count({
        where: {
          enrollment: { studentId },
          attended: false,
          session: { status: 'MISSED' },
        },
      }),
      prisma.sessionParticipant.findMany({
        where: {
          enrollment: { studentId },
        },
        include: {
          session: {
            select: {
              scheduledAt: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    // Get grade summary and recent grades (only approved grades)
    const [approvedGrades, recentGrades] = await Promise.all([
      prisma.grade.findMany({
        where: {
          enrollment: { studentId },
          status: 'APPROVED',
        },
        select: { score: true, maxScore: true },
      }),
      prisma.grade.findMany({
        where: {
          enrollment: { studentId },
          status: 'APPROVED',
        },
        include: {
          enrollment: {
            include: {
              subject: true,
            },
          },
          assignment: {
            select: {
              title: true,
            },
          },
          grader: {
            select: {
              fullName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const avgGradePercentage = approvedGrades.length > 0
      ? approvedGrades.reduce((sum, g) => {
          const maxScore = Number(g.maxScore || 100);
          return sum + (Number(g.score) / maxScore) * 100;
        }, 0) / approvedGrades.length
      : null;

    const enrichedRecentGrades = recentGrades.map(grade => ({
      id: grade.id,
      score: Number(grade.score),
      maxScore: Number(grade.maxScore || 100),
      percentage: (Number(grade.score) / Number(grade.maxScore || 100)) * 100,
      status: grade.status,
      subject: grade.enrollment.subject.name,
      assignmentTitle: grade.assignment?.title,
      grader: grade.grader.fullName,
      approvedAt: grade.approvedAt,
      createdAt: grade.createdAt,
    }));

    const pendingGradesCount = await prisma.grade.count({
      where: {
        enrollment: { studentId },
        status: 'PENDING_APPROVAL',
      },
    });

    // Get assignment summary and recent items with submission status
    const [assignmentsTotal, assignmentsCompleted, assignmentsPending, recentAssignments] = await Promise.all([
      prisma.assignment.count({
        where: {
          enrollment: { studentId },
        },
      }),
      prisma.assignment.count({
        where: {
          enrollment: { studentId },
          status: { in: ['COMPLETED', 'GRADED'] },
        },
      }),
      prisma.assignment.count({
        where: {
          enrollment: { studentId },
          status: 'PENDING',
        },
      }),
      prisma.assignment.findMany({
        where: {
          enrollment: { studentId },
        },
        include: {
          submissions: {
            select: {
              submittedAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const enrichedRecentAssignments = recentAssignments.map(assignment => ({
      id: assignment.id,
      title: assignment.title,
      type: assignment.type,
      dueDate: assignment.dueDate,
      status: assignment.status,
      hasSubmission: assignment.submissions.length > 0,
      lastSubmittedAt: assignment.submissions[0]?.submittedAt,
    }));

    // Get latest progress reports
    const progressReports = await prisma.progressReport.findMany({
      where: {
        enrollment: { studentId },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Get performance data (default period=month, supports ?period= query param)
    // Admin can view any student's performance
    const performance = await this.performanceService.getStudentPerformance(
      studentId,
      adminId,
      'ADMIN',
      { period }
    );

    const { user, ...studentWithoutUser } = student;
    return {
      student: {
        id: studentWithoutUser.id,
        fullName: studentWithoutUser.fullName,
        dateOfBirth: studentWithoutUser.dateOfBirth,
        gender: studentWithoutUser.gender,
        actualGrade: studentWithoutUser.actualGrade,
        gradeLevel: studentWithoutUser.gradeLevel,
        gradeBandTier: studentWithoutUser.gradeBandTier,
        school: studentWithoutUser.school,
        notes: studentWithoutUser.notes,
        email: student.user.email,
        preferredStartDate: studentWithoutUser.preferredStartDate,
        timezone: student.user.timezone,
        profilePictureUrl: student.user.profilePicture,
        createdAt: studentWithoutUser.createdAt,
        status: student.user.status,
      },
      parent: parent ? {
        id: parent.id,
        fullName: parent.fullName,
        profilePictureUrl: parent.profilePicture,
      } : null,
      tutors: uniqueTutors,
      enrollments: enrichedEnrollments,
      sessions: enrichedSessions,
      attendance: {
        attended: attendedCount,
        missed: missedCount,
        total: attendedCount + missedCount,
        recent: recentAttendance.map(ra => ({
          date: ra.session.scheduledAt,
          attended: ra.attended,
          status: ra.session.status,
        })),
      },
      grades: {
        averagePercentage: avgGradePercentage,
        approvedCount: approvedGrades.length,
        pendingCount: pendingGradesCount,
        recent: enrichedRecentGrades,
      },
      assignments: {
        total: assignmentsTotal,
        completed: assignmentsCompleted,
        pending: assignmentsPending,
        recent: enrichedRecentAssignments,
      },
      progressReports,
      performance,
    };
  }

  async getStudentEnrollments(studentId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [enrollments, total] = await Promise.all([
      prisma.enrollment.findMany({
        where: { studentId, deletedAt: null },
        include: {
          subject: true,
          tutor: {
            select: {
              id: true,
              fullName: true,
              profilePicture: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Math.min(limit, 100),
      }),
      prisma.enrollment.count({
        where: { studentId, deletedAt: null },
      }),
    ]);

    return {
      data: enrollments,
      page,
      limit,
      total,
    };
  }

  async getStudentGrades(studentId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [grades, total] = await Promise.all([
      prisma.grade.findMany({
        where: {
          enrollment: { studentId },
        },
        include: {
          enrollment: {
            include: {
              subject: true,
            },
          },
          assignment: true,
          grader: {
            select: {
              id: true,
              fullName: true,
            },
          },
          approver: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Math.min(limit, 100),
      }),
      prisma.grade.count({
        where: {
          enrollment: { studentId },
        },
      }),
    ]);

    return {
      data: grades,
      page,
      limit,
      total,
    };
  }

  async getStudentAttendance(studentId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where: {
          participants: {
            some: {
              enrollment: { studentId },
            },
          },
        },
        include: {
          participants: {
            where: {
              enrollment: { studentId },
            },
          },
          tutor: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
        orderBy: { scheduledAt: 'desc' },
        skip,
        take: Math.min(limit, 100),
      }),
      prisma.session.count({
        where: {
          participants: {
            some: {
              enrollment: { studentId },
            },
          },
        },
      }),
    ]);

    return {
      data: sessions,
      page,
      limit,
      total,
    };
  }

  async getStudentSessions(studentId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where: {
          participants: {
            some: {
              enrollment: { studentId },
            },
          },
        },
        include: {
          participants: {
            include: {
              enrollment: {
                include: {
                  subject: true,
                },
              },
            },
          },
          tutor: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
        orderBy: { scheduledAt: 'desc' },
        skip,
        take: Math.min(limit, 100),
      }),
      prisma.session.count({
        where: {
          participants: {
            some: {
              enrollment: { studentId },
            },
          },
        },
      }),
    ]);

    return {
      data: sessions,
      page,
      limit,
      total,
    };
  }

  async getStudentAssignments(studentId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [assignments, total] = await Promise.all([
      prisma.assignment.findMany({
        where: {
          enrollment: { studentId },
        },
        include: {
          enrollment: {
            include: {
              subject: true,
            },
          },
          submissions: {
            select: {
              id: true,
              submittedAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Math.min(limit, 100),
      }),
      prisma.assignment.count({
        where: {
          enrollment: { studentId },
        },
      }),
    ]);

    return {
      data: assignments,
      page,
      limit,
      total,
    };
  }

  async getStudentProgressReports(studentId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      prisma.progressReport.findMany({
        where: {
          enrollment: { studentId },
        },
        include: {
          enrollment: {
            include: {
              subject: true,
              tutor: {
                select: {
                  id: true,
                  fullName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Math.min(limit, 100),
      }),
      prisma.progressReport.count({
        where: {
          enrollment: { studentId },
        },
      }),
    ]);

    return {
      data: reports,
      page,
      limit,
      total,
    };
  }

  async regenerateStudentPin(studentId: string, adminId: string) {
    // Get the student with their linked user account
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: {
          select: { id: true },
        },
      },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    // Generate new PIN
    const plainPin = this.generatePin();
    const passwordHash = await hashPassword(plainPin);

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
      await sendPasswordResetEmail(
        parent.email,
        'password_reset',
        { name: parent.fullName, newPin: plainPin }
      );
    }

    logger.info({ studentId, adminId }, 'Admin regenerated student PIN');

    return {
      message: 'PIN regenerated successfully. New credentials sent to parent email.',
    };
  }

  async getEnrollmentPricing(enrollmentId: string) {
    return this.enrollmentsService.getEnrollmentPricing(enrollmentId);
  }

  async updateEnrollmentPricing(enrollmentId: string, data: UpdateEnrollmentPricingInput) {
    return this.enrollmentsService.updateEnrollmentPricing(enrollmentId, data);
  }

  async createSession(data: CreateSessionInput, adminId: string) {
    return this.sessionsService.createSession(data, adminId);
  }

  async rescheduleSession(sessionId: string, data: RescheduleSessionInput) {
    return this.sessionsService.rescheduleSession(sessionId, data);
  }

  async getSuspendedUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
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
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: Math.min(limit, 100),
      }),
      prisma.user.count({
        where: { status: 'SUSPENDED' },
      }),
    ]);

    return {
      data: users,
      page,
      limit,
      total,
    };
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

    // Revoke the entire token family on reactivation for security
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { revokedAt: new Date() },
    });

    logger.info({ userId, adminId, newStatus }, 'User reactivated by admin');
    return updated;
  }

  async suspendUser(userId: string, data: SuspendUserInput, adminId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.status === 'SUSPENDED') {
      throw new Error('User is already suspended');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status: 'SUSPENDED' },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
      },
    });

    // If suspending a tutor, find affected active enrollments
    let affectedEnrollments: any[] = [];
    if (user.role === 'TUTOR') {
      affectedEnrollments = await prisma.enrollment.findMany({
        where: {
          tutorId: userId,
          status: 'ACTIVE',
          deletedAt: null,
        },
        include: {
          student: true,
          subject: true,
        },
      });

      // Notify admin about affected enrollments for reassignment
      if (affectedEnrollments.length > 0) {
        logger.info(
          { userId, adminId, affectedCount: affectedEnrollments.length },
          'Tutor suspended with active enrollments - admin notified for reassignment'
        );
      }
    }

    // Revoke the entire token family on suspension for security
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { revokedAt: new Date() },
    });

    // Send suspension notification email
    if (user.email) {
      await this.notificationsService.createNotification(
        userId,
        'ACCOUNT_SUSPENDED',
        {
          title: 'Account Suspended',
          message: `Your account has been suspended for the following reason: ${data.reason}`,
          relatedType: 'USER',
          relatedId: userId,
        }
      );

      // Send email notification
      await sendPasswordResetEmail(user.email, 'account_suspended', {
        fullName: user.fullName,
        reason: data.reason,
      });
    }

    logger.info({ userId, adminId, reason: data.reason }, 'User suspended by admin');

    return {
      user: updated,
      affectedEnrollments,
    };
  }

  async addPaymentNote(paymentId: string, data: AddPaymentNoteInput, adminId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: { adminNote: data.note },
    });

    // Log to admin action log
    await prisma.adminActionLog.create({
      data: {
        adminId,
        action: 'ADD_PAYMENT_NOTE',
        targetType: 'PAYMENT',
        targetId: paymentId,
        details: { note: data.note },
      },
    });

    logger.info({ paymentId, adminId }, 'Admin added note to payment');

    return updated;
  }

  async reverifyPayment(paymentId: string, adminId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        enrollment: true,
      },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== 'PENDING') {
      throw new Error('Payment is not in PENDING status');
    }

    if (!payment.providerReference) {
      throw new Error('Payment has no provider reference to verify');
    }

    // Call Paystack verify API server-side
    const paystackUrl = `https://api.paystack.co/transaction/verify/${payment.providerReference}`;
    const paystackKey = process.env.PAYSTACK_SECRET_KEY;

    if (!paystackKey) {
      throw new Error('Paystack secret key not configured');
    }

    const response = await fetch(paystackUrl, {
      headers: {
        Authorization: `Bearer ${paystackKey}`,
      },
    });

    const result: any = await response.json();

    if (!result.status || result.data.status !== 'success') {
      throw new Error('Payment verification failed: ' + (result.message || 'Unknown error'));
    }

    // Update payment status if successful
    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'SUCCESS',
        paidAt: new Date(result.data.paid_at),
      },
    });

    // Activate enrollment(s) idempotently
    if (payment.enrollmentId) {
      await prisma.enrollment.update({
        where: { id: payment.enrollmentId },
        data: { status: 'ACTIVE' },
      });
    } else if (payment.enrollmentGroupId) {
      await prisma.enrollment.updateMany({
        where: { enrollmentGroupId: payment.enrollmentGroupId },
        data: { status: 'ACTIVE' },
      });
    }

    // Log to admin action log
    await prisma.adminActionLog.create({
      data: {
        adminId,
        action: 'REVERIFY_PAYMENT',
        targetType: 'PAYMENT',
        targetId: paymentId,
        details: { providerReference: payment.providerReference },
      },
    });

    logger.info({ paymentId, adminId }, 'Admin reverified payment and activated enrollment');

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

  // Pricing Tier Management (DEPRECATED - use Subject/SubjectPrice-based pricing instead)
  // These methods are kept for backward compatibility but the routes have been removed
  async getPricingTiers() {
    const tiers = await prisma.pricingTier.findMany({
      include: {
        updater: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: {
        gradeBandTier: 'asc',
      },
    });

    // Get latest exchange rate for drift calculation
    const latestRate = await prisma.exchangeRate.findFirst({
      where: {
        fromCurrency: 'USD',
        toCurrency: 'NGN',
      },
      orderBy: {
        fetchedAt: 'desc',
      },
    });

    const marketRate = latestRate ? Number(latestRate.rate) : null;

    // Calculate drift for each tier
    return tiers.map(tier => {
      const impliedRate = Number(tier.yearlyPriceNGN) / Number(tier.yearlyPriceUSD);
      const driftPercentage = marketRate
        ? Math.abs((impliedRate - marketRate) / marketRate) * 100
        : null;

      return {
        ...tier,
        impliedRate,
        currentMarketRate: marketRate,
        driftPercentage,
        needsReview: driftPercentage !== null && driftPercentage > 7, // Default threshold
      };
    });
  }

  async updatePricingTier(gradeBandTier: GradeBandTier, data: UpdatePricingTierInput, adminId: string) {
    const tier = await prisma.pricingTier.findUnique({
      where: { gradeBandTier },
    });

    if (!tier) {
      throw new Error('Pricing tier not found');
    }

    return prisma.pricingTier.update({
      where: { gradeBandTier },
      data: {
        yearlyPriceNGN: data.yearlyPriceNGN !== undefined ? data.yearlyPriceNGN : tier.yearlyPriceNGN,
        yearlyPriceUSD: data.yearlyPriceUSD !== undefined ? data.yearlyPriceUSD : tier.yearlyPriceUSD,
        updatedBy: adminId,
      },
      include: {
        updater: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  async updateEnrollmentPricingOverride(enrollmentId: string, data: UpdateEnrollmentPricingOverrideInput, adminId: string) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: {
          include: {
            user: true,
          },
        },
        subject: true,
      },
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    // Log price change if prices are being modified
    if (data.yearlyPriceNGN !== undefined || data.yearlyPriceUSD !== undefined) {
      await prisma.priceChangeLog.create({
        data: {
          targetType: 'ENROLLMENT',
          targetId: enrollmentId,
          changedBy: adminId,
          oldNGN: enrollment.yearlyPriceNGN,
          oldUSD: enrollment.yearlyPriceUSD,
          newNGN: data.yearlyPriceNGN !== undefined ? data.yearlyPriceNGN : enrollment.yearlyPriceNGN,
          newUSD: data.yearlyPriceUSD !== undefined ? data.yearlyPriceUSD : enrollment.yearlyPriceUSD,
          note: data.note,
        },
      });

      // Send price update notification to parent
      await this.notificationsService.createNotification(
        enrollment.student.parentId,
        'PRICE_UPDATED',
        {
          title: 'Price Updated',
          message: `The price for ${enrollment.student.fullName}'s ${enrollment.subject.name} is now ₦${data.yearlyPriceNGN || enrollment.yearlyPriceNGN} / $${data.yearlyPriceUSD || enrollment.yearlyPriceUSD}`,
          relatedType: 'ENROLLMENT',
          relatedId: enrollmentId,
        }
      );
    }

    return prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        yearlyPriceNGN: data.yearlyPriceNGN !== undefined ? data.yearlyPriceNGN : enrollment.yearlyPriceNGN,
        yearlyPriceUSD: data.yearlyPriceUSD !== undefined ? data.yearlyPriceUSD : enrollment.yearlyPriceUSD,
        billingFrequency: data.billingFrequency !== undefined ? data.billingFrequency : enrollment.billingFrequency,
      },
      include: {
        student: {
          include: {
            user: true,
          },
        },
        subject: true,
      },
    });
  }

  async getEnrollmentPricingOverride(enrollmentId: string) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: {
          include: {
            user: true,
          },
        },
        subject: true,
      },
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    // Determine effective price and source
    let effectivePriceNGN: number | null = null;
    let effectivePriceUSD: number | null = null;
    let priceSource: 'override' | 'tier default' | 'error' = 'error';

    // Check for override first
    if (enrollment.yearlyPriceNGN !== null && enrollment.yearlyPriceUSD !== null) {
      effectivePriceNGN = Number(enrollment.yearlyPriceNGN);
      effectivePriceUSD = Number(enrollment.yearlyPriceUSD);
      priceSource = 'custom_override';
    } else {
      // Fall back to tier default
      const tier = await prisma.pricingTier.findUnique({
        where: { gradeBandTier: enrollment.student.gradeBandTier },
      });

      if (tier) {
        effectivePriceNGN = Number(tier.yearlyPriceNGN);
        effectivePriceUSD = Number(tier.yearlyPriceUSD);
        priceSource = 'tier default';
      } else {
        // No pricing available
        throw new Error('No pricing configured for this enrollment');
      }
    }

    return {
      enrollmentId: enrollment.id,
      studentName: enrollment.student.fullName,
      subject: enrollment.subject.name,
      gradeBandTier: enrollment.student.gradeBandTier,
      effectivePriceNGN,
      effectivePriceUSD,
      priceSource,
      overrideNGN: enrollment.yearlyPriceNGN,
      overrideUSD: enrollment.yearlyPriceUSD,
      billingFrequency: enrollment.billingFrequency,
    };
  }

  async getCurrentExchangeRate() {
    const latestRate = await prisma.exchangeRate.findFirst({
      where: {
        fromCurrency: 'USD',
        toCurrency: 'NGN',
      },
      orderBy: {
        fetchedAt: 'desc',
      },
    });

    if (!latestRate) {
      throw new Error('No exchange rate data available');
    }

    return {
      fromCurrency: latestRate.fromCurrency,
      toCurrency: latestRate.toCurrency,
      rate: Number(latestRate.rate),
      fetchedAt: latestRate.fetchedAt,
    };
  }

  // Parent Directory
  async getParents(filters?: { search?: string; status?: string; page?: number; limit?: number }) {
    const { search, status, page = 1, limit = 20 } = filters || {};
    const skip = (page - 1) * limit;

    const where: any = {
      role: 'PARENT',
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [parents, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          status: true,
          createdAt: true,
          _count: {
            select: {
              students: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Math.min(limit, 100),
      }),
      prisma.user.count({ where }),
    ]);

    // Fetch additional metrics for each parent
    const enrichedParents = await Promise.all(
      parents.map(async (parent) => {
        const [activeEnrollments, pendingPaymentCount, totalPaidNGN, totalPaidUSD] = await Promise.all([
          prisma.enrollment.count({
            where: {
              student: { parentId: parent.id },
              status: 'ACTIVE',
            },
          }),
          prisma.payment.count({
            where: {
              parentId: parent.id,
              status: 'PENDING',
            },
          }),
          prisma.payment.aggregate({
            where: {
              parentId: parent.id,
              status: 'SUCCESS',
              currency: 'NGN',
            },
            _sum: { amount: true },
          }),
          prisma.payment.aggregate({
            where: {
              parentId: parent.id,
              status: 'SUCCESS',
              currency: 'USD',
            },
            _sum: { amount: true },
          }),
        ]);

        return {
          ...parent,
          childrenCount: parent._count.students,
          activeEnrollments,
          pendingPaymentCount,
          totalPaidNGN: Number(totalPaidNGN._sum.amount || 0),
          totalPaidUSD: Number(totalPaidUSD._sum.amount || 0),
        };
      })
    );

    return {
      data: enrichedParents,
      page,
      limit,
      total,
    };
  }

  async getParentById(parentId: string) {
    const parent = await prisma.user.findUnique({
      where: { id: parentId, role: 'PARENT' },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        status: true,
        timezone: true,
        profilePicture: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!parent) {
      throw new Error('Parent not found');
    }

    // Get children with their enrollments
    const children = await prisma.student.findMany({
      where: { parentId },
      include: {
        user: {
          select: {
            status: true,
            // Explicitly exclude studentCode - admins must never see student codes
          },
        },
        enrollments: {
          where: { deletedAt: null },
          include: {
            subject: true,
            tutor: {
              select: {
                id: true,
                fullName: true,
                profilePicture: true,
              },
            },
            payments: {
              where: { status: 'PENDING' },
              take: 1,
            },
          },
        },
      },
    });

    // Get recent payments
    const recentPayments = await prisma.payment.findMany({
      where: { parentId },
      include: {
        enrollment: {
          include: {
            student: true,
            subject: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Get complaint count
    const complaintCount = await prisma.complaint.count({
      where: { filedBy: parentId },
    });

    // Enrich enrollments with effective pricing
    const enrichedChildren = await Promise.all(
      children.map(async (child) => {
        const enrichedEnrollments = await Promise.all(
          child.enrollments.map(async (enrollment) => {
            let effectivePriceNGN: number | null = null;
            let effectivePriceUSD: number | null = null;
            let priceSource: string = 'error';

            if (enrollment.yearlyPriceNGN && enrollment.yearlyPriceUSD) {
              effectivePriceNGN = Number(enrollment.yearlyPriceNGN);
              effectivePriceUSD = Number(enrollment.yearlyPriceUSD);
              priceSource = 'custom_override';
            } else {
              const subjectPrice = await prisma.subjectPrice.findUnique({
                where: {
                  subjectId_gradeBandTier: {
                    subjectId: enrollment.subjectId,
                    gradeBandTier: child.gradeBandTier,
                  },
                },
              });

              if (subjectPrice && subjectPrice.isActive) {
                effectivePriceNGN = Number(subjectPrice.yearlyPriceNGN);
                effectivePriceUSD = Number(subjectPrice.yearlyPriceUSD);
                priceSource = 'subject_price';
              }
            }

            return {
              ...enrollment,
              effectivePriceNGN,
              effectivePriceUSD,
              priceSource,
              hasPendingPayment: enrollment.payments.length > 0,
            };
          })
        );

        const { user, ...childWithoutUser } = child;
        return {
          ...childWithoutUser,
          status: user.status,
          enrollments: enrichedEnrollments,
        };
      })
    );

    return {
      ...parent,
      children: enrichedChildren,
      recentPayments,
      complaintCount,
    };
  }

  async getSuggestedTutors(enrollmentId: string) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: {
          include: {
            user: true,
          },
        },
        subject: true,
      },
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    // Get APPROVED tutors who teach this subject
    const tutors = await prisma.user.findMany({
      where: {
        role: 'TUTOR',
        status: 'APPROVED',
        tutorProfile: {
          vettingStatus: 'APPROVED',
          availabilityStatus: { not: 'UNAVAILABLE' },
          tutorSubjects: {
            some: {
              subjectId: enrollment.subjectId,
            },
          },
        },
      },
      include: {
        tutorProfile: {
          include: {
            tutorSubjects: {
              include: {
                subject: true,
              },
            },
          },
        },
      },
    });

    // Calculate fit score for each tutor
    const scoredTutors = await Promise.all(
      tutors.map(async (tutor) => {
        const currentStudentCount = await prisma.enrollment.count({
          where: {
            tutorId: tutor.id,
            status: 'ACTIVE',
          },
        });

        const maxStudents = tutor.tutorProfile?.maxStudents;
        const hasCapacity = !maxStudents || currentStudentCount < maxStudents;

        const reasons: string[] = [];
        const warnings: string[] = [];

        if (!hasCapacity) {
          warnings.push('At capacity');
        }

        if (tutor.tutorProfile?.availabilityStatus === 'LIMITED') {
          warnings.push('Limited availability');
        }

        // Check availability overlap (simplified - would need more complex logic in production)
        if (enrollment.availableDays && enrollment.availableDays.length > 0) {
          reasons.push('Availability may match');
        }

        // Base score calculation
        let matchScore = 50; // Base score
        if (hasCapacity) matchScore += 20;
        if (tutor.tutorProfile?.availabilityStatus === 'AVAILABLE') matchScore += 15;
        if (currentStudentCount < 5) matchScore += 10; // Prefer tutors with fewer students
        if (enrollment.availableDays && enrollment.availableDays.length > 0) matchScore += 5;

        return {
          tutorId: tutor.id,
          fullName: tutor.fullName,
          profilePictureUrl: tutor.profilePicture,
          subjects: tutor.tutorProfile?.tutorSubjects.map(ts => ts.subject.name) || [],
          availabilityStatus: tutor.tutorProfile?.availabilityStatus,
          currentStudentCount,
          maxStudents,
          matchScore,
          reasons,
          warnings,
        };
      })
    );

    // Sort by match score descending
    scoredTutors.sort((a, b) => b.matchScore - a.matchScore);

    return scoredTutors;
  }

  // Admin Transactions
  async getPayments(filters?: {
    status?: string;
    currency?: string;
    provider?: string;
    parentId?: string;
    from?: string;
    to?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, currency, provider, parentId, from, to, search, page = 1, limit = 20 } = filters || {};
    const skip = (page - 1) * limit;

    // Validate provider filter - only PAYSTACK is supported
    if (provider && provider !== 'PAYSTACK') {
      throw new Error('Invalid payment provider. Only PAYSTACK is supported.');
    }

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (currency) {
      where.currency = currency;
    }

    if (provider) {
      where.provider = provider;
    }

    if (parentId) {
      where.parentId = parentId;
    }

    if (from || to) {
      where.createdAt = {};
      if (from) {
        where.createdAt.gte = new Date(from);
      }
      if (to) {
        where.createdAt.lte = new Date(to);
      }
    }

    if (search) {
      where.OR = [
        { providerReference: { contains: search, mode: 'insensitive' } },
        { parent: { fullName: { contains: search, mode: 'insensitive' } } },
        { parent: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
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
        skip,
        take: Math.min(limit, 100),
      }),
      prisma.payment.count({ where }),
    ]);

    // Enrich with NGN equivalent for USD payments
    const enrichedPayments = await Promise.all(
      payments.map(async (payment) => {
        let chargedAmountNGN = Number(payment.amount);
        if (payment.currency === 'USD') {
          // Get latest exchange rate
          const rate = await prisma.exchangeRate.findFirst({
            where: {
              fromCurrency: 'USD',
              toCurrency: 'NGN',
            },
            orderBy: { fetchedAt: 'desc' },
          });
          if (rate) {
            chargedAmountNGN = Number(payment.amount) * Number(rate.rate);
          }
        }

        return {
          ...payment,
          chargedAmountNGN,
        };
      })
    );

    return {
      data: enrichedPayments,
      page,
      limit,
      total,
    };
  }

  async getPaymentById(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        parent: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
        enrollment: {
          include: {
            student: true,
            subject: true,
          },
        },
      },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    // Get timeline events
    const timeline = [
      {
        event: 'Initiated',
        timestamp: payment.createdAt,
      },
    ];

    if (payment.paidAt) {
      timeline.push({
        event: 'Paid',
        timestamp: payment.paidAt,
      });
    }

    // Calculate NGN equivalent
    let chargedAmountNGN = Number(payment.amount);
    if (payment.currency === 'USD') {
      const rate = await prisma.exchangeRate.findFirst({
        where: {
          fromCurrency: 'USD',
          toCurrency: 'NGN',
        },
        orderBy: { fetchedAt: 'desc' },
      });
      if (rate) {
        chargedAmountNGN = Number(payment.amount) * Number(rate.rate);
      }
    }

    return {
      ...payment,
      chargedAmountNGN,
      timeline,
    };
  }

  async getPaymentsSummary(filters?: { from?: string; to?: string }) {
    const { from, to } = filters || {};

    const where: any = {
      status: 'SUCCESS',
    };

    if (from || to) {
      where.paidAt = {};
      if (from) {
        where.paidAt.gte = new Date(from);
      }
      if (to) {
        where.paidAt.lte = new Date(to);
      }
    }

    // Total revenue by currency
    const revenueByCurrency = await prisma.payment.groupBy({
      by: ['currency'],
      where,
      _sum: {
        amount: true,
      },
    });

    // Counts by status
    const countsByStatus = await prisma.payment.groupBy({
      by: ['status'],
      where: from || to ? { createdAt: {} } : undefined,
      ...(from && { where: { ...where, createdAt: { gte: new Date(from) } } }),
      ...(to && { where: { ...where, createdAt: { lte: new Date(to) } } }),
      _count: true,
    });

    // Revenue per day (for chart)
    const revenuePerDay = await prisma.$queryRaw<Array<{ date: string; amount: bigint }>>`
      SELECT DATE("paidAt") as date, SUM(amount) as amount
      FROM "Payment"
      WHERE status = 'SUCCESS'
      ${from ? `AND "paidAt" >= ${new Date(from).toISOString()}` : ''}
      ${to ? `AND "paidAt" <= ${new Date(to).toISOString()}` : ''}
      GROUP BY DATE("paidAt")
      ORDER BY date DESC
      LIMIT 30
    `;

    const totalRevenue = revenueByCurrency.reduce((sum, item) => {
      return sum + Number(item._sum.amount || 0);
    }, 0);

    const totalPayments = countsByStatus.reduce((sum, item) => {
      return sum + item._count;
    }, 0);

    const successPayments = countsByStatus.find(item => item.status === 'SUCCESS')?._count || 0;
    const successRate = totalPayments > 0 ? (successPayments / totalPayments) * 100 : 0;

    return {
      totalRevenue,
      revenueByCurrency: revenueByCurrency.map(item => ({
        currency: item.currency,
        amount: Number(item._sum.amount || 0),
      })),
      countsByStatus: countsByStatus.map(item => ({
        status: item.status,
        count: item._count,
      })),
      successRate: Math.round(successRate * 100) / 100,
      revenuePerDay: revenuePerDay.map(item => ({
        date: item.date,
        amount: Number(item.amount),
      })),
    };
  }

  async getEmailDiagnostics() {
    const diagnostics = {
      configured: !!config.RESEND_API_KEY,
      emailFrom: config.EMAIL_FROM,
      emailReplyTo: config.EMAIL_REPLY_TO || 'Not configured',
      domainStatus: 'unknown',
      domain: 'teachmenest.com',
    };

    if (!config.RESEND_API_KEY) {
      return {
        ...diagnostics,
        domainStatus: 'error',
        message: 'Resend API key not configured',
      };
    }

    try {
      // Extract domain from EMAIL_FROM
      const emailMatch = config.EMAIL_FROM.match(/<([^>]+)>/);
      const senderEmail = emailMatch ? emailMatch[1] : config.EMAIL_FROM;
      const domain = senderEmail.split('@')[1];

      // Call Resend API to check domain verification status
      const response = await fetch(`https://api.resend.com/v1/domains/${domain}`, {
        headers: {
          'Authorization': `Bearer ${config.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const domainData: any = await response.json();
        return {
          ...diagnostics,
          domain,
          domainStatus: domainData.status || 'verified',
          dnsRecords: domainData.dnsRecords || [],
          message: 'Domain verification status retrieved successfully',
        };
      } else if (response.status === 404) {
        return {
          ...diagnostics,
          domain,
          domainStatus: 'not_found',
          message: 'Domain not found in Resend. Please add it in the Resend dashboard.',
        };
      } else {
        const error = await response.text();
        return {
          ...diagnostics,
          domain,
          domainStatus: 'error',
          message: `Resend API error: ${response.status} - ${error}`,
        };
      }
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to check Resend domain status');
      return {
        ...diagnostics,
        domainStatus: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
