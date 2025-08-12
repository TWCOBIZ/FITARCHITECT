#!/usr/bin/env node

/**
 * Production Database Seeding Script
 * Seeds Railway production database with all required data
 * Run locally with: DATABASE_URL="railway_url" node scripts/seed-production.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { exerciseDatabase: exerciseData } = require('../backend/src/data/exerciseDatabase');

// Use Railway production DATABASE_URL if provided via command line
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:JIIWyJLnFjAZwWGqosIBxdoCrNWqmWMY@nozomi.proxy.rlwy.net:25063/railway';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

// Convert exercise database format to Prisma schema format
function convertExerciseToPrismaFormat(exercise) {
  // Ensure instructions is an array
  let instructions = [];
  if (Array.isArray(exercise.instructions)) {
    instructions = exercise.instructions;
  } else if (typeof exercise.instructions === 'string') {
    instructions = [exercise.instructions];
  } else {
    instructions = ['Follow proper form'];
  }
  
  return {
    name: exercise.name,
    description: exercise.description || `${exercise.name} - ${exercise.category} exercise`,
    category: exercise.category || 'strength',
    equipment: exercise.equipment || ['bodyweight'],
    difficulty: exercise.difficulty || 'beginner',
    muscleGroups: exercise.muscleGroups || exercise.targetMuscles || [],
    instructions: instructions,
    tips: exercise.tips || [],
    isActive: true,
    imageUrl: exercise.imageUrl || null,
    videoUrl: exercise.videoUrl || null,
    gifPath: exercise.gifPath || null,
    approvalStatus: 'approved',
    isCustom: false
  };
}

async function seedExercises() {
  console.log('🏋️ Seeding exercises into production database...');
  
  let created = 0;
  let updated = 0;
  let failed = 0;
  
  for (const exercise of exerciseData) {
    try {
      const exerciseData = convertExerciseToPrismaFormat(exercise);
      
      // Check if exercise exists first
      const existing = await prisma.exercise.findFirst({
        where: { name: exerciseData.name }
      });
      
      if (existing) {
        // Update existing
        await prisma.exercise.update({
          where: { id: existing.id },
          data: exerciseData
        });
        updated++;
      } else {
        // Create new
        await prisma.exercise.create({
          data: exerciseData
        });
        created++;
      }
      
      console.log(`✅ Seeded: ${exerciseData.name}`);
    } catch (error) {
      console.error(`❌ Failed to seed ${exercise.name}:`, error.message);
      failed++;
    }
  }
  
  console.log(`\n📊 Exercise Seeding Summary:`);
  console.log(`✅ Created: ${created}, Updated: ${updated}`);
  console.log(`❌ Failed: ${failed} exercises`);
  
  const totalCount = await prisma.exercise.count();
  console.log(`📊 Total exercises in database: ${totalCount}`);
}

async function ensureAdminUser() {
  console.log('\n👤 Ensuring admin user exists...');
  
  const adminEmail = 'admin@fitarchitect.com';
  const adminPassword = 'Legendary23!!';
  
  try {
    // Check if admin exists
    const existingAdmin = await prisma.userProfile.findUnique({
      where: { email: adminEmail }
    });
    
    if (existingAdmin) {
      // Update password to ensure it's correct
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await prisma.userProfile.update({
        where: { email: adminEmail },
        data: {
          password: hashedPassword,
          isAdmin: true,
          tier: 'premium',
          subscriptionStatus: 'active',
          parqCompleted: true
        }
      });
      console.log('✅ Admin user updated with correct password');
    } else {
      // Create admin user
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await prisma.userProfile.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: 'Administrator',
          isAdmin: true,
          tier: 'premium',
          subscriptionStatus: 'active',
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
      console.log('✅ Admin user created');
    }
    
    console.log(`📧 Admin Email: ${adminEmail}`);
    console.log(`🔑 Admin Password: ${adminPassword}`);
  } catch (error) {
    console.error('❌ Failed to ensure admin user:', error);
  }
}

async function seedSystemSettings() {
  console.log('\n⚙️ Seeding system settings...');
  
  try {
    // Create default system settings if not exists
    const settingsCount = await prisma.systemSettings.count();
    
    if (settingsCount === 0) {
      await prisma.systemSettings.create({
        data: {
          id: 'default',
          maintenanceMode: false,
          allowRegistrations: true,
          requireEmailVerification: false,
          maxWorkoutsPerWeek: 7,
          maxNutritionLogsPerDay: 10,
          defaultTheme: 'dark',
          systemEmail: 'noreply@fitarchitect.com',
          supportEmail: 'support@fitarchitect.com'
        }
      });
      console.log('✅ System settings created');
    } else {
      console.log('✅ System settings already exist');
    }
  } catch (error) {
    console.error('❌ Failed to seed system settings:', error.message);
  }
}

async function seedGifApprovals() {
  console.log('\n🎬 Creating GIF approvals for exercises...');
  
  try {
    // Get all exercises
    const exercises = await prisma.exercise.findMany();
    let created = 0;
    
    for (const exercise of exercises) {
      // Create a default GIF approval entry for each exercise
      try {
        await prisma.gifApproval.create({
          data: {
            exerciseName: exercise.name,
            standardizedName: exercise.name.toUpperCase().replace(/\s+/g, '_'),
            gifUrl: exercise.gifUrl || '',
            source: 'curated',
            category: exercise.category,
            equipment: exercise.equipment,
            difficulty: exercise.difficulty,
            isApproved: true,
            approvedBy: 'system',
            approvedAt: new Date()
          }
        });
        created++;
      } catch (error) {
        // Skip if already exists
        if (!error.message.includes('Unique constraint')) {
          console.error(`Failed to create GIF approval for ${exercise.name}:`, error.message);
        }
      }
    }
    
    console.log(`✅ Created ${created} GIF approvals`);
  } catch (error) {
    console.error('❌ Failed to seed GIF approvals:', error.message);
  }
}

async function verifyDatabase() {
  console.log('\n🔍 Verifying database state...');
  
  const counts = {
    users: await prisma.userProfile.count(),
    exercises: await prisma.exercise.count(),
    workoutPlans: await prisma.workoutPlan.count(),
    systemSettings: await prisma.systemSettings.count(),
    gifApprovals: await prisma.gifApproval?.count() || 0
  };
  
  console.log('\n📊 Database Summary:');
  console.log(`👥 Users: ${counts.users}`);
  console.log(`🏋️ Exercises: ${counts.exercises}`);
  console.log(`📋 Workout Plans: ${counts.workoutPlans}`);
  console.log(`⚙️ System Settings: ${counts.systemSettings}`);
  console.log(`🎬 GIF Approvals: ${counts.gifApprovals}`);
  
  return counts;
}

async function main() {
  console.log('🚀 Starting Production Database Seeding');
  console.log('📍 Database:', DATABASE_URL.replace(/:[^:]*@/, ':****@'));
  console.log('=' .repeat(50));
  
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Connected to production database\n');
    
    // Run all seeding operations
    await seedExercises();
    await ensureAdminUser();
    await seedSystemSettings();
    await seedGifApprovals();
    
    // Verify final state
    const counts = await verifyDatabase();
    
    if (counts.exercises > 0) {
      console.log('\n🎉 Production database seeding completed successfully!');
      console.log('✅ Your app should now be fully functional');
    } else {
      console.log('\n⚠️ Warning: No exercises were seeded. Check for errors above.');
    }
    
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});