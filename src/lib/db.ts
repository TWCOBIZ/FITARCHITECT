import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined
}

const prisma = global.prisma || new PrismaClient({
  log: ['query', 'error', 'warn'],
  errorFormat: 'pretty',
})

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}

// Add connection error handling
prisma.$connect()
  .then(() => {
    console.log('Successfully connected to database')
  })
  .catch((error) => {
    console.error('Failed to connect to database:', error)
    process.exit(1)
  })

// Handle process termination
process.on('beforeExit', async () => {
  await prisma.$disconnect()
  console.log('Database connection closed')
})

export default prisma 