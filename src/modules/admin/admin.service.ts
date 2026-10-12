import prisma from '../../config/database';
import { UpdateTutorVettingInput, AssignTutorInput, UpdateEnrollmentPricingInput, UpdatePricingTierInput, UpdateEnrollmentPricingOverrideInput } from './admin.validation';
import { hashPassword } from '../../utils/password.util';
import { sendPasswordResetEmail } from '../../utils/email.util';
import { logger } from '../../config/logger';
import crypto from 'crypto';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { SessionsService } from '../sessions/sessions.service';
import { GradesService } from '../grades/grades.service';
import { NotificationsService } from '../notifications/notifications.service';
import { GradeBandTier } from '@prisma/client';
import { CreateSessionInput, RescheduleSessionInput } from '../sessions/sessions.validation';

export class AdminService {
  private enrollmentsService: EnrollmentsService;
  private sessionsService: SessionsService;
  private gradesService: GradesService;
  private notificationsService: NotificationsService;

  constructor() {
    this.enrollmentsService = new EnrollmentsService();
    this.sessionsService = new SessionsService();
    this.gradesService = new GradesService();
    this.notificationsService = new NotificationsService();
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

  async getTutors(filters?: { status?: string; availabilityStatus?: string; subjectId?: string; hasCapacity?: boolean }) {
    const where: any = {
      role: 'TUTOR',
    };

    // Default to APPROVED if no status filter provided (useful for assign-tutor use case)
    if (filters?.status) {
      where.status = filters.status;
    } else {
      where.status = 'APPROVED';
    }

    if (filters?.availabilityStatus) {
      where.tutorProfile = {
        availabilityStatus: filters.availabilityStatus,
      };
    }

    if (filters?.subjectId) {
      where.tutorProfile = {
        ...where.tutorProfile,
        tutorSubjects: {
          some: {
            subjectId: filters.subjectId,
          },
        },
      };
    }

    const tutors = await prisma.user.findMany({
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
      },
      orderBy: {
        fullName: 'asc',
      },
    });

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

    // Filter by capacity if requested
    if (filters?.hasCapacity) {
      return enrichedTutors.filter(tutor => {
        const maxStudents = tutor.tutorProfile?.maxStudents;
        if (!maxStudents) return true; // No limit set
        return tutor.currentStudentCount < maxStudents;
      });
    }

    return enrichedTutors;
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

  async regenerateStudentPin(studentId: string, adminId: string) {
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
        parent.fullName,
        plainPin
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
      await this.notificationsService.createNotification({
        userId: enrollment.student.parentId,
        type: 'PRICE_UPDATED',
        title: 'Price Updated',
        message: `The price for ${enrollment.student.fullName}'s ${enrollment.subject.name} is now ₦${data.yearlyPriceNGN || enrollment.yearlyPriceNGN} / $${data.yearlyPriceUSD || enrollment.yearlyPriceUSD}`,
        relatedType: 'ENROLLMENT',
        relatedId: enrollmentId,
        data: {
          studentId: enrollment.studentId,
          enrollmentId: enrollmentId,
        },
      });
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
      priceSource = 'override';
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
      studentCode: enrollment.student.user.studentCode,
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
            studentCode: true,
            status: true,
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
              priceSource = 'override';
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

        return {
          ...child,
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
}
