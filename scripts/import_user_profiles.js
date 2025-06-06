const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function importUsers() {
  const data = JSON.parse(fs.readFileSync('user_profiles_transformed.json', 'utf-8'));
  for (const { user, profile } of data) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: {
        ...user,
        profile: {
          create: profile
        }
      }
    });
    console.log(`Imported user ${user.email}`);
  }
  await prisma.$disconnect();
}

importUsers(); 