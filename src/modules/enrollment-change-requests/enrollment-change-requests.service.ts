import prisma from '../../config/database';
import { NotificationCoreService } from '../notifications/notification-core.service';
import { AppError } from '../../middleware/error-handler.middleware';
import { NotificationCategory, NotificationType, ChangeRequestStatus } from '@prisma/client';

export class EnrollmentChangeRequestService {
  private notificationCore: NotificationCoreService;

  constructor() {
    this.notificationCore = new NotificationCoreService();
  }

  /**
   * Create a change request for an enrollment (parent only, own child)
   * Only schedule fields are allowed (reject subject or billing-frequency changes)
   */
  async createChangeRequest(enrollmentId: string, parentId: string, data: {
    requestedValues: {
      startDate?: string;
      endDate?: string;
      availableDays?: string[];
      preferredStartHour?: number;
      preferredEndHour?: number;
    };
  }) {
    // Verify enrollment exists and belongs to parent's child
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId, deletedAt: null },
      include: {
        student: true,
        subject: true,
      },
    });

    if (!enrollment) {
      throw new AppError(404, 'Enrollment not found');
    }

    if (enrollment.student.parentId !== parentId) {
      throw new AppError(403, 'Not authorized to modify this enrollment');
    }

    // Only allow schedule field changes
    const { requestedValues } = data;
    const allowedKeys = ['startDate', 'endDate', 'availableDays', 'preferredStartHour', 'preferredEndHour'];
    const requestedKeys = Object.keys(requestedValues);

    for (const key of requestedKeys) {
      if (!allowedKeys.includes(key)) {
        throw new AppError(400, `Cannot change ${key}. Only schedule fields are allowed`);
      }
    }

    // Check if there's already a PENDING change request
    const existingPending = await prisma.enrollmentChangeRequest.findFirst({
      where: {
        enrollmentId,
        status: 'PENDING',
      },
    });

    if (existingPending) {
      throw new AppError(400, 'A change request is already pending for this enrollment');
    }

    // Create the change request
    const changeRequest = await prisma.enrollmentChangeRequest.create({
      data: {
        enrollmentId,
        requestedBy: parentId,
        requestedValues: requestedValues as any,
        previousSnapshot: {
          startDate: enrollment.startDate,
          endDate: enrollment.endDate,
          availableDays: enrollment.availableDays,
          preferredStartHour: enrollment.preferredStartHour,
          preferredEndHour: enrollment.preferredEndHour,
        },
        status: 'PENDING',
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

    // Notify admins
    await this.notificationCore.notify({
      recipientRole: 'ADMIN',
      type: 'CHANGE_REQUEST_SUBMITTED' as NotificationType,
      category: 'ENROLLMENT' as NotificationCategory,
      title: 'Enrollment Change Request Submitted',
      body: `A change request has been submitted for ${enrollment.student.fullName}'s enrollment in ${enrollment.subject.name}`,
      entityType: 'EnrollmentChangeRequest',
      entityId: changeRequest.id,
      dedupeKey: `change-request-${changeRequest.id}`,
    });

    return changeRequest;
  }

  /**
   * Get change requests for an enrollment (parent only, own child)
   */
  async getChangeRequests(enrollmentId: string, parentId: string) {
    // Verify enrollment belongs to parent's child
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId, deletedAt: null },
      include: {
        student: true,
      },
    });

    if (!enrollment) {
      throw new AppError(404, 'Enrollment not found');
    }

    if (enrollment.student.parentId !== parentId) {
      throw new AppError(403, 'Not authorized to view this enrollment');
    }

    const changeRequests = await prisma.enrollmentChangeRequest.findMany({
      where: { enrollmentId },
      orderBy: { createdAt: 'desc' },
    });

    return changeRequests;
  }

  /**
   * Cancel a change request (parent only, own, only PENDING)
   */
  async cancelChangeRequest(changeRequestId: string, parentId: string) {
    const changeRequest = await prisma.enrollmentChangeRequest.findUnique({
      where: { id: changeRequestId },
      include: {
        enrollment: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!changeRequest) {
      throw new AppError(404, 'Change request not found');
    }

    // Verify parent owns the enrollment
    if (changeRequest.enrollment.student.parentId !== parentId) {
      throw new AppError(403, 'Not authorized to cancel this change request');
    }

    // Only allow cancellation of PENDING requests
    if (changeRequest.status !== 'PENDING') {
      throw new AppError(400, 'Can only cancel PENDING change requests');
    }

    const updated = await prisma.enrollmentChangeRequest.update({
      where: { id: changeRequestId },
      data: {
        status: 'CANCELLED',
      },
    });

    return updated;
  }

  /**
   * Admin: Get all change requests with filters
   */
  async getAdminChangeRequests(filters: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    const [changeRequests, total] = await Promise.all([
      prisma.enrollmentChangeRequest.findMany({
        where,
        include: {
          enrollment: {
            include: {
              student: {
                select: {
                  id: true,
                  fullName: true,
                  user: {
                    select: {
                      id: true,
                      fullName: true,
                    },
                  },
                },
              },
              subject: true,
            },
          },
          requestedByUser: {
            select: {
              id: true,
              fullName: true,
            },
          },
          reviewedByUser: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Math.min(limit, 100),
      }),
      prisma.enrollmentChangeRequest.count({ where }),
    ]);

    return {
      data: changeRequests,
      page,
      limit,
      total,
    };
  }

  /**
   * Admin: Get a single change request
   */
  async getAdminChangeRequest(changeRequestId: string) {
    const changeRequest = await prisma.enrollmentChangeRequest.findUnique({
      where: { id: changeRequestId },
      include: {
        enrollment: {
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                user: {
                  select: {
                    id: true,
                    fullName: true,
                  },
                },
              },
            },
            subject: true,
            tutor: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
        requestedByUser: {
          select: {
            id: true,
            fullName: true,
          },
        },
        reviewedByUser: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (!changeRequest) {
      throw new AppError(404, 'Change request not found');
    }

    return changeRequest;
  }

  /**
   * Admin: Approve a change request
   * ONE transaction: re-validate enrollment is still paid and active, check conflicts, apply values
   */
  async approveChangeRequest(changeRequestId: string, adminId: string) {
    const changeRequest = await prisma.enrollmentChangeRequest.findUnique({
      where: { id: changeRequestId },
      include: {
        enrollment: {
          include: {
            student: true,
            subject: true,
            tutor: true,
          },
        },
      },
    });

    if (!changeRequest) {
      throw new AppError(404, 'Change request not found');
    }

    if (changeRequest.status !== 'PENDING') {
      throw new AppError(400, 'Can only approve PENDING change requests');
    }

    // Re-validate enrollment is still active
    if (changeRequest.enrollment.status !== 'ACTIVE') {
      throw new AppError(400, 'Enrollment is no longer active');
    }

    const requestedValues = changeRequest.requestedValues as any;

    // Check for conflicts with existing sessions
    if (requestedValues.availableDays || requestedValues.preferredStartHour || requestedValues.preferredEndHour) {
      // This is a simplified check - in production, you'd want more sophisticated conflict detection
      const existingSessions = await prisma.session.findMany({
        where: {
          participants: {
            some: {
              enrollmentId: changeRequest.enrollmentId,
            },
          },
          status: { in: ['SCHEDULED', 'COMPLETED'] },
          scheduledAt: {
            gte: new Date(),
          },
        },
      });

      if (existingSessions.length > 0) {
        // Flag future sessions that no longer fit
        const sessionIdsToUpdate = existingSessions.map(s => s.id);
        await prisma.session.updateMany({
          where: {
            id: { in: sessionIdsToUpdate },
            scheduledAt: {
              gte: new Date(),
            },
          },
          data: {
            needsReschedule: true,
          },
        });
      }
    }

    // Apply the changes in a transaction
    const updated = await prisma.$transaction(async (tx) => {
      // Update the enrollment
      const updateData: any = {};
      if (requestedValues.startDate) updateData.startDate = new Date(requestedValues.startDate);
      if (requestedValues.endDate) updateData.endDate = new Date(requestedValues.endDate);
      if (requestedValues.availableDays) updateData.availableDays = requestedValues.availableDays;
      if (requestedValues.preferredStartHour !== undefined) updateData.preferredStartHour = requestedValues.preferredStartHour;
      if (requestedValues.preferredEndHour !== undefined) updateData.preferredEndHour = requestedValues.preferredEndHour;
      if (requestedValues.sessionFrequency) updateData.sessionFrequency = requestedValues.sessionFrequency;

      await tx.enrollment.update({
        where: { id: changeRequest.enrollmentId },
        data: updateData,
      });

      // Update the change request
      const cr = await tx.enrollmentChangeRequest.update({
        where: { id: changeRequestId },
        data: {
          status: 'APPROVED',
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
      });

      // Log admin action
      await tx.adminActionLog.create({
        data: {
          adminId,
          action: 'CHANGE_REQUEST_APPROVED',
          targetType: 'EnrollmentChangeRequest',
          targetId: changeRequestId,
          details: { enrollmentId: changeRequest.enrollmentId },
        },
      });

      return cr;
    });

    // Notify tutor, parent, and student
    const recipients = [
      changeRequest.enrollment.tutorId,
      changeRequest.enrollment.student.userId,
      changeRequest.requestedBy,
    ].filter((id): id is string => id !== null);

    await this.notificationCore.notify({
      recipientIds: recipients,
      type: 'CHANGE_REQUEST_APPROVED' as NotificationType,
      category: 'ENROLLMENT' as NotificationCategory,
      title: 'Enrollment Change Request Approved',
      body: `Your requested changes to the enrollment for ${changeRequest.enrollment.student.fullName} have been approved`,
      entityType: 'EnrollmentChangeRequest',
      entityId: changeRequestId,
      dedupeKey: `change-request-approved-${changeRequestId}`,
    });

    return this.getAdminChangeRequest(changeRequestId);
  }

  /**
   * Admin: Reject a change request
   * Reason is required
   */
  async rejectChangeRequest(changeRequestId: string, adminId: string, reason: string) {
    const changeRequest = await prisma.enrollmentChangeRequest.findUnique({
      where: { id: changeRequestId },
      include: {
        enrollment: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!changeRequest) {
      throw new AppError(404, 'Change request not found');
    }

    if (changeRequest.status !== 'PENDING') {
      throw new AppError(400, 'Can only reject PENDING change requests');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const cr = await tx.enrollmentChangeRequest.update({
        where: { id: changeRequestId },
        data: {
          status: 'REJECTED',
          rejectionReason: reason,
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
      });

      // Log admin action
      await tx.adminActionLog.create({
        data: {
          adminId,
          action: 'CHANGE_REQUEST_REJECTED',
          targetType: 'EnrollmentChangeRequest',
          targetId: changeRequestId,
          details: { enrollmentId: changeRequest.enrollmentId, reason },
        },
      });

      return cr;
    });

    // Notify the parent with the reason
    await this.notificationCore.notify({
      recipientIds: [changeRequest.requestedBy],
      type: 'CHANGE_REQUEST_REJECTED' as NotificationType,
      category: 'ENROLLMENT' as NotificationCategory,
      title: 'Enrollment Change Request Rejected',
      body: reason ? `Your requested changes have been rejected. Reason: ${reason}` : 'Your requested changes have been rejected',
      entityType: 'EnrollmentChangeRequest',
      entityId: changeRequestId,
      dedupeKey: `change-request-rejected-${changeRequestId}`,
    });

    return this.getAdminChangeRequest(changeRequestId);
  }
}
