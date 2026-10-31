import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting backfill of DRAFT TutorApplication for tutors without applications...');

  // Find all PENDING_VETTING tutors without a TutorApplication
  const tutorsWithoutApp = await prisma.user.findMany({
    where: {
      role: 'TUTOR',
      status: 'PENDING_VETTING',
      tutorApplication: null,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  });

  console.log(`Found ${tutorsWithoutApp.length} tutors without applications`);

  if (tutorsWithoutApp.length === 0) {
    console.log('✅ No tutors need backfilling');
    return;
  }

  // Create DRAFT applications for each
  for (const tutor of tutorsWithoutApp) {
    try {
      await prisma.tutorApplication.create({
        data: {
          userId: tutor.id,
          status: 'DRAFT',
          birthDay: 1,
          birthMonth: 1,
          country: '',
          city: '',
          highestQualification: 'SSCE_WAEC',
          yearsOfExperience: 0,
          whyTeach: '',
          howHeard: 'OTHER',
          aboutYou: [],
        },
      });
      console.log(`✅ Created DRAFT application for ${tutor.fullName} (${tutor.email})`);
    } catch (error) {
      console.error(`❌ Failed to create application for ${tutor.fullName}:`, error);
    }
  }

  console.log('✅ Backfill completed');
}

main()
  .catch((e) => {
    console.error('❌ Error during backfill:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
