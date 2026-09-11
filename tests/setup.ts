import dotenv from 'dotenv';
import path from 'path';

// Load environment variables for test environment
dotenv.config({ path: path.resolve(__dirname, '../.env') });

process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'super-secret-access-token-key-min-32-chars-long';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-token-key-min-32-chars-long';
process.env.PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_mock_secret_key';
process.env.NODE_ENV = 'test';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

afterAll(async () => {
  await prisma.$disconnect();
});

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
