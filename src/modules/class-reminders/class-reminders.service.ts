import prisma from '../../config/database';
import { NotificationCoreService } from '../notifications/notification-core.service';
import { AppError } from '../../middleware/error-handler.middleware';
import { NotificationCategory, NotificationType } from '@prisma/client';
import { DateTime } from 'luxon';

export class ClassRemindersService {
  private notificationCore: NotificationCoreService;

  constructor() {
    this.notificationCore = new NotificationCoreService();
  }

  /**
   * 15-minute job to send class reminders
   * Uses timezone: student timezone, then parent, then UTC (DST-safe)
   */
  async sendClassReminders() {
    const now = DateTime.now().toUTC();

    // Get all ACTIVE enrollments with assigned tutors
    const enrollments = await prisma.enrollment.findMany({
      where: {
        status: 'ACTIVE',
        tutorId: { not: null },
        deletedAt: null,
        tutor: {
          status: 'ACTIVE', // Skip unavailable tutors
        },
      },
      include: {
        student: {
          include: {
            user: true,
          },
        },
        subject: true,
        tutor: true,
      },
    });

    for (const enrollment of enrollments) {
      try {
        await this.processEnrollmentReminders(enrollment, now);
      } catch (error) {
        console.error(`Error processing reminders for enrollment ${enrollment.id}:`, error);
      }
    }
  }

  /**
   * Process reminders for a single enrollment
   */
  private async processEnrollmentReminders(enrollment: any, now: DateTime) {
    // Determine timezone: student, then UTC
    const timezone = enrollment.student.user.timezone || 'UTC';

    // Compute the next expected slot from preferred days and hours
    const nextSlot = this.computeNextExpectedSlot(enrollment, timezone, now);

    if (!nextSlot) {
      return; // No valid slot
    }

    const slotUtc = nextSlot.toUTC();
    const dedupeBase = `${enrollment.id}-${slotUtc.toISO()}`;

    // Check if a session exists for this slot
    const existingSession = await prisma.session.findFirst({
      where: {
        participants: {
          some: {
            enrollmentId: enrollment.id,
          },
        },
        scheduledAt: {
          gte: slotUtc.toJSDate(),
          lt: slotUtc.plus({ hours: 1 }).toJSDate(),
        },
      },
    });

    const timeUntilSlot = slotUtc.diff(now).as('hours');

    // Scenario 1: No session exists - notify tutor to schedule
    if (!existingSession) {
      // 24 hours before
      if (timeUntilSlot <= 24 && timeUntilSlot > 23) {
        await this.notificationCore.notify({
          recipientIds: [enrollment.tutor.userId],
          type: 'CLASS_NEEDS_SCHEDULING' as NotificationType,
          category: 'SCHEDULING' as NotificationCategory,
          title: 'Class Needs Scheduling',
          body: `You have a class scheduled for ${enrollment.student.user.fullName} in 24 hours that needs to be scheduled`,
          entityType: 'Enrollment',
          entityId: enrollment.id,
          dedupeKey: `${dedupeBase}-needs-scheduling-24h`,
        });
      }

      // 2 hours before
      if (timeUntilSlot <= 2 && timeUntilSlot > 1.9) {
        await this.notificationCore.notify({
          recipientIds: [enrollment.tutor.userId],
          type: 'CLASS_NEEDS_SCHEDULING' as NotificationType,
          category: 'SCHEDULING' as NotificationCategory,
          title: 'Class Needs Scheduling - Urgent',
          body: `You have a class scheduled for ${enrollment.student.user.fullName} in 2 hours that still needs to be scheduled`,
          entityType: 'Enrollment',
          entityId: enrollment.id,
          dedupeKey: `${dedupeBase}-needs-scheduling-2h`,
        });
      }

      // 1 hour before - notify admins
      if (timeUntilSlot <= 1 && timeUntilSlot > 0.9) {
        await this.notificationCore.notify({
          recipientRole: 'ADMIN',
          type: 'CLASS_UNSCHEDULED' as NotificationType,
          category: 'SCHEDULING' as NotificationCategory,
          title: 'Class Still Unscheduled',
          body: `Class for ${enrollment.student.user.fullName} is still unscheduled 1 hour before the slot`,
          entityType: 'Enrollment',
          entityId: enrollment.id,
          dedupeKey: `${dedupeBase}-unscheduled-1h`,
        });
      }

      // Mark as missed if slot has passed
      if (timeUntilSlot < 0) {
        await this.notificationCore.notify({
          recipientRole: 'ADMIN',
          type: 'CLASS_MISSED' as NotificationType,
          category: 'SCHEDULING' as NotificationCategory,
          title: 'Class Missed',
          body: `Class for ${enrollment.student.user.fullName} was missed (no session scheduled)`,
          entityType: 'Enrollment',
          entityId: enrollment.id,
          dedupeKey: `${dedupeBase}-missed`,
        });

        // Also notify tutor that they failed to schedule
        await this.notificationCore.notify({
          recipientIds: [enrollment.tutor.userId],
          type: 'TUTOR_FAILED_TO_SCHEDULE' as NotificationType,
          category: 'SCHEDULING' as NotificationCategory,
          title: 'Class Not Scheduled',
          body: `You failed to schedule the class for ${enrollment.student.user.fullName}`,
          entityType: 'Enrollment',
          entityId: enrollment.id,
          dedupeKey: `${dedupeBase}-tutor-failed`,
        });
      }
    } else {
      // Scenario 2: Session exists - notify tutor 30 minutes before
      if (timeUntilSlot <= 0.5 && timeUntilSlot > 0.4) {
        await this.notificationCore.notify({
          recipientIds: [enrollment.tutor.userId],
          type: 'CLASS_REMINDER' as NotificationType,
          category: 'SCHEDULING' as NotificationCategory,
          title: 'Upcoming Class Reminder',
          body: `You have a class with ${enrollment.student.user.fullName} in 30 minutes`,
          entityType: 'Session',
          entityId: existingSession.id,
          dedupeKey: `${dedupeBase}-reminder-30m`,
        });
      }
    }
  }

