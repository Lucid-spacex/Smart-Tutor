import prisma from '../../config/database';
import { AppError } from '../../middleware/error-handler.middleware';
import { CloudinaryService } from '../../services/cloudinary.service';

export class AssignmentsService {
  private cloudinaryService: CloudinaryService;

  constructor() {
    this.cloudinaryService = new CloudinaryService();
  }

  async createAssignment(tutorId: string, data: any) {
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
      throw new AppError(403, 'You are not assigned to this enrollment and cannot create assignments for it');
    }

    let attachmentUrl = null;
    let attachmentName = null;

    // Upload attachment to Cloudinary if provided
    if (data.attachmentBase64) {
      const uploadResult = await this.cloudinaryService.uploadFile(
        data.attachmentBase64,
        'assignments',
        'raw'
      );
      attachmentUrl = uploadResult.url;
      attachmentName = uploadResult.filename;
    }

    return prisma.assignment.create({
      data: {
        enrollmentId: data.enrollmentId,
        createdBy: tutorId,
        title: data.title,
        description: data.description,
        type: data.type,
        dueDate: new Date(data.dueDate),
        status: 'PENDING',
        attachmentUrl,
        attachmentName,
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
  }

  async getAssignments(userId: string, userRole: string, filters?: { enrollmentId?: string; status?: string }) {
    const where: any = {};

    // Add status filter if provided
    if (filters?.status) {
      where.status = filters.status;
    }

    // Filter based on user role using proper enrollment ID filtering
    if (userRole === 'TUTOR') {
      // Get tutor's enrollment IDs
      const enrollments = await prisma.enrollment.findMany({
        where: { tutorId: userId },
        select: { id: true },
      });

      const enrollmentIds = enrollments.map(e => e.id);

      if (enrollmentIds.length > 0) {
        where.enrollmentId = { in: enrollmentIds };
      } else {
        return []; // No enrollments, no assignments
      }
    } else if (userRole === 'PARENT') {
      // Get parent's children's enrollment IDs
      const children = await prisma.student.findMany({
        where: { parentId: userId },
        select: { id: true },
      });

      const childIds = children.map(c => c.id);

      if (childIds.length === 0) {
        return []; // No children, no assignments
      }

      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: { in: childIds } },
        select: { id: true },
      });

      const enrollmentIds = enrollments.map(e => e.id);

      if (enrollmentIds.length > 0) {
        where.enrollmentId = { in: enrollmentIds };
      } else {
        return []; // No enrollments, no assignments
      }
    } else if (userRole === 'STUDENT') {
      // Get student's enrollment IDs
      const student = await prisma.student.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!student) {
        throw new AppError(404, 'Student profile not found');
      }

      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: student.id },
        select: { id: true },
      });

      const enrollmentIds = enrollments.map(e => e.id);

      if (enrollmentIds.length > 0) {
        where.enrollmentId = { in: enrollmentIds };
      } else {
        return []; // No enrollments, no assignments
      }
    }

    // If enrollmentId is specified, verify it belongs to the user
    if (filters?.enrollmentId) {
      if (where.enrollmentId && Array.isArray(where.enrollmentId.in)) {
        if (!where.enrollmentId.in.includes(filters.enrollmentId)) {
          throw new AppError(403, 'You do not have permission to access assignments for this enrollment');
        }
        where.enrollmentId = filters.enrollmentId;
      } else {
        where.enrollmentId = filters.enrollmentId;
      }
    }

    return prisma.assignment.findMany({
      where,
      include: {
        enrollment: {
          include: {
            student: true,
            subject: true,
          },
        },
        creator: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    });
  }

  async updateAssignment(assignmentId: string, tutorId: string, data: any) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        enrollment: true,
      },
    });

    if (!assignment) {
      throw new AppError(404, 'Assignment not found');
    }

    // Only the creator (tutor) can update the assignment
    if (assignment.createdBy !== tutorId) {
      throw new AppError(403, 'Not authorized to update this assignment');
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);

    // Handle attachment update
    if (data.attachmentBase64) {
      // Delete old attachment from Cloudinary if it exists
      if (assignment.attachmentUrl) {
        const publicId = this.extractPublicIdFromUrl(assignment.attachmentUrl);
        if (publicId) {
          await this.cloudinaryService.deleteFile(publicId);
        }
      }

      // Upload new attachment
      const uploadResult = await this.cloudinaryService.uploadFile(
        data.attachmentBase64,
        'assignments',
        'raw'
      );
      updateData.attachmentUrl = uploadResult.url;
      updateData.attachmentName = uploadResult.filename;
    } else if (data.removeAttachment === true) {
      // Remove attachment
      if (assignment.attachmentUrl) {
        const publicId = this.extractPublicIdFromUrl(assignment.attachmentUrl);
        if (publicId) {
          await this.cloudinaryService.deleteFile(publicId);
        }
      }
      updateData.attachmentUrl = null;
      updateData.attachmentName = null;
    }

    return prisma.assignment.update({
      where: { id: assignmentId },
      data: updateData,
      include: {
        enrollment: {
          include: {
            student: true,
            subject: true,
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

  async deleteAssignment(assignmentId: string, tutorId: string) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new AppError(404, 'Assignment not found');
    }

    // Only the creator (tutor) can delete the assignment
    if (assignment.createdBy !== tutorId) {
      throw new AppError(403, 'Not authorized to delete this assignment');
    }

    // Check if there are any submissions
    const submissions = await prisma.assignmentSubmission.findMany({
      where: { assignmentId },
    });

    if (submissions.length > 0) {
      throw new AppError(400, 'Cannot delete assignment - student has already submitted work');
    }

    // Delete attachment from Cloudinary if it exists
    if (assignment.attachmentUrl) {
      const publicId = this.extractPublicIdFromUrl(assignment.attachmentUrl);
      if (publicId) {
        await this.cloudinaryService.deleteFile(publicId);
      }
    }

    await prisma.assignment.delete({
      where: { id: assignmentId },
    });
  }

  async submitAssignment(assignmentId: string, userId: string, data: any) {
    const student = await prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      throw new AppError(404, 'Student profile not found');
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        enrollment: true,
      },
    });

    if (!assignment) {
      throw new AppError(404, 'Assignment not found');
    }

    // Verify the assignment belongs to the student's enrollment
    if (assignment.enrollment.studentId !== student.id) {
      throw new AppError(403, 'You are not authorized to submit this assignment');
    }

    // Check if student has already submitted
    const existingSubmission = await prisma.assignmentSubmission.findFirst({
      where: {
        assignmentId,
        studentId: student.id,
      },
    });

    if (existingSubmission) {
      throw new AppError(400, 'You have already submitted this assignment');
    }

    let attachmentUrl = null;
    let attachmentName = null;

    // Upload attachment to Cloudinary if provided
    if (data.attachmentBase64) {
      const uploadResult = await this.cloudinaryService.uploadFile(
        data.attachmentBase64,
        'assignment-submissions',
        'raw'
      );
      attachmentUrl = uploadResult.url;
      attachmentName = uploadResult.filename;
    }

    return prisma.assignmentSubmission.create({
      data: {
        assignmentId,
        studentId: student.id,
        textAnswer: data.textAnswer,
        attachmentUrl,
        attachmentName,
      },
      include: {
        assignment: {
          include: {
            enrollment: {
              include: {
                subject: true,
              },
            },
          },
        },
      },
    });
  }

  async provideFeedback(assignmentId: string, submissionId: string, tutorId: string, data: any) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new AppError(404, 'Assignment not found');
    }

    // Verify the tutor created the assignment
    if (assignment.createdBy !== tutorId) {
      throw new AppError(403, 'Not authorized to provide feedback for this assignment');
    }

    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new AppError(404, 'Submission not found');
    }

    // Verify the submission belongs to the assignment
    if (submission.assignmentId !== assignmentId) {
      throw new AppError(400, 'Submission does not belong to this assignment');
    }

    const updateData: any = {
      feedbackText: data.feedbackText,
      gradedAt: new Date(),
    };

    // Handle feedback attachment
    if (data.feedbackAttachmentBase64) {
      // Delete old feedback attachment from Cloudinary if it exists
      if (submission.feedbackAttachmentUrl) {
        const publicId = this.extractPublicIdFromUrl(submission.feedbackAttachmentUrl);
        if (publicId) {
          await this.cloudinaryService.deleteFile(publicId);
        }
      }

      // Upload new feedback attachment
      const uploadResult = await this.cloudinaryService.uploadFile(
        data.feedbackAttachmentBase64,
        'assignment-feedback',
        'raw'
      );
      updateData.feedbackAttachmentUrl = uploadResult.url;
      updateData.feedbackAttachmentName = uploadResult.filename;
    }

    return prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: updateData,
      include: {
        student: true,
        assignment: {
          include: {
            enrollment: {
              include: {
                subject: true,
              },
            },
          },
        },
      },
    });
  }
}
