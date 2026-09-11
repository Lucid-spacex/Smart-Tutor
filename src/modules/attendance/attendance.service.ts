import prisma from '../../config/database';

export class AttendanceService {
  async getStudentAttendance(studentId: string, requestorId: string, requestorRole: string) {
    // Get the student record (parentId scalar is sufficient for auth checks)
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    // Authorization check
    if (requestorRole === 'PARENT') {
      if (student.parentId !== requestorId) {
        throw new Error('Access denied');
      }
    } else if (requestorRole === 'TUTOR') {
      // Check if tutor is assigned to at least one of this student's enrollments
      const isAssigned = await prisma.enrollment.findFirst({
        where: {
          studentId,
          tutorId: requestorId,
        },
      });
      if (!isAssigned) {
        throw new Error('Access denied');
      }
    } else if (requestorRole === 'STUDENT') {
      // Student can only access their own attendance
      if (student.userId !== requestorId) {
        throw new Error('Access denied');
      }
    }
    // Admin can access any attendance

    // Get all session participants for this student's enrollments
    const sessionParticipants = await prisma.sessionParticipant.findMany({
      where: {
        enrollment: {
          studentId,
        },
      },
      include: {
        session: true,
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

    // Filter for completed/missed sessions only (not scheduled)
    const completedSessions = sessionParticipants.filter(
      sp => sp.session.status === 'COMPLETED' || sp.session.status === 'MISSED'
    );

    // Calculate statistics
    const totalSessions = completedSessions.length;
    const attended = completedSessions.filter(sp => sp.attended === true).length;
    const missed = completedSessions.filter(sp => sp.attended === false).length;
    const percentage = totalSessions > 0 ? (attended / totalSessions) * 100 : 0;

    // Build per-session breakdown
    const sessionBreakdown = completedSessions.map(sp => ({
      sessionId: sp.sessionId,
      scheduledAt: sp.session.scheduledAt,
      durationMinutes: sp.session.durationMinutes,
      status: sp.session.status,
      subject: sp.enrollment.subject.name,
      attended: sp.attended,
    }));

    return {
      student: {
        id: student.id,
        fullName: student.fullName,
      },
      statistics: {
        totalSessions,
        attended,
        missed,
        percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
      },
      sessions: sessionBreakdown,
    };
  }

  async getMyAttendance(userId: string) {
    // Get the student profile for this user
    const student = await prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      throw new Error('Student profile not found');
    }

    // Use the main attendance method with student role
    return this.getStudentAttendance(student.id, userId, 'STUDENT');
  }
}
