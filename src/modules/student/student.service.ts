import prisma from '../../config/database';
import { AppError } from '../../middleware/error-handler.middleware';

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
      throw new AppError(404, 'Student profile not found');
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
      throw new AppError(404, 'Student profile not found');
    }

    // Get all sessions via session participants (including past and future)
    const sessionParticipants = await prisma.sessionParticipant.findMany({
      where: {
        enrollment: {
          studentId: student.id,
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
          scheduledAt: 'desc',
        },
      },
    });

    return sessionParticipants.map((sp: any) => ({
      sessionId: sp.sessionId,
      scheduledAt: sp.session.scheduledAt,
      durationMinutes: sp.session.durationMinutes,
      zoomLink: sp.session.zoomLink,
      status: sp.session.status,
      tutor: sp.session.tutor,
      subject: sp.enrollment.subject.name,
    }));
  }

  async getStudentAssignments(userId: string) {
    const student = await prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      throw new AppError(404, 'Student profile not found');
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
      throw new AppError(404, 'Student profile not found');
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
      throw new AppError(404, 'Student profile not found');
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
      throw new AppError(404, 'Student profile not found');
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

  async getMyTutors(userId: string) {
    const student = await prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      throw new AppError(404, 'Student profile not found');
    }

    // Get all active enrollments with assigned tutors
    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId: student.id,
        status: 'ACTIVE',
        tutorId: {
          not: null,
        },
      },
      include: {
        tutor: {
          include: {
            tutorProfile: true,
          },
        },
        subject: true,
      },
    });

    // Create a map to deduplicate tutors (one entry per distinct tutor)
    const tutorMap = new Map();

    for (const enrollment of enrollments) {
      if (!enrollment.tutor) continue;

      const tutorId = enrollment.tutor.id;
      if (!tutorMap.has(tutorId)) {
        tutorMap.set(tutorId, {
          tutorId: enrollment.tutor.id,
          fullName: enrollment.tutor.fullName,
          bio: enrollment.tutor.tutorProfile?.bio || null,
          subjects: enrollment.tutor.tutorProfile?.subjects || [],
          enrollmentSubject: enrollment.subject.name,
          assignedSince: enrollment.startDate,
        });
      }
    }

    return Array.from(tutorMap.values());
  }

  async getMyEnrollments(userId: string) {
    const student = await prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      throw new AppError(404, 'Student profile not found');
    }

    // Get all enrollments for this student with tutor and subject data
    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId: student.id,
      },
      include: {
        tutor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            tutorProfile: {
              select: {
                bio: true,
                subjects: true,
                vettingStatus: true,
              },
            },
          },
        },
        subject: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return enrollments;
  }

  async getEnrollmentSessions(userId: string, enrollmentId: string) {
    const student = await prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      throw new AppError(404, 'Student profile not found');
    }

    // Verify the enrollment belongs to this student
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: { studentId: true },
    });

    if (!enrollment || enrollment.studentId !== student.id) {
      throw new AppError(403, 'You do not have access to this enrollment');
    }

    // Get sessions for this enrollment
    const sessionParticipants = await prisma.sessionParticipant.findMany({
      where: {
        enrollmentId,
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
      },
      orderBy: {
        session: {
          scheduledAt: 'desc',
        },
      },
    });

    return sessionParticipants.map((sp: any) => ({
      sessionId: sp.sessionId,
      scheduledAt: sp.session.scheduledAt,
      durationMinutes: sp.session.durationMinutes,
      zoomLink: sp.session.zoomLink,
      status: sp.session.status,
      tutor: sp.session.tutor,
    }));
  }
}
