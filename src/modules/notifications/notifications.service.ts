import prisma from '../../config/database';
import { sendNotificationEmail } from '../../utils/email.util';
import { logger } from '../../config/logger';

interface NotifyOptions {
  recipients: string[]; // Array of user IDs
  type: string;
  title: string;
  message: string;
  relatedType?: string;
  relatedId?: string;
  data?: any;
  sendEmail?: boolean;
}

export class NotificationsService {
  /**
   * Central notification method - best-effort, never fails the calling action
   */
  async notify(options: NotifyOptions): Promise<void> {
    const { recipients, type, title, message, relatedType, relatedId, data, sendEmail = false } = options;

    // Avoid duplicates for the same event and recipient
    const deduplicationKey = relatedId ? `${type}-${relatedId}` : type;

    for (const userId of recipients) {
      try {
        // Check for duplicate notification in last 24 hours
        const existing = await prisma.notification.findFirst({
          where: {
            userId,
            type: type as any,
            relatedId,
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
            },
          },
        });

        if (existing) {
          logger.debug({ userId, type, relatedId }, 'Duplicate notification skipped');
          continue;
        }

        await prisma.notification.create({
          data: {
            userId,
            type: type as any,
            title,
            message,
            relatedType,
            relatedId,
            data: data || {},
          },
        });

        // Send email if requested
        if (sendEmail) {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, fullName: true },
          });

