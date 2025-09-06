require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Get credentials from environment or use secure defaults
const getAdminCredentials = () => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@fitarchitect.com';
  const adminPassword = process.env.ADMIN_PASSWORD || Math.random().toString(36).substring(2, 15);
  
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.warn('⚠️  WARNING: Using default admin credentials. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env for production.');
    console.log(`📧 Admin Email: ${adminEmail}`);
    console.log(`🔑 Admin Password: ${adminPassword}`);
  }
  
  return { adminEmail, adminPassword };
};

const getTestCredentials = () => {
  const testEmail = process.env.TEST_USER_EMAIL || 'test@fitarchitect.com';
  const testPassword = process.env.TEST_USER_PASSWORD || 'testuser123';
  
  return { testEmail, testPassword };
};

async function createAdminUser() {
  const { adminEmail, adminPassword } = getAdminCredentials();
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.userProfile.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
      isAdmin: true,
      tier: 'premium',
      subscriptionStatus: 'active',
      name: 'Administrator',
      parqCompleted: true,
      type: 'registered',
    },
    create: {
      email: adminEmail,
      password: hashedPassword,
      isAdmin: true,
      tier: 'premium',
      subscriptionStatus: 'active',
      name: 'Administrator',
      height: 175,
      weight: 75,
      age: 30,
      gender: 'other',
      fitnessGoals: ['strength', 'muscle_gain'],
      activityLevel: 'moderate',
      dietaryPreferences: [],
      equipmentAvailability: ['bodyweight', 'dumbbells'],
      emailNotifications: true,
      telegramEnabled: false,
      parqCompleted: true,
      type: 'registered',
    },
  });

  console.log('✅ Admin user created/updated:', adminEmail);
  return admin;
}

async function createTestUser() {
  const { testEmail, testPassword } = getTestCredentials();
  const hashedPassword = await bcrypt.hash(testPassword, 10);

  const testUser = await prisma.userProfile.upsert({
    where: { email: testEmail },
    update: {
      password: hashedPassword,
      isAdmin: false,
      tier: 'premium',
      subscriptionStatus: 'active',
      name: 'Test User',
      parqCompleted: true,
      type: 'registered',
      fitnessGoals: ['strength', 'weight_loss'],
      activityLevel: 'active',
      dietaryPreferences: [],
      equipmentAvailability: ['bodyweight', 'resistance_bands'],
    },
    create: {
      email: testEmail,
      password: hashedPassword,
      isAdmin: false,
      tier: 'premium',
      subscriptionStatus: 'active',
      name: 'Test User',
      height: 170,
      weight: 70,
      age: 25,
      gender: 'other',
      fitnessGoals: ['strength', 'weight_loss'],
      activityLevel: 'active',
      dietaryPreferences: [],
      equipmentAvailability: ['bodyweight', 'resistance_bands'],
      emailNotifications: true,
      telegramEnabled: false,
      parqCompleted: true,
      type: 'registered',
    },
  });

  console.log('✅ Test user created/updated:', testEmail);
  return testUser;
}

async function seedPlans() {
  try {
    // Create subscription plans if they don't exist (simplified to match schema)
    const plans = [
      {
        id: 'free_plan',
        name: 'Free',
        price: 0
      },
      {
        id: 'basic_plan',
        name: 'Basic',
        price: 9.99
      },
      {
        id: 'premium_plan',
        name: 'Premium',
        price: 19.99
      }
    ];

    for (const plan of plans) {
      await prisma.plan.upsert({
        where: { id: plan.id },
        update: {
          name: plan.name,
          price: plan.price
        },
        create: plan
      });
    }
    
    console.log('✅ Subscription plans seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding plans:', error);
  }
}

async function createPremiumSubscription(userId) {
  try {
    // Ensure plans exist first
    await seedPlans();
    
    const existingSubscription = await prisma.subscription.findFirst({
      where: { userId }
    });

    if (!existingSubscription) {
      await prisma.subscription.create({
        data: {
          userId,
          planId: 'premium_plan', // Use the correct plan ID
          plan: 'Premium',
          status: 'active',
          startDate: new Date(),
        },
      });
      console.log('✅ Premium subscription created for user');
    } else {
      console.log('ℹ️  Subscription already exists for user');
    }
  } catch (error) {
    console.log('ℹ️  Subscription creation skipped (optional):', error.message);
  }
}

async function main() {
  try {
    console.log('🌱 Seeding database...');
    
    // Create admin user
    const admin = await createAdminUser();
    await createPremiumSubscription(admin.id);
    
    // Create test user
    const testUser = await createTestUser();
    await createPremiumSubscription(testUser.id);
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Created users:');
    console.log(`   👑 Admin: ${admin.email}`);
    console.log(`   🧪 Test:  ${testUser.email}`);
    console.log('\n💡 Tip: Set ADMIN_EMAIL and ADMIN_PASSWORD in .env for custom admin credentials');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());