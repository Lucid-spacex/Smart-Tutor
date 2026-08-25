import prisma from '../../config/database';
import { UpdateTutorVettingInput, AssignTutorInput } from './admin.validation';

export class AdminService {
  async getPendingTutors() {
    return prisma.user.findMany({
      where: {
        role: 'TUTOR',
        status: 'PENDING_VETTING',
      },
      include: {
        tutorProfile: true,
      },
    });
  }

  async updateTutorVetting(tutorId: string, data: UpdateTutorVettingInput) {
    const user = await prisma.user.findUnique({
      where: { id: tutorId },
      include: { tutorProfile: true },
    });

    if (!user) {
      throw new Error('Tutor not found');
    }

    if (user.role !== 'TUTOR') {
      throw new Error('User is not a tutor');
    }

    // Update both user status and tutor profile vetting status
    const userStatus = data.vettingStatus === 'APPROVED' ? 'APPROVED' : 'REJECTED';

    await prisma.user.update({
      where: { id: tutorId },
      data: { status: userStatus },
    });

    const updatedProfile = await prisma.tutorProfile.update({
      where: { userId: tutorId },
      data: { vettingStatus: data.vettingStatus },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            status: true,
          },
        },
      },
    });

    return updatedProfile;
  }

  async getUnmatchedEnrollments() {
    return prisma.enrollment.findMany({
      where: {
        tutorId: null,
        status: 'ACTIVE',
      },
      include: {
        student: {
          include: {
            parent: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        subject: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async assignTutor(enrollmentId: string, data: AssignTutorInput) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    if (enrollment.tutorId) {
      throw new Error('Enrollment already has a tutor assigned');
    }

    // Verify tutor exists and is approved
    const tutor = await prisma.user.findUnique({
      where: { id: data.tutorId },
      include: { tutorProfile: true },
    });

    if (!tutor || tutor.role !== 'TUTOR') {
      throw new Error('Tutor not found');
    }

    if (tutor.status !== 'APPROVED' || !tutor.tutorProfile || tutor.tutorProfile.vettingStatus !== 'APPROVED') {
      throw new Error('Tutor is not approved for tutoring');
    }

    return prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { tutorId: data.tutorId },
      include: {
        student: true,
        subject: true,
        tutor: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  async getFailedPayments() {
    return prisma.payment.findMany({
      where: {
        status: 'FAILED',
      },
      include: {
        parent: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        enrollment: {
          include: {
            student: true,
            subject: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOverviewReport() {
    // Use raw SQL for complex aggregate queries as specified
    const activeStudents = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT s.id) as count
      FROM "Student" s
      INNER JOIN "Enrollment" e ON s."parentId" = e."studentId"
      WHERE e.status = 'ACTIVE'
    `;

    const activeTutors = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM "User" u
      INNER JOIN "TutorProfile" tp ON u.id = tp."userId"
      WHERE u.role = 'TUTOR' AND u.status = 'APPROVED' AND tp."vettingStatus" = 'APPROVED'
    `;

    const revenueThisMonth = await prisma.$queryRaw<Array<{ total: bigint }>>`
      SELECT COALESCE(SUM(p.amount), 0) as total
      FROM "Payment" p
      WHERE p.status = 'SUCCESS'
      AND p."paidAt" >= DATE_TRUNC('month', CURRENT_DATE)
      AND p."paidAt" < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
    `;

    const totalEnrollments = await prisma.enrollment.count({
      where: { status: 'ACTIVE' },
    });

    const pendingVetting = await prisma.user.count({
      where: {
        role: 'TUTOR',
        status: 'PENDING_VETTING',
      },
    });

    return {
      activeStudents: Number(activeStudents[0]?.count || 0),
      activeTutors: Number(activeTutors[0]?.count || 0),
      revenueThisMonth: Number(revenueThisMonth[0]?.total || 0),
      totalEnrollments,
      pendingVetting,
    };
  }
}
