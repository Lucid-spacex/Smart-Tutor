import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Hash passwords
  const adminPassword = await bcrypt.hash('admin123', 10);
  const parentPassword = await bcrypt.hash('parent123', 10);
  const tutorPassword = await bcrypt.hash('tutor123', 10);

  // Create Admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@smarttutor.com' },
    update: {},
    create: {
      fullName: 'Admin User',
      email: 'admin@smarttutor.com',
      phone: '+1234567890',
      passwordHash: adminPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Create Parent user
  const parent = await prisma.user.upsert({
    where: { email: 'parent@smarttutor.com' },
    update: {},
    create: {
      fullName: 'Jane Parent',
      email: 'parent@smarttutor.com',
      phone: '+1234567891',
      passwordHash: parentPassword,
      role: 'PARENT',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Parent user created:', parent.email);

  // Create Tutor user
  const tutor = await prisma.user.upsert({
    where: { email: 'tutor@smarttutor.com' },
    update: {},
    create: {
      fullName: 'John Tutor',
      email: 'tutor@smarttutor.com',
      phone: '+1234567892',
      passwordHash: tutorPassword,
      role: 'TUTOR',
      status: 'APPROVED',
    },
  });
  console.log('✅ Tutor user created:', tutor.email);

  // Create Tutor profile
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

  // Create Subjects
  const mathSubject = await prisma.subject.upsert({
    where: { name: 'Mathematics' },
    update: {},
    create: {
      name: 'Mathematics',
      gradeBand: 'K-12',
      category: 'CORE',
    },
  });
  console.log('✅ Subject created:', mathSubject.name);

  const physicsSubject = await prisma.subject.upsert({
    where: { name: 'Physics' },
    update: {},
    create: {
      name: 'Physics',
      gradeBand: '9-12',
      category: 'CORE',
    },
  });
  console.log('✅ Subject created:', physicsSubject.name);

  const codingSubject = await prisma.subject.upsert({
    where: { name: 'Computer Programming' },
    update: {},
    create: {
      name: 'Computer Programming',
      gradeBand: '6-12',
      category: 'ENRICHMENT',
    },
  });
  console.log('✅ Subject created:', codingSubject.name);

  // Create Student
  const student = await prisma.student.upsert({
    where: { id: 'demo-student-id' },
    update: {},
    create: {
      id: 'demo-student-id',
      parentId: parent.id,
      fullName: 'Tommy Student',
      dateOfBirth: new Date('2012-05-15'),
      gradeLevel: '5th Grade',
      school: 'Lincoln Elementary School',
      notes: 'Enjoys math, needs help with reading comprehension.',
    },
  });
  console.log('✅ Student created:', student.fullName);

  // Create Enrollment
  const enrollment = await prisma.enrollment.upsert({
    where: { id: 'demo-enrollment-id' },
    update: {},
    create: {
      id: 'demo-enrollment-id',
      studentId: student.id,
      subjectId: mathSubject.id,
      tutorId: tutor.id,
      frequency: 'WEEKLY',
      status: 'ACTIVE',
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-06-15'),
    },
  });
  console.log('✅ Enrollment created for student:', student.fullName);

  // Create a sample session
  await prisma.session.create({
    data: {
      enrollmentId: enrollment.id,
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      durationMinutes: 60,
      zoomLink: 'https://zoom.us/j/123456789',
      status: 'SCHEDULED',
    },
  });
  console.log('✅ Sample session created');

  // Create a sample payment
  await prisma.payment.create({
    data: {
      parentId: parent.id,
      enrollmentId: enrollment.id,
      amount: 200.00,
      currency: 'USD',
      provider: 'PAYSTACK',
      providerReference: 'pay_demo_reference_123',
      status: 'SUCCESS',
      paidAt: new Date(),
    },
  });
  console.log('✅ Sample payment created');

  // Create a sample progress report
  await prisma.progressReport.create({
    data: {
      enrollmentId: enrollment.id,
      period: 'January 2024',
      summary: 'Tommy has shown great improvement in algebra concepts this month.',
      strengths: 'Strong problem-solving skills, excellent participation in class.',
      areasToImprove: 'Could benefit from more practice with word problems.',
      createdBy: tutor.id,
    },
  });
  console.log('✅ Sample progress report created');

  console.log('🎉 Database seed completed successfully!');
  console.log('\n📋 Demo Credentials:');
  console.log('   Admin: admin@smarttutor.com / admin123');
  console.log('   Parent: parent@smarttutor.com / parent123');
  console.log('   Tutor: tutor@smarttutor.com / tutor123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
