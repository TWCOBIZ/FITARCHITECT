require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetTestUser() {
  const testEmail = 'test@fitarchitect.com';
  const testPassword = 'testuser123';
  
  console.log('🔐 Resetting test user password...');
  console.log(`📧 Test Email: ${testEmail}`);
  
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    
    // Update the test user's password
    const updatedUser = await prisma.userProfile.update({
      where: { email: testEmail },
      data: { 
        password: hashedPassword,
        tier: 'premium',
        subscriptionStatus: 'active',
        parqCompleted: true,
        type: 'registered'
      }
    });
    
    console.log('✅ Test user password successfully reset!');
    console.log('📧 Email:', testEmail);
    console.log('🔑 Password:', testPassword);
    console.log('👤 User ID:', updatedUser.id);
    console.log('💎 Tier:', updatedUser.tier);
    console.log('');
    console.log('You can now login with these credentials.');
    
  } catch (error) {
    if (error.code === 'P2025') {
      console.error('❌ Test user not found. Creating new test user...');
      
      try {
        const hashedPassword = await bcrypt.hash(testPassword, 10);
        
        const newTestUser = await prisma.userProfile.create({
          data: {
            email: testEmail,
            password: hashedPassword,
            isAdmin: false,
            tier: 'premium',
            subscriptionStatus: 'active',
            name: 'Test User',
            height: 180,
            weight: 80,
            age: 25,
            gender: 'male',
            fitnessGoals: ['muscle_gain', 'strength'],
            activityLevel: 'very_active',
            equipmentAvailability: ['full_gym'],
            preferredWorkoutDuration: 90,
            dietaryPreferences: ['high_protein'],
            parqCompleted: true,
            type: 'registered',
            emailNotifications: true,
            telegramEnabled: false,
            freeWorkoutTrialUsed: false
          }
        });
        
        console.log('✅ Test user created successfully!');
        console.log('📧 Email:', testEmail);
        console.log('🔑 Password:', testPassword);
        console.log('👤 User ID:', newTestUser.id);
        console.log('💎 Tier:', newTestUser.tier);
        
      } catch (createError) {
        console.error('❌ Failed to create test user:', createError);
      }
    } else {
      console.error('❌ Failed to reset password:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the reset
resetTestUser().catch(console.error);