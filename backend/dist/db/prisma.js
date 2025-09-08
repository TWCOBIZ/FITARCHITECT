"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.getPrismaClient = getPrismaClient;
exports.checkDatabaseConnection = checkDatabaseConnection;
exports.getQueryMetrics = getQueryMetrics;
const client_1 = require("@prisma/client");
// Environment variable validation
function validateDatabaseUrl() {
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
    }
    catch (e) {
        const error = `DATABASE_URL is not a valid URL: ${databaseUrl}`;
        console.error(error);
        throw new Error(error);
    }
    return databaseUrl;
}
// Singleton pattern for Prisma client with connection pooling
let prisma;
// Lazy initialization - only validate and create client when needed
function initializePrismaClient() {
    if (prisma)
        return prisma;
    const databaseUrl = validateDatabaseUrl();
    if (process.env.NODE_ENV === 'production') {
        console.log('Initializing Prisma Client for production...');
        prisma = new client_1.PrismaClient({
            datasources: {
                db: {
                    url: databaseUrl,
                },
            },
            // Production optimizations
            log: ['error', 'warn'],
            errorFormat: 'minimal',
        });
    }
    else {
        // Development settings
        if (!global.prisma) {
            console.log('Initializing Prisma Client for development...');
            global.prisma = new client_1.PrismaClient({
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
    return prisma;
}
// Don't initialize immediately - wait for first use
// Add connection pool configuration via DATABASE_URL parameters
// Example: postgresql://user:password@host:port/database?connection_limit=20&pool_timeout=30
// Graceful shutdown
process.on('beforeExit', async () => {
    if (prisma) {
        await prisma.$disconnect();
    }
});
// Handle connection errors (commented out for compatibility)
// prisma.$on('error', (e) => {
//   console.error('Prisma Client Error:', e);
// });
// Export getter that initializes on first use
function getPrismaClient() {
    if (!prisma) {
        initializePrismaClient();
    }
    return prisma;
}
// Create a proxy object that delays initialization until first access
const prismaProxy = new Proxy({}, {
    get(target, prop) {
        if (!prisma) {
            initializePrismaClient();
        }
        return prisma[prop];
    },
    set(target, prop, value) {
        if (!prisma) {
            initializePrismaClient();
        }
        prisma[prop] = value;
        return true;
    }
});
exports.prisma = prismaProxy;
// Connection health check
async function checkDatabaseConnection() {
    try {
        const client = getPrismaClient();
        await client.$queryRaw `SELECT 1`;
        return true;
    }
    catch (error) {
        console.error('Database connection check failed:', error);
        return false;
    }
}
// Query performance monitoring (disabled for compatibility)
async function getQueryMetrics() {
    try {
        // const metrics = await prisma.$metrics.json();
        // return metrics;
        return null;
    }
    catch (error) {
        console.error('Failed to get query metrics:', error);
        return null;
    }
}
