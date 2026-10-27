import { randomUUID } from 'crypto';
import prisma from '../../config/database';
import { CreateEnrollmentInput, GetEnrollmentsQuery, UpdateEnrollmentPricingInput } from './enrollments.validation';
import { computeLagosEquivalentWindow } from '../../utils/timezone.util';
import { AppError } from '../../middleware/error-handler.middleware';
import { NotificationCoreService } from '../notifications/notification-core.service';
import { NotificationCategory, NotificationType } from '@prisma/client';

export { computeLagosEquivalentWindow };

export class EnrollmentsService {
  private notificationCore: NotificationCoreService;

  constructor() {
    this.notificationCore = new NotificationCoreService();
  }
  async createEnrollment(parentId: string, data: CreateEnrollmentInput) {
    // 1. Verify student belongs to parent
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
    });

    if (!student) {
      throw new AppError(404, 'Student not found');
    }

    if (student.parentId !== parentId) {
      throw new AppError(403, 'Not authorized to enroll this student');
    }

    // 2. Prevent duplicate subjects in the same submission
    const uniqueSubjectIds = Array.from(new Set(data.subjectIds));
    if (uniqueSubjectIds.length !== data.subjectIds.length) {
      throw new AppError(400, 'Duplicate subjects are not allowed in the same enrollment batch');
    }

    // 3. Batch verify all requested subjects exist
    const subjects = await prisma.subject.findMany({
      where: { id: { in: data.subjectIds } },
    });

    if (subjects.length !== data.subjectIds.length) {
      throw new AppError(404, 'One or more subjects not found');
    }

    // 4. Check for existing active or pending payment enrollments for this student with any of these subjects
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        studentId: data.studentId,
        subjectId: { in: data.subjectIds },
        status: { in: ['ACTIVE', 'PENDING_PAYMENT'] },
      },
      include: {
        subject: true,
      },
    });

    if (existingEnrollment) {
      throw new AppError(400, `Student is already enrolled in ${existingEnrollment.subject.name}`);
    }

    // 5. Generate shared enrollmentGroupId for the batch
    const enrollmentGroupId = randomUUID();

    // 6. Create one Enrollment row per subject inside a single database transaction
    const enrollments = await prisma.$transaction(
      data.subjectIds.map((subjectId) =>
        prisma.enrollment.create({
          data: {
            enrollmentGroupId,
            studentId: data.studentId,
            subjectId,
            sessionFrequency: data.sessionFrequency,
            availableDays: data.availableDays,
            preferredStartHour: data.preferredStartHour,
            preferredEndHour: data.preferredEndHour,
            billingFrequency: data.billingFrequency,
            yearlyPrice: 0, // Default, admin will set actual price or pricing tier applies
            startDate: new Date(data.startDate),
            endDate: data.endDate ? new Date(data.endDate) : null,
            status: 'PENDING_PAYMENT',
          },
          include: {
            student: true,
            subject: true,
          },
        })
      )
    );

    // Notify admins of new enrollment (payment pending)
    await this.notificationCore.notify({
      recipientRole: 'ADMIN',
      type: 'ENROLLMENT_CREATED' as NotificationType,
      category: 'ENROLLMENTS' as NotificationCategory,
      title: 'New Enrollment Created',
      body: `New enrollment for ${enrollments[0].student.fullName} - payment pending`,
      entityType: 'Enrollment',
      entityId: enrollments[0].id,
      dedupeKey: `enrollment-created-${enrollmentGroupId}`,
    });

    return {
      enrollmentGroupId,
      enrollments,
    };
  }

  async getEnrollmentsByGroupId(groupId: string, userId: string, userRole: string) {
    // For tutors and students, exclude pricing fields
    const includePayments = userRole === 'ADMIN' || userRole === 'PARENT';
    const selectPricing = userRole === 'ADMIN' || userRole === 'PARENT';

    const enrollments = await prisma.enrollment.findMany({
      where: { enrollmentGroupId: groupId },
      select: {
        id: true,
        studentId: true,
        subjectId: true,
        tutorId: true,
        enrollmentGroupId: true,
        status: true,
        sessionFrequency: true,
        availableDays: true,
        preferredStartHour: true,
        preferredEndHour: true,
        billingFrequency: selectPricing,
        yearlyPrice: selectPricing,
        startDate: true,
        endDate: true,
        createdAt: true,
        updatedAt: true,
        student: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                timezone: true,
              },
            },
          },
        },
        subject: true,
        tutor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            tutorProfile: true,
          },
        },
        sessionParticipants: {
          include: {
            session: true,
          },
        },
        payments: includePayments ? {
          orderBy: { createdAt: 'desc' },
        } : false,
        progressReports: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!enrollments || enrollments.length === 0) {
      throw new AppError(404, 'Enrollment group not found');
    }

    // Check authorization based on role
    if (userRole === 'PARENT') {
      if (enrollments[0].student.parentId !== userId) {
        throw new AppError(403, 'Not authorized to access this enrollment group');
      }
    } else if (userRole === 'TUTOR') {
      const isAssignedTutor = enrollments.some((e) => e.tutorId === userId);
      if (!isAssignedTutor) {
        throw new AppError(403, 'Not authorized to access this enrollment group');
      }
    } else if (userRole !== 'ADMIN') {
      throw new AppError(403, 'Not authorized to access this enrollment group');
    }

    return {
      enrollmentGroupId: groupId,
      enrollments,
    };
  }

  async getEnrollmentsByParent(parentId: string, query: GetEnrollmentsQuery) {
    const where: any = {
      student: {
        parentId,
      },
    };

    if (query.status) {
      where.status = query.status;
    }

    return prisma.enrollment.findMany({
      where,
      select: {
        // Include all fields EXCEPT yearlyPriceNGN and yearlyPriceUSD
        id: true,
        studentId: true,
        subjectId: true,
        tutorId: true,
        enrollmentGroupId: true,
        status: true,
        sessionFrequency: true,
        availableDays: true,
        preferredStartHour: true,
        preferredEndHour: true,
        billingFrequency: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        updatedAt: true,
        student: true,
        subject: true,
        tutor: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        sessionParticipants: {
          include: {
            session: true,
          },
        },
        // Exclude payments to hide pricing
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getEnrollmentsByTutor(tutorId: string, query: GetEnrollmentsQuery) {
    const where: any = {
      tutorId,
    };

    if (query.status) {
      where.status = query.status;
    }

    return prisma.enrollment.findMany({
      where,
      select: {
        // Include all fields EXCEPT pricing
        id: true,
        studentId: true,
        subjectId: true,
        tutorId: true,
        enrollmentGroupId: true,
        status: true,
        sessionFrequency: true,
        availableDays: true,
        preferredStartHour: true,
        preferredEndHour: true,
        billingFrequency: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        updatedAt: true,
        student: true,
        subject: true,
        tutor: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        sessionParticipants: {
          include: {
            session: true,
          },
        },
        // Exclude payments to hide pricing
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getEnrollmentById(id: string, userId: string, userRole: string) {
    // For tutors, exclude pricing fields
    const includePayments = userRole === 'ADMIN' || userRole === 'PARENT';
    const selectPricing = userRole === 'ADMIN' || userRole === 'PARENT';

    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      select: {
        id: true,
        studentId: true,
        subjectId: true,
        tutorId: true,
        enrollmentGroupId: true,
        status: true,
        sessionFrequency: true,
        availableDays: true,
        preferredStartHour: true,
        preferredEndHour: true,
        billingFrequency: selectPricing,
        yearlyPrice: selectPricing,
        startDate: true,
        endDate: true,
        createdAt: true,
        updatedAt: true,
        student: true,
        subject: true,
        tutor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            tutorProfile: true,
          },
        },
        sessionParticipants: {
          include: {
            session: true,
          },
        },
        payments: includePayments ? {
          orderBy: { createdAt: 'desc' },
        } : false,
        progressReports: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!enrollment) {
      throw new AppError(404, 'Enrollment not found');
    }

    // Check authorization based on role
    if (userRole === 'PARENT') {
      if (enrollment.student.parentId !== userId) {
        throw new AppError(403, 'Not authorized to access this enrollment');
      }
    } else if (userRole === 'TUTOR') {
      if (enrollment.tutorId !== userId) {
        throw new AppError(403, 'Not authorized to access this enrollment');
      }
    } else if (userRole !== 'ADMIN') {
      throw new AppError(403, 'Not authorized to access this enrollment');
    }

    return enrollment;
  }

  // Admin-only method to update enrollment pricing
  async updateEnrollmentPricing(enrollmentId: string, data: UpdateEnrollmentPricingInput) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      throw new AppError(404, 'Enrollment not found');
    }

    return prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        yearlyPrice: data.yearlyPrice !== undefined ? data.yearlyPrice : enrollment.yearlyPrice,
        billingFrequency: data.billingFrequency !== undefined ? data.billingFrequency : enrollment.billingFrequency,
      },
      include: {
        student: true,
        subject: true,
      },
    });
  }

  // Admin-only method to get enrollment pricing details
  async getEnrollmentPricing(enrollmentId: string) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: {
        id: true,
        yearlyPrice: true,
        billingFrequency: true,
        sessionFrequency: true,
        student: {
          select: {
            fullName: true,
          },
        },
        subject: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!enrollment) {
      throw new AppError(404, 'Enrollment not found');
    }

    // Calculate current amount based on billing frequency
    let currentAmount = Number(enrollment.yearlyPrice);
    switch (enrollment.billingFrequency) {
      case 'WEEKLY':
        currentAmount = currentAmount / 52;
        break;
      case 'MONTHLY':
        currentAmount = currentAmount / 12;
        break;
      case 'YEARLY':
        // Already yearly
        break;
    }

    return {
      ...enrollment,
      currentAmount,
      currency: 'USD',
    };
  }
}
