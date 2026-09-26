import prisma from '../../config/database';
import { CreateTutorProfileInput, UpdateAvailabilityInput } from './tutor.validation';

export class TutorService {
  async createTutorProfile(tutorId: string, data: CreateTutorProfileInput) {
    // Check if profile already exists
    const existingProfile = await prisma.tutorProfile.findUnique({
      where: { userId: tutorId },
    });

    if (existingProfile) {
      throw new Error('Tutor profile already exists');
    }

    return prisma.tutorProfile.create({
      data: {
        userId: tutorId,
        subjects: data.subjects,
        bio: data.bio,
        credentialsUrl: data.credentialsUrl,
        hourlyRate: data.hourlyRate,
        availability: data.availability,
      },
    });
  }

  async updateAvailability(tutorId: string, data: UpdateAvailabilityInput) {
    const profile = await prisma.tutorProfile.findUnique({
      where: { userId: tutorId },
    });

    if (!profile) {
      throw new Error('Tutor profile not found');
    }

    return prisma.tutorProfile.update({
      where: { id: profile.id },
      data: {
        availability: data.availability,
      },
    });
  }

  async getAssignedStudents(tutorId: string) {
    const enrollments = await prisma.enrollment.findMany({
      where: {
        tutorId,
        status: 'ACTIVE',
      },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            dateOfBirth: true,
            gradeLevel: true,
            school: true,
            notes: true,
            createdAt: true,
            // SECURITY: Parent info is explicitly omitted
          },
        },
        subject: true,
      },
    });

    return enrollments.map(enrollment => ({
      student: enrollment.student,
      enrollment: {
        id: enrollment.id,
        subject: enrollment.subject,
        sessionFrequency: enrollment.sessionFrequency,
        billingFrequency: enrollment.billingFrequency,
        startDate: enrollment.startDate,
        endDate: enrollment.endDate,
        status: enrollment.status,
      },
    }));
  }

  async getTutorSessions(tutorId: string) {
    return prisma.session.findMany({
      where: {
        tutorId,
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
                    gradeLevel: true,
                  },
                },
                subject: true,
              },
            },
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async getTutorProfile(tutorId: string) {
    const profile = await prisma.tutorProfile.findUnique({
      where: { userId: tutorId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            status: true,
          },
        },
      },
    });

    if (!profile) {
      throw new Error('Tutor profile not found');
    }

    return profile;
  }

  async getStudentDetail(tutorId: string, studentId: string) {
    // CRITICAL AUTHORIZATION CHECK: Verify tutor is assigned to at least one active enrollment for this student
    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId,
        tutorId,
        status: 'ACTIVE',
      },
      include: {
        student: true,
        subject: true,
      },
    });

    if (enrollments.length === 0) {
      throw new Error('Not authorized to view this student');
    }

    // Get the first active enrollment (the one this request is about)
    const enrollment = enrollments[0];

    // SECURITY: Explicitly select only allowed fields - no parent contact or financial info
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        fullName: true,
        dateOfBirth: true,
        gender: true,
        actualGrade: true,
        gradeLevel: true,
        gradeBandTier: true,
        school: true,
        notes: true,
        // Explicitly omitted: parentId, User fields with contact info
      },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    // Get upcoming sessions for this enrollment
    const upcomingSessions = await prisma.session.findMany({
      where: {
        tutorId,
        participants: {
          some: {
            enrollmentId: enrollment.id,
          },
        },
        status: 'SCHEDULED',
        scheduledAt: {
          gte: new Date(),
        },
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
                  },
                },
                subject: true,
              },
            },
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    // Get recent completed/missed sessions with this tutor's notes
    const pastSessions = await prisma.session.findMany({
      where: {
        tutorId,
        participants: {
          some: {
            enrollmentId: enrollment.id,
          },
        },
        status: {
          in: ['COMPLETED', 'MISSED'],
        },
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
                  },
                },
                subject: true,
              },
            },
          },
        },
      },
      orderBy: { scheduledAt: 'desc' },
      take: 10, // Limit to recent sessions
    });

    // Get assignments THIS tutor created for THIS enrollment
    const assignments = await prisma.assignment.findMany({
      where: {
        enrollmentId: enrollment.id,
        createdBy: tutorId,
      },
      include: {
        enrollment: {
          include: {
            subject: true,
          },
        },
      },
      orderBy: { dueDate: 'desc' },
    });

    // Get grades THIS tutor submitted for THIS enrollment
    const gradesGiven = await prisma.grade.findMany({
      where: {
        enrollmentId: enrollment.id,
        gradedBy: tutorId,
      },
      include: {
        enrollment: {
          include: {
            subject: true,
          },
        },
        assignment: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get progress reports THIS tutor wrote for THIS enrollment
    const progressReports = await prisma.progressReport.findMany({
      where: {
        enrollmentId: enrollment.id,
        createdBy: tutorId,
      },
      include: {
        enrollment: {
          include: {
            subject: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate attendance stats for this enrollment
    const allSessions = await prisma.session.findMany({
      where: {
        tutorId,
        participants: {
          some: {
            enrollmentId: enrollment.id,
          },
        },
        status: {
          in: ['COMPLETED', 'MISSED'],
        },
      },
      include: {
        participants: {
          where: {
            enrollmentId: enrollment.id,
          },
        },
      },
    });

    const totalSessions = allSessions.length;
    const attended = allSessions.filter(session =>
      session.participants.some(p => p.attended)
    ).length;
    const missed = totalSessions - attended;
    const percentage = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0;

    return {
      student,
      enrollment: {
        id: enrollment.id,
        subject: enrollment.subject,
        status: enrollment.status,
        sessionFrequency: enrollment.sessionFrequency,
        availableDays: enrollment.availableDays,
        startDate: enrollment.startDate,
        endDate: enrollment.endDate,
      },
      upcomingSessions,
      pastSessions,
      assignments,
      gradesGiven,
      progressReports,
      attendance: {
        totalSessions,
        attended,
        missed,
        percentage,
      },
    };
  }
}
