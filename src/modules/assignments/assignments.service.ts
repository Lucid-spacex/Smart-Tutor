import prisma from '../../config/database';
import { AppError } from '../../middleware/error-handler.middleware';

export class AssignmentsService {
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

    return prisma.assignment.create({
      data: {
        enrollmentId: data.enrollmentId,
        createdBy: tutorId,
        title: data.title,
        description: data.description,
        type: data.type,
        dueDate: new Date(data.dueDate),
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

  async updateAssignmentStatus(assignmentId: string, tutorId: string, status: string) {
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

    return prisma.assignment.update({
      where: { id: assignmentId },
      data: { status: status as any },
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
}
