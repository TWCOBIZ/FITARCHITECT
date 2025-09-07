import { PrismaClient } from '@prisma/client';

// Environment variable validation
function validateDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    const error = 'DATABASE_URL environment variable is required but not set';
    console.error(error);
    console.error('Available environment variables:', Object.keys(process.env).join(', '));
    throw new Error(error);
  }
  
  // Basic URL validation
  try {
    new URL(databaseUrl);
  } catch (e) {
    const error = `DATABASE_URL is not a valid URL: ${databaseUrl}`;
    console.error(error);
    throw new Error(error);
  }
  
  return databaseUrl;
}

// Singleton pattern for Prisma client with connection pooling
let prisma: PrismaClient;

// Validate database URL before creating Prisma client
const databaseUrl = validateDatabaseUrl();

if (process.env.NODE_ENV === 'production') {
  console.log('Initializing Prisma Client for production...');
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    // Production optimizations
    log: ['error', 'warn'],
    errorFormat: 'minimal',
  });
} else {
  // Development settings
  if (!global.prisma) {
    console.log('Initializing Prisma Client for development...');
    global.prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
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