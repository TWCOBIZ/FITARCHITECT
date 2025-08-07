import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../auth';
import { logger } from '../utils/logger';

// Simple in-memory cache for workout generation
const workoutGenerationCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Metrics for monitoring
export const cacheMetrics = {
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
    cacheMetrics.evictions += evicted;
    logger.info(`Cache cleanup: evicted ${evicted} expired entries`);
  }
}, 60000); // Run every minute

export const cacheWorkoutGeneration = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Only cache POST requests to workout generation endpoint
  if (req.method !== 'POST' || !req.path.includes('/workout-plans/generate')) {
    return next();
  }

  // Generate cache key from user ID and request body
  const userId = req.user?.id || 'anonymous';
  const profileHash = JSON.stringify(req.body.userProfile || {});
  const cacheKey = `${userId}-${profileHash}`;
  
  // Check cache
  const cached = workoutGenerationCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    cacheMetrics.hits++;
    logger.debug(`Cache hit for workout generation: ${userId}`);
    return res.status(201).json(cached.data);
  }
  
  cacheMetrics.misses++;
  logger.debug(`Cache miss for workout generation: ${userId}`);
  
  // Intercept response to cache it
  const originalJson = res.json.bind(res);
  res.json = function(data: any) {
    // Only cache successful responses
    if (res.statusCode === 201 && data && data.id) {
      workoutGenerationCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      logger.debug(`Cached workout generation response for: ${userId}`);
    }
    return originalJson(data);
  };
  
  next();
};

// Get cache statistics
export const getCacheStats = () => {
  const hitRate = cacheMetrics.hits + cacheMetrics.misses > 0
    ? (cacheMetrics.hits / (cacheMetrics.hits + cacheMetrics.misses)) * 100
    : 0;
    
  return {
    ...cacheMetrics,
    hitRate: Math.round(hitRate * 100) / 100,
    size: workoutGenerationCache.size,
    memoryUsage: process.memoryUsage().heapUsed
  };
};