require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const basicExercises = [
  // Push Exercises
  {
    name: 'Push-ups',
    category: 'push',
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    muscleGroups: ['chest', 'triceps', 'shoulders'],
    description: 'A fundamental bodyweight exercise for upper body strength',
    instructions: 'Start in plank position. Lower body until chest nearly touches floor. Push back up.',
    isActive: true
  },
  {
    name: 'Bench Press',
    category: 'push',
    equipment: ['barbell', 'bench'],
    difficulty: 'intermediate',
    muscleGroups: ['chest', 'triceps', 'shoulders'],
    description: 'Classic chest building exercise using a barbell',
    instructions: 'Lie on bench. Lower bar to chest. Press back up.',
    isActive: true
  },
  {
    name: 'Overhead Press',
    category: 'push',
    equipment: ['barbell', 'dumbbells'],
    difficulty: 'intermediate',
    muscleGroups: ['shoulders', 'triceps'],
    description: 'Shoulder strengthening exercise',
    instructions: 'Press weight overhead from shoulder level.',
    isActive: true
  },
  
  // Pull Exercises
  {
    name: 'Pull-ups',
    category: 'pull',
    equipment: ['pull_up_bar'],
    difficulty: 'intermediate',
    muscleGroups: ['back', 'biceps'],
    description: 'Upper body pulling exercise',
    instructions: 'Hang from bar. Pull body up until chin over bar.',
    isActive: true
  },
  {
    name: 'Bent Over Row',
    category: 'pull',
    equipment: ['barbell', 'dumbbells'],
    difficulty: 'intermediate',
    muscleGroups: ['back', 'biceps'],
    description: 'Back strengthening rowing movement',
    instructions: 'Bend forward. Pull weight to chest.',
    isActive: true
  },
  {
    name: 'Lat Pulldown',
    category: 'pull',
    equipment: ['cable_machine'],
    difficulty: 'beginner',
    muscleGroups: ['back', 'biceps'],
    description: 'Cable machine back exercise',
    instructions: 'Pull bar down to chest level.',
    isActive: true
  },
  
  // Leg Exercises
  {
    name: 'Squats',
    category: 'legs',
    equipment: ['bodyweight', 'barbell'],
    difficulty: 'beginner',
    muscleGroups: ['quadriceps', 'glutes', 'hamstrings'],
    description: 'Fundamental leg exercise',
    instructions: 'Lower hips from standing position, then stand back up.',
    isActive: true
  },
  {
    name: 'Lunges',
    category: 'legs',
    equipment: ['bodyweight', 'dumbbells'],
    difficulty: 'beginner',
    muscleGroups: ['quadriceps', 'glutes', 'hamstrings'],
    description: 'Single leg strengthening exercise',
    instructions: 'Step forward and lower hips until both knees bent at 90 degrees.',
    isActive: true
  },
  {
    name: 'Deadlifts',
    category: 'legs',
    equipment: ['barbell'],
    difficulty: 'intermediate',
    muscleGroups: ['hamstrings', 'glutes', 'back'],
    description: 'Full body compound lift',
    instructions: 'Lift loaded barbell from ground to hip level.',
    isActive: true
  },
  {
    name: 'Leg Press',
    category: 'legs',
    equipment: ['leg_press_machine'],
    difficulty: 'beginner',
    muscleGroups: ['quadriceps', 'glutes'],
    description: 'Machine-based leg exercise',
    instructions: 'Push weight away using legs.',
    isActive: true
  },
  
  // Core Exercises
  {
    name: 'Plank',
    category: 'core',
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    muscleGroups: ['abs', 'core'],
    description: 'Core stabilization exercise',
    instructions: 'Hold body straight in push-up position.',
    isActive: true
  },
  {
    name: 'Crunches',
    category: 'core',
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    muscleGroups: ['abs'],
    description: 'Abdominal strengthening exercise',
    instructions: 'Lie on back. Curl upper body toward knees.',
    isActive: true
  },
  {
    name: 'Russian Twists',
    category: 'core',
    equipment: ['bodyweight', 'medicine_ball'],
    difficulty: 'intermediate',
    muscleGroups: ['abs', 'obliques'],
    description: 'Oblique and core rotation exercise',
    instructions: 'Sit with knees bent. Rotate torso side to side.',
    isActive: true
  },
  
  // Cardio Exercises
  {
    name: 'Burpees',
    category: 'cardio',
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    muscleGroups: ['full_body'],
    description: 'High intensity full body exercise',
    instructions: 'Squat, jump feet back to plank, push-up, jump feet forward, jump up.',
    isActive: true
  },
  {
    name: 'Jumping Jacks',
    category: 'cardio',
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    muscleGroups: ['full_body'],
    description: 'Basic cardio warm-up exercise',
    instructions: 'Jump while spreading legs and raising arms.',
    isActive: true
  },
  {
    name: 'Mountain Climbers',
    category: 'cardio',
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    muscleGroups: ['core', 'legs'],
    description: 'Dynamic core and cardio exercise',
    instructions: 'In plank position, alternate bringing knees to chest.',
    isActive: true
  },
  {
    name: 'High Knees',
    category: 'cardio',
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    muscleGroups: ['legs', 'core'],
    description: 'Cardio exercise for leg strength',
    instructions: 'Run in place bringing knees high.',
    isActive: true
  }
];

async function seedExercises() {
  console.log('🏋️ Seeding exercises into database...');
  
  try {
    // Check existing exercises
    const existingCount = await prisma.exercise.count();
    console.log(`📊 Found ${existingCount} existing exercises`);
    
    // Add exercises
    let created = 0;
    let skipped = 0;
    
    for (const exercise of basicExercises) {
      try {
        // Check if exercise already exists
        const existing = await prisma.exercise.findFirst({
          where: { name: exercise.name }
        });
        
        if (existing) {
          console.log(`⏭️  Skipping ${exercise.name} (already exists)`);
          skipped++;
        } else {
          await prisma.exercise.create({
            data: exercise
          });
          console.log(`✅ Created ${exercise.name}`);
          created++;
        }
      } catch (error) {
        console.error(`❌ Failed to create ${exercise.name}:`, error.message);
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`✅ Created: ${created} exercises`);
    console.log(`⏭️  Skipped: ${skipped} exercises`);
    
    const totalCount = await prisma.exercise.count();
    console.log(`📊 Total exercises in database: ${totalCount}`);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
seedExercises().catch(console.error);