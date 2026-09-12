import prisma from '../../config/database';
import { logger } from '../../config/logger';

export class PricingService {
  /**
   * Map grade level string to grade band tier
   */
  private mapGradeLevelToTier(gradeLevel: string): 'PRESCHOOL_TO_G1' | 'G2_TO_G4' | 'G5_TO_G8' | 'G9_TO_G12' {
    const level = gradeLevel.toLowerCase();
    
    if (level.includes('preschool') || level.includes('kg') || level.includes('reception') || level.includes('nursery')) {
      return 'PRESCHOOL_TO_G1';
    }
    if (level.includes('grade 2') || level.includes('grade 3') || level.includes('grade 4') || level.includes('g2') || level.includes('g3') || level.includes('g4')) {
      return 'G2_TO_G4';
    }
    if (level.includes('grade 5') || level.includes('grade 6') || level.includes('grade 7') || level.includes('grade 8') || level.includes('g5') || level.includes('g6') || level.includes('g7') || level.includes('g8')) {
      return 'G5_TO_G8';
    }
    if (level.includes('grade 9') || level.includes('grade 10') || level.includes('grade 11') || level.includes('grade 12') || level.includes('g9') || level.includes('g10') || level.includes('g11') || level.includes('g12')) {
      return 'G9_TO_G12';
    }
    
    // Default to middle tier if unclear
    return 'G5_TO_G8';
  }

  /**
   * Get all pricing tiers with drift information
   */
  async getPricingTiersWithDrift() {
    const tiers = await prisma.pricingTier.findMany({
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
    });

    // Get current exchange rate
    const exchangeRate = await this.getCurrentExchangeRate();
    const marketRate = exchangeRate?.rate || 0;

    // Calculate drift for each tier
    const tiersWithDrift = tiers.map(tier => {
      const impliedRate = Number(tier.yearlyPriceNGN) / Number(tier.yearlyPriceUSD);
      const driftPercentage = marketRate > 0 
        ? Math.abs((impliedRate - marketRate) / marketRate * 100)
        : 0;
      
      return {
        ...tier,
        impliedRate,
        currentMarketRate: marketRate,
        driftPercentage: Math.round(driftPercentage * 100) / 100,
        needsReview: driftPercentage > 7, // 7% threshold
      };
    });

    return tiersWithDrift;
  }

