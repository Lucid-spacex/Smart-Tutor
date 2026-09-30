import prisma from '../../config/database';
import { NotificationsService } from '../notifications/notifications.service';
import { AppError } from '../../middleware/error-handler.middleware';
import { CloudinaryService } from '../../services/cloudinary.service';

export class GradesService {
  private notificationsService: NotificationsService;
  private cloudinaryService: CloudinaryService;

  constructor() {
    this.notificationsService = new NotificationsService();
    this.cloudinaryService = new CloudinaryService();
  }

  async createGrade(tutorId: string, data: any) {
    // Verify enrollment exists and tutor is assigned
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: data.enrollmentId },
      include: {
        student: true,
        subject: true,
      },
    });

    if (!enrollment) {
      throw new AppError(404, 'Enrollment not found');
    }

    if (enrollment.tutorId !== tutorId) {
      throw new AppError(403, 'Not authorized to grade this enrollment');
    }

    // If assignmentId is provided, verify it exists and belongs to the enrollment
    if (data.assignmentId) {
      const assignment = await prisma.assignment.findUnique({
        where: { id: data.assignmentId },
      });
      if (!assignment || assignment.enrollmentId !== data.enrollmentId) {
        throw new AppError(400, 'Assignment not found or does not belong to this enrollment');
      }
    }

    let attachmentUrl = null;
    let attachmentName = null;

    // Upload attachment to Cloudinary if provided
    if (data.attachmentBase64) {
      const uploadResult = await this.cloudinaryService.uploadFile(
        data.attachmentBase64,
        'grades',
        'raw'
      );
      attachmentUrl = uploadResult.url;
      attachmentName = uploadResult.filename;
    }

    // Grade always starts as PENDING_APPROVAL
    return prisma.grade.create({
      data: {
        enrollmentId: data.enrollmentId,
        assignmentId: data.assignmentId || null,
        gradedBy: tutorId,
        score: data.score,
        comments: data.comments,
        attachmentUrl,
        attachmentName,
        status: 'PENDING_APPROVAL',
        visibleToStudent: false, // Not visible until approved
      },
      include: {
        enrollment: {
          include: {
            student: true,
            subject: true,
          },
        },
        assignment: true,
        grader: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });
  }

  async updateGrade(gradeId: string, tutorId: string, data: any) {
    const grade = await prisma.grade.findUnique({
      where: { id: gradeId },
    });

    if (!grade) {
      throw new AppError(404, 'Grade not found');
    }

    // Only the grader (tutor) can update the grade
    if (grade.gradedBy !== tutorId) {
      throw new AppError(403, 'Not authorized to update this grade');
    }

    // Only allow updates when grade is PENDING_APPROVAL or REJECTED
    if (grade.status === 'APPROVED') {
      throw new AppError(403, 'Cannot update approved grades');
    }

    const updateData: any = {};
    if (data.score !== undefined) updateData.score = data.score;
    if (data.comments !== undefined) updateData.comments = data.comments;

    // Handle attachment update
    if (data.attachmentBase64) {
      // Delete old attachment from Cloudinary if it exists
      if (grade.attachmentUrl) {
        const publicId = this.extractPublicIdFromUrl(grade.attachmentUrl);
        if (publicId) {
          await this.cloudinaryService.deleteFile(publicId);
        }
      }

      // Upload new attachment
      const uploadResult = await this.cloudinaryService.uploadFile(
        data.attachmentBase64,
        'grades',
        'raw'
      );
      updateData.attachmentUrl = uploadResult.url;
      updateData.attachmentName = uploadResult.filename;
    } else if (data.removeAttachment === true) {
      // Remove attachment
      if (grade.attachmentUrl) {
        const publicId = this.extractPublicIdFromUrl(grade.attachmentUrl);
        if (publicId) {
          await this.cloudinaryService.deleteFile(publicId);
        }
      }
      updateData.attachmentUrl = null;
      updateData.attachmentName = null;
    }

    return prisma.grade.update({
      where: { id: gradeId },
      data: updateData,
      include: {
        enrollment: {
          include: {
            student: true,
            subject: true,
          },
        },
        assignment: true,
        grader: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });
  }

  /**
   * Extract Cloudinary public ID from URL
   */
  private extractPublicIdFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      
      const uploadIndex = pathParts.indexOf('upload');
      if (uploadIndex === -1 || uploadIndex === pathParts.length - 1) {
        return null;
      }

      const startIndex = uploadIndex + 2;
      const publicIdWithExtension = pathParts.slice(startIndex).join('/');
      const publicId = publicIdWithExtension.replace(/\.[^/.]+$/, '');
      
      return publicId;
    } catch {
      return null;
    }
  }

  async deleteGrade(gradeId: string, tutorId: string) {
    const grade = await prisma.grade.findUnique({
      where: { id: gradeId },
    });

    if (!grade) {
      throw new AppError(404, 'Grade not found');
    }

    // Only the grader (tutor) can delete the grade
    if (grade.gradedBy !== tutorId) {
      throw new AppError(403, 'Not authorized to delete this grade');
    }

    // Only allow deletion when grade is PENDING_APPROVAL or REJECTED
    if (grade.status === 'APPROVED') {
      throw new AppError(403, 'Cannot delete approved grades');
    }

    // Delete attachment from Cloudinary if it exists
    if (grade.attachmentUrl) {
      const publicId = this.extractPublicIdFromUrl(grade.attachmentUrl);
      if (publicId) {
        await this.cloudinaryService.deleteFile(publicId);
      }
    }

    await prisma.grade.delete({
      where: { id: gradeId },
    });
  }

  async getPendingGrades() {
    return prisma.grade.findMany({
      where: {
        status: 'PENDING_APPROVAL',
      },
      include: {
        enrollment: {
          include: {
            student: true,
            subject: true,
          },
        },
        assignment: true,
        grader: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async approveGrade(gradeId: string, adminId: string) {
    const grade = await prisma.grade.findUnique({
      where: { id: gradeId },
    });

    if (!grade) {
      throw new AppError(404, 'Grade not found');
    }

    if (grade.status !== 'PENDING_APPROVAL') {
      throw new AppError(400, 'Grade is not in pending approval status');
    }

    const updatedGrade = await prisma.grade.update({
      where: { id: gradeId },
      data: {
        status: 'APPROVED',
        approvedBy: adminId,
        approvedAt: new Date(),
        visibleToStudent: true, // Now visible to student/parent
      },
      include: {
        enrollment: {
          include: {
            student: true,
            subject: true,
          },
        },
        assignment: true,
        grader: {
          select: {
            id: true,
            fullName: true,
          },
        },
        approver: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    // Create notification for student and parent (with email)
    await this.notificationsService.createGradeApprovedNotification(gradeId, true);

    return updatedGrade;
  }

  async rejectGrade(gradeId: string, adminId: string, reason?: string) {
    const grade = await prisma.grade.findUnique({
      where: { id: gradeId },
    });

    if (!grade) {
      throw new AppError(404, 'Grade not found');
    }

    if (grade.status !== 'PENDING_APPROVAL') {
      throw new AppError(400, 'Grade is not in pending approval status');
    }

    return prisma.grade.update({
      where: { id: gradeId },
      data: {
        status: 'REJECTED',
        approvedBy: adminId,
        approvedAt: new Date(),
        comments: reason ? `${grade.comments}\n\nRejection reason: ${reason}` : grade.comments,
      },
      include: {
        enrollment: {
          include: {
            student: true,
            subject: true,
          },
        },
        assignment: true,
        grader: {
          select: {
            id: true,
            fullName: true,
          },
        },
        approver: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });
  }

  async getGrades(userId: string, userRole: string, filters?: { studentId?: string; enrollmentId?: string }) {
    const where: any = {
      visibleToStudent: true, // Only show approved grades to students/parents
    };

    if (filters?.studentId) {
      where.enrollment = {
        studentId: filters.studentId,
      };
    }

    if (filters?.enrollmentId) {
      where.enrollmentId = filters.enrollmentId;
    }

    // Filter based on user role
    if (userRole === 'TUTOR') {
      // Tutors see all grades for their enrollments (any status)
      delete where.visibleToStudent;
      where.enrollment = {
        tutorId: userId,
      };
    } else if (userRole === 'PARENT') {
      // Parents see approved grades for their children
      where.enrollment = {
        student: {
          parentId: userId,
        },
      };
    } else if (userRole === 'STUDENT') {
      // Students see approved grades for their own enrollments
      where.enrollment = {
        student: {
          userId,
        },
      };
    } else if (userRole === 'ADMIN') {
      // Admins see all grades (any status)
      delete where.visibleToStudent;
    }

    return prisma.grade.findMany({
      where,
      include: {
        enrollment: {
          include: {
            student: true,
            subject: true,
          },
        },
        assignment: true,
        grader: {
          select: {
            id: true,
            fullName: true,
          },
        },
        approver: {
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
}
