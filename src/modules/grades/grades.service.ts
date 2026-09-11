import prisma from '../../config/database';
import { NotificationsService } from '../notifications/notifications.service';

export class GradesService {
  private notificationsService: NotificationsService;

  constructor() {
    this.notificationsService = new NotificationsService();
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
      throw new Error('Enrollment not found');
    }

    if (enrollment.tutorId !== tutorId) {
      throw new Error('Not authorized to grade this enrollment');
    }

    // If assignmentId is provided, verify it exists and belongs to the enrollment
    if (data.assignmentId) {
      const assignment = await prisma.assignment.findUnique({
        where: { id: data.assignmentId },
      });
      if (!assignment || assignment.enrollmentId !== data.enrollmentId) {
        throw new Error('Assignment not found or does not belong to this enrollment');
      }
    }

    // Grade always starts as PENDING_APPROVAL
    return prisma.grade.create({
      data: {
        enrollmentId: data.enrollmentId,
        assignmentId: data.assignmentId || null,
        gradedBy: tutorId,
        score: data.score,
        comments: data.comments,
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
      throw new Error('Grade not found');
    }

    if (grade.status !== 'PENDING_APPROVAL') {
      throw new Error('Grade is not in pending approval status');
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

    // Create notification for student and parent
    await this.notificationsService.createGradeApprovedNotification(gradeId);

    return updatedGrade;
  }

  async rejectGrade(gradeId: string, adminId: string, reason?: string) {
    const grade = await prisma.grade.findUnique({
      where: { id: gradeId },
    });

    if (!grade) {
      throw new Error('Grade not found');
    }

    if (grade.status !== 'PENDING_APPROVAL') {
      throw new Error('Grade is not in pending approval status');
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