  /**
   * Update a pricing tier
   */
  async updatePricingTier(gradeBandTier: string, data: { yearlyPriceNGN?: number; yearlyPriceUSD?: number }, adminId: string) {
    const tier = await prisma.pricingTier.findUnique({
      where: { gradeBandTier },
    });

    if (!tier) {
      throw new Error('Pricing tier not found');
    }

    return prisma.pricingTier.update({
      where: { gradeBandTier },
      data: {
        yearlyPriceNGN: data.yearlyPriceNGN !== undefined ? data.yearlyPriceNGN : tier.yearlyPriceNGN,
        yearlyPriceUSD: data.yearlyPriceUSD !== undefined ? data.yearlyPriceUSD : tier.yearlyPriceUSD,
        updatedBy: adminId,
      },
      include: {
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
   * Get enrollment pricing with source information
   */
  async getEnrollmentPricing(enrollmentId: string) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    const student = enrollment.student;
    
    // Resolution order: enrollment override -> tier default
    let priceSource: 'override' | 'tier default' = 'tier default';
    let yearlyPriceNGN: number;
    let yearlyPriceUSD: number;

    if (enrollment.yearlyPriceNGN && enrollment.yearlyPriceUSD) {
      // Use enrollment override
      yearlyPriceNGN = Number(enrollment.yearlyPriceNGN);
      yearlyPriceUSD = Number(enrollment.yearlyPriceUSD);
      priceSource = 'override';
    } else {
      // Use tier default
      const tier = await prisma.pricingTier.findUnique({
        where: { gradeBandTier: student.gradeBandTier },
      });

      if (!tier) {
        throw new Error(`No pricing tier configured for grade band: ${student.gradeBandTier}. Please contact admin to set up pricing.`);
      }

      yearlyPriceNGN = Number(tier.yearlyPriceNGN);
      yearlyPriceUSD = Number(tier.yearlyPriceUSD);
      priceSource = 'tier default';
    }

    return {
      enrollmentId: enrollment.id,
      priceSource,
      yearlyPriceNGN,
      yearlyPriceUSD,
      billingFrequency: enrollment.billingFrequency,
      sessionFrequency: enrollment.sessionFrequency,
      studentGradeBand: student.gradeBandTier,
    };
  }

  /**
   * Update enrollment pricing (set or clear override)
   */
  async updateEnrollmentPricing(enrollmentId: string, data: { yearlyPriceNGN?: number; yearlyPriceUSD?: number; billingFrequency?: string }) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    return prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        yearlyPriceNGN: data.yearlyPriceNGN !== undefined ? data.yearlyPriceNGN : enrollment.yearlyPriceNGN,
        yearlyPriceUSD: data.yearlyPriceUSD !== undefined ? data.yearlyPriceUSD : enrollment.yearlyPriceUSD,
        billingFrequency: data.billingFrequency || enrollment.billingFrequency,
      },
    });
  }

  /**
   * Get current exchange rate
   */
  async getCurrentExchangeRate() {
    const rate = await prisma.exchangeRate.findFirst({
      where: {
        fromCurrency: 'USD',
        toCurrency: 'NGN',
      },
      orderBy: {
        fetchedAt: 'desc',
      },
    });

    return rate;
  }

  /**
   * Fetch and store latest exchange rate
   */
  async fetchAndStoreExchangeRate() {
    try {
      // Using exchangerate-api.com free tier
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD/NGN');
      
      if (!response.ok) {
        throw new Error('Failed to fetch exchange rate');
      }

      const data = await response.json();
      const rate = data.rates?.NGN;

      if (!rate) {
        throw new Error('Exchange rate not found in response');
      }

      // Store the rate
      await prisma.exchangeRate.upsert({
        where: {
          fromCurrency_toCurrency: {
            fromCurrency: 'USD',
            toCurrency: 'NGN',
          },
        },
        update: {
          rate,
          fetchedAt: new Date(),
        },
        create: {
          fromCurrency: 'USD',
          toCurrency: 'NGN',
          rate,
          fetchedAt: new Date(),
        },
      });

      logger.info({ rate }, 'Exchange rate updated successfully');
      return rate;
    } catch (error) {
      logger.error({ error: 'Failed to fetch exchange rate' }, 'Exchange rate fetch error');
      // Fall back to last cached rate
      return this.getCurrentExchangeRate();
    }
  }

  /**
   * Calculate drift and create alerts if needed
   */
  async checkPricingDriftAndAlert(thresholdPercent: number = 7) {
    const exchangeRate = await this.getCurrentExchangeRate();
    const marketRate = exchangeRate?.rate || 0;

    if (marketRate === 0) {
      logger.warn('No exchange rate available for drift calculation');
      return;
    }

    // Check all pricing tiers
    const tiers = await prisma.pricingTier.findMany();
    let alertsCreated = 0;

    for (const tier of tiers) {
      const impliedRate = Number(tier.yearlyPriceNGN) / Number(tier.yearlyPriceUSD);
      const driftPercentage = Math.abs((impliedRate - marketRate) / marketRate * 100);

      if (driftPercentage > thresholdPercent) {
        // Create admin notification
        const admins = await prisma.user.findMany({
          where: { role: 'ADMIN' },
          select: { id: true },
        });

        for (const admin of admins) {
          await prisma.notification.create({
            data: {
              userId: admin.id,
              type: 'PRICING_DRIFT_ALERT',
              message: `Pricing tier ${tier.gradeBandTier} is ${driftPercentage.toFixed(1)}% off the current market exchange rate (${impliedRate.toFixed(2)} vs ${marketRate.toFixed(2)}). Consider reviewing pricing.`,
              relatedId: tier.id,
              isRead: false,
            },
          });
        }

        alertsCreated++;
        logger.warn(
          { tier: tier.gradeBandTier, driftPercentage, impliedRate, marketRate },
          'Pricing drift alert created'
        );
      }
    }

    // Check enrollments with overrides
    const enrollmentsWithOverrides = await prisma.enrollment.findMany({
      where: {
        yearlyPriceNGN: { not: null },
        yearlyPriceUSD: { not: null },
      },
      include: {
        student: true,
      },
    });

    for (const enrollment of enrollmentsWithOverrides) {
      const impliedRate = Number(enrollment.yearlyPriceNGN) / Number(enrollment.yearlyPriceUSD);
      const driftPercentage = Math.abs((impliedRate - marketRate) / marketRate * 100);

      if (driftPercentage > thresholdPercent) {
        const admins = await prisma.user.findMany({
          where: { role: 'ADMIN' },
          select: { id: true },
        });

        for (const admin of admins) {
          await prisma.notification.create({
            data: {
              userId: admin.id,
              type: 'PRICING_DRIFT_ALERT',
              message: `Enrollment ${enrollment.id} for student ${enrollment.student.fullName} has custom pricing that is ${driftPercentage.toFixed(1)}% off market rate. Consider reviewing.`,
              relatedId: enrollment.id,
              isRead: false,
            },
          });
        }

        alertsCreated++;
        logger.warn(
          { enrollmentId: enrollment.id, driftPercentage, impliedRate, marketRate },
          'Enrollment pricing drift alert created'
        );
      }
    }

    logger.info({ tiersChecked: tiers.length, enrollmentsChecked: enrollmentsWithOverrides.length, alertsCreated }, 'Pricing drift check completed');
    return { alertsCreated };
  }
}