import { logger } from '../utils/logger';

interface CacheItem {
  data: any;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  tags?: string[];
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  memoryUsage: number;
  totalItems: number;
}

export class CacheService {
  private cache = new Map<string, CacheItem>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    memoryUsage: 0,
    totalItems: 0
  };
  
  // Maximum cache size (items)
  private maxSize = 1000;
  
  // Cache categories with different TTLs
  private categoryDefaults = {
    food_search: { ttl: 5 * 60 * 1000, tags: ['food', 'search'] }, // 5 minutes
    food_barcode: { ttl: 10 * 60 * 1000, tags: ['food', 'barcode'] }, // 10 minutes
    meal_plan: { ttl: 60 * 60 * 1000, tags: ['meal', 'plan'] }, // 1 hour
    workout_plan: { ttl: 30 * 60 * 1000, tags: ['workout', 'plan'] }, // 30 minutes
    user_profile: { ttl: 15 * 60 * 1000, tags: ['user', 'profile'] }, // 15 minutes
    stripe_data: { ttl: 30 * 60 * 1000, tags: ['stripe', 'payment'] }, // 30 minutes
    wger_exercise: { ttl: 24 * 60 * 60 * 1000, tags: ['wger', 'exercise'] }, // 24 hours
  };

  constructor() {
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
    
    // Log cache stats every 30 minutes
    setInterval(() => this.logStats(), 30 * 60 * 1000);
  }

  /**
   * Get an item from cache
   */
  get(key: string): any | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }
    
    // Check if expired
    if (Date.now() > item.timestamp + item.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.evictions++;
      return null;
    }
    
    // Update access stats
    item.accessCount++;
    item.lastAccessed = Date.now();
    this.stats.hits++;
    
    return item.data;
  }

  /**
   * Set an item in cache with automatic category detection
   */
  set(key: string, data: any, category?: string, customTtlMinutes?: number): void {
    // Detect category from key if not provided
    if (!category) {
      category = this.detectCategory(key);
    }
    
    const categoryConfig = this.categoryDefaults[category as keyof typeof this.categoryDefaults];
    const ttl = customTtlMinutes 
      ? customTtlMinutes * 60 * 1000 
      : categoryConfig?.ttl || 10 * 60 * 1000; // Default 10 minutes
    
    // Check if we need to evict items
    if (this.cache.size >= this.maxSize) {
      this.evictLeastRecentlyUsed();
    }
    
    const item: CacheItem = {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccessed: Date.now(),
      tags: categoryConfig?.tags || []
    };
    
    this.cache.set(key, item);
    this.updateStats();
    
    logger.info('Cache item set', {
      operation: 'cache_set',
      component: 'cache',
      metadata: {
        key,
        category,
        ttlMinutes: ttl / 60000,
        cacheSize: this.cache.size
      }
    });
  }

  /**
   * Delete an item from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.updateStats();
    }
    return deleted;
  }

  /**
   * Clear all cache entries or entries with specific tags
   */
  clear(tags?: string[]): number {
    if (!tags) {
      const size = this.cache.size;
      this.cache.clear();
      this.updateStats();
      return size;
    }
    
    let cleared = 0;
    for (const [key, item] of this.cache.entries()) {
      if (item.tags && tags.some(tag => item.tags!.includes(tag))) {
        this.cache.delete(key);
        cleared++;
      }
    }
    
    this.updateStats();
    return cleared;
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUp(): Promise<void> {
    logger.info('Starting cache warm-up', {
      operation: 'cache_warmup_start',
      component: 'cache'
    });
    
    // This would be called at application startup
    // For now, just log that we would warm up common searches
    const commonSearches = [
      'chicken', 'rice', 'apple', 'bread', 'milk', 'egg', 'banana', 'pasta'
    ];
    
    logger.info('Cache warm-up completed', {
      operation: 'cache_warmup_complete',
      component: 'cache',
      metadata: {
        plannedWarmups: commonSearches.length
      }
    });
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    
    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }

  /**
   * Get cache contents for debugging
   */
  getDebugInfo(): {
    totalItems: number;
    categories: Record<string, number>;
    topKeys: Array<{ key: string; accessCount: number; lastAccessed: Date }>;
    memoryEstimate: string;
  } {
    const categories: Record<string, number> = {};
    const items: Array<{ key: string; accessCount: number; lastAccessed: Date }> = [];
    
    for (const [key, item] of this.cache.entries()) {
      const category = this.detectCategory(key);
      categories[category] = (categories[category] || 0) + 1;
      items.push({
        key,
        accessCount: item.accessCount,
        lastAccessed: new Date(item.lastAccessed)
      });
    }
    
    // Sort by access count and take top 10
    const topKeys = items
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);
    
    // Estimate memory usage
    const memoryBytes = JSON.stringify(Array.from(this.cache.entries())).length;
    const memoryMB = (memoryBytes / 1024 / 1024).toFixed(2);
    
    return {
      totalItems: this.cache.size,
      categories,
      topKeys,
      memoryEstimate: `${memoryMB} MB`
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const before = this.cache.size;
    const now = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.timestamp + item.ttl) {
        this.cache.delete(key);
        this.stats.evictions++;
      }
    }
    
    const cleaned = before - this.cache.size;
    if (cleaned > 0) {
      this.updateStats();
      logger.info('Cache cleanup completed', {
        operation: 'cache_cleanup',
        component: 'cache',
        metadata: {
          itemsCleaned: cleaned,
          totalItems: this.cache.size
        }
      });
    }
  }

  /**
   * Evict least recently used items when cache is full
   */
  private evictLeastRecentlyUsed(): void {
    if (this.cache.size === 0) return;
    
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
      
      logger.info('Cache LRU eviction', {
        operation: 'cache_lru_eviction',
        component: 'cache',
        metadata: {
          evictedKey: oldestKey,
          cacheSize: this.cache.size
        }
      });
    }
  }

  /**
   * Detect cache category from key
   */
  private detectCategory(key: string): string {
    if (key.startsWith('food_search_')) return 'food_search';
    if (key.startsWith('food_barcode_')) return 'food_barcode';
    if (key.startsWith('meal_plan_')) return 'meal_plan';
    if (key.startsWith('workout_plan_')) return 'workout_plan';
    if (key.startsWith('user_profile_')) return 'user_profile';
    if (key.startsWith('stripe_')) return 'stripe_data';
    if (key.startsWith('wger_')) return 'wger_exercise';
    
    return 'generic';
  }

  /**
   * Update cache statistics
   */
  private updateStats(): void {
    this.stats.totalItems = this.cache.size;
    
    // Estimate memory usage
    let memoryBytes = 0;
    for (const item of this.cache.values()) {
      memoryBytes += JSON.stringify(item).length;
    }
    this.stats.memoryUsage = memoryBytes;
  }

  /**
   * Log cache statistics periodically
   */
  private logStats(): void {
    const stats = this.getStats();
    logger.info('Cache statistics', {
      operation: 'cache_stats',
      component: 'cache',
      metadata: {
        ...stats,
        memoryMB: (stats.memoryUsage / 1024 / 1024).toFixed(2)
      }
    });
  }
}

// Export singleton instance
export const cacheService = new CacheService();