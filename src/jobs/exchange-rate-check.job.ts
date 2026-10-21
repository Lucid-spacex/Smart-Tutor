import prisma from '../config/database';
import { logger } from '../config/logger';
import { NotificationCoreService } from '../modules/notifications/notification-core.service';
import { NotificationCategory, NotificationType } from '@prisma/client';

/**
 * Daily job: Exchange rate monitoring and drift alert
 * Fetches current USD→NGN rate, checks for pricing drift, and alerts admin if threshold exceeded
 */
export async function runExchangeRateCheck(): Promise<{ rateFetched: boolean; alertsCreated: number }> {
  const notificationCore = new NotificationCoreService();
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

    const data = await response.json() as any;
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
        await notificationCore.notify({
          recipientRole: 'ADMIN',
          type: 'PRICING_DRIFT_ALERT' as NotificationType,
          category: 'PRICING' as NotificationCategory,
          title: 'Pricing Drift Alert',
          body: `Pricing tier ${tier.gradeBandTier} is now ${driftPercentage.toFixed(1)}% off the current market exchange rate (${marketRate.toFixed(2)}). Current implied rate: ${impliedRate.toFixed(2)}. Consider reviewing pricing.`,
          entityType: 'PricingTier',
          entityId: tier.id,
          dedupeKey: `pricing-drift-tier-${tier.id}`,
        });

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
        await notificationCore.notify({
          recipientRole: 'ADMIN',
          type: 'PRICING_DRIFT_ALERT' as NotificationType,
          category: 'PRICING' as NotificationCategory,
          title: 'Pricing Drift Alert',
          body: `Enrollment override for student ${enrollment.student.fullName} (${enrollment.student.user.studentCode}) is now ${driftPercentage.toFixed(1)}% off the current market exchange rate (${marketRate.toFixed(2)}). Current implied rate: ${impliedRate.toFixed(2)}. Consider reviewing pricing.`,
          entityType: 'Enrollment',
          entityId: enrollment.id,
          dedupeKey: `pricing-drift-enrollment-${enrollment.id}`,
        });

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
