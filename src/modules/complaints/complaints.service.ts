import prisma from '../../config/database';
import { NotificationsService } from '../notifications/notifications.service';

export class ComplaintsService {
  private notificationsService: NotificationsService;

  constructor() {
    this.notificationsService = new NotificationsService();
  }

  async createComplaint(userId: string, userRole: string, data: any) {
    // Only parents and tutors can file complaints
    if (userRole !== 'PARENT' && userRole !== 'TUTOR') {
      throw new Error('Not authorized to file complaints');
    }

    return prisma.complaint.create({
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
  }

  async getComplaints(userId: string, userRole: string) {
    const where: any = {};

    if (userRole === 'ADMIN') {
      // Admins see all complaints
    } else if (userRole === 'PARENT' || userRole === 'TUTOR') {
      // Parents and tutors see only their own complaints
      where.filedBy = userId;
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

  async resolveComplaint(complaintId: string, adminId: string, reply: string) {
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
        adminReply: reply,
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

    // Create notification for the filer (with email)
    await this.notificationsService.createComplaintResolvedNotification(complaintId, complaint.filedBy, true);

    return updatedComplaint;
  }
}
