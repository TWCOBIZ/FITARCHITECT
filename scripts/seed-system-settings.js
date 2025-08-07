require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedSystemSettings() {
  try {
    console.log('🌱 Seeding system settings...');
    
    // Check if system settings already exist
    const existingSettings = await prisma.systemSettings.findFirst();
    
    if (existingSettings) {
      console.log('✅ System settings already exist, skipping seed');
      return;
    }
    
    // Create default system settings
    const settings = await prisma.systemSettings.create({
      data: {
        maintenanceMode: false,
        allowRegistrations: true,
        requireEmailVerification: false,
        notificationEmail: process.env.ADMIN_EMAIL || 'admin@fitarchitect.com',
        appName: 'FitArchitect',
        appDescription: 'Your AI-powered fitness companion',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@fitarchitect.com',
        maxFreeUsers: 1000,
        sessionTimeout: 1440 // 24 hours
      }
    });
    
    console.log('✅ System settings created:', settings.id);
    console.log('📧 Notification email:', settings.notificationEmail);
    console.log('🏗️  App name:', settings.appName);
    
  } catch (error) {
    console.error('❌ Error seeding system settings:', error);
    throw error;
  }
}

async function main() {
  try {
    await seedSystemSettings();
    console.log('🎉 System settings seeding completed successfully!');
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());