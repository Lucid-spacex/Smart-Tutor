import prisma from '../../config/database';
import { CreateEnrollmentInput, GetEnrollmentsQuery } from './enrollments.validation';

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

    return prisma.enrollment.create({
      data: {
        studentId: data.studentId,
        subjectId: data.subjectId,
        frequency: data.frequency,
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
        sessions: {
          orderBy: { scheduledAt: 'desc' },
          take: 5,
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
        sessions: {
          orderBy: { scheduledAt: 'desc' },
          take: 5,
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
        sessions: {
          orderBy: { scheduledAt: 'desc' },
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
    } else {
      throw new Error('Not authorized to access this enrollment');
    }

    return enrollment;
  }
}
