// Fail fast if required database variables are missing
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in .env.test. Tests cannot run without a test database.');
}
if (!process.env.DIRECT_URL) {
  throw new Error('DIRECT_URL is not set in .env.test. Tests cannot run without a direct database connection for migrations.');
}

process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'super-secret-access-token-key-min-32-chars-long';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-token-key-min-32-chars-long';
process.env.PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_mock_secret_key';
process.env.NODE_ENV = 'test';

import { PrismaClient } from '@prisma/client';

// Connection retry logic for Neon wake-up
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;

async function connectWithRetry(): Promise<PrismaClient> {
  const prisma = new PrismaClient();
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await prisma.$connect();
      console.log(`Database connected on attempt ${attempt}`);
      return prisma;
    } catch (error: any) {
      console.error(`Connection attempt ${attempt} failed:`, error.message);
      if (attempt === MAX_RETRIES) {
        throw new Error(`Failed to connect to database after ${MAX_RETRIES} attempts. Last error: ${error.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
  throw new Error('Connection retry logic failed unexpectedly');
}

let prisma: PrismaClient;

beforeAll(async () => {
  prisma = await connectWithRetry();
});

afterAll(async () => {
  if (prisma) {
    await prisma.$disconnect();
  }
});

export { prisma };

// Clear database before each test (optional)
beforeEach(async () => {
  // Optionally clean up test data
  // await prisma.payment.deleteMany();
  // await prisma.session.deleteMany();
  // await prisma.enrollment.deleteMany();
  // await prisma.student.deleteMany();
  // await prisma.tutorProfile.deleteMany();
  // await prisma.refreshToken.deleteMany();
  // await prisma.user.deleteMany();
});
