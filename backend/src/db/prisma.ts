import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma client with connection pooling
let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Production optimizations
    log: ['error', 'warn'],
    errorFormat: 'minimal',
  });
} else {
  // Development settings
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log: ['query', 'info', 'warn', 'error'],
      errorFormat: 'pretty',
    });
  }
  prisma = global.prisma;
}

// Add connection pool configuration via DATABASE_URL parameters
// Example: postgresql://user:password@host:port/database?connection_limit=20&pool_timeout=30

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

// Handle connection errors (commented out for compatibility)
// prisma.$on('error', (e) => {
//   console.error('Prisma Client Error:', e);
// });

// Export singleton instance
export { prisma };

// Type augmentation for global
declare global {
  var prisma: PrismaClient | undefined;
}

// Connection health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}

// Query performance monitoring (disabled for compatibility)
export async function getQueryMetrics() {
  try {
    // const metrics = await prisma.$metrics.json();
    // return metrics;
    return null;
  } catch (error) {
    console.error('Failed to get query metrics:', error);
    return null;
  }
}