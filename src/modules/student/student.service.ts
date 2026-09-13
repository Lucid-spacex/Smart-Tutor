import prisma from '../../config/database';

export class StudentService {
  async getStudentProfile(userId: string) {
    const student = await prisma.student.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            studentCode: true,
            status: true,
            timezone: true,
          },
        },
      },
    });

    if (!student) {
      throw new Error('Student profile not found');
    }

    // Fetch parent details separately (Student has no parent relation, only parentId scalar)
    const parent = student.parentId
      ? await prisma.user.findUnique({
          where: { id: student.parentId },
          select: { id: true, fullName: true, email: true },
        })
      : null;

    return { ...student, parent };
  }

  async getStudentSchedule(userId: string) {
    const student = await prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      throw new Error('Student profile not found');
    }

    // Get upcoming sessions via session participants
    const sessionParticipants = await prisma.sessionParticipant.findMany({
      where: {
        enrollment: {
          studentId: student.id,
        },
        session: {
          status: 'SCHEDULED',
          scheduledAt: {
            gte: new Date(),
          },
        },
      },
      include: {
        session: {
          include: {
            tutor: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
        enrollment: {
          include: {
            subject: true,
          },
        },
      },
      orderBy: {
        session: {
          scheduledAt: 'asc',
        },
      },
    });

    return sessionParticipants.map((sp: any) => ({
      sessionId: sp.sessionId,
      scheduledAt: sp.session.scheduledAt,
      durationMinutes: sp.session.durationMinutes,
      zoomLink: sp.session.zoomLink,
      tutor: sp.session.tutor,
      subject: sp.enrollment.subject.name,
    }));
  }

  async getStudentAssignments(userId: string) {
    const student = await prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      throw new Error('Student profile not found');
    }

    const assignments = await prisma.assignment.findMany({
      where: {
        enrollment: {
          studentId: student.id,
        },
      },
      include: {
        enrollment: {
          include: {
            subject: true,
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    return assignments;
  }

  async getStudentGrades(userId: string) {
    const student = await prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      throw new Error('Student profile not found');
    }

    const grades = await prisma.grade.findMany({
      where: {
        enrollment: {
          studentId: student.id,
        },
        visibleToStudent: true, // Only show approved grades
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
            fullName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return grades;
  }

  async getStudentProgressReports(userId: string) {
    const student = await prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      throw new Error('Student profile not found');
    }

    const progressReports = await prisma.progressReport.findMany({
      where: {
        enrollment: {
          studentId: student.id,
        },
      },
      include: {
        enrollment: {
          include: {
            subject: true,
          },
        },
        creator: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return progressReports;
  }

  async getStudentNotifications(userId: string) {
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return notifications;
  }

  async getNextClass(userId: string) {
    const student = await prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      throw new Error('Student profile not found');
    }

    // Find the nearest upcoming SCHEDULED session
    const nextSession = await prisma.sessionParticipant.findFirst({
      where: {
        enrollment: {
          studentId: student.id,
        },
        session: {
          status: 'SCHEDULED',
          scheduledAt: {
            gte: new Date(),
          },
        },
      },
      include: {
        session: {
          include: {
            tutor: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
        enrollment: {
          include: {
            subject: true,
          },
        },
      },
      orderBy: {
        session: {
          scheduledAt: 'asc',
        },
      },
    });

    if (!nextSession) {
      return {
        message: 'No upcoming classes scheduled',
        session: null,
      };
    }

    // Get the student's effective timezone
    const studentUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    let effectiveTimezone: string | null = studentUser?.timezone ?? null;
    if (!effectiveTimezone && studentUser?.parentId) {
      // Fall back to parent's timezone
      const parent = await prisma.user.findUnique({
        where: { id: studentUser.parentId },
      });
      effectiveTimezone = parent?.timezone ?? null;
    }

    return {
      session: {
        sessionId: nextSession.sessionId,
        scheduledAt: nextSession.session.scheduledAt, // Raw UTC timestamp
        durationMinutes: nextSession.session.durationMinutes,
        zoomLink: nextSession.session.zoomLink,
        tutor: nextSession.session.tutor,
        subject: nextSession.enrollment.subject.name,
      },
      timezone: effectiveTimezone || 'UTC', // Send timezone for client-side display
    };
  }
}