          if (user?.email && user.fullName) {
            await sendNotificationEmail(user.email, user.fullName, title, message);
          }
        }
      } catch (error) {
        // Best-effort: log error but don't throw
        logger.error({ error, userId, type }, 'Failed to create notification');
      }
    }
  }

  async getNotifications(userId: string, filters: { unreadOnly?: boolean; type?: string; page?: number; limit?: number } = {}) {
    const { unreadOnly = false, type, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
      userId,
      deletedAt: null,
    };

    if (unreadOnly) {
      where.readAt = null;
    }

    if (type) {
      where.type = type;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: Math.min(limit, 100),
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      page,
      limit,
      total,
    };
  }

  async getUnreadCount(userId: string) {
    const count = await prisma.notification.count({
      where: {
        userId,
        readAt: null,
        deletedAt: null,
      },
    });

    return { count };
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new Error('Not authorized to mark this notification as read');
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
        deletedAt: null,
      },
      data: { readAt: new Date() },
    });
  }

  async notifyAdmins(type: string, data: { title: string; message: string; relatedType?: string; relatedId?: string }) {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE' },
      select: { id: true },
    });

    for (const admin of admins) {
      await this.createNotification(admin.id, type, data);
    }
  }

  async createNotification(userId: string, type: string, data: { title: string; message: string; relatedType?: string; relatedId?: string }) {
    await prisma.notification.create({
      data: {
        userId,
        type: type as any,
        title: data.title,
        message: data.message,
        relatedType: data.relatedType,
        relatedId: data.relatedId,
      },
    });
  }

  async deleteNotification(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new Error('Not authorized to delete this notification');
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { deletedAt: new Date() },
    });
  }

  // Cron job to delete read notifications older than 90 days
  async cleanupOldNotifications() {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const result = await prisma.notification.deleteMany({
      where: {
        readAt: {
          not: null,
          lte: ninetyDaysAgo,
        },
        deletedAt: null,
      },
    });

    logger.info({ count: result.count }, 'Cleaned up old notifications');
    return result;
  }

  // ========== Helper methods for specific event types ==========

  async createAssignmentDueNotification(assignmentId: string, dueDate: Date) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        enrollment: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!assignment) {
      return;
    }

    const student = assignment.enrollment.student;
    const type = new Date(dueDate) < new Date() ? 'ASSIGNMENT_OVERDUE' : 'ASSIGNMENT_DUE_SOON';
    const title = type === 'ASSIGNMENT_OVERDUE' ? 'Assignment Overdue' : 'Assignment Due Soon';
    const message = type === 'ASSIGNMENT_OVERDUE'
      ? `Assignment "${assignment.title}" is overdue`
      : `Assignment "${assignment.title}" is due soon`;

    const recipients = [student.userId];
    if (student.parentId) {
      recipients.push(student.parentId);
    }

    await this.notify({
      recipients,
      type,
      title,
      message,
      relatedType: 'ASSIGNMENT',
      relatedId: assignmentId,
      sendEmail: true, // Email for overdue
    });
  }

  async createGradeApprovedNotification(gradeId: string) {
    const grade = await prisma.grade.findUnique({
      where: { id: gradeId },
      include: {
        enrollment: {
          include: {
            student: true,
            subject: true,
          },
        },
      },
    });

    if (!grade) {
      return;
    }

    const student = grade.enrollment.student;
    const title = 'Grade Approved';
    const message = `Grade for ${grade.enrollment.subject.name} has been approved`;

    const recipients = [student.userId];
    if (student.parentId) {
      recipients.push(student.parentId);
    }

    await this.notify({
      recipients,
      type: 'GRADE_APPROVED',
      title,
      message,
      relatedType: 'GRADE',
      relatedId: gradeId,
    });
  }

  async createComplaintResolvedNotification(complaintId: string, userId: string) {
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
    });

    if (!complaint) {
      return;
    }

    await this.notify({
      recipients: [userId],
      type: 'COMPLAINT_RESOLVED',
      title: 'Complaint Resolved',
      message: `Your complaint "${complaint.subject}" has been resolved`,
      relatedType: 'COMPLAINT',
      relatedId: complaintId,
    });
  }

  async createTutorAssignedNotification(enrollmentId: string, tutorId: string) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: true,
        subject: true,
        tutor: {
          select: {
            fullName: true,
          },
        },
      },
    });

    if (!enrollment || !enrollment.student) {
      return;
    }

    const tutorName = enrollment.tutor?.fullName || 'Your tutor';
    const subjectName = enrollment.subject?.name || 'your subject';
    const title = 'Tutor Assigned';
    const message = `You've been assigned a tutor for ${subjectName}: ${tutorName}`;

    const recipients = [enrollment.student.userId, tutorId];
    if (enrollment.student.parentId) {
      recipients.push(enrollment.student.parentId);
    }

    await this.notify({
      recipients,
      type: 'STUDENT_ASSIGNED',
      title,
      message,
      relatedType: 'ENROLLMENT',
      relatedId: enrollmentId,
      data: { studentId: enrollment.studentId, enrollmentId },
    });
  }

  async createEnrollmentAwaitingTutorNotification(enrollmentId: string) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: true,
        subject: true,
      },
    });

    if (!enrollment) {
      return;
    }

    // Notify all admins
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE' },
      select: { id: true },
    });

    const adminIds = admins.map(a => a.id);

    await this.notify({
      recipients: adminIds,
      type: 'ENROLLMENT_AWAITING_TUTOR',
      title: 'Enrollment Awaiting Tutor',
      message: `New enrollment for ${enrollment.subject.name} (Student: ${enrollment.student.fullName}) is awaiting tutor assignment`,
      relatedType: 'ENROLLMENT',
      relatedId: enrollmentId,
      data: { enrollmentId, studentId: enrollment.studentId },
    });
  }

  async createPaymentNotification(paymentId: string, status: 'SUCCESS' | 'FAILED') {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        parent: true,
      },
    });

    if (!payment) {
      return;
    }

    const type = status === 'SUCCESS' ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED';
    const title = status === 'SUCCESS' ? 'Payment Successful' : 'Payment Failed';
    const message = status === 'SUCCESS'
      ? `Your payment of ${payment.currency} ${payment.amount} was successful`
      : `Your payment of ${payment.currency} ${payment.amount} failed. Please try again.`;

    await this.notify({
      recipients: [payment.parentId],
      type,
      title,
      message,
      relatedType: 'PAYMENT',
      relatedId: paymentId,
      sendEmail: true, // Email for payment events
    });

    // Notify admins on failed payments
    if (status === 'FAILED') {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', status: 'ACTIVE' },
        select: { id: true },
      });

      await this.notify({
        recipients: admins.map(a => a.id),
        type: 'PAYMENT_FAILED',
        title: 'Payment Failed',
        message: `Payment failed for parent ${payment.parent.fullName}`,
        relatedType: 'PAYMENT',
        relatedId: paymentId,
      });
    }
  }

  async createEnrollmentActivatedNotification(enrollmentId: string) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: true,
        subject: true,
      },
    });

    if (!enrollment) {
      return;
    }

    const recipients = [enrollment.student.userId];
    if (enrollment.student.parentId) {
      recipients.push(enrollment.student.parentId);
    }

    await this.notify({
      recipients,
      type: 'ENROLLMENT_ACTIVATED',
      title: 'Enrollment Activated',
      message: `Your enrollment for ${enrollment.subject.name} is now active`,
      relatedType: 'ENROLLMENT',
      relatedId: enrollmentId,
      data: { enrollmentId, studentId: enrollment.studentId },
    });
  }

  async createSessionNotification(sessionId: string, type: 'SCHEDULED' | 'RESCHEDULED' | 'CANCELLED') {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        tutor: true,
        participants: {
          include: {
            enrollment: {
              include: {
                student: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      return;
    }

    const titleMap = {
      SCHEDULED: 'Session Scheduled',
      RESCHEDULED: 'Session Rescheduled',
      CANCELLED: 'Session Cancelled',
    };

    const messageMap = {
      SCHEDULED: `A session has been scheduled for ${session.scheduledAt.toISOString()}`,
      RESCHEDULED: `Your session has been rescheduled to ${session.scheduledAt.toISOString()}`,
      CANCELLED: `Your session scheduled for ${session.scheduledAt.toISOString()} has been cancelled`,
    };

    const recipients = [session.tutorId];
    session.participants.forEach(p => {
      recipients.push(p.enrollment.student.userId);
      if (p.enrollment.student.parentId) {
        recipients.push(p.enrollment.student.parentId);
      }
    });

    await this.notify({
      recipients,
      type: `SESSION_${type}`,
      title: titleMap[type],
      message: messageMap[type],
      relatedType: 'SESSION',
      relatedId: sessionId,
      data: { sessionId },
      sendEmail: type === 'CANCELLED' || type === 'RESCHEDULED', // Email for parent-facing changes
    });
  }

  async createSessionReminderNotification(sessionId: string) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        tutor: true,
        participants: {
          include: {
            enrollment: {
              include: {
                student: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      return;
    }

    const recipients = [session.tutorId];
    session.participants.forEach(p => {
      recipients.push(p.enrollment.student.userId);
      if (p.enrollment.student.parentId) {
        recipients.push(p.enrollment.student.parentId);
      }
    });

    await this.notify({
      recipients,
      type: 'SESSION_REMINDER',
      title: 'Session Reminder',
      message: `Reminder: You have a session scheduled for ${session.scheduledAt.toISOString()}`,
      relatedType: 'SESSION',
      relatedId: sessionId,
      data: { sessionId },
    });
  }

  async createAssignmentPostedNotification(assignmentId: string) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        enrollment: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!assignment) {
      return;
    }

    const recipients = [assignment.enrollment.student.userId];
    if (assignment.enrollment.student.parentId) {
      recipients.push(assignment.enrollment.student.parentId);
    }

    await this.notify({
      recipients,
      type: 'ASSIGNMENT_POSTED',
      title: 'New Assignment Posted',
      message: `A new assignment "${assignment.title}" has been posted`,
      relatedType: 'ASSIGNMENT',
      relatedId: assignmentId,
      data: { assignmentId },
    });
  }

  async createAssignmentSubmittedNotification(assignmentId: string, studentId: string) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        enrollment: {
          include: {
            tutor: true,
          },
        },
      },
    });

    if (!assignment) {
      return;
    }

    await this.notify({
      recipients: [assignment.enrollment.tutorId!],
      type: 'ASSIGNMENT_SUBMITTED',
      title: 'Assignment Submitted',
      message: `Assignment "${assignment.title}" has been submitted`,
      relatedType: 'ASSIGNMENT',
      relatedId: assignmentId,
      data: { assignmentId, studentId },
    });
  }

  async createAssignmentReviewedNotification(assignmentId: string) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        enrollment: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!assignment) {
      return;
    }

    const recipients = [assignment.enrollment.student.userId];
    if (assignment.enrollment.student.parentId) {
      recipients.push(assignment.enrollment.student.parentId);
    }

    await this.notify({
      recipients,
      type: 'ASSIGNMENT_REVIEWED',
      title: 'Assignment Reviewed',
      message: `Your assignment "${assignment.title}" has been reviewed`,
      relatedType: 'ASSIGNMENT',
      relatedId: assignmentId,
      data: { assignmentId },
    });
  }

  async createGradeSubmittedNotification(gradeId: string) {
    const grade = await prisma.grade.findUnique({
      where: { id: gradeId },
      include: {
        enrollment: {
          include: {
            subject: true,
          },
        },
      },
    });

    if (!grade) {
      return;
    }

    // Notify admins
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE' },
      select: { id: true },
    });

    await this.notify({
      recipients: admins.map(a => a.id),
      type: 'GRADE_SUBMITTED',
      title: 'Grade Submitted for Approval',
      message: `A grade for ${grade.enrollment.subject.name} has been submitted and awaits approval`,
      relatedType: 'GRADE',
      relatedId: gradeId,
      data: { gradeId },
    });
  }

  async createGradeRejectedNotification(gradeId: string) {
    const grade = await prisma.grade.findUnique({
      where: { id: gradeId },
      include: {
        grader: true,
      },
    });

    if (!grade) {
      return;
    }

    await this.notify({
      recipients: [grade.gradedBy],
      type: 'GRADE_REJECTED',
      title: 'Grade Rejected',
      message: 'Your submitted grade has been rejected. Please review and resubmit.',
      relatedType: 'GRADE',
      relatedId: gradeId,
      data: { gradeId },
    });
  }

  async createNewTutorApplicationNotification(tutorId: string) {
    // Notify admins
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE' },
      select: { id: true },
    });

    await this.notify({
      recipients: admins.map(a => a.id),
      type: 'NEW_TUTOR_APPLICATION',
      title: 'New Tutor Application',
      message: 'A new tutor application has been submitted and requires review',
      relatedType: 'USER',
      relatedId: tutorId,
      data: { tutorId },
    });
  }

  async createTutorApprovalNotification(tutorId: string, approved: boolean) {
    const tutor = await prisma.user.findUnique({
      where: { id: tutorId },
      select: { fullName: true },
    });

    if (!tutor) {
      return;
    }

    const type = approved ? 'TUTOR_APPROVED' : 'TUTOR_REJECTED';
    const title = approved ? 'Tutor Application Approved' : 'Tutor Application Rejected';
    const message = approved
      ? `Congratulations! Your tutor application has been approved.`
      : `Your tutor application has been rejected.`;

    await this.notify({
      recipients: [tutorId],
      type,
      title,
      message,
      relatedType: 'USER',
      relatedId: tutorId,
      sendEmail: true, // Email for approval/rejection
    });
  }

  async createPriceUpdatedNotification(enrollmentId: string, priceNGN: number, priceUSD: number) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: true,
        subject: true,
      },
    });

    if (!enrollment) {
      return;
    }

    await this.notify({
      recipients: [enrollment.student.parentId],
      type: 'PRICE_UPDATED',
      title: 'Price Updated',
      message: `The price for ${enrollment.student.fullName}'s ${enrollment.subject.name} is now ₦${priceNGN} / $${priceUSD}`,
      relatedType: 'ENROLLMENT',
      relatedId: enrollmentId,
      data: { enrollmentId, priceNGN, priceUSD },
    });
  }

  async createPricingDriftAlertNotification(driftedCount: number, worstDrifts: any[]) {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE' },
      select: { id: true },
    });

    const message = `Pricing drift alert: ${driftedCount} prices have drifted beyond threshold. Top issues: ${worstDrifts.slice(0, 3).map(d => d.tier).join(', ')}`;

    await this.notify({
      recipients: admins.map(a => a.id),
      type: 'PRICING_DRIFT_ALERT',
      title: 'Pricing Drift Alert',
      message,
    });
  }

  async createTutorUnavailableNotification(tutorId: string, activeStudentCount: number) {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE' },
      select: { id: true },
    });

    await this.notify({
      recipients: admins.map(a => a.id),
      type: 'TUTOR_UNAVAILABLE',
      title: 'Tutor Set to Unavailable',
      message: `Tutor has set status to UNAVAILABLE while having ${activeStudentCount} active students`,
      relatedType: 'USER',
      relatedId: tutorId,
      data: { tutorId, activeStudentCount },
    });
  }

  async createComplaintFiledNotification(complaintId: string) {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE' },
      select: { id: true },
    });

    await this.notify({
      recipients: admins.map(a => a.id),
      type: 'GENERAL',
      title: 'New Complaint Filed',
      message: 'A new complaint has been filed and requires attention',
      relatedType: 'COMPLAINT',
      relatedId: complaintId,
      data: { complaintId },
    });
  }

  async createNewMessageNotification(recipientId: string, threadId: string) {
    // Collapse to at most one unread NEW_MESSAGE per thread
    const existing = await prisma.notification.findFirst({
      where: {
        userId: recipientId,
        type: 'NEW_MESSAGE',
        relatedId: threadId,
        readAt: null,
      },
    });

    if (existing) {
      return; // Don't create duplicate
    }

    await this.notify({
      recipients: [recipientId],
      type: 'NEW_MESSAGE',
      title: 'New Message',
      message: 'You have a new message',
      relatedType: 'MESSAGE_THREAD',
      relatedId: threadId,
      data: { threadId },
    });
  }

  async createAccountStatusNotification(userId: string, status: 'SUSPENDED' | 'REACTIVATED', reason?: string) {
    const type = status === 'SUSPENDED' ? 'ACCOUNT_SUSPENDED' : 'ACCOUNT_REACTIVATED';
    const title = status === 'SUSPENDED' ? 'Account Suspended' : 'Account Reactivated';
    const message = status === 'SUSPENDED'
      ? `Your account has been suspended. Reason: ${reason || 'Contact admin for details.'}`
      : 'Your account has been reactivated.';

    await this.notify({
      recipients: [userId],
      type,
      title,
      message,
      relatedType: 'USER',
      relatedId: userId,
      sendEmail: true, // Email for account status changes
    });
  }
}
