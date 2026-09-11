import prisma from '../../config/database';
import { CreateEnrollmentInput, GetEnrollmentsQuery, UpdateEnrollmentPricingInput } from './enrollments.validation';

export class EnrollmentsService {
  async createEnrollment(parentId: string, data: CreateEnrollmentInput) {
    // Verify student belongs to parent
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    if (student.parentId !== parentId) {
      throw new Error('Not authorized to enroll this student');
    }

    // Verify subject exists
    const subject = await prisma.subject.findUnique({
      where: { id: data.subjectId },
    });

    if (!subject) {
      throw new Error('Subject not found');
    }

    // Note: yearlyPrice should be set by admin after enrollment
    // For now, we'll set a default of 0 and require admin to update it
    return prisma.enrollment.create({
      data: {
        studentId: data.studentId,
        subjectId: data.subjectId,
        sessionFrequency: data.sessionFrequency,
        billingFrequency: data.billingFrequency,
        yearlyPrice: 0, // Default, admin will set actual price
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        status: 'ACTIVE',
      },
      include: {
        student: true,
        subject: true,
      },
    });
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
