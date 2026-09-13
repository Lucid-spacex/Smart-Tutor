import prisma from '../../config/database';
import { sendNotificationEmail } from '../../utils/email.util';

export class NotificationsService {
  async createNotification(userId: string, type: string, message: string, relatedId?: string, sendEmailNotification: boolean = false) {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: type as any,
        message,
        relatedId,
        isRead: false,
      },
    });

    // Send email notification if requested
    if (sendEmailNotification) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, fullName: true },
      });

      if (user?.email && user.fullName) {
        await sendNotificationEmail(user.email, user.fullName, type, message);
      }
    }

    return notification;
  }

  async getNotifications(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
    });
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
      data: { isRead: true },
    });
  }

  // Helper method to create assignment due notifications for both student and parent
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
    const message = type === 'ASSIGNMENT_OVERDUE'
      ? `Assignment "${assignment.title}" is overdue`
      : `Assignment "${assignment.title}" is due soon`;

    // Create notification for student (with email)
    await this.createNotification(student.userId, type, message, assignmentId, true);

    // Create notification for parent (with email)
    if (student.parentId) {
      await this.createNotification(student.parentId, type, message, assignmentId, true);
    }
  }

  // Helper method to create grade approved notification
  async createGradeApprovedNotification(gradeId: string, sendEmailNotification: boolean = true) {
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
    const message = `Grade for ${grade.enrollment.subject.name} has been approved`;

    // Create notification for student (with email)
    await this.createNotification(student.userId, 'GRADE_APPROVED', message, gradeId, sendEmailNotification);

    // Create notification for parent (with email)
    if (student.parentId) {
      await this.createNotification(student.parentId, 'GRADE_APPROVED', message, gradeId, sendEmailNotification);
    }
  }

  // Helper method to create complaint resolved notification
  async createComplaintResolvedNotification(complaintId: string, userId: string, sendEmailNotification: boolean = true) {
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
    });

    if (!complaint) {
      return;
    }

    const message = `Your complaint "${complaint.subject}" has been resolved`;
    await this.createNotification(userId, 'COMPLAINT_RESOLVED', message, complaintId, sendEmailNotification);
  }
}
