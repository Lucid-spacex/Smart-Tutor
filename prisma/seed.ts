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
    : await bcrypt.hash('Admin123456!', 12);

  // Create or update Admin user
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: adminPassword,
    },
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









