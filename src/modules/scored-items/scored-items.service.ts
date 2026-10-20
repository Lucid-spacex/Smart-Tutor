import prisma from '../../config/database';
import { AppError } from '../../middleware/error-handler.middleware';
import { ScoredItemType } from '@prisma/client';

export class ScoredItemsService {
  /**
   * Get scored items for a student (tutor only)
   * Tutor ownership is checked: only scored items for the tutor's assigned students
   */
  async getStudentScoredItems(studentId: string, tutorId: string, filters: {
    enrollmentId?: string;
    type?: ScoredItemType;
    unassigned?: boolean;
  } = {}) {
    // Verify the student is assigned to this tutor
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        studentId,
        tutorId,
        status: 'ACTIVE',
      },
    });

    if (!enrollment) {
      throw new AppError(403, 'Student is not assigned to you');
    }

    const where: any = {
      studentId,
      tutorId,
    };

    if (filters.enrollmentId) {
      // Verify the enrollment belongs to this tutor
      const targetEnrollment = await prisma.enrollment.findUnique({
        where: { id: filters.enrollmentId },
      });

      if (!targetEnrollment || targetEnrollment.tutorId !== tutorId) {
        throw new AppError(403, 'Enrollment not assigned to you');
      }

      where.enrollmentId = filters.enrollmentId;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.unassigned === true) {
      where.gradeId = null;
    }

    return prisma.scoredItem.findMany({
      where,
      include: {
        enrollment: {
          include: {
            subject: true,
          },
        },
        student: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { scoredAt: 'desc' },
    });
  }

  /**
   * Create a manual scored item (tutor only)
   * Manual items are not auto-scored from quizzes
   */
  async createScoredItem(tutorId: string, data: {
    enrollmentId: string;
    type: ScoredItemType;
    score: number;
    maxScore: number;
    comment?: string;
  }) {
    // Verify enrollment belongs to this tutor
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: data.enrollmentId },
      include: {
        student: true,
      },
    });

    if (!enrollment) {
      throw new AppError(404, 'Enrollment not found');
    }

    if (enrollment.tutorId !== tutorId) {
      throw new AppError(403, 'You can only create scored items for your assigned students');
    }

    return prisma.scoredItem.create({
      data: {
        tutorId,
        studentId: enrollment.studentId,
        enrollmentId: data.enrollmentId,
        type: data.type,
        score: data.score,
        maxScore: data.maxScore,
        comment: data.comment,
      },
      include: {
        enrollment: {
          include: {
            subject: true,
          },
        },
        student: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });
  }

  /**
   * Update a scored item (tutor only)
   * Blocked if item is part of a PENDING_APPROVAL or APPROVED grade
   */
  async updateScoredItem(scoredItemId: string, tutorId: string, data: {
    score?: number;
    maxScore?: number;
    comment?: string;
  }) {
    const scoredItem = await prisma.scoredItem.findUnique({
      where: { id: scoredItemId },
      include: {
        grade: true,
      },
    });

    if (!scoredItem) {
      throw new AppError(404, 'Scored item not found');
    }

    // Tutor ownership check
    if (scoredItem.tutorId !== tutorId) {
      throw new AppError(403, 'You can only update your own scored items');
    }

    // Block if item is part of a PENDING_APPROVAL or APPROVED grade
    if (scoredItem.grade) {
      if (scoredItem.grade.status === 'PENDING_APPROVAL' || scoredItem.grade.status === 'APPROVED') {
        throw new AppError(403, 'Cannot edit scored items that are part of a submitted or approved grade');
      }
    }

    const updateData: any = {};
    if (data.score !== undefined) updateData.score = data.score;
    if (data.maxScore !== undefined) updateData.maxScore = data.maxScore;
    if (data.comment !== undefined) updateData.comment = data.comment;

    return prisma.scoredItem.update({
      where: { id: scoredItemId },
      data: updateData,
      include: {
        enrollment: {
          include: {
            subject: true,
          },
        },
        student: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });
  }

  /**
   * Delete a scored item (tutor only)
   * Only manual items (not from quizzes) can be deleted
   * Blocked if item is part of an active grade
   */
  async deleteScoredItem(scoredItemId: string, tutorId: string) {
    const scoredItem = await prisma.scoredItem.findUnique({
      where: { id: scoredItemId },
      include: {
        grade: true,
      },
    });

    if (!scoredItem) {
      throw new AppError(404, 'Scored item not found');
    }

    // Tutor ownership check
    if (scoredItem.tutorId !== tutorId) {
      throw new AppError(403, 'You can only delete your own scored items');
    }

    // Block if item is part of any grade (even REJECTED)
    if (scoredItem.gradeId) {
      throw new AppError(403, 'Cannot delete scored items that are attached to a grade');
    }

    // Optionally block deletion of auto-scored quiz items
    if (scoredItem.sourceType === 'QuizAttempt') {
      throw new AppError(403, 'Cannot delete auto-scored quiz items');
    }

    await prisma.scoredItem.delete({
      where: { id: scoredItemId },
    });
  }
}
