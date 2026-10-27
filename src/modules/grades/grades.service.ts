import prisma from '../../config/database';
import { NotificationCoreService } from '../notifications/notification-core.service';
import { AppError } from '../../middleware/error-handler.middleware';
import { NotificationCategory, NotificationType } from '@prisma/client';

export class NewGradesService {
  private notificationCore: NotificationCoreService;

  constructor() {
    this.notificationCore = new NotificationCoreService();
  }

  /**
   * Compute attendance rate for a grading period
   * Computed as: attended sessions / expected completed sessions
   */
  private async computeAttendanceRate(enrollmentId: string, periodStart: Date, periodEnd: Date): Promise<number> {
    const totalSessions = await prisma.session.count({
      where: {
        participants: {
          some: {
            enrollmentId,
          },
        },
        scheduledAt: {
          gte: periodStart,
          lte: periodEnd,
        },
        status: { in: ['COMPLETED', 'MISSED'] },
      },
    });

    if (totalSessions === 0) return 0;

    const attendedSessions = await prisma.session.count({
      where: {
        participants: {
          some: {
            enrollmentId,
          },
        },
        scheduledAt: {
          gte: periodStart,
          lte: periodEnd,
        },
        status: 'COMPLETED',
      },
    });

    return (attendedSessions / totalSessions) * 100;
  }

  /**
   * Compute the grade score from components
   * Server-calculated, never client-supplied
   */
  private async computeGradeScore(gradeId: string): Promise<number> {
    const components = await prisma.gradeComponent.findMany({
      where: { gradeId },
      include: {
        scoredItem: true,
      },
    });

    if (components.length === 0) return 0;

    let totalScore = 0;
    for (const component of components) {
      if (component.scoredItem) {
        const itemScore = Number(component.scoredItem.score) / Number(component.scoredItem.maxScore);
        totalScore += itemScore * component.weight;
      } else if (component.type === 'ATTENDANCE') {
        // Attendance is a special case - use the stored attendance rate
        totalScore += Number(component.attendanceRate || 0) * component.weight;
      }
    }

    return totalScore;
  }

