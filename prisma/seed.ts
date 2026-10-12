import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  // SECURITY: Refuse to run in production unless explicitly forced
  if (process.env.NODE_ENV === 'production' && process.env.FORCE_SEED !== 'true') {
    console.error('❌ SECURITY: Seed script cannot run in production without FORCE_SEED=true');
    console.error('   In production, use ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD environment variables instead');
    process.exit(1);
  }

  console.log('🌱 Starting database seed...');

  // SECURITY: Use environment variables for admin credentials in production
  const adminEmail = process.env.ADMIN_SEED_EMAIL || 'admin@smarttutor.com';
  const adminPassword = process.env.ADMIN_SEED_PASSWORD
    ? await bcrypt.hash(process.env.ADMIN_SEED_PASSWORD, 12)
    : await bcrypt.hash('admin123456!', 12);

  // SECURITY: Only create demo parent/tutor/student accounts in development
  // In production, these should never be created to avoid default credential exposure
  const parentPassword = process.env.NODE_ENV === 'production'
    ? await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12)
    : await bcrypt.hash('parent123456!', 12);
  const tutorPassword = process.env.NODE_ENV === 'production'
    ? await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12)
    : await bcrypt.hash('tutor123456!', 12);
  const studentPassword = process.env.NODE_ENV === 'production'
    ? await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12)
    : await bcrypt.hash('student123456!', 12);

  // 1. Create Admin user
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

  // 2. Create Parent user (only in development)
  let parent;
  if (process.env.NODE_ENV !== 'production') {
    parent = await prisma.user.upsert({
      where: { email: 'parent@smarttutor.com' },
      update: {},
      create: {
        fullName: 'Jane Parent',
        email: 'parent@smarttutor.com',
        phone: '+1234567891',
        passwordHash: parentPassword,
        role: 'PARENT',
        status: 'ACTIVE',
        timezone: 'America/New_York',
      },
    });
    console.log('✅ Parent user created:', parent.email);
  } else {
    console.log('⏭️  Skipping parent account creation in production');
  }

  // 3. Create Tutor user (only in development)
  let tutor;
  if (process.env.NODE_ENV !== 'production') {
    tutor = await prisma.user.upsert({
      where: { email: 'tutor@smarttutor.com' },
      update: {},
      create: {
        fullName: 'John Tutor',
        email: 'tutor@smarttutor.com',
        phone: '+1234567892',
        passwordHash: tutorPassword,
        role: 'TUTOR',
        status: 'APPROVED',
        timezone: 'Africa/Lagos',
      },
    });
    console.log('✅ Tutor user created:', tutor.email);
  } else {
    console.log('⏭️  Skipping tutor account creation in production');
  }

  // 4. Create Tutor profile (only in development)
  if (tutor) {
    await prisma.tutorProfile.upsert({
      where: { userId: tutor.id },
      update: {},
      create: {
        userId: tutor.id,
        subjects: ['Mathematics', 'Physics', 'Chemistry'],
        bio: 'Experienced tutor with 5+ years of teaching experience in STEM subjects.',
        credentialsUrl: 'https://example.com/credentials.pdf',
        vettingStatus: 'APPROVED',
        hourlyRate: 50.00,
        availability: {
          monday: ['9:00-12:00', '14:00-17:00'],
          tuesday: ['9:00-12:00', '14:00-17:00'],
          wednesday: ['9:00-12:00', '14:00-17:00'],
          thursday: ['9:00-12:00', '14:00-17:00'],
          friday: ['9:00-12:00'],
        },
      },
    });
    console.log('✅ Tutor profile created for:', tutor.email);
  }

  // 5. Create Subjects with per-grade pricing
  const mathSubject = await prisma.subject.upsert({
    where: { name: 'Mathematics' },
    update: {},
    create: {
      name: 'Mathematics',
      description: 'Core mathematics curriculum',
      category: 'CORE',
      isActive: true,
    },
  });

  const physicsSubject = await prisma.subject.upsert({
    where: { name: 'Physics' },
    update: {},
    create: {
      name: 'Physics',
      description: 'Core physics curriculum',
      category: 'CORE',
      isActive: true,
    },
  });

  const codingSubject = await prisma.subject.upsert({
    where: { name: 'Computer Programming' },
    update: {},
    create: {
      name: 'Computer Programming',
      description: 'Computer programming and coding skills',
      category: 'ENRICHMENT',
      isActive: true,
    },
  });

  // Create SubjectPrice rows for Mathematics (all bands)
  const mathPrices = [
    { gradeBandTier: 'PRESCHOOL_TO_G1' as const, yearlyPriceNGN: 150000, yearlyPriceUSD: 200 },
    { gradeBandTier: 'G2_TO_G4' as const, yearlyPriceNGN: 200000, yearlyPriceUSD: 250 },
    { gradeBandTier: 'G5_TO_G8' as const, yearlyPriceNGN: 250000, yearlyPriceUSD: 300 },
    { gradeBandTier: 'G9_TO_G12' as const, yearlyPriceNGN: 300000, yearlyPriceUSD: 400 },
  ];

  for (const price of mathPrices) {
    await prisma.subjectPrice.upsert({
      where: {
        subjectId_gradeBandTier: {
          subjectId: mathSubject.id,
          gradeBandTier: price.gradeBandTier,
        },
      },
      update: {
        yearlyPriceNGN: price.yearlyPriceNGN,
        yearlyPriceUSD: price.yearlyPriceUSD,
        updatedBy: admin.id,
      },
      create: {
        subjectId: mathSubject.id,
        gradeBandTier: price.gradeBandTier,
        yearlyPriceNGN: price.yearlyPriceNGN,
        yearlyPriceUSD: price.yearlyPriceUSD,
        updatedBy: admin.id,
      },
    });
  }

  // Create SubjectPrice rows for Physics (G9_TO_G12 only)
  await prisma.subjectPrice.upsert({
    where: {
      subjectId_gradeBandTier: {
        subjectId: physicsSubject.id,
        gradeBandTier: 'G9_TO_G12',
      },
    },
    update: {
      yearlyPriceNGN: 300000,
      yearlyPriceUSD: 400,
      updatedBy: admin.id,
    },
    create: {
      subjectId: physicsSubject.id,
      gradeBandTier: 'G9_TO_G12',
      yearlyPriceNGN: 300000,
      yearlyPriceUSD: 400,
      updatedBy: admin.id,
    },
  });

  // Create SubjectPrice rows for Computer Programming (G5_TO_G8 and G9_TO_G12)
  const codingPrices = [
    { gradeBandTier: 'G5_TO_G8' as const, yearlyPriceNGN: 250000, yearlyPriceUSD: 300 },
    { gradeBandTier: 'G9_TO_G12' as const, yearlyPriceNGN: 300000, yearlyPriceUSD: 400 },
  ];

  for (const price of codingPrices) {
    await prisma.subjectPrice.upsert({
      where: {
        subjectId_gradeBandTier: {
          subjectId: codingSubject.id,
          gradeBandTier: price.gradeBandTier,
        },
      },
      update: {
        yearlyPriceNGN: price.yearlyPriceNGN,
        yearlyPriceUSD: price.yearlyPriceUSD,
        updatedBy: admin.id,
      },
      create: {
        subjectId: codingSubject.id,
        gradeBandTier: price.gradeBandTier,
        yearlyPriceNGN: price.yearlyPriceNGN,
        yearlyPriceUSD: price.yearlyPriceUSD,
        updatedBy: admin.id,
      },
    });
  }

  console.log('✅ Subjects created with per-grade pricing (Math, Physics, Programming)');

  // 5.5. Create Default Pricing Tiers for each grade band
  const pricingTiers = [
    {
      gradeBandTier: 'PRESCHOOL_TO_G1',
      yearlyPriceNGN: 150000, // NGN 150,000 per year
      yearlyPriceUSD: 200,    // $200 per year
    },
    {
      gradeBandTier: 'G2_TO_G4',
      yearlyPriceNGN: 200000, // NGN 200,000 per year
      yearlyPriceUSD: 250,    // $250 per year
    },
    {
      gradeBandTier: 'G5_TO_G8',
      yearlyPriceNGN: 250000, // NGN 250,000 per year
      yearlyPriceUSD: 300,    // $300 per year
    },
    {
      gradeBandTier: 'G9_TO_G12',
      yearlyPriceNGN: 300000, // NGN 300,000 per year
      yearlyPriceUSD: 400,    // $400 per year
    },
  ];

  for (const tier of pricingTiers) {
    await prisma.pricingTier.upsert({
      where: { gradeBandTier: tier.gradeBandTier as any },
      update: {
        yearlyPriceNGN: tier.yearlyPriceNGN,
        yearlyPriceUSD: tier.yearlyPriceUSD,
        updatedBy: admin.id,
      },
      create: {
        gradeBandTier: tier.gradeBandTier as any,
        yearlyPriceNGN: tier.yearlyPriceNGN,
        yearlyPriceUSD: tier.yearlyPriceUSD,
        updatedBy: admin.id,
      },
    });
  }
  console.log('✅ Default pricing tiers created for all grade bands');

  // 6. Create Student User and Profile (only in development)
  let student;
  if (parent && process.env.NODE_ENV !== 'production') {
    const studentUser = await prisma.user.upsert({
      where: { studentCode: 'STUDENT01' },
      update: {},
      create: {
        fullName: 'Tommy Student',
        studentCode: 'STUDENT01',
        passwordHash: studentPassword,
        role: 'STUDENT',
        status: 'ACTIVE',
        parentId: parent.id,
      },
    });

    student = await prisma.student.upsert({
      where: { userId: studentUser.id },
      update: {},
      create: {
        parentId: parent.id,
        userId: studentUser.id,
        fullName: 'Tommy Student',
        dateOfBirth: new Date('2012-05-15'),
        actualGrade: 'GRADE_5' as any,
        gradeLevel: '5th Grade',
        gradeBandTier: 'G5_TO_G8' as any,
        school: 'Lincoln Elementary School',
        notes: 'Enjoys math, needs help with word problems.',
      },
    });
    console.log('✅ Student account & profile created:', student.fullName, 'Code:', studentUser.studentCode);

    // 7. Create Enrollment
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        studentId: student.id,
        subjectId: mathSubject.id,
      },
    });

    let enrollment = existingEnrollment;
    if (!enrollment) {
      enrollment = await prisma.enrollment.create({
        data: {
          studentId: student.id,
          subjectId: mathSubject.id,
          tutorId: tutor.id,
          sessionFrequency: 'TWICE_WEEKLY' as any,
          availableDays: ['MON', 'THU'],
          preferredStartHour: 15,
          preferredEndHour: 17,
          billingFrequency: 'MONTHLY',
          yearlyPrice: 1200.00,
          status: 'ACTIVE',
          startDate: new Date(),
        },
      });
    }
    console.log('✅ Enrollment created with yearlyPrice $1200.00');

    // 8. Create Session with SessionParticipant
    const session = await prisma.session.create({
      data: {
        tutorId: tutor.id,
        createdBy: admin.id,
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        durationMinutes: 60,
        zoomLink: 'https://zoom.us/j/123456789',
        status: 'SCHEDULED',
        participants: {
          create: {
            enrollmentId: enrollment.id,
          },
        },
      },
    });
    console.log('✅ Scheduled session created with participant');

    // 9. Create Sample Completed Payment
    await prisma.payment.create({
      data: {
        parentId: parent.id,
        enrollmentId: enrollment.id,
        amount: 100.00, // Monthly payment ($1200 / 12)
        currency: 'USD',
        provider: 'PAYSTACK',
        providerReference: 'pay_demo_reference_123',
        status: 'SUCCESS',
        paidAt: new Date(),
      },
    });
    console.log('✅ Sample payment record created ($100.00)');

    // 10. Create Sample Progress Report
    await prisma.progressReport.create({
      data: {
        enrollmentId: enrollment.id,
        period: 'Initial Assessment',
        summary: 'Tommy is showing great engagement with foundational concepts.',
        strengths: 'Analytical problem solving, quick grasp of arithmetic rules.',
        areasToImprove: 'Multi-step word problems.',
        createdBy: tutor.id,
      },
    });
    console.log('✅ Sample progress report created');
  } else {
    console.log('⏭️  Skipping demo data (student, enrollment, session, payment, progress report) in production');
  }

  console.log('\n🎉 Database seed completed successfully!');
  
  // SECURITY: Never print passwords in production
  if (process.env.NODE_ENV !== 'production') {
    console.log('\n📋 Demo Credentials (development only):');
    console.log('   Admin:   admin@smarttutor.com / admin123456!');
    console.log('   Parent:  parent@smarttutor.com / parent123456!');
    console.log('   Tutor:   tutor@smarttutor.com / tutor123456!');
    console.log('   Student: Parent Email: parent@smarttutor.com | Student Code: STUDENT01 | Password: student123456!');
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