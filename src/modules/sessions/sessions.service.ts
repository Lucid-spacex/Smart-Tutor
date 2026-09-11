import prisma from '../../config/database';
import { UpdateSessionInput, GetSessionsQuery, CreateSessionInput, RescheduleSessionInput } from './sessions.validation';

export class SessionsService {
  // Admin-only: Create a new session with multiple participants
  async createSession(data: CreateSessionInput) {
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

    // Verify all enrollment IDs are valid and belong to the same tutor (if assigned)
    const enrollments = await prisma.enrollment.findMany({
      where: {
        id: { in: data.participantEnrollmentIds },
      },
      include: {
        student: true,
        subject: true,
      },
    });

    if (enrollments.length !== data.participantEnrollmentIds.length) {
      throw new Error('One or more enrollments not found');
    }

    // Check if enrollments have assigned tutors
    for (const enrollment of enrollments) {
      if (enrollment.tutorId && enrollment.tutorId !== data.tutorId) {
        throw new Error(`Enrollment ${enrollment.id} is assigned to a different tutor`);
      }
    }

    // Create session and participants in a transaction
    const session = await prisma.$transaction(async (tx) => {
      const newSession = await tx.session.create({
        data: {
          tutorId: data.tutorId,
          scheduledAt: new Date(data.scheduledAt),
          durationMinutes: data.durationMinutes,
          zoomLink: data.zoomLink,
          status: 'SCHEDULED',
        },
      });

      // Create session participants
      const participants = await tx.sessionParticipant.createMany({
        data: data.participantEnrollmentIds.map((enrollmentId) => ({
          sessionId: newSession.id,
          enrollmentId,
        })),
      });

      return newSession;
    });

    return session;
  }

  // Admin-only: Reschedule a session (change time or zoom link)
  async rescheduleSession(sessionId: string, data: RescheduleSessionInput) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    // Only allow rescheduling scheduled sessions
    if (session.status !== 'SCHEDULED') {
      throw new Error('Can only reschedule scheduled sessions');
    }

    return prisma.session.update({
      where: { id: sessionId },
      data: {
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : session.scheduledAt,
        zoomLink: data.zoomLink !== undefined ? data.zoomLink : session.zoomLink,
      },
    });
  }

  async getSessions(userId: string, userRole: string, query: GetSessionsQuery) {
    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    // Filter based on user role using new schema structure
    if (userRole === 'PARENT' || userRole === 'STUDENT') {
      // Get sessions where the user is a participant
      where.participants = {
        enrollment: {
          student: userRole === 'STUDENT'
            ? { userId }
            : { parentId: userId },
        },
      };
    } else if (userRole === 'TUTOR') {
      where.tutorId = userId;
    }

    const sessions = await prisma.session.findMany({
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
        tutor: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return sessions;
  }

  async getSessionsByTutor(tutorId: string) {
    return prisma.session.findMany({
      where: { tutorId },
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
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async updateSession(id: string, tutorId: string, data: UpdateSessionInput) {
    const session = await prisma.session.findUnique({
      where: { id },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    if (session.tutorId !== tutorId) {
      throw new Error('Not authorized to update this session');
    }

    // SECURITY: Tutors cannot change scheduledAt or zoomLink
    // These are admin-only operations
    const allowedFields: any = {};
    if (data.status !== undefined) {
      allowedFields.status = data.status;
    }
    if (data.tutorNotes !== undefined) {
      allowedFields.tutorNotes = data.tutorNotes;
    }
    if (data.homeworkAssigned !== undefined) {
      allowedFields.homeworkAssigned = data.homeworkAssigned;
    }

    // Handle participant attendance marking
    if (data.participants && data.participants.length > 0) {
      const effectiveStatus = data.status || session.status;
      // Only allow marking attendance when completing or missing a session (can't mark attendance for a still-SCHEDULED session)
      if (effectiveStatus !== 'COMPLETED' && effectiveStatus !== 'MISSED') {
        throw new Error('Can only mark attendance when session is COMPLETED or MISSED');
      }

      // Validate that all provided enrollmentIds are actual participants
      const participantEnrollmentIds = await prisma.sessionParticipant.findMany({
        where: { sessionId: id },
        select: { enrollmentId: true },
      });

      const validEnrollmentIds = new Set(participantEnrollmentIds.map(p => p.enrollmentId));
      for (const participant of data.participants) {
        if (!validEnrollmentIds.has(participant.enrollmentId)) {
          throw new Error(`Enrollment ${participant.enrollmentId} is not a participant in this session`);
        }
      }

      // Update attendance for participants
      await prisma.$transaction([
        prisma.session.update({
          where: { id },
          data: allowedFields,
        }),
        ...data.participants.map((participant) =>
          prisma.sessionParticipant.updateMany({
            where: {
              sessionId: id,
              enrollmentId: participant.enrollmentId,
            },
            data: { attended: participant.attended },
          })
        ),
      ]);

      // Return updated session with participants
      return prisma.session.findUnique({
        where: { id },
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
      });
    }

    return prisma.session.update({
      where: { id },
      data: allowedFields,
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
    });
  }
}