  /**
   * Create a DRAFT grade with components
   */
  async createDraftGrade(tutorId: string, data: {
    enrollmentId: string;
    periodStart: Date;
    periodEnd: Date;
    components: Array<{
      type: string;
      weight: number;
      scoredItemId?: string;
      attendanceRate?: number;
    }>;
    tutorComment?: string;
  }) {
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

    // Validate weights total exactly 100
    const totalWeight = data.components.reduce((sum, c) => sum + c.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new AppError(400, 'Component weights must total exactly 100');
    }

    // Check for overlapping periods with non-rejected grades
    const overlappingGrade = await prisma.grade.findFirst({
      where: {
        enrollmentId: data.enrollmentId,
        status: { in: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'] },
        periodStart: { lte: data.periodEnd },
        periodEnd: { gte: data.periodStart },
      },
    });

    if (overlappingGrade) {
      throw new AppError(400, 'A grade for this period already exists or is pending approval');
    }

    // Create grade and components in a transaction
    const grade = await prisma.$transaction(async (tx) => {
      const newGrade = await tx.grade.create({
        data: {
          enrollmentId: data.enrollmentId,
          gradedBy: tutorId,
          status: 'DRAFT',
          periodStart: data.periodStart,
          periodEnd: data.periodEnd,
          tutorComment: data.tutorComment,
          visibleToStudent: false,
        },
      });

      // Create components
      for (const component of data.components) {
        // If attendance component, compute the rate
        let attendanceRate = component.attendanceRate;
        if (component.type === 'ATTENDANCE' && attendanceRate === undefined) {
          attendanceRate = await this.computeAttendanceRate(data.enrollmentId, data.periodStart, data.periodEnd);
        }

        await tx.gradeComponent.create({
          data: {
            gradeId: newGrade.id,
            type: component.type,
            weight: component.weight,
            weightPercent: component.weight, // Legacy field, same as weight
            itemCount: component.scoredItemId ? 1 : 0,
            componentPercentage: 0, // Will be computed from final score
            snapshot: component.scoredItemId ? { scoredItemId: component.scoredItemId } : {},
            scoredItemId: component.scoredItemId,
            attendanceRate: attendanceRate ? attendanceRate : null,
          },
        });

        // Lock the scored item if provided
        if (component.scoredItemId) {
          await tx.scoredItem.update({
            where: { id: component.scoredItemId },
            data: { gradeId: newGrade.id },
          });
        }
      }

      // Log the grade creation event
      await tx.gradeEvent.create({
        data: {
          gradeId: newGrade.id,
          action: 'CREATED',
          userId: tutorId,
          details: { componentCount: data.components.length },
        },
      });

      return newGrade;
    });

    // Compute initial score
    const computedScore = await this.computeGradeScore(grade.id);

    const updatedGrade = await prisma.grade.update({
      where: { id: grade.id },
      data: { computedScore },
      include: {
        enrollment: {
          include: {
            student: true,
            subject: true,
          },
        },
        components: {
          include: {
            scoredItem: true,
          },
        },
        grader: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    return updatedGrade;
  }

  /**
   * Update a DRAFT or REJECTED grade
   * Recomputes the score
   */
  async updateGrade(gradeId: string, tutorId: string, data: {
    periodStart?: Date;
    periodEnd?: Date;
    components?: Array<{
      type: string;
      weight: number;
      scoredItemId?: string;
      attendanceRate?: number;
    }>;
    tutorComment?: string;
    finalScore?: number;
    overrideReason?: string;
  }) {
    const existingGrade = await prisma.grade.findUnique({
      where: { id: gradeId },
      include: {
        components: true,
      },
    });

    if (!existingGrade) {
      throw new AppError(404, 'Grade not found');
    }

    // Only the grader (tutor) can update the grade
    if (existingGrade.gradedBy !== tutorId) {
      throw new AppError(403, 'Not authorized to update this grade');
    }

    // Only allow updates when grade is DRAFT or REJECTED
    if (existingGrade.status === 'PENDING_APPROVAL' || existingGrade.status === 'APPROVED') {
      throw new AppError(403, 'Cannot edit submitted or approved grades');
    }

    // Validate weights if components are provided
    if (data.components) {
      const totalWeight = data.components.reduce((sum, c) => sum + c.weight, 0);
      if (Math.abs(totalWeight - 100) > 0.01) {
        throw new AppError(400, 'Component weights must total exactly 100');
      }
    }

    // Validate override reason if finalScore is provided
    if (data.finalScore !== undefined && data.overrideReason === undefined) {
      throw new AppError(400, 'Override reason is required when setting finalScore');
    }

    // Update in a transaction
    const grade = await prisma.$transaction(async (tx) => {
      const updateData: any = {};
      if (data.periodStart) updateData.periodStart = data.periodStart;
      if (data.periodEnd) updateData.periodEnd = data.periodEnd;
      if (data.tutorComment !== undefined) updateData.tutorComment = data.tutorComment;
      if (data.finalScore !== undefined) updateData.finalScore = data.finalScore;
      if (data.overrideReason !== undefined) updateData.overrideReason = data.overrideReason;

      const updatedGrade = await tx.grade.update({
        where: { id: gradeId },
        data: updateData,
      });

      // If components are provided, replace them
      if (data.components) {
        // Delete existing components and unlock items
        const existingComponents = await tx.gradeComponent.findMany({
          where: { gradeId },
          include: {
            scoredItem: true,
          },
        });

        for (const existingComponent of existingComponents) {
          if (existingComponent.scoredItem) {
            await tx.scoredItem.update({
              where: { id: existingComponent.scoredItem.id },
              data: { gradeId: null },
            });
          }
        }

        await tx.gradeComponent.deleteMany({
          where: { gradeId },
        });

        // Create new components
        for (const component of data.components) {
          let attendanceRate = component.attendanceRate;
          if (component.type === 'ATTENDANCE' && attendanceRate === undefined) {
            const periodStart = data.periodStart || existingGrade.periodStart;
            const periodEnd = data.periodEnd || existingGrade.periodEnd;
            if (!periodStart || !periodEnd) {
              throw new AppError(400, 'Period start and end are required for attendance calculation');
            }
            attendanceRate = await this.computeAttendanceRate(existingGrade.enrollmentId, periodStart, periodEnd);
          }

          await tx.gradeComponent.create({
            data: {
              gradeId,
              type: component.type,
              weight: component.weight,
              weightPercent: component.weight, // Legacy field, same as weight
              itemCount: component.scoredItemId ? 1 : 0,
              componentPercentage: 0, // Will be computed from final score
              snapshot: component.scoredItemId ? { scoredItemId: component.scoredItemId } : {},
              scoredItemId: component.scoredItemId,
              attendanceRate: attendanceRate ? attendanceRate : null,
            },
          });

          // Lock the scored item if provided
          if (component.scoredItemId) {
            await tx.scoredItem.update({
              where: { id: component.scoredItemId },
              data: { gradeId },
            });
          }
        }
      }

      // Log the update event
      await tx.gradeEvent.create({
        data: {
          gradeId,
          action: 'RESUBMITTED',
          userId: tutorId,
          details: { componentsUpdated: !!data.components },
        },
      });

      return updatedGrade;
    });

    // Recompute score
    const computedScore = await this.computeGradeScore(grade.id);

    const finalGrade = await prisma.grade.update({
      where: { id: grade.id },
      data: { computedScore },
      include: {
        enrollment: {
          include: {
            student: true,
            subject: true,
          },
        },
        components: {
          include: {
            scoredItem: true,
          },
        },
        grader: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    return finalGrade;
  }

  /**
   * Delete a DRAFT or REJECTED grade
   * Releases all locked scored items
   */
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

    // Only allow deletion when grade is DRAFT or REJECTED
    if (grade.status === 'PENDING_APPROVAL' || grade.status === 'APPROVED') {
      throw new AppError(403, 'Cannot delete submitted or approved grades');
    }

    // Delete in a transaction to release items
    await prisma.$transaction(async (tx) => {
      // Unlock all scored items
      await tx.scoredItem.updateMany({
        where: { gradeId },
        data: { gradeId: null },
      });

      // Delete components
      await tx.gradeComponent.deleteMany({
        where: { gradeId },
      });

      // Delete events
      await tx.gradeEvent.deleteMany({
        where: { gradeId },
      });

      // Delete the grade
      await tx.grade.delete({
        where: { id: gradeId },
      });
    });
  }

  /**
   * Submit a DRAFT or REJECTED grade for approval
   * Full validation, freeze snapshots, lock items
   */
  async submitGrade(gradeId: string, tutorId: string) {
    const grade = await prisma.grade.findUnique({
      where: { id: gradeId },
      include: {
        components: {
          include: {
            scoredItem: true,
          },
        },
        enrollment: {
          include: {
            student: true,
            subject: true,
          },
        },
      },
    });

    if (!grade) {
      throw new AppError(404, 'Grade not found');
    }

    // Only the grader (tutor) can submit the grade
    if (grade.gradedBy !== tutorId) {
      throw new AppError(403, 'Not authorized to submit this grade');
    }

    // Only allow submission when grade is DRAFT or REJECTED
    if (grade.status !== 'DRAFT' && grade.status !== 'REJECTED') {
      throw new AppError(400, 'Can only submit DRAFT or REJECTED grades');
    }

    // Full validation: ensure every weighted component has data
    for (const component of grade.components) {
      if (component.weight > 0) {
        if (component.type === 'ATTENDANCE' && component.attendanceRate === null) {
          throw new AppError(400, 'Attendance component is missing data');
        }
        if (!component.scoredItem && component.type !== 'ATTENDANCE') {
          throw new AppError(400, `Component ${component.type} is missing a scored item`);
        }
      }
    }

    // Submit in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.grade.update({
        where: { id: gradeId },
        data: {
          status: 'PENDING_APPROVAL',
          submittedAt: new Date(),
        },
      });

      // Log the submission event
      await tx.gradeEvent.create({
        data: {
          gradeId,
          action: 'SUBMITTED',
          userId: tutorId,
          details: { componentCount: grade.components.length },
        },
      });
    });

    // Notify admins of grade submission
    await this.notificationCore.notify({
      recipientRole: 'ADMIN',
      type: 'GRADE_SUBMITTED' as NotificationType,
      category: 'GRADES' as NotificationCategory,
      title: 'Grade Submitted for Approval',
      body: `A grade for ${grade.enrollment.subject.name} has been submitted and awaits approval`,
      entityType: 'Grade',
      entityId: gradeId,
      dedupeKey: `grade-submitted-${gradeId}`,
    });

    return { message: 'Grade submitted for approval' };
  }

  /**
   * Withdraw a PENDING_APPROVAL grade back to DRAFT
   * Unlocks items
   */
  async withdrawGrade(gradeId: string, tutorId: string) {
    const grade = await prisma.grade.findUnique({
      where: { id: gradeId },
    });

    if (!grade) {
      throw new AppError(404, 'Grade not found');
    }

    // Only the grader (tutor) can withdraw the grade
    if (grade.gradedBy !== tutorId) {
      throw new AppError(403, 'Not authorized to withdraw this grade');
    }

    // Only allow withdrawal when grade is PENDING_APPROVAL
    if (grade.status !== 'PENDING_APPROVAL') {
      throw new AppError(400, 'Can only withdraw PENDING_APPROVAL grades');
    }

    await prisma.$transaction(async (tx) => {
      await tx.grade.update({
        where: { id: gradeId },
        data: {
          status: 'DRAFT',
          submittedAt: null,
        },
      });

      // Log the withdrawal event
      await tx.gradeEvent.create({
        data: {
          gradeId,
          action: 'WITHDRAWN',
          userId: tutorId,
          details: {},
        },
      });
    });

    return { message: 'Grade withdrawn to draft' };
  }

  /**
   * Preview a grade (read-only, can be called on any status)
   */
  async previewGrade(gradeId: string, tutorId: string) {
    const grade = await prisma.grade.findUnique({
      where: { id: gradeId },
      include: {
        enrollment: {
          include: {
            student: true,
            subject: true,
          },
        },
        components: {
          include: {
            scoredItem: true,
          },
        },
        grader: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (!grade) {
      throw new AppError(404, 'Grade not found');
    }

    // Only the grader (tutor) can preview their own grades
    if (grade.gradedBy !== tutorId) {
      throw new AppError(403, 'Not authorized to view this grade');
    }

    return grade;
  }

  /**
   * Admin: Get grades (never lists DRAFT)
   */
  async getAdminGrades(filters: {
    status?: string;
    tutorId?: string;
    studentId?: string;
    subjectId?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, tutorId, studentId, subjectId, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Never list DRAFT grades to admins
    if (status && status !== 'DRAFT') {
      where.status = status;
    } else if (!status) {
      where.status = { in: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'] };
    }

    if (tutorId) {
      where.gradedBy = tutorId;
    }

    if (studentId) {
      where.enrollment = {
        studentId,
      };
    }

    if (subjectId) {
      where.enrollment = {
        ...where.enrollment,
        subjectId,
      };
    }

    const [grades, total] = await Promise.all([
      prisma.grade.findMany({
        where,
        include: {
          enrollment: {
            include: {
              student: {
                select: {
                  id: true,
                  fullName: true,
                },
              },
              subject: true,
            },
          },
          components: {
            include: {
              scoredItem: true,
            },
          },
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
        orderBy: { createdAt: 'desc' },
        skip,
        take: Math.min(limit, 100),
      }),
      prisma.grade.count({ where }),
    ]);

    return {
      data: grades,
      page,
      limit,
      total,
    };
  }

  /**
   * Admin: Get a single grade with full breakdown
   * No studentCode exposed
   */
  async getAdminGrade(gradeId: string) {
    const grade = await prisma.grade.findUnique({
      where: { id: gradeId },
      include: {
        enrollment: {
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
              },
            },
            subject: true,
          },
        },
        components: {
          include: {
            scoredItem: true,
          },
        },
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
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!grade) {
      throw new AppError(404, 'Grade not found');
    }

    return grade;
  }

  /**
   * Admin: Approve a grade
   * Only PENDING_APPROVAL grades can be approved
   */
  async approveGrade(gradeId: string, adminId: string) {
    const grade = await prisma.grade.findUnique({
      where: { id: gradeId },
      include: {
        enrollment: {
          include: {
            student: true,
            subject: true,
          },
        },
      },
    });

    if (!grade) {
      throw new AppError(404, 'Grade not found');
    }

    if (grade.status !== 'PENDING_APPROVAL') {
      throw new AppError(400, 'Grade is not in pending approval status');
    }

    const updatedGrade = await prisma.$transaction(async (tx) => {
      const g = await tx.grade.update({
        where: { id: gradeId },
        data: {
          status: 'APPROVED',
          approvedBy: adminId,
          approvedAt: new Date(),
          reviewedBy: adminId,
          reviewedAt: new Date(),
          visibleToStudent: true,
        },
      });

      // Log admin action
      await tx.adminActionLog.create({
        data: {
          adminId,
          action: 'GRADE_APPROVED',
          targetType: 'Grade',
          targetId: gradeId,
          details: { gradeId },
        },
      });

      // Log grade event
      await tx.gradeEvent.create({
        data: {
          gradeId,
          action: 'APPROVED',
          userId: adminId,
          details: {},
        },
      });

      return g;
    });

    // Notify student and parent of grade approval
    const recipients = [grade.enrollment.student.userId];
    if (grade.enrollment.student.parentId) {
      recipients.push(grade.enrollment.student.parentId);
    }

    await this.notificationCore.notify({
      recipientIds: recipients,
      type: 'GRADE_APPROVED' as NotificationType,
      category: 'GRADES' as NotificationCategory,
      title: 'Grade Approved',
      body: `Grade for ${grade.enrollment.subject.name} has been approved`,
      entityType: 'Grade',
      entityId: gradeId,
      dedupeKey: `grade-approved-${gradeId}`,
    });

    return this.getAdminGrade(gradeId);
  }

  /**
   * Admin: Reject a grade
   * Only PENDING_APPROVAL grades can be rejected
   * Reason is required (validated in controller)
   */
  async rejectGrade(gradeId: string, adminId: string, reason: string) {
    const grade = await prisma.grade.findUnique({
      where: { id: gradeId },
      include: {
        enrollment: {
          include: {
            subject: true,
          },
        },
      },
    });

    if (!grade) {
      throw new AppError(404, 'Grade not found');
    }

    if (grade.status !== 'PENDING_APPROVAL') {
      throw new AppError(400, 'Grade is not in pending approval status');
    }

    const updatedGrade = await prisma.$transaction(async (tx) => {
      const g = await tx.grade.update({
        where: { id: gradeId },
        data: {
          status: 'REJECTED',
          approvedBy: adminId,
          approvedAt: new Date(),
          reviewedBy: adminId,
          reviewedAt: new Date(),
          rejectionReason: reason,
        },
      });

      // Unlock scored items
      await tx.scoredItem.updateMany({
        where: { gradeId },
        data: { gradeId: null },
      });

      // Log admin action
      await tx.adminActionLog.create({
        data: {
          adminId,
          action: 'GRADE_REJECTED',
          targetType: 'Grade',
          targetId: gradeId,
          details: { gradeId, reason },
        },
      });

      // Log grade event
      await tx.gradeEvent.create({
        data: {
          gradeId,
          action: 'REJECTED',
          userId: adminId,
          details: { reason },
        },
      });

      return g;
    });

    // Notify tutor ONLY (not student or parent)
    await this.notificationCore.notify({
      recipientIds: [updatedGrade.gradedBy],
      type: 'GRADE_REJECTED' as NotificationType,
      category: 'GRADES' as NotificationCategory,
      title: 'Grade Rejected',
      body: reason ? `Your submitted grade has been rejected. Reason: ${reason}` : 'Your submitted grade has been rejected. Please review and resubmit.',
      entityType: 'Grade',
      entityId: gradeId,
      dedupeKey: `grade-rejected-${gradeId}`,
    });

    return this.getAdminGrade(gradeId);
  }

  /**
   * Admin: Bulk approve grades
   * One transaction per grade with per-item results
   */
  async bulkApproveGrades(gradeIds: string[], adminId: string) {
    const results = [];

    for (const gradeId of gradeIds) {
      try {
        const result = await this.approveGrade(gradeId, adminId);
        results.push({ gradeId, success: true, grade: result });
      } catch (error: any) {
        results.push({ gradeId, success: false, error: error.message });
      }
    }

    return {
      total: gradeIds.length,
      approved: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  }

  async getGradeById(gradeId: string, userId: string, userRole: string) {
    const grade = await prisma.grade.findUnique({
      where: { id: gradeId },
      include: {
        enrollment: {
          include: {
            student: {
              include: {
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
        gradedByUser: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (!grade) {
      throw new AppError(404, 'Grade not found');
    }

    // Role-based visibility
    if (userRole === 'TUTOR') {
      // Tutors see all their own grades including overrideReason and rejectionReason
      if (grade.gradedBy !== userId) {
        throw new AppError(403, 'Access denied');
      }
    } else if (userRole === 'PARENT') {
      // Parents see only APPROVED grades for their children, never overrideReason or rejectionReason
      if (grade.status !== 'APPROVED' || grade.enrollment.student.parentId !== userId) {
        throw new AppError(403, 'Access denied');
      }
      // Remove sensitive fields
      delete (grade as any).overrideReason;
      delete (grade as any).rejectionReason;
    } else if (userRole === 'STUDENT') {
      // Students see only APPROVED grades for their own enrollments, never overrideReason or rejectionReason
      if (grade.status !== 'APPROVED' || grade.enrollment.student.userId !== userId) {
        throw new AppError(403, 'Access denied');
      }
      // Remove sensitive fields
      delete (grade as any).overrideReason;
      delete (grade as any).rejectionReason;
    }

    return grade;
  }

  /**
   * Legacy: Get grades for students/parents/tutors
   * Role-based visibility rules:
   * - Tutors: see ONLY their own grades in ALL statuses (DRAFT, PENDING_APPROVAL, APPROVED, REJECTED) with rejectionReason
   * - Parents/Students: see only APPROVED grades for their own children, never overrideReason or rejectionReason
   * - Admins: see everything except DRAFT in review lists
   */
  async getGrades(userId: string, userRole: string, filters?: { studentId?: string; enrollmentId?: string }) {
    const where: any = {};

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
      // Tutors see ONLY their own grades in ALL statuses
      where.gradedBy = userId;
      // No status filter - tutors see DRAFT, PENDING_APPROVAL, APPROVED, REJECTED
    } else if (userRole === 'PARENT') {
      // Parents see only APPROVED grades for their children
      where.status = 'APPROVED';
      where.visibleToStudent = true;
      where.enrollment = {
        student: {
          parentId: userId,
        },
      };
    } else if (userRole === 'STUDENT') {
      // Students see only APPROVED grades for their own enrollments
      where.status = 'APPROVED';
      where.visibleToStudent = true;
      where.enrollment = {
        student: {
          userId,
        },
      };
    } else if (userRole === 'ADMIN') {
      // Admins see everything except DRAFT in review lists
      where.status = { in: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'] };
    }

    const grades = await prisma.grade.findMany({
      where,
      select: {
        id: true,
        enrollmentId: true,
        periodStart: true,
        periodEnd: true,
        computedScore: true,
        finalScore: true,
        status: true,
        tutorComment: true,
        createdAt: true,
        // SECURITY: Only tutors and admins see overrideReason
        overrideReason: userRole === 'TUTOR' || userRole === 'ADMIN',
        // SECURITY: Only tutors see rejectionReason
        rejectionReason: userRole === 'TUTOR',
        enrollment: {
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
              },
            },
            subject: true,
          },
        },
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
        components: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return grades;
  }

  /**
   * Legacy: Calculate average grade percentage
   * Only APPROVED grades count
   */
  async calculateAverageGrade(filters: { studentId?: string; enrollmentId?: string; tutorId?: string }) {
    const where: any = {
      status: 'APPROVED',
    };

    if (filters.studentId) {
      where.enrollment = {
        studentId: filters.studentId,
      };
    }

    if (filters.enrollmentId) {
      where.enrollmentId = filters.enrollmentId;
    }

    if (filters.tutorId) {
      where.enrollment = {
        tutorId: filters.tutorId,
      };
    }

    const grades = await prisma.grade.findMany({
      where,
      select: {
        score: true,
        maxScore: true,
      },
    });

    if (grades.length === 0) {
      return {
        averagePercentage: null,
        gradedCount: 0,
      };
    }

    const percentages = grades.map(g => (Number(g.score) / Number(g.maxScore || 100)) * 100);
    const averagePercentage = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;

    return {
      averagePercentage: Math.round(averagePercentage * 10) / 10,
      gradedCount: grades.length,
    };
  }
}
