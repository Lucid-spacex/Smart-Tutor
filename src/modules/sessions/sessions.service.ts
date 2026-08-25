import prisma from '../../config/database';
import { UpdateSessionInput, GetSessionsQuery } from './sessions.validation';

export class SessionsService {
  async getSessions(userId: string, userRole: string, query: GetSessionsQuery) {
    const where: any = {};

    if (query.enrollmentId) {
      where.enrollmentId = query.enrollmentId;
    }

    if (query.status) {
      where.status = query.status;
    }

    // Filter based on user role
    if (userRole === 'PARENT') {
      where.enrollment = {
        student: {
          parentId: userId,
        },
      };
    } else if (userRole === 'TUTOR') {
      where.enrollment = {
        tutorId: userId,
      };
    }

    return prisma.session.findMany({
      where,
      include: {
        enrollment: {
          include: {
            student: true,
            subject: true,
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async updateSession(id: string, tutorId: string, data: UpdateSessionInput) {
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        enrollment: true,
      },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    if (session.enrollment.tutorId !== tutorId) {
      throw new Error('Not authorized to update this session');
    }

    return prisma.session.update({
      where: { id },
      data: {
        status: data.status,
        tutorNotes: data.tutorNotes,
        homeworkAssigned: data.homeworkAssigned,
      },
      include: {
        enrollment: {
          include: {
            student: true,
            subject: true,
          },
        },
      },
    });
  }
}
