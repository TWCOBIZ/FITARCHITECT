import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
  errorFormat: 'pretty',
})

// Define a type for the column object
interface ColumnInfo {
  column_name: string;
  data_type: string;
}

export async function verifyDatabaseConnection() {
  try {
    // Test database connection
    await prisma.$connect()
    console.log('Database connection successful')

    // Verify UserProfile table exists
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles'
      )
    `
    
    if (!tableExists[0].exists) {
      throw new Error('UserProfile table does not exist')
    }

    // Verify schema
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_profiles'
    `

    const requiredColumns = [
      'id', 'email', 'name', 'avatar', 'height', 'weight',
      'age', 'gender', 'fitnessGoals', 'activityLevel',
      'dietaryPreferences', 'emailNotifications', 'telegramEnabled',
      'telegramChatId', 'createdAt', 'updatedAt'
    ]

    const existingColumns = (columns as ColumnInfo[]).map((col) => col.column_name)
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col))

    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`)
    }

    console.log('Database schema verification successful')
    return true
  } catch (error) {
    console.error('Database verification failed:', error)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

// Run verification if this file is executed directly
if (require.main === module) {
  verifyDatabaseConnection()
    .then(success => {
      if (success) {
        console.log('Database verification completed successfully')
        process.exit(0)
      } else {
        console.error('Database verification failed')
        process.exit(1)
      }
    })
    .catch(error => {
      console.error('Unexpected error during verification:', error)
      process.exit(1)
    })
} 