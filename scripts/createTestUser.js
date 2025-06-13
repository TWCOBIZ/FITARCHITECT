require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('Creating/updating test user with full access...');
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('testpass123', 10);
    
    // Check if user exists
    let user = await prisma.userProfile.findUnique({
      where: { email: 'test@fitarchitect.com' }
    });

    if (user) {
      console.log('User exists, updating...');
      user = await prisma.userProfile.update({
        where: { email: 'test@fitarchitect.com' },
        data: {
          password: hashedPassword,
          name: 'Test User',
          height: 70,
          weight: 180,
          age: 30,
          gender: 'male',
          fitnessGoals: ['weight_loss', 'muscle_gain'],
          activityLevel: 'moderate',
          dietaryPreferences: ['none'],
          parqCompleted: true,
          tier: 'premium',
          subscriptionStatus: 'active',
          type: 'registered',
          legalAcknowledgment: true,
          parqAnswers: {
            q1: false, q2: false, q3: false, q4: false,
            q5: false, q6: false, q7: false, q8: false
          },
          healthConditions: 'None',
          injuryHistory: 'None',
          equipmentAvailability: 'Full gym access',
          preferredWorkoutDuration: '45-60 minutes',
          notificationPreferences: {
            workoutReminders: true,
            nutritionTips: true,
            progressUpdates: true,
            weeklyReports: true
          }
        }
      });
    } else {
      console.log('Creating new user...');
      user = await prisma.userProfile.create({
        data: {
          email: 'test@fitarchitect.com',
          name: 'Test User',
          password: hashedPassword,
          height: 70,
          weight: 180,
          age: 30,
          gender: 'male',
          fitnessGoals: ['weight_loss', 'muscle_gain'],
          activityLevel: 'moderate',
          dietaryPreferences: ['none'],
          parqCompleted: true,
          tier: 'premium',
          subscriptionStatus: 'active',
          type: 'registered',
          legalAcknowledgment: true,
          parqAnswers: {
            q1: false, q2: false, q3: false, q4: false,
            q5: false, q6: false, q7: false, q8: false
          },
          healthConditions: 'None',
          injuryHistory: 'None',
          equipmentAvailability: 'Full gym access',
          preferredWorkoutDuration: '45-60 minutes',
          notificationPreferences: {
            workoutReminders: true,
            nutritionTips: true,
            progressUpdates: true,
            weeklyReports: true
          }
        }
      });
    }

    // Create PAR-Q response if it doesn't exist
    const existingParq = await prisma.parqResponse.findFirst({
      where: { userId: user.id }
    });
    
    if (!existingParq) {
      await prisma.parqResponse.create({
        data: {
          userId: user.id,
          answers: {
            q1: false,
            q2: false,
            q3: false,
            q4: false,
            q5: false,
            q6: false,
            q7: false,
            q8: false
          },
          flagged: false,
          flaggedQuestions: [],
          notes: [],
          reviewed: true
        }
      });
    }

    console.log('✅ Test user created/updated successfully!');
    console.log('📧 Email: test@fitarchitect.com');
    console.log('🔑 Password: testpass123');
    console.log('🎯 Features: All features unlocked (Premium tier, PAR-Q completed)');
    console.log('💪 Ready to test workout generation, meal planning, and all features!');
    
  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();