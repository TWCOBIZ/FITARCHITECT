const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email1 = 'ken@nepacreativeagency.com';
  const password1 = 'adminlog';
  const hash1 = await bcrypt.hash(password1, 10);

  await prisma.userProfile.upsert({
    where: { email: email1 },
    update: {
      password: hash1,
      isAdmin: true,
      tier: 'premium',
      subscriptionStatus: 'active',
      name: 'Admin User',
      height: 170,
      weight: 70,
      age: 30,
      gender: 'other',
      fitnessGoals: [],
      activityLevel: 'moderate',
      dietaryPreferences: [],
      emailNotifications: true,
      telegramEnabled: false,
      parqCompleted: true,
      type: 'registered',
    },
    create: {
      email: email1,
      password: hash1,
      isAdmin: true,
      tier: 'premium',
      subscriptionStatus: 'active',
      name: 'Admin User',
      height: 170,
      weight: 70,
      age: 30,
      gender: 'other',
      fitnessGoals: [],
      activityLevel: 'moderate',
      dietaryPreferences: [],
      emailNotifications: true,
      telegramEnabled: false,
      parqCompleted: true,
      type: 'registered',
    },
  });

  const email2 = 'twcobiz@icloud.com';
  const password2 = 'dandj2018';
  const hash2 = await bcrypt.hash(password2, 10);

  await prisma.userProfile.upsert({
    where: { email: email2 },
    update: {
      password: hash2,
      isAdmin: true,
      tier: 'premium',
      subscriptionStatus: 'active',
      name: 'Admin User',
      height: 170,
      weight: 70,
      age: 30,
      gender: 'other',
      fitnessGoals: [],
      activityLevel: 'moderate',
      dietaryPreferences: [],
      emailNotifications: true,
      telegramEnabled: false,
      parqCompleted: true,
      type: 'registered',
    },
    create: {
      email: email2,
      password: hash2,
      isAdmin: true,
      tier: 'premium',
      subscriptionStatus: 'active',
      name: 'Admin User',
      height: 170,
      weight: 70,
      age: 30,
      gender: 'other',
      fitnessGoals: [],
      activityLevel: 'moderate',
      dietaryPreferences: [],
      emailNotifications: true,
      telegramEnabled: false,
      parqCompleted: true,
      type: 'registered',
    },
  });

  console.log('Admin users created or updated!');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect()); 