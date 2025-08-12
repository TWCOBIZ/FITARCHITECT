require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetAdminPassword() {
  const adminEmail = 'admin@fitarchitect.com';
  const newPassword = 'Legendary23!!';
  
  console.log('🔐 Resetting admin password...');
  console.log(`📧 Admin Email: ${adminEmail}`);
  
  try {
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the admin user's password
    const updatedUser = await prisma.userProfile.update({
      where: { email: adminEmail },
      data: { 
        password: hashedPassword,
        isAdmin: true,
        tier: 'premium',
        subscriptionStatus: 'active',
        parqCompleted: true,
        type: 'registered'
      }
    });
    
    console.log('✅ Admin password successfully reset!');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Password:', newPassword);
    console.log('👤 User ID:', updatedUser.id);
    console.log('');
    console.log('You can now login at /admin with these credentials.');
    
  } catch (error) {
    if (error.code === 'P2025') {
      console.error('❌ Admin user not found. Creating new admin user...');
      
      try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        const newAdmin = await prisma.userProfile.create({
          data: {
            email: adminEmail,
            password: hashedPassword,
            isAdmin: true,
            tier: 'premium',
            subscriptionStatus: 'active',
            name: 'Administrator',
            height: 175,
            weight: 75,
            age: 30,
            gender: 'male',
            fitnessGoals: ['general_fitness'],
            activityLevel: 'moderate',
            equipmentAvailability: ['full_gym'],
            preferredWorkoutDuration: 60,
            dietaryPreferences: ['balanced'],
            parqCompleted: true,
            type: 'registered'
          }
        });
        
        console.log('✅ Admin user created successfully!');
        console.log('📧 Email:', adminEmail);
        console.log('🔑 Password:', newPassword);
        console.log('👤 User ID:', newAdmin.id);
        
      } catch (createError) {
        console.error('❌ Failed to create admin user:', createError);
      }
    } else {
      console.error('❌ Failed to reset password:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the reset
resetAdminPassword().catch(console.error);