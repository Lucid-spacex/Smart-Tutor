import prisma from '../../config/database';
import { NotificationCoreService } from './notification-core.service';
import { AppError } from '../../middleware/error-handler.middleware';

export class BadgeCountsService {
  private notificationCore: NotificationCoreService;

  constructor() {
    this.notificationCore = new NotificationCoreService();
  }

  async getBadgeCounts(userId: string, userRole: string) {
    switch (userRole) {
      case 'ADMIN':
        return this.getAdminBadgeCounts(userId);
      case 'TUTOR':
        return this.getTutorBadgeCounts(userId);
      case 'PARENT':
        return this.getParentBadgeCounts(userId);
      case 'STUDENT':
        return this.getStudentBadgeCounts(userId);
      default:
        throw new AppError(403, 'Invalid user role');
    }
  }

  private async getAdminBadgeCounts(adminId: string) {
    // Platform-wide counts
    const [
      pendingTutorApplications,
      pendingGrades,
      openComplaints,
      unmatchedPaidEnrollments,
      pendingChangeRequests,
      unscheduledWithin24h,
      failedPayments,
      outstandingEnrollments,
      attendanceUnmarkedSessions,
    ] = await Promise.all([
      prisma.tutorApplication.count({ where: { status: 'SUBMITTED' } }),
      prisma.grade.count({ where: { status: 'PENDING_APPROVAL' } }),
      prisma.complaint.count({ where: { status: 'OPEN' } }),
      prisma.enrollment.count({
        where: {
          tutorId: null,
          payments: { some: { status: 'SUCCESS' } },
        },
      }),
      prisma.enrollmentChangeRequest.count({ where: { status: 'PENDING' } }),
      prisma.session.count({
        where: {
          status: 'SCHEDULED',
          scheduledAt: {
            gte: new Date(),
            lte: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.payment.count({
        where: {
          status: 'FAILED',
          createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.enrollment.count({
        where: {
          status: 'PENDING_PAYMENT',
          createdAt: { lte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.session.count({
        where: {
          status: { in: ['SCHEDULED', 'COMPLETED'] },
          scheduledAt: { lt: new Date() },
          participants: { some: { attended: null } },
        },
      }),
    ]);

    // Admin-specific counts
    const unreadMessages = await prisma.message.count({
      where: {
        recipient: { role: 'ADMIN' },
        sender: { role: { in: ['PARENT', 'TUTOR'] } },
        readAt: null,
      },
    });

    const unreadNewParents = await prisma.notification.count({
      where: {
        userId: adminId,
        isRead: false,
        entityType: 'PARENT',
        type: 'USER_VERIFIED',
      },
    });

    const unreadNewTutors = await prisma.notification.count({
      where: {
        userId: adminId,
        isRead: false,
        entityType: 'TUTOR',
        type: 'USER_VERIFIED',
      },
    });

    // Unread notifications by category
    const unreadByCategory = await this.notificationCore.getUnreadCount(adminId);

    return {
      pendingTutorApplications,
      pendingGrades,
      openComplaints,
      unmatchedPaidEnrollments,
      pendingChangeRequests,
      unscheduledWithin24h,
      failedPayments,
      outstandingEnrollments,
      attendanceUnmarkedSessions,
      unreadMessages,
      unreadNewParents,
      unreadNewTutors,
      unreadByCategory: unreadByCategory.byCategory,
    };
  }

  private async getTutorBadgeCounts(tutorId: string) {
    // Get tutor's own data
    const tutor = await prisma.user.findUnique({
      where: { id: tutorId },
      include: { tutorProfile: true },
    });

    if (!tutor || tutor.role !== 'TUTOR') {
      throw new AppError(404, 'Tutor not found');
    }

    // Unread notifications by category
    const unreadByCategory = await this.notificationCore.getUnreadCount(tutorId);

    // Sessions needing scheduling (enrollments without sessions in next 24h)
    const activeEnrollments = await prisma.enrollment.findMany({
      where: {
        tutorId,
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: { id: true },
    });

    const enrollmentIds = activeEnrollments.map(e => e.id);
    const sessionsIn24h = await prisma.session.findMany({
      where: {
        participants: {
          some: { enrollmentId: { in: enrollmentIds } },
        },
        scheduledAt: {
          gte: new Date(),
          lte: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      },
      select: { id: true },
    });

    const enrolledIn24h = new Set();
    for (const session of sessionsIn24h) {
      const participants = await prisma.sessionParticipant.findMany({
        where: { sessionId: session.id },
        select: { enrollmentId: true },
      });
      for (const p of participants) {
        enrolledIn24h.add(p.enrollmentId);
      }
    }

    const sessionsNeedingScheduling = enrollmentIds.filter(id => !enrolledIn24h.has(id)).length;

    // Classes within 24h (sessions scheduled in next 24h)
    const classesWithin24h = await prisma.session.count({
      where: {
        participants: {
          some: {
            enrollment: {
              tutorId,
            },
          },
        },
        scheduledAt: {
          gte: new Date(),
          lte: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        status: 'SCHEDULED',
      },
    });

    // Draft or rejected grades (grades created by tutor with DRAFT or REJECTED status)
    const draftOrRejectedGrades = await prisma.grade.count({
      where: {
        gradedBy: tutorId,
        status: { in: ['DRAFT', 'REJECTED'] },
      },
    });

    // Unmarked attendance (sessions with unmarked participants)
    const unmarkedAttendance = await prisma.session.count({
      where: {
        tutorId,
        status: { in: ['SCHEDULED', 'COMPLETED'] },
        scheduledAt: { lt: new Date() },
        participants: { some: { attended: null } },
      },
    });

    // Unread messages (own thread with admin)
    const unreadMessages = await prisma.message.count({
      where: {
        recipientId: tutorId,
        sender: { role: 'ADMIN' },
        readAt: null,
      },
    });

    // Submissions to score (assignments with submissions not yet scored)
    const submissions = await prisma.assignmentSubmission.findMany({
      where: {
        assignment: {
          createdBy: tutorId,
        },
      },
      select: { id: true },
    });

    const submissionIds = submissions.map(s => s.id);
    const scoredItems = await prisma.scoredItem.findMany({
      where: {
        sourceType: 'AssignmentSubmission',
        sourceId: { in: submissionIds },
      },
      select: { sourceId: true },
    });

    const scoredSubmissionIds = new Set(scoredItems.map(si => si.sourceId));
    const submissionsToScore = submissionIds.filter(id => !scoredSubmissionIds.has(id)).length;

    return {
      unreadByCategory: unreadByCategory.byCategory,
      sessionsNeedingScheduling,
      classesWithin24h,
      draftOrRejectedGrades,
      unmarkedAttendance,
      unreadMessages,
      submissionsToScore,
    };
  }

  private async getParentBadgeCounts(parentId: string) {
    // Get parent's children
    const children = await prisma.student.findMany({
      where: { parentId },
      select: { id: true },
    });

    const childIds = children.map(c => c.id);

    // Unread notifications by category
    const unreadByCategory = await this.notificationCore.getUnreadCount(parentId);

    // Own unpaid enrollments (enrollments in PENDING_PAYMENT status)
    const unpaidEnrollments = await prisma.enrollment.count({
      where: {
        studentId: { in: childIds },
        status: 'PENDING_PAYMENT',
      },
    });

    // Own upcoming sessions within 24h
    const upcomingSessions24h = await prisma.session.count({
      where: {
        participants: {
          some: {
            enrollment: {
              studentId: { in: childIds },
            },
          },
        },
        scheduledAt: {
          gte: new Date(),
          lte: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        status: 'SCHEDULED',
      },
    });

    // Own unread messages
    const unreadMessages = await prisma.message.count({
      where: {
        recipientId: parentId,
        readAt: null,
      },
    });

    return {
      unreadByCategory: unreadByCategory.byCategory,
      unpaidEnrollments,
      upcomingSessions24h,
      unreadMessages,
    };
  }

  private async getStudentBadgeCounts(studentUserId: string) {
    // Get student profile
    const student = await prisma.student.findUnique({
      where: { userId: studentUserId },
    });

    if (!student) {
      throw new AppError(404, 'Student profile not found');
    }

    // Unread notifications by category
    const unreadByCategory = await this.notificationCore.getUnreadCount(studentUserId);

    // Own pending assignments
    const pendingAssignments = await prisma.assignment.count({
      where: {
        enrollment: {
          studentId: student.id,
        },
        status: 'PENDING',
      },
    });

    // Own classes within 24h
    const classesWithin24h = await prisma.session.count({
      where: {
        participants: {
          some: {
            enrollment: {
              studentId: student.id,
            },
          },
        },
        scheduledAt: {
          gte: new Date(),
          lte: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        status: 'SCHEDULED',
      },
    });

    return {
      unreadByCategory: unreadByCategory.byCategory,
      pendingAssignments,
      classesWithin24h,
    };
  }
}