  /**
   * Compute the next expected slot from available days and preferred hours
   */
  private computeNextExpectedSlot(enrollment: any, timezone: string, now: DateTime): DateTime | null {
    if (!enrollment.availableDays || enrollment.availableDays.length === 0) {
      return null;
    }

    const availableDays = enrollment.availableDays as string[]; // e.g., ['MON', 'TUE', 'WED']
    const preferredStartHour = enrollment.preferredStartHour;
    const preferredEndHour = enrollment.preferredEndHour;

    if (!preferredStartHour || !preferredEndHour) {
      return null;
    }

    const nowInTz = now.setZone(timezone);
    const currentDay = nowInTz.weekday;

    // Check today's slot first
    if (availableDays.includes(this.weekdayToString(currentDay))) {
      const slotTime = nowInTz.set({ hour: preferredStartHour, minute: 0, second: 0, millisecond: 0 });

      if (slotTime > nowInTz) {
        return slotTime;
      }
    }

    // Find the next day's slot
    for (let i = 1; i <= 7; i++) {
      const nextDay = (currentDay + i - 1) % 7 + 1;
      const dayName = this.weekdayToString(nextDay);

      if (availableDays.includes(dayName)) {
        const nextDate = nowInTz.plus({ days: i });
        return nextDate.set({ hour: preferredStartHour, minute: 0, second: 0, millisecond: 0 });
      }
    }

    return null;
  }

  /**
   * Convert Luxon weekday number to string
   */
  private weekdayToString(weekday: number): string {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return days[weekday - 1] || 'MON';
  }

