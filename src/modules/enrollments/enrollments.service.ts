import { randomUUID } from 'crypto';
import prisma from '../../config/database';
import { CreateEnrollmentInput, GetEnrollmentsQuery, UpdateEnrollmentPricingInput } from './enrollments.validation';
import { computeLagosEquivalentWindow } from '../../utils/timezone.util';
import { AppError } from '../../middleware/error-handler.middleware';

export { computeLagosEquivalentWindow };

export class EnrollmentsService {
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

    // 4. Check for existing active enrollments for this student with any of these subjects
    const existingActiveEnrollment = await prisma.enrollment.findFirst({
      where: {
        studentId: data.studentId,
        subjectId: { in: data.subjectIds },
        status: 'ACTIVE',
      },
      include: {
        subject: true,
      },
    });

    if (existingActiveEnrollment) {
      throw new AppError(400, `Student is already enrolled in ${existingActiveEnrollment.subject.name}`);
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
            status: 'ACTIVE',
          },
          include: {
            student: true,
            subject: true,
          },
        })
      )
    );

    return {
      enrollmentGroupId,
      enrollments,
    };
  }

  async getEnrollmentsByGroupId(groupId: string, userId: string, userRole: string) {
    const enrollments = await prisma.enrollment.findMany({
      where: { enrollmentGroupId: groupId },
      include: {
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
        payments: {
          orderBy: { createdAt: 'desc' },
        },
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
        sessionParticipants: {
          include: {
            session: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
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
        sessionParticipants: {
          include: {
            session: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getEnrollmentById(id: string, userId: string, userRole: string) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: {
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
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        progressReports: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    // Check authorization based on role
    if (userRole === 'PARENT') {
      if (enrollment.student.parentId !== userId) {
        throw new Error('Not authorized to access this enrollment');
      }
    } else if (userRole === 'TUTOR') {
      if (enrollment.tutorId !== userId) {
        throw new Error('Not authorized to access this enrollment');
      }
    } else if (userRole !== 'ADMIN') {
      throw new Error('Not authorized to access this enrollment');
    }

    return enrollment;
  }

  // Admin-only method to update enrollment pricing
  async updateEnrollmentPricing(enrollmentId: string, data: UpdateEnrollmentPricingInput) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
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
      throw new Error('Enrollment not found');
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
