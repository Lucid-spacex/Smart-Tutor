import prisma from './src/config/database';

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        passwordHash: true,
        studentCode: true,
        parentId: true,
      },
    });

    console.log('Users in database:');
    console.log(JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
