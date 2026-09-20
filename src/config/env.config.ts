import { z } from 'zod';

// Environment variable validation schema
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Paystack
  PAYSTACK_SECRET_KEY: z.string().optional(),
  PAYSTACK_PUBLIC_KEY: z.string().optional(),

  // Frontend
  FRONTEND_URL: z.string().optional(),

  // Server
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ALLOWED_ORIGINS: z.string().optional(),

  // Email (Resend)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Smart-Tutor <noreply@smarttutor.com>'),

  // Exchange Rate API
  EXCHANGERATE_API_KEY: z.string().optional(),
  PRICING_DRIFT_THRESHOLD_PERCENT: z.string().default('7'),

  // Zoom
  ZOOM_ACCOUNT_ID: z.string().optional(),
  ZOOM_CLIENT_ID: z.string().optional(),
  ZOOM_CLIENT_SECRET: z.string().optional(),
  ZOOM_WEBHOOK_SECRET: z.string().optional(),
});

// Validate and parse environment variables
const validateEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(
        `Environment variable validation failed:\n${missingVars.join('\n')}\n\nPlease check your .env file.`
      );
    }
    throw error;
  }
};

// Export validated config
export const config = validateEnv();

// Export typed config for use throughout the app
export type Config = z.infer<typeof envSchema>;
