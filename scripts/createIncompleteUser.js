require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createIncompleteUser() {
  try {
    console.log('Creating incomplete test user...');
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('testpass123', 10);
    
    // Check if user exists
    let user = await prisma.userProfile.findUnique({
      where: { email: 'incomplete@fitarchitect.com' }
    });

    if (user) {
      console.log('User exists, updating...');
      user = await prisma.userProfile.update({
        where: { email: 'incomplete@fitarchitect.com' },
        data: {
          password: hashedPassword,
          name: 'Incomplete User',
          // Missing height, weight, age, gender, etc. to trigger profile completion
          height: 0, // Missing
          weight: 0, // Missing
          age: 0,    // Missing
          gender: 'male',
          fitnessGoals: [], // Missing
          activityLevel: 'moderate',
          dietaryPreferences: [], // Missing
          parqCompleted: false,
          tier: 'free',
          subscriptionStatus: 'inactive',
          type: 'registered',
          legalAcknowledgment: false,
          emailNotifications: true,
          telegramEnabled: false
        }
      });
    } else {
      console.log('Creating new incomplete user...');
      user = await prisma.userProfile.create({
        data: {
          email: 'incomplete@fitarchitect.com',
          name: 'Incomplete User',
          password: hashedPassword,
          height: 0, // Missing
          weight: 0, // Missing  
          age: 0,    // Missing
          gender: 'male',
          fitnessGoals: [], // Missing
          activityLevel: 'moderate',
          dietaryPreferences: [], // Missing
          parqCompleted: false,
          tier: 'free',
          subscriptionStatus: 'inactive',
          type: 'registered',
          legalAcknowledgment: false,
          emailNotifications: true,
          telegramEnabled: false
        }
      });
    }

    console.log('✅ Incomplete test user created/updated successfully!');
    console.log('📧 Email: incomplete@fitarchitect.com');
    console.log('🔑 Password: testpass123');
    console.log('🚫 Profile: Incomplete (missing height, weight, age, goals)');
    console.log('🎯 Use this to test profile completion flow!');
    
  } catch (error) {
    console.error('❌ Error creating incomplete test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createIncompleteUser();