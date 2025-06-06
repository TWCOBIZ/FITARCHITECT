const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function verify() {
  const legacy = JSON.parse(fs.readFileSync('user_profiles_backup.json', 'utf-8'));
  const parqLegacy = JSON.parse(fs.readFileSync('parq_responses_backup.json', 'utf-8'));
  const nutritionLegacy = JSON.parse(fs.readFileSync('nutrition_logs_backup.json', 'utf-8'));

  const userCount = await prisma.user.count();
  const profileCount = await prisma.profile.count();
  const parqCount = await prisma.parqResponse.count();
  const nutritionCount = await prisma.nutritionLog.count();

  console.log(`Legacy user_profiles: ${legacy.length}`);
  console.log(`New users: ${userCount}, profiles: ${profileCount}`);
  console.log(`Legacy ParqResponse: ${parqLegacy.length}, new: ${parqCount}`);
  console.log(`Legacy NutritionLog: ${nutritionLegacy.length}, new: ${nutritionCount}`);

  if (
    userCount === legacy.length &&
    profileCount === legacy.length &&
    parqCount === parqLegacy.length &&
    nutritionCount === nutritionLegacy.length
  ) {
    console.log('Migration successful: All users, profiles, ParqResponses, and NutritionLogs imported.');
  } else {
    console.warn('Mismatch in counts! Investigate further.');
  }
  await prisma.$disconnect();
}

verify(); 