import prisma from '../config/database';
import { logger } from '../config/logger';
import { NotificationCoreService } from '../modules/notifications/notification-core.service';
import { NotificationCategory, NotificationType } from '@prisma/client';

const notificationCore = new NotificationCoreService();

/**
 * Daily job: Assignment due-date notifications
 * Finds pending assignments due within 48 hours or overdue.
 * Creates notifications for both the student and the parent without creating duplicates.
 */
export async function runAssignmentDueNotifications(): Promise<{ notificationsCreated: number }> {
  const now = new Date();
  const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  // Find all PENDING assignments with dueDate <= 48h from now
  const pendingAssignments = await prisma.assignment.findMany({
    where: {
      status: 'PENDING',
      dueDate: {
        lte: in48Hours,
      },
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

  let notificationsCreated = 0;

  for (const assignment of pendingAssignments) {
    const isOverdue = assignment.dueDate < now;
    const notificationType = isOverdue ? 'ASSIGNMENT_OVERDUE' : 'ASSIGNMENT_DUE_SOON';
    const student = assignment.enrollment.student;

    const message = isOverdue
      ? `Assignment "${assignment.title}" for ${assignment.enrollment.subject.name} is overdue.`
      : `Assignment "${assignment.title}" for ${assignment.enrollment.subject.name} is due soon (${assignment.dueDate.toISOString().slice(0, 10)}).`;

    const recipients = [student.userId];
    if (student.parentId) {
      recipients.push(student.parentId);
    }

    await notificationCore.notify({
      recipientIds: recipients,
      type: notificationType as NotificationType,
      category: 'ASSIGNMENTS' as NotificationCategory,
      title: isOverdue ? 'Assignment Overdue' : 'Assignment Due Soon',
      body: message,
      entityType: 'Assignment',
      entityId: assignment.id,
      dedupeKey: `assignment-due-${assignment.id}`,
    });

    notificationsCreated += recipients.length;
  }

  logger.info(
    { assignmentsScanned: pendingAssignments.length, notificationsCreated },
    'Assignment due-date notification job completed'
  );

  return { notificationsCreated };
}
