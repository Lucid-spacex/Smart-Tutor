import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed (admin only)...');

  // Use environment variables for admin credentials
  const adminEmail = process.env.ADMIN_SEED_EMAIL || 'admin@smarttutor.com';
  const adminPassword = process.env.ADMIN_SEED_PASSWORD
    ? await bcrypt.hash(process.env.ADMIN_SEED_PASSWORD, 12)
    : await bcrypt.hash('admin123456!', 12);

  // Create Admin user
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      fullName: 'Admin User',
      email: adminEmail,
      phone: '+1234567890',
      passwordHash: adminPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
      timezone: 'UTC',
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // One-time backfill: Create DRAFT TutorApplication for any tutor user who lacks one
  console.log('\n🔄 Running backfill for missing tutor applications...');
  const tutorsWithoutApplications = await prisma.user.findMany({
    where: {
      role: 'TUTOR',
      tutorApplication: null,
    },
  });

  for (const tutor of tutorsWithoutApplications) {
    await prisma.tutorApplication.create({
      data: {
        userId: tutor.id,
        status: 'DRAFT',
      },
    });
    console.log(`✅ Created DRAFT application for tutor: ${tutor.email}`);
  }

  if (tutorsWithoutApplications.length === 0) {
    console.log('ℹ️  No tutors without applications found.');
  } else {
    console.log(`✅ Backfill completed: ${tutorsWithoutApplications.length} tutor applications created.`);
  }

  console.log('\n🎉 Database seed completed successfully!');

  console.log('\n📋 Admin Credentials:');
  console.log('   Email:', adminEmail);
  if (!process.env.ADMIN_SEED_PASSWORD) {
    console.log('   Password: admin123456! (default - change immediately)');
  } else {
    console.log('   Password: (from ADMIN_SEED_PASSWORD environment variable)');
  }
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });