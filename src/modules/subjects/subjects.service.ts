import prisma from '../../config/database';
import { logger } from '../../config/logger';

export class SubjectsService {
  async getSubjects(filters?: { category?: string; gradeBand?: string }) {
    const where: any = {};

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.gradeBand) {
      where.gradeBand = filters.gradeBand;
    }

    return prisma.subject.findMany({
      where,
      select: {
        id: true,
        name: true,
        gradeBand: true,
        category: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Get all subjects with pricing (admin view)
   */
  async getAdminSubjects(filters?: { includeInactive?: boolean; category?: string }) {
    const where: any = {};

    if (filters?.includeInactive !== true) {
      where.isActive = true;
    }

    if (filters?.category) {
      where.category = filters.category;
    }

    const subjects = await prisma.subject.findMany({
      where,
      include: {
        subjectPrices: {
          include: {
            updater: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
          orderBy: {
            gradeBandTier: 'asc',
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Add drift information for each price
    const exchangeRate = await this.getCurrentExchangeRate();
    const marketRate = Number(exchangeRate?.rate || 0);

    const subjectsWithDrift = subjects.map(subject => ({
      ...subject,
      subjectPrices: subject.subjectPrices.map(price => {
        const impliedRate = Number(price.yearlyPriceNGN) / Number(price.yearlyPriceUSD);
        const driftPercentage = marketRate > 0
          ? Math.abs((impliedRate - marketRate) / marketRate * 100)
          : 0;

        return {
          ...price,
          impliedRate,
          marketRate,
          driftPercentage: Math.round(driftPercentage * 100) / 100,
          needsReview: driftPercentage > 7,
        };
      }),
    }));

    return subjectsWithDrift;
  }

  /**
   * Create a new subject with per-grade pricing
   */
  async createSubject(data: {
    name: string;
    description?: string;
    category: string;
    prices: Array<{
      gradeBandTier: 'PRESCHOOL_TO_G1' | 'G2_TO_G4' | 'G5_TO_G8' | 'G9_TO_G12';
      yearlyPriceNGN: number;
      yearlyPriceUSD: number;
    }>;
  }, adminId: string) {
    if (!data.prices || data.prices.length === 0) {
      throw new Error('At least one grade band price is required');
    }

    return prisma.subject.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category as 'CORE' | 'ENRICHMENT' | 'TEST_PREP',
        subjectPrices: {
          create: data.prices.map(price => ({
            gradeBandTier: price.gradeBandTier,
            yearlyPriceNGN: price.yearlyPriceNGN,
            yearlyPriceUSD: price.yearlyPriceUSD,
            updatedBy: adminId,
          })),
        },
      },
      include: {
        subjectPrices: true,
      },
    });
  }

  /**
   * Update subject metadata
   */
  async updateSubject(subjectId: string, data: {
    name?: string;
    description?: string;
    category?: string;
    isActive?: boolean;
  }) {
    const updateData: any = {
      name: data.name,
      description: data.description,
      isActive: data.isActive,
    };

    if (data.category) {
      updateData.category = data.category as 'CORE' | 'ENRICHMENT' | 'TEST_PREP';
    }

    return prisma.subject.update({
      where: { id: subjectId },
      data: updateData,
    });
  }

  /**
   * Update or create a subject price for a specific grade band
   */
  async upsertSubjectPrice(
    subjectId: string,
    gradeBandTier: 'PRESCHOOL_TO_G1' | 'G2_TO_G4' | 'G5_TO_G8' | 'G9_TO_G12',
    data: {
      yearlyPriceNGN: number;
      yearlyPriceUSD: number;
      isActive?: boolean;
      note?: string;
    },
    adminId: string
  ) {
    // Get existing price for logging
    const existing = await prisma.subjectPrice.findUnique({
      where: {
        subjectId_gradeBandTier: {
          subjectId,
          gradeBandTier,
        },
      },
    });

    // Create price change log
    if (existing) {
      await prisma.priceChangeLog.create({
        data: {
          targetType: 'SUBJECT_PRICE',
          targetId: existing.id,
          changedBy: adminId,
          oldNGN: existing.yearlyPriceNGN,
          oldUSD: existing.yearlyPriceUSD,
          newNGN: data.yearlyPriceNGN,
          newUSD: data.yearlyPriceUSD,
          note: data.note,
        },
      });
    }

    // Upsert the price
    return prisma.subjectPrice.upsert({
      where: {
        subjectId_gradeBandTier: {
          subjectId,
          gradeBandTier,
        },
      },
      create: {
        subjectId,
        gradeBandTier,
        yearlyPriceNGN: data.yearlyPriceNGN,
        yearlyPriceUSD: data.yearlyPriceUSD,
        isActive: data.isActive ?? true,
        updatedBy: adminId,
      },
      update: {
        yearlyPriceNGN: data.yearlyPriceNGN,
        yearlyPriceUSD: data.yearlyPriceUSD,
        isActive: data.isActive,
        updatedBy: adminId,
      },
      include: {
        subject: true,
        updater: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });
  }

  /**
   * Delete a subject (soft delete if has enrollments)
   */
  async deleteSubject(subjectId: string) {
    const enrollmentCount = await prisma.enrollment.count({
      where: { subjectId },
    });

    if (enrollmentCount > 0) {
      // Soft delete
      return prisma.subject.update({
        where: { id: subjectId },
        data: { isActive: false },
      });
    }

    // Hard delete
    return prisma.subject.delete({
      where: { id: subjectId },
    });
  }

  /**
   * Get subjects for parents/students (active only, with active prices for their grade band)
   */
  getPublicSubjects(filters?: { gradeBandTier?: string; category?: string }, userRole?: string) {
    const where: any = {
      isActive: true,
    };

    if (filters?.category) {
      where.category = filters.category;
    }

    const includePrices = userRole === 'PARENT' || userRole === 'ADMIN';

    const include: any = {};
    if (includePrices) {
      include.subjectPrices = {
        where: {
          isActive: true,
          ...(filters?.gradeBandTier && { gradeBandTier: filters.gradeBandTier as any }),
        },
      };
    }

    return prisma.subject.findMany({
      where,
      include,
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Get pricing quote for a student's subjects
   */
  async getPricingQuote(studentId: string, subjectIds: string[], parentId: string) {
    // Verify parent owns the student
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: true,
      },
    });

    if (!student || student.parentId !== parentId) {
      throw new Error('Student not found or not owned by parent');
    }

    const subjects = await prisma.subject.findMany({
      where: {
        id: { in: subjectIds },
        isActive: true,
      },
      include: {
        subjectPrices: {
          where: {
            gradeBandTier: student.gradeBandTier,
            isActive: true,
          },
        },
      },
    });

    const quotes = subjects.map(subject => {
      const price = subject.subjectPrices[0];

      if (!price) {
        throw new Error(`No price configured for ${subject.name} at ${student.gradeBandTier}`);
      }

      return {
        subjectId: subject.id,
        subjectName: subject.name,
        category: subject.category,
        yearlyPriceNGN: Number(price.yearlyPriceNGN),
        yearlyPriceUSD: Number(price.yearlyPriceUSD),
        source: 'subject_price',
      };
    });

    const totalNGN = quotes.reduce((sum, q) => sum + q.yearlyPriceNGN, 0);
    const totalUSD = quotes.reduce((sum, q) => sum + q.yearlyPriceUSD, 0);

    return {
      studentId,
      studentName: student.fullName,
      gradeBandTier: student.gradeBandTier,
      quotes,
      totals: {
        yearlyPriceNGN: totalNGN,
        yearlyPriceUSD: totalUSD,
      },
    };
  }

  /**
   * Resolve effective price for an enrollment
   * Order: override -> subject price -> fail
   */
  async resolveEnrollmentPrice(enrollmentId: string) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: true,
        subject: true,
      },
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    // Check for override first
    if (enrollment.yearlyPriceNGN && enrollment.yearlyPriceUSD) {
      return {
        yearlyPriceNGN: Number(enrollment.yearlyPriceNGN),
        yearlyPriceUSD: Number(enrollment.yearlyPriceUSD),
        source: 'override',
      };
    }

    // Get subject price for student's grade band
    const subjectPrice = await prisma.subjectPrice.findUnique({
      where: {
        subjectId_gradeBandTier: {
          subjectId: enrollment.subjectId,
          gradeBandTier: enrollment.student.gradeBandTier,
        },
      },
    });

    if (!subjectPrice || !subjectPrice.isActive) {
      throw new Error(`No price configured for ${enrollment.subject.name} at ${enrollment.student.gradeBandTier}`);
    }

    return {
      yearlyPriceNGN: Number(subjectPrice.yearlyPriceNGN),
      yearlyPriceUSD: Number(subjectPrice.yearlyPriceUSD),
      source: 'subject_price',
    };
  }

  private async getCurrentExchangeRate() {
    return prisma.exchangeRate.findFirst({
      where: {
        fromCurrency: 'NGN',
        toCurrency: 'USD',
      },
      orderBy: {
        fetchedAt: 'desc',
      },
    });
  }
}
