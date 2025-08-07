interface CacheItem {
  data: any;
  timestamp: number;
  ttl: number;
  accessCount: number;
}

interface CacheConfig {
  maxSize: number;
  defaultTtlMinutes: number;
  storagePrefix: string;
}

class FrontendCacheService {
  private cache = new Map<string, CacheItem>();
  private config: CacheConfig = {
    maxSize: 100, // Frontend cache is smaller than backend
    defaultTtlMinutes: 5,
    storagePrefix: 'fitarch_cache_'
  };

  constructor() {
    // Load cache from localStorage on initialization
    this.loadFromStorage();
    
    // Clean up expired entries every 2 minutes
    setInterval(() => this.cleanup(), 2 * 60 * 1000);
    
    // Save to localStorage every 30 seconds
    setInterval(() => this.saveToStorage(), 30 * 1000);
  }

  /**
   * Get item from cache
   */
  get(key: string): any | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    // Check if expired
    if (Date.now() > item.timestamp + item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    // Update access count
    item.accessCount++;
    
    return item.data;
  }

  /**
   * Set item in cache
   */
  set(key: string, data: any, ttlMinutes?: number): void {
    // Check cache size limit
    if (this.cache.size >= this.config.maxSize) {
      this.evictLeastRecentlyUsed();
    }
    
    const ttl = (ttlMinutes || this.config.defaultTtlMinutes) * 60 * 1000;
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 0
    });
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.clearStorage();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    hitRate: number;
    memoryEstimate: string;
  } {
    const memoryBytes = JSON.stringify(Array.from(this.cache.entries())).length;
    const memoryKB = (memoryBytes / 1024).toFixed(2);
    
    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses for accurate calculation
      memoryEstimate: `${memoryKB} KB`
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const expired: string[] = [];
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.timestamp + item.ttl) {
        expired.push(key);
      }
    }
    
    expired.forEach(key => this.cache.delete(key));
    
    // Cleaned up expired cache items
  }

  /**
   * Evict least recently used item
   */
  private evictLeastRecentlyUsed(): void {
    let lruKey = '';
    let lruCount = Infinity;
    
    for (const [key, item] of this.cache.entries()) {
      if (item.accessCount < lruCount) {
        lruCount = item.accessCount;
        lruKey = key;
      }
    }
    
    if (lruKey) {
      this.cache.delete(lruKey);
      // Evicted least recently used cache item
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveToStorage(): void {
    try {
      const cacheArray = Array.from(this.cache.entries());
      const cacheData = {
        entries: cacheArray,
        savedAt: Date.now()
      };
      
      localStorage.setItem(
        `${this.config.storagePrefix}main`,
        JSON.stringify(cacheData)
      );
    } catch (error) {
      console.warn('Failed to save cache to localStorage:', error);
    }
  }

  /**
   * Load cache from localStorage
   */
  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem(`${this.config.storagePrefix}main`);
      if (!saved) return;
      
      const cacheData = JSON.parse(saved);
      const now = Date.now();
      
      // Only load if saved within last hour
      if (now - cacheData.savedAt > 60 * 60 * 1000) {
        this.clearStorage();
        return;
      }
      
      // Restore cache entries, filtering out expired ones
      for (const [key, item] of cacheData.entries) {
        if (now < item.timestamp + item.ttl) {
          this.cache.set(key, item);
        }
      }
      
      console.log(`📦 Loaded ${this.cache.size} items from frontend cache`);
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error);
      this.clearStorage();
    }
  }

  /**
   * Clear cache from localStorage
   */
  private clearStorage(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.config.storagePrefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear cache from localStorage:', error);
    }
  }
}

// Export singleton instance
export const frontendCache = new FrontendCacheService();

// Convenience functions with automatic key prefixing
export const foodSearchCache = {
  get: (query: string, page: number = 1): any | null => 
    frontendCache.get(`food_search_${query.toLowerCase()}_${page}`),
  
  set: (query: string, page: number = 1, data: any): void => 
    frontendCache.set(`food_search_${query.toLowerCase()}_${page}`, data, 3), // 3 minute TTL
  
  clear: (): void => {
    const keys = Array.from((frontendCache as any).cache.keys());
    keys.forEach((key: string) => {
      if (key.startsWith('food_search_')) {
        frontendCache.delete(key);
      }
    });
  }
};

export const barcodeCache = {
  get: (barcode: string): any | null => 
    frontendCache.get(`barcode_${barcode}`),
  
  set: (barcode: string, data: any): void => 
    frontendCache.set(`barcode_${barcode}`, data, 15), // 15 minute TTL
  
  clear: (): void => {
    const keys = Array.from((frontendCache as any).cache.keys());
    keys.forEach((key: string) => {
      if (key.startsWith('barcode_')) {
        frontendCache.delete(key);
      }
    });
  }
};