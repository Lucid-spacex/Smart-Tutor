import prisma from '../config/database';
import { logger } from '../config/logger';
import { NotificationsService } from '../modules/notifications/notifications.service';

/**
 * Daily job: Exchange rate monitoring and drift alert
 * Fetches current USD→NGN rate, checks for pricing drift, and alerts admin if threshold exceeded
 */
export async function runExchangeRateCheck(): Promise<{ rateFetched: boolean; alertsCreated: number }> {
  const notificationsService = new NotificationsService();
  const driftThreshold = parseFloat(process.env.PRICING_DRIFT_THRESHOLD_PERCENT || '7');
  
  try {
    // Fetch current exchange rate from exchangerate-api.com
    const apiKey = process.env.EXCHANGERATE_API_KEY;
    if (!apiKey) {
      logger.warn('EXCHANGERATE_API_KEY not configured, skipping exchange rate check');
      return { rateFetched: false, alertsCreated: 0 };
    }

    const response = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`);
    if (!response.ok) {
      throw new Error(`Exchange rate API failed: ${response.status}`);
    }

    const data = await response.json();
    const marketRate = data.conversion_rates?.NGN;
    
    if (!marketRate) {
      throw new Error('No NGN rate found in API response');
    }

    // Store the new rate
    await prisma.exchangeRate.upsert({
      where: {
        fromCurrency_toCurrency: {
          fromCurrency: 'USD',
          toCurrency: 'NGN',
        },
      },
      update: {
        rate: marketRate,
        fetchedAt: new Date(),
      },
      create: {
        fromCurrency: 'USD',
        toCurrency: 'NGN',
        rate: marketRate,
        fetchedAt: new Date(),
      },
    });

    logger.info({ marketRate }, 'Exchange rate fetched and stored');

    // Check all pricing tiers for drift
    const tiers = await prisma.pricingTier.findMany();
    let alertsCreated = 0;

    for (const tier of tiers) {
      const impliedRate = Number(tier.yearlyPriceNGN) / Number(tier.yearlyPriceUSD);
      const driftPercentage = Math.abs((impliedRate - marketRate) / marketRate) * 100;

      if (driftPercentage > driftThreshold) {
        // Find admin users
        const admins = await prisma.user.findMany({
          where: { role: 'ADMIN' },
        });

        for (const admin of admins) {
          await notificationsService.createNotification(
            admin.id,
            'PRICING_DRIFT_ALERT',
            `Pricing tier ${tier.gradeBandTier} is now ${driftPercentage.toFixed(1)}% off the current market exchange rate (${marketRate.toFixed(2)}). Current implied rate: ${impliedRate.toFixed(2)}. Consider reviewing pricing.`,
            tier.id,
            true // Send email notification
          );
        }

        alertsCreated++;
        logger.warn({ gradeBandTier: tier.gradeBandTier, driftPercentage }, 'Pricing drift alert created');
      }
    }

    // Check enrollments with overrides for drift
    const enrollmentsWithOverrides = await prisma.enrollment.findMany({
      where: {
        yearlyPriceNGN: { not: null },
        yearlyPriceUSD: { not: null },
      },
      include: {
        student: {
          include: {
            user: true,
          },
        },
      },
    });

    for (const enrollment of enrollmentsWithOverrides) {
      const impliedRate = Number(enrollment.yearlyPriceNGN) / Number(enrollment.yearlyPriceUSD);
      const driftPercentage = Math.abs((impliedRate - marketRate) / marketRate) * 100;

      if (driftPercentage > driftThreshold) {
        const admins = await prisma.user.findMany({
          where: { role: 'ADMIN' },
        });

        for (const admin of admins) {
          await notificationsService.createNotification(
            admin.id,
            'PRICING_DRIFT_ALERT',
            `Enrollment override for student ${enrollment.student.fullName} (${enrollment.student.user.studentCode}) is now ${driftPercentage.toFixed(1)}% off the current market exchange rate (${marketRate.toFixed(2)}). Current implied rate: ${impliedRate.toFixed(2)}. Consider reviewing pricing.`,
            enrollment.id,
            true
          );
        }

        alertsCreated++;
        logger.warn({ enrollmentId: enrollment.id, studentCode: enrollment.student.user.studentCode, driftPercentage }, 'Enrollment pricing drift alert created');
      }
    }

    logger.info({ rateFetched: true, alertsCreated }, 'Exchange rate check completed');
    return { rateFetched: true, alertsCreated };
  } catch (error) {
    logger.error({ error }, 'Exchange rate check failed');
    // Fall back to last successfully cached rate
    const lastRate = await prisma.exchangeRate.findFirst({
      where: {
        fromCurrency: 'USD',
        toCurrency: 'NGN',
      },
      orderBy: {
        fetchedAt: 'desc',
      },
    });

    if (lastRate) {
      logger.info({ lastRate: lastRate.rate, fetchedAt: lastRate.fetchedAt }, 'Using cached exchange rate');
    } else {
      logger.error('No cached exchange rate available');
    }

    return { rateFetched: false, alertsCreated: 0 };
  }
}
