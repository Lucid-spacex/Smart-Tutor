import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Setup test database connection if needed
  // For now, we'll use the same database
});

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
