import prisma from '../config/database';
import { logger } from '../config/logger';
import { sendSuspensionEmail } from '../utils/email.util';

/**
 * Daily job: Inactivity check for PARENT accounts
 * Suspends PARENT accounts that are ACTIVE, created > 7 days ago,
 * and have zero active/completed enrollments across all their children.
 */
export async function runParentInactivityCheck(): Promise<{ suspendedCount: number }> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Find all ACTIVE parents created more than 7 days ago
  const activeParents = await prisma.user.findMany({
    where: {
      role: 'PARENT',
      status: 'ACTIVE',
      createdAt: {
        lte: sevenDaysAgo,
      },
    },
    include: {
      students: true, // or via student model
    },
  });

  let suspendedCount = 0;

  for (const parent of activeParents) {
    // Check total enrollments across all children owned by this parent
    const enrollmentCount = await prisma.enrollment.count({
      where: {
        student: {
          parentId: parent.id,
        },
      },
    });

    if (enrollmentCount === 0) {
      await prisma.user.update({
        where: { id: parent.id },
        data: { status: 'SUSPENDED' },
      });

      // Revoke any active refresh tokens
      await prisma.refreshToken.deleteMany({
        where: { userId: parent.id },
      });

      // Send suspension email to parent
      if (parent.email && parent.fullName) {
        await sendSuspensionEmail(
          parent.email,
          parent.fullName,
          'Your account has been automatically suspended because no child enrollment was created within 7 days of registration. Please contact support to reactivate your account.'
        );
      }

      suspendedCount++;
      logger.info(
        { parentId: parent.id, email: parent.email, createdAt: parent.createdAt },
        'Parent auto-suspended due to 7-day enrollment inactivity'
      );
    }
  }

  logger.info({ checked: activeParents.length, suspendedCount }, 'Parent inactivity check completed');
  return { suspendedCount };
}
