"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCacheStats = exports.cacheWorkoutGeneration = exports.cacheMetrics = void 0;
const logger_1 = require("../utils/logger");
// Simple in-memory cache for workout generation
const workoutGenerationCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
// Metrics for monitoring
exports.cacheMetrics = {
    hits: 0,
    misses: 0,
    evictions: 0
};
// Clean up expired entries periodically
setInterval(() => {
    const now = Date.now();
    let evicted = 0;
    for (const [key, entry] of workoutGenerationCache.entries()) {
        if (now - entry.timestamp > CACHE_TTL) {
            workoutGenerationCache.delete(key);
            evicted++;
        }
    }
    if (evicted > 0) {
        exports.cacheMetrics.evictions += evicted;
        logger_1.logger.info(`Cache cleanup: evicted ${evicted} expired entries`);
    }
}, 60000); // Run every minute
const cacheWorkoutGeneration = (req, res, next) => {
    var _a;
    // Only cache POST requests to workout generation endpoint
    if (req.method !== 'POST' || !req.path.includes('/workout-plans/generate')) {
        return next();
    }
    // Generate cache key from user ID and request body
    const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || 'anonymous';
    const profileHash = JSON.stringify(req.body.userProfile || {});
    const cacheKey = `${userId}-${profileHash}`;
    // Check cache
    const cached = workoutGenerationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        exports.cacheMetrics.hits++;
        logger_1.logger.debug(`Cache hit for workout generation: ${userId}`);
        return res.status(201).json(cached.data);
    }
    exports.cacheMetrics.misses++;
    logger_1.logger.debug(`Cache miss for workout generation: ${userId}`);
    // Intercept response to cache it
    const originalJson = res.json.bind(res);
    res.json = function (data) {
        // Only cache successful responses
        if (res.statusCode === 201 && data && data.id) {
            workoutGenerationCache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });
            logger_1.logger.debug(`Cached workout generation response for: ${userId}`);
        }
        return originalJson(data);
    };
    next();
};
exports.cacheWorkoutGeneration = cacheWorkoutGeneration;
// Get cache statistics
const getCacheStats = () => {
    const hitRate = exports.cacheMetrics.hits + exports.cacheMetrics.misses > 0
        ? (exports.cacheMetrics.hits / (exports.cacheMetrics.hits + exports.cacheMetrics.misses)) * 100
        : 0;
    return {
        ...exports.cacheMetrics,
        hitRate: Math.round(hitRate * 100) / 100,
        size: workoutGenerationCache.size,
        memoryUsage: process.memoryUsage().heapUsed
    };
};
exports.getCacheStats = getCacheStats;
