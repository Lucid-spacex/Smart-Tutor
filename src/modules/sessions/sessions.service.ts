import prisma from '../../config/database';
import { UpdateSessionInput, GetSessionsQuery, CreateSessionInput, CreateTutorSessionInput, RescheduleSessionInput, RescheduleTutorSessionInput } from './sessions.validation';
import { ZoomService } from '../../services/zoom.service';
import { AppError } from '../../middleware/error-handler.middleware';

export class SessionsService {
  private zoomService: ZoomService;

  constructor() {
    this.zoomService = new ZoomService();
  }

  // Tutor-only: Create a session for their own assigned student (single enrollment)
  async createTutorSession(tutorId: string, data: CreateTutorSessionInput) {
    // CRITICAL OWNERSHIP CHECK: Verify enrollment belongs to this tutor
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: data.enrollmentId },
      include: {
        student: true,
        subject: true,
      },
    });

    if (!enrollment) {
      throw new AppError(404, 'Enrollment not found');
    }

    if (enrollment.tutorId !== tutorId) {
      throw new AppError(403, 'You can only create sessions for your own assigned students');
    }

    // Create session with single participant
    const session = await prisma.$transaction(async (tx) => {
      // Auto-create Zoom meeting
      const { zoomLink, zoomMeetingId } = await this.zoomService.createMeeting(
        new Date(data.scheduledAt),
        data.durationMinutes
      );

      const newSession = await tx.session.create({
        data: {
          tutorId,
          createdBy: tutorId, // Track that this session was created by the tutor
          scheduledAt: new Date(data.scheduledAt),
          durationMinutes: data.durationMinutes,
          zoomLink,
          zoomMeetingId,
          status: 'SCHEDULED',
        },
      });

      // Create single session participant
      await tx.sessionParticipant.create({
        data: {
          sessionId: newSession.id,
          enrollmentId: data.enrollmentId,
        },
      });

      return newSession;
    });

    return session;
  }

  // Tutor-only: Reschedule a session they created
  async rescheduleTutorSession(sessionId: string, tutorId: string, data: RescheduleTutorSessionInput) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new AppError(404, 'Session not found');
    }

    // CRITICAL OWNERSHIP CHECK: Verify session was created by this tutor (not just assigned to them)
    if (session.createdBy !== tutorId) {
      throw new AppError(403, 'You can only reschedule sessions you created yourself');
    }

    // Only allow rescheduling scheduled sessions
    if (session.status !== 'SCHEDULED') {
      throw new AppError(400, 'Can only reschedule scheduled sessions');
    }

    const updateData: any = {
      scheduledAt: new Date(data.scheduledAt),
    };

    // Allow updating duration if provided
    if (data.durationMinutes !== undefined) {
      updateData.durationMinutes = data.durationMinutes;
    }

    return prisma.session.update({
      where: { id: sessionId },
      data: updateData,
    });
  }

  // Admin-only: Create a new session with multiple participants
  async createSession(data: CreateSessionInput, adminId: string) {
    // Verify tutor exists and is approved
    const tutor = await prisma.user.findUnique({
      where: { id: data.tutorId },
      include: { tutorProfile: true },
    });

    if (!tutor || tutor.role !== 'TUTOR') {
      throw new AppError(404, 'Tutor not found');
    }

    if (tutor.status !== 'APPROVED' || !tutor.tutorProfile || tutor.tutorProfile.vettingStatus !== 'APPROVED') {
      throw new AppError(403, 'Tutor is not approved for tutoring');
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
      throw new AppError(404, 'One or more enrollments not found');
    }

    // Check if enrollments have assigned tutors
    for (const enrollment of enrollments) {
      if (enrollment.tutorId && enrollment.tutorId !== data.tutorId) {
        throw new AppError(400, `Enrollment ${enrollment.id} is assigned to a different tutor`);
      }
    }

    // Create session and participants in a transaction
    const session = await prisma.$transaction(async (tx) => {
      // Auto-create Zoom meeting if not provided
      let zoomLink = data.zoomLink;
      let zoomMeetingId = data.zoomMeetingId;

      if (!zoomLink && !zoomMeetingId) {
        const zoomMeeting = await this.zoomService.createMeeting(
          new Date(data.scheduledAt),
          data.durationMinutes
        );
        zoomLink = zoomMeeting.zoomLink;
        zoomMeetingId = zoomMeeting.zoomMeetingId;
      }

      const newSession = await tx.session.create({
        data: {
          tutorId: data.tutorId,
          createdBy: adminId, // Track that this session was created by admin
          scheduledAt: new Date(data.scheduledAt),
          durationMinutes: data.durationMinutes,
          zoomLink,
          zoomMeetingId,
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
      throw new AppError(404, 'Session not found');
    }

    // Only allow rescheduling scheduled sessions
    if (session.status !== 'SCHEDULED') {
      throw new AppError(400, 'Can only reschedule scheduled sessions');
    }

    const updateData: any = {};
    if (data.scheduledAt) {
      updateData.scheduledAt = new Date(data.scheduledAt);
    }
    if (data.zoomLink !== undefined) {
      updateData.zoomLink = data.zoomLink;
    }

    return prisma.session.update({
      where: { id: sessionId },
      data: updateData,
    });
  }

  async getSessions(userId: string, userRole: string, query: GetSessionsQuery) {
    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    // Filter based on user role
    if (userRole === 'PARENT' || userRole === 'STUDENT') {
      // Get enrollment IDs based on user role
      let enrollmentIds: string[] = [];

      if (userRole === 'STUDENT') {
        // Get student's enrollments
        const student = await prisma.student.findUnique({
          where: { userId },
          select: { id: true },
        });

        if (!student) {
          throw new AppError(404, 'Student profile not found');
        }

        const enrollments = await prisma.enrollment.findMany({
          where: { studentId: student.id },
          select: { id: true },
        });

        enrollmentIds = enrollments.map(e => e.id);
      } else if (userRole === 'PARENT') {
        // Get parent's children's enrollments
        const children = await prisma.student.findMany({
          where: { parentId: userId },
          select: { id: true },
        });

        const childIds = children.map(c => c.id);

        if (childIds.length === 0) {
          return []; // No children, no sessions
        }

        const enrollments = await prisma.enrollment.findMany({
          where: { studentId: { in: childIds } },
          select: { id: true },
        });

        enrollmentIds = enrollments.map(e => e.id);
      }

      // If enrollmentId is specified, verify it belongs to the user
      if (query.enrollmentId) {
        if (!enrollmentIds.includes(query.enrollmentId)) {
          throw new AppError(403, 'You do not have permission to access sessions for this enrollment');
        }
        enrollmentIds = [query.enrollmentId];
      }

      // Filter sessions by enrollment IDs
      if (enrollmentIds.length > 0) {
        where.participants = {
          enrollmentId: { in: enrollmentIds },
        };
      } else {
        return []; // No enrollments, no sessions
      }
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
      throw new AppError(404, 'Session not found');
    }

    if (session.tutorId !== tutorId) {
      throw new AppError(403, 'Not authorized to update this session');
    }

    // SECURITY: Tutors cannot change scheduledAt or zoomLink
    // These are admin-only operations
    const allowedFields: any = {
      status: data.status !== undefined ? data.status : undefined,
      tutorNotes: data.tutorNotes !== undefined ? data.tutorNotes : undefined,
      homeworkAssigned: data.homeworkAssigned !== undefined ? data.homeworkAssigned : undefined,
      durationMinutes: data.durationMinutes !== undefined ? data.durationMinutes : undefined,
    };

    // Remove undefined values
    Object.keys(allowedFields).forEach(key => {
      if (allowedFields[key] === undefined) {
        delete allowedFields[key];
      }
    });

    // Handle participant attendance marking
    if (data.participants && data.participants.length > 0) {
      const effectiveStatus = data.status || session.status;
      // Only allow marking attendance when completing or missing a session (can't mark attendance for a still-SCHEDULED session)
      if (effectiveStatus !== 'COMPLETED' && effectiveStatus !== 'MISSED') {
        throw new AppError(400, 'Can only mark attendance when session is COMPLETED or MISSED');
      }

      // Validate that all provided enrollmentIds are actual participants
      const participantEnrollmentIds = await prisma.sessionParticipant.findMany({
        where: { sessionId: id },
        select: { enrollmentId: true },
      });

      const validEnrollmentIds = new Set(participantEnrollmentIds.map(p => p.enrollmentId));
      for (const participant of data.participants) {
        if (!validEnrollmentIds.has(participant.enrollmentId)) {
          throw new AppError(400, `Enrollment ${participant.enrollmentId} is not a participant in this session`);
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

  async deleteSession(id: string, tutorId: string) {
    const session = await prisma.session.findUnique({
      where: { id },
    });

    if (!session) {
      throw new AppError(404, 'Session not found');
    }

    // Only the tutor who created the session can delete it (not just the assigned tutor)
    if (session.createdBy !== tutorId) {
      throw new AppError(403, 'You can only delete sessions you created yourself');
    }

    // Only allow deletion of scheduled sessions (prevent deleting past/active sessions)
    if (session.status !== 'SCHEDULED') {
      throw new AppError(400, 'Can only delete scheduled sessions');
    }

    // Cancel the Zoom meeting if it exists
    if (session.zoomMeetingId) {
      await this.zoomService.deleteMeeting(session.zoomMeetingId);
    }

    await prisma.session.delete({
      where: { id },
    });
  }
}
