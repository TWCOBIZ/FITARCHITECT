const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateEquipmentData() {
  try {
    console.log('Starting equipment data migration...');

    // Get all users 
    const users = await prisma.userProfile.findMany({
      select: {
        id: true,
        email: true,
        equipmentAvailability: true
      }
    });

    console.log(`Found ${users.length} users to potentially update`);

    let updated = 0;
    for (const user of users) {
      // Check if equipmentAvailability is a string (legacy format)
      if (typeof user.equipmentAvailability === 'string') {
        // Convert string to array
        const equipmentArray = user.equipmentAvailability
          .split(',')
          .map(item => item.trim())
          .filter(item => item.length > 0);

        await prisma.userProfile.update({
          where: { id: user.id },
          data: {
            equipmentAvailability: equipmentArray
          }
        });

        console.log(`Updated user ${user.email}: "${user.equipmentAvailability}" -> [${equipmentArray.join(', ')}]`);
        updated++;
      }
    }

    console.log(`Migration completed. Updated ${updated} users.`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateEquipmentData();