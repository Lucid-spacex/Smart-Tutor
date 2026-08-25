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
        student: true,
        subject: true,
      },
    });

    return enrollments.map(enrollment => ({
      student: enrollment.student,
      enrollment: {
        id: enrollment.id,
        subject: enrollment.subject,
        frequency: enrollment.frequency,
        startDate: enrollment.startDate,
        endDate: enrollment.endDate,
        status: enrollment.status,
      },
    }));
  }

  async getTutorSessions(tutorId: string) {
    return prisma.session.findMany({
      where: {
        enrollment: {
          tutorId,
        },
      },
      include: {
        enrollment: {
          include: {
            student: true,
            subject: true,
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
}
