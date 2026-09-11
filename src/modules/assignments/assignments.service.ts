import prisma from '../../config/database';

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
      throw new Error('Enrollment not found');
    }

    if (enrollment.tutorId !== tutorId) {
      throw new Error('Not authorized to create assignment for this enrollment');
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

  async getAssignments(userId: string, userRole: string, filters?: { enrollmentId?: string }) {
    const where: any = {};

    if (filters?.enrollmentId) {
      where.enrollmentId = filters.enrollmentId;
    }

    // Filter based on user role
    if (userRole === 'TUTOR') {
      // Tutors see assignments for enrollments they're assigned to
      where.enrollment = {
        tutorId: userId,
      };
    } else if (userRole === 'PARENT') {
      // Parents see assignments for their children's enrollments
      where.enrollment = {
        student: {
          parentId: userId,
        },
      };
    } else if (userRole === 'STUDENT') {
      // Students see assignments for their own enrollments
      where.enrollment = {
        student: {
          userId,
        },
      };
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
      throw new Error('Assignment not found');
    }

    // Only the creator (tutor) can update the assignment
    if (assignment.createdBy !== tutorId) {
      throw new Error('Not authorized to update this assignment');
    }

    return prisma.assignment.update({
      where: { id: assignmentId },
      data: { status },
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
