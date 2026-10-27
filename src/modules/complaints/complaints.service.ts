import prisma from '../../config/database';
import { NotificationCoreService } from '../notifications/notification-core.service';
import { NotificationCategory, NotificationType } from '@prisma/client';

export class ComplaintsService {
  private notificationCore: NotificationCoreService;

  constructor() {
    this.notificationCore = new NotificationCoreService();
  }

  async createComplaint(userId: string, userRole: string, data: any) {
    // Only parents can file complaints (tutors now use messaging)
    if (userRole !== 'PARENT') {
      throw new Error('Not authorized to file complaints');
    }

    const complaint = await prisma.complaint.create({
      data: {
        filedBy: userId,
        aboutType: data.aboutType,
        aboutId: data.aboutId || null,
        subject: data.subject,
        description: data.description,
        status: 'OPEN',
      },
      include: {
        filer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Notify admins of new complaint
    await this.notificationCore.notify({
      recipientRole: 'ADMIN',
      type: 'GENERAL' as NotificationType,
      category: 'COMPLAINTS' as NotificationCategory,
      title: 'New Complaint Filed',
      body: `Complaint "${data.subject}" filed by ${complaint.filer.fullName}`,
      entityType: 'Complaint',
      entityId: complaint.id,
      dedupeKey: `complaint-filed-${complaint.id}`,
    });

    return complaint;
  }

  async getComplaints(userId: string, userRole: string) {
    const where: any = {};

    if (userRole === 'ADMIN') {
      // Admins see all complaints
    } else if (userRole === 'PARENT') {
      // Parents see only their own complaints
      where.filedBy = userId;
    } else if (userRole === 'TUTOR') {
      // Tutors no longer have access to complaints (they use messaging)
      return [];
    } else {
      throw new Error('Not authorized to view complaints');
    }

    return prisma.complaint.findMany({
      where,
      include: {
        filer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        resolver: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async resolveComplaint(complaintId: string, adminId: string, resolution: string) {
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
    });

    if (!complaint) {
      throw new Error('Complaint not found');
    }

    if (complaint.status !== 'OPEN') {
      throw new Error('Complaint is not in open status');
    }

    const updatedComplaint = await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status: 'RESOLVED',
        adminReply: resolution,
        resolvedBy: adminId,
        resolvedAt: new Date(),
      },
      include: {
        filer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        resolver: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    // Notify the filer that complaint is resolved
    await this.notificationCore.notify({
      recipientIds: [complaint.filedBy],
      type: 'COMPLAINT_RESOLVED' as NotificationType,
      category: 'COMPLAINTS' as NotificationCategory,
      title: 'Complaint Resolved',
      body: `Your complaint "${complaint.subject}" has been resolved`,
      entityType: 'Complaint',
      entityId: complaint.id,
      dedupeKey: `complaint-resolved-${complaint.id}`,
    });

    return updatedComplaint;
  }
}
