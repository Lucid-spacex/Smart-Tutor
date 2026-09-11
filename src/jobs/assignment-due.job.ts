import prisma from '../config/database';
import { logger } from '../config/logger';

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

    // 1. Student notification (check duplicate first)
    const existingStudentNotif = await prisma.notification.findFirst({
      where: {
        userId: student.userId,
        type: notificationType,
        relatedId: assignment.id,
      },
    });

    if (!existingStudentNotif) {
      await prisma.notification.create({
        data: {
          userId: student.userId,
          type: notificationType,
          message,
          relatedId: assignment.id,
        },
      });
      notificationsCreated++;
    }

    // 2. Parent notification (check duplicate first)
    if (student.parentId) {
      const existingParentNotif = await prisma.notification.findFirst({
        where: {
          userId: student.parentId,
          type: notificationType,
          relatedId: assignment.id,
        },
      });

      if (!existingParentNotif) {
        await prisma.notification.create({
          data: {
            userId: student.parentId,
            type: notificationType,
            message,
            relatedId: assignment.id,
          },
        });
        notificationsCreated++;
      }
    }
  }

  logger.info(
    { assignmentsScanned: pendingAssignments.length, notificationsCreated },
    'Assignment due-date notification job completed'
  );

  return { notificationsCreated };
}