  /**
   * Get upcoming classes for a tutor
   * Own assigned students only, SCHEDULED or NEEDS_SESSION
   */
  async getTutorUpcomingClasses(tutorId: string, filters: {
    from?: string;
    to?: string;
  }) {
    const fromDate = filters.from ? new Date(filters.from) : new Date();
    const toDate = filters.to ? new Date(filters.to) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days default

    // Get enrollments assigned to this tutor
    const enrollments = await prisma.enrollment.findMany({
      where: {
        tutorId,
        status: 'ACTIVE',
        deletedAt: null,
      },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
          },
        },
        subject: true,
      },
    });

    const enrollmentIds = enrollments.map(e => e.id);

    // Get sessions for these enrollments
    const sessions = await prisma.session.findMany({
      where: {
        participants: {
          some: {
            enrollmentId: { in: enrollmentIds },
          },
        },
        scheduledAt: {
          gte: fromDate,
          lte: toDate,
        },
        status: 'SCHEDULED',
      },
      include: {
        participants: {
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
                        timezone: true,
                      },
                    },
                  },
                },
                subject: true,
              },
            },
          },
        },
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });

    // Map sessions to expected response format
    const scheduledClasses = sessions.map(session => {
      const participant = session.participants[0];
      const enrollment = participant?.enrollment;

      return {
        id: session.id,
        scheduledAt: session.scheduledAt,
        status: session.status,
        durationMinutes: session.durationMinutes,
        googleMeetLink: session.googleMeetLink,
        enrollment: enrollment ? {
          id: enrollment.id,
          student: enrollment.student,
          subject: enrollment.subject,
        } : null,
      };
    });

    // For each enrollment, check if it needs a session in the time range (NEEDS_SESSION)
    const needsSessionClasses = [];
    for (const enrollment of enrollments) {
      const existingSession = await prisma.session.findFirst({
        where: {
          participants: {
            some: {
              enrollmentId: enrollment.id,
            },
          },
          scheduledAt: {
            gte: fromDate,
            lte: toDate,
          },
        },
      });

      if (!existingSession) {
        needsSessionClasses.push({
          id: `needs-session-${enrollment.id}`,
          scheduledAt: null,
          status: 'NEEDS_SESSION',
          durationMinutes: null,
          googleMeetLink: null,
          enrollment: {
            id: enrollment.id,
            student: enrollment.student,
            subject: enrollment.subject,
          },
        });
      }
    }

    // Combine and sort by scheduledAt (nulls last)
    const allClasses = [...scheduledClasses, ...needsSessionClasses].sort((a, b) => {
      if (!a.scheduledAt) return 1;
      if (!b.scheduledAt) return -1;
      return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    });

    return allClasses;
  }

  /**
   * Get class schedule for admin
   * All students, SCHEDULED, UNSCHEDULED or MISSED
   * UNSCHEDULED is computed from enrollments without sessions
   */
  async getAdminClassSchedule(filters: {
    tutorId?: string;
    status?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    const { tutorId, status, from, to, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const fromDate = from ? new Date(from) : new Date();
    const toDate = to ? new Date(to) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // If requesting UNSCHEDULED status, return computed unscheduled classes
    if (status === 'UNSCHEDULED') {
      const enrollments = await prisma.enrollment.findMany({
        where: {
          status: 'ACTIVE',
          tutorId: tutorId || undefined,
          deletedAt: null,
        },
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
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
      });

      // For each enrollment, check if it has a session in the time range
      const unscheduledClasses = [];
      for (const enrollment of enrollments) {
        const existingSession = await prisma.session.findFirst({
          where: {
            participants: {
              some: {
                enrollmentId: enrollment.id,
              },
            },
            scheduledAt: {
              gte: fromDate,
              lte: toDate,
            },
          },
        });

        if (!existingSession) {
          unscheduledClasses.push({
            id: `unscheduled-${enrollment.id}`,
            scheduledAt: null,
            status: 'UNSCHEDULED',
            durationMinutes: null,
            googleMeetLink: null,
            enrollment: {
              id: enrollment.id,
              student: enrollment.student,
              subject: enrollment.subject,
              tutor: enrollment.tutor,
            },
          });
        }
      }

      return {
        data: unscheduledClasses.slice(skip, skip + limit),
        page,
        limit,
        total: unscheduledClasses.length,
        unscheduledWithin24hCount: unscheduledClasses.length,
      };
    }

    // For SCHEDULED, MISSED, or no status filter, query sessions
    const where: any = {
      scheduledAt: {
        gte: fromDate,
        lte: toDate,
      },
    };

    if (status) {
      where.status = status;
    } else {
      where.status = { in: ['SCHEDULED', 'MISSED'] };
    }

    if (tutorId) {
      where.participants = {
        some: {
          enrollment: {
            tutorId,
          },
        },
      };
    }

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        include: {
          participants: {
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
                  tutor: {
                    select: {
                      id: true,
                      fullName: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          scheduledAt: 'asc',
        },
        skip,
        take: Math.min(limit, 100),
      }),
      prisma.session.count({ where }),
    ]);

    // Count unscheduled within 24h (enrollments without sessions in next 24h)
    const activeEnrollments = await prisma.enrollment.findMany({
      where: {
        status: 'ACTIVE',
        tutorId: tutorId || undefined,
        deletedAt: null,
      },
      select: { id: true },
    });

    const enrollmentIds = activeEnrollments.map(e => e.id);
    const sessionsIn24h = await prisma.session.findMany({
      where: {
        participants: {
          some: {
            enrollmentId: { in: enrollmentIds },
          },
        },
        scheduledAt: {
          gte: new Date(),
          lte: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      },
      select: { id: true },
    });

    const enrolledIn24h = new Set();
    for (const session of sessionsIn24h) {
      const participants = await prisma.sessionParticipant.findMany({
        where: { sessionId: session.id },
        select: { enrollmentId: true },
      });
      for (const p of participants) {
        enrolledIn24h.add(p.enrollmentId);
      }
    }

    const unscheduledWithin24hCount = enrollmentIds.filter(id => !enrolledIn24h.has(id)).length;

    return {
      data: sessions.map(session => {
        const participant = session.participants[0];
        const enrollment = participant?.enrollment;

        return {
          id: session.id,
          scheduledAt: session.scheduledAt,
          status: session.status,
          durationMinutes: session.durationMinutes,
          googleMeetLink: session.googleMeetLink,
          enrollment: enrollment ? {
            id: enrollment.id,
            student: enrollment.student,
            subject: enrollment.subject,
            tutor: enrollment.tutor,
          } : null,
        };
      }),
      page,
      limit,
      total,
      unscheduledWithin24hCount,
    };
  }
}
