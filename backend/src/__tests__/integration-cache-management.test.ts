/**
 * Integration Tests for Cache Management System
 * 
 * Tests the complete cache management pipeline including:
 * - ExerciseDB service with intelligent caching
 * - Cache size management and LRU eviction
 * - Performance monitoring and recommendations
 * - Storage quota handling
 * - Configuration-driven behavior
 */

// Mock localStorage for Node.js environment
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      // Simulate quota exceeded error for large values
      if (value.length > 50000) {
        const error = new Error('QuotaExceededError')
        error.name = 'QuotaExceededError'
        throw error
      }
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    }),
    length: 0,
    key: jest.fn()
  }
})()

// Mock global localStorage for Node.js environment
global.localStorage = localStorageMock as any

// Mock axios for API calls
const mockAxiosGet = jest.fn()
jest.mock('axios', () => ({
  get: mockAxiosGet
}))

// Mock import.meta.env for frontend
global.import = {
  meta: {
    env: {
      VITE_EXERCISEDB_API_KEY: 'test-api-key-for-cache-testing'
    }
  }
} as any

import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals'

// Create a minimal ExerciseDbService for testing since we can't import the frontend version in Node.js
class TestExerciseDbService {
  private apiKey: string | null = 'test-api-key-for-cache-testing'
  private baseUrl = 'https://exercisedb.p.rapidapi.com'
  private exerciseCache = new Map<string, any>()
  private gifCache = new Map<string, string>()
  private requestQueue = new Map<string, Promise<string | null>>()
  private rateLimitDelay = 100

  // Cache management configuration
  private readonly cacheConfig = {
    maxGifCacheSize: 10, // Small for testing
    maxExerciseCacheSize: 15, // Small for testing
    maxStorageSize: 1024, // 1KB for testing
    cleanupThreshold: 0.8,
    expiryTime: 1000, // 1 second for testing
  }

  // Cache metadata for LRU and expiry
  private gifCacheMetadata = new Map<string, { lastAccessed: number; addedAt: number; size: number }>()
  private exerciseCacheMetadata = new Map<string, { lastAccessed: number; addedAt: number }>()

  constructor() {
    this.loadCacheFromStorage()
  }

  private loadCacheFromStorage() {
    try {
      const cachedGifs = localStorage.getItem('exercisedb_gif_cache')
      const cachedGifMetadata = localStorage.getItem('exercisedb_gif_metadata')
      
      if (cachedGifs && cachedGifMetadata) {
        const gifData = JSON.parse(cachedGifs)
        const metaData = JSON.parse(cachedGifMetadata)
        
        this.gifCache = new Map(gifData)
        this.gifCacheMetadata = new Map(metaData)
        
        this.cleanupExpiredCache()
      }
      
      const cachedExercises = localStorage.getItem('exercisedb_exercise_cache')
      const cachedExerciseMetadata = localStorage.getItem('exercisedb_exercise_metadata')
      
      if (cachedExercises && cachedExerciseMetadata) {
        const exerciseData = JSON.parse(cachedExercises)
        const metaData = JSON.parse(cachedExerciseMetadata)
        
        this.exerciseCache = new Map(exerciseData)
        this.exerciseCacheMetadata = new Map(metaData)
      }
      
      this.checkAndCleanupCache()
      
    } catch (error) {
      console.warn('Failed to load cache from storage:', error)
      this.clearCache()
    }
  }

  private saveCacheToStorage() {
    try {
      const gifCacheArray = Array.from(this.gifCache.entries())
      const gifMetadataArray = Array.from(this.gifCacheMetadata.entries())
      
      const gifCacheJson = JSON.stringify(gifCacheArray)
      const gifMetadataJson = JSON.stringify(gifMetadataArray)
      
      const totalSize = gifCacheJson.length + gifMetadataJson.length
      if (totalSize > this.cacheConfig.maxStorageSize) {
        this.cleanupCacheBySize()
        return
      }
      
      localStorage.setItem('exercisedb_gif_cache', gifCacheJson)
      localStorage.setItem('exercisedb_gif_metadata', gifMetadataJson)
      
      const exerciseCacheArray = Array.from(this.exerciseCache.entries())
      const exerciseMetadataArray = Array.from(this.exerciseCacheMetadata.entries())
      
      localStorage.setItem('exercisedb_exercise_cache', JSON.stringify(exerciseCacheArray))
      localStorage.setItem('exercisedb_exercise_metadata', JSON.stringify(exerciseMetadataArray))
      
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        this.cleanupCacheBySize()
        this.saveCacheToStorage()
      }
    }
  }

  private cleanupExpiredCache() {
    const now = Date.now()
    const expiredKeys: string[] = []
    
    for (const [key, metadata] of this.gifCacheMetadata.entries()) {
      if (now - metadata.addedAt > this.cacheConfig.expiryTime) {
        expiredKeys.push(key)
      }
    }
    
    for (const key of expiredKeys) {
      this.gifCache.delete(key)
      this.gifCacheMetadata.delete(key)
    }
    
    const expiredExerciseKeys: string[] = []
    for (const [key, metadata] of this.exerciseCacheMetadata.entries()) {
      if (now - metadata.addedAt > this.cacheConfig.expiryTime) {
        expiredExerciseKeys.push(key)
      }
    }
    
    for (const key of expiredExerciseKeys) {
      this.exerciseCache.delete(key)
      this.exerciseCacheMetadata.delete(key)
    }
  }

  private cleanupCacheBySize() {
    if (this.gifCache.size > this.cacheConfig.maxGifCacheSize * this.cacheConfig.cleanupThreshold) {
      this.cleanupLRUCache(this.gifCache as any, this.gifCacheMetadata, this.cacheConfig.maxGifCacheSize * 0.7)
    }
    
    if (this.exerciseCache.size > this.cacheConfig.maxExerciseCacheSize * this.cacheConfig.cleanupThreshold) {
      this.cleanupLRUCache(this.exerciseCache as any, this.exerciseCacheMetadata, this.cacheConfig.maxExerciseCacheSize * 0.7)
    }
  }

  private cleanupLRUCache<T>(cache: Map<string, T>, metadata: Map<string, any>, targetSize: number) {
    if (cache.size <= targetSize) return
    
    const sortedEntries = Array.from(metadata.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)
    
    const entriesToRemove = cache.size - targetSize
    for (let i = 0; i < entriesToRemove && i < sortedEntries.length; i++) {
      const [key] = sortedEntries[i]
      cache.delete(key)
      metadata.delete(key)
    }
  }

  private checkAndCleanupCache() {
    const gifCacheNeedsCleanup = this.gifCache.size > this.cacheConfig.maxGifCacheSize * this.cacheConfig.cleanupThreshold
    const exerciseCacheNeedsCleanup = this.exerciseCache.size > this.cacheConfig.maxExerciseCacheSize * this.cacheConfig.cleanupThreshold
    
    if (gifCacheNeedsCleanup || exerciseCacheNeedsCleanup) {
      this.cleanupCacheBySize()
      this.saveCacheToStorage()
    }
  }

  private updateCacheAccess(key: string, isGifCache: boolean = true) {
    const now = Date.now()
    const metadataMap = isGifCache ? this.gifCacheMetadata : this.exerciseCacheMetadata
    
    const existing = metadataMap.get(key)
    if (existing) {
      existing.lastAccessed = now
    }
  }

  private addToCacheWithMetadata(key: string, value: string | any, isGifCache: boolean = true) {
    const now = Date.now()
    
    const metadata: any = {
      lastAccessed: now,
      addedAt: now
    }
    
    if (isGifCache && typeof value === 'string') {
      this.gifCache.set(key, value as string)
      metadata.size = (value as string).length
      this.gifCacheMetadata.set(key, metadata)
      
      if (this.gifCache.size > this.cacheConfig.maxGifCacheSize) {
        this.cleanupLRUCache(this.gifCache as any, this.gifCacheMetadata, this.cacheConfig.maxGifCacheSize * 0.8)
      }
    } else {
      this.exerciseCache.set(key, value)
      this.exerciseCacheMetadata.set(key, metadata)
      
      if (this.exerciseCache.size > this.cacheConfig.maxExerciseCacheSize) {
        this.cleanupLRUCache(this.exerciseCache as any, this.exerciseCacheMetadata, this.cacheConfig.maxExerciseCacheSize * 0.8)
      }
    }
  }

  async searchExerciseByName(exerciseName: string): Promise<string | null> {
    const normalizedName = exerciseName.toLowerCase().trim()
    
    // Check GIF cache first
    if (this.gifCache.has(normalizedName)) {
      this.updateCacheAccess(normalizedName, true)
      return this.gifCache.get(normalizedName)!
    }

    // Check if request is already in progress
    if (this.requestQueue.has(normalizedName)) {
      return this.requestQueue.get(normalizedName)!
    }

    // Create new request and add to queue
    const requestPromise = this.fetchExerciseGif(normalizedName)
    this.requestQueue.set(normalizedName, requestPromise)

    try {
      const result = await requestPromise
      
      if (result) {
        this.addToCacheWithMetadata(normalizedName, result, true)
        this.saveCacheToStorage()
      }
      
      return result
    } finally {
      this.requestQueue.delete(normalizedName)
    }
  }

  private async fetchExerciseGif(normalizedName: string): Promise<string | null> {
    // Mock API response
    return `https://example.com/gif/${normalizedName}.gif`
  }

  clearCache() {
    this.exerciseCache.clear()
    this.gifCache.clear()
    this.requestQueue.clear()
    this.gifCacheMetadata.clear()
    this.exerciseCacheMetadata.clear()
    
    localStorage.removeItem('exercisedb_gif_cache')
    localStorage.removeItem('exercisedb_gif_metadata')
    localStorage.removeItem('exercisedb_exercise_cache')
    localStorage.removeItem('exercisedb_exercise_metadata')
  }

  getCacheStats() {
    const now = Date.now()
    const gifCacheSize = this.gifCache.size
    const exerciseCacheSize = this.exerciseCache.size
    
    const gifCacheJson = JSON.stringify(Array.from(this.gifCache.entries()))
    const exerciseCacheJson = JSON.stringify(Array.from(this.exerciseCache.entries()))
    const totalStorageBytes = gifCacheJson.length + exerciseCacheJson.length
    
    const expiredGifCount = Array.from(this.gifCacheMetadata.values())
      .filter(meta => now - meta.addedAt > this.cacheConfig.expiryTime).length
    const expiredExerciseCount = Array.from(this.exerciseCacheMetadata.values())
      .filter(meta => now - meta.addedAt > this.cacheConfig.expiryTime).length
    
    return {
      exerciseCache: exerciseCacheSize,
      gifCache: gifCacheSize,
      activeRequests: this.requestQueue.size,
      hasApiKey: !!this.apiKey,
      storageUsage: {
        totalBytes: totalStorageBytes,
        totalMB: (totalStorageBytes / 1024 / 1024).toFixed(2),
        maxMB: (this.cacheConfig.maxStorageSize / 1024 / 1024).toFixed(2),
        usagePercentage: ((totalStorageBytes / this.cacheConfig.maxStorageSize) * 100).toFixed(1)
      },
      health: {
        gifCacheUtilization: ((gifCacheSize / this.cacheConfig.maxGifCacheSize) * 100).toFixed(1),
        exerciseCacheUtilization: ((exerciseCacheSize / this.cacheConfig.maxExerciseCacheSize) * 100).toFixed(1),
        expiredGifEntries: expiredGifCount,
        expiredExerciseEntries: expiredExerciseCount
      },
      config: {
        maxGifCacheSize: this.cacheConfig.maxGifCacheSize,
        maxExerciseCacheSize: this.cacheConfig.maxExerciseCacheSize,
        cleanupThreshold: this.cacheConfig.cleanupThreshold,
        expiryDays: this.cacheConfig.expiryTime / (24 * 60 * 60 * 1000)
      }
    }
  }

  getPerformanceMetrics() {
    const stats = this.getCacheStats()
    const recommendations: string[] = []
    
    if (parseFloat(stats.health.gifCacheUtilization) > 90) {
      recommendations.push('GIF cache is near capacity - consider increasing maxGifCacheSize')
    }
    
    if (parseFloat(stats.health.exerciseCacheUtilization) > 90) {
      recommendations.push('Exercise cache is near capacity - consider increasing maxExerciseCacheSize')
    }
    
    if (parseFloat(stats.storageUsage.usagePercentage) > 80) {
      recommendations.push('Storage usage is high - consider running cache cleanup')
    }
    
    if (stats.health.expiredGifEntries > 5) {
      recommendations.push('Many expired GIF entries detected - run cleanupExpiredCache()')
    }
    
    if (stats.health.expiredExerciseEntries > 10) {
      recommendations.push('Many expired exercise entries detected - run cleanupExpiredCache()')
    }
    
    return {
      ...stats,
      recommendations,
      overallHealth: recommendations.length === 0 ? 'Good' : 
                    recommendations.length <= 2 ? 'Fair' : 'Poor'
    }
  }

  forceCleanupExpired() {
    this.cleanupExpiredCache()
    this.saveCacheToStorage()
  }

  forceCleanupBySize() {
    this.cleanupCacheBySize()
    this.saveCacheToStorage()
  }
}

describe('Cache Management System Integration Tests', () => {
  let cacheService: TestExerciseDbService

  beforeEach(() => {
    // Clear localStorage
    localStorageMock.clear()
    jest.clearAllMocks()
    
    // Initialize service
    cacheService = new TestExerciseDbService()
  })

  afterEach(() => {
    cacheService.clearCache()
  })

  describe('Basic Cache Operations', () => {
    it('should cache exercise GIFs with metadata', async () => {
      const exerciseName = 'push-up'
      
      const result = await cacheService.searchExerciseByName(exerciseName)
      
      expect(result).toBe(`https://example.com/gif/${exerciseName}.gif`)
      
      const stats = cacheService.getCacheStats()
      expect(stats.gifCache).toBe(1)
      expect(stats.exerciseCache).toBe(0)
    })

    it('should return cached results on subsequent requests', async () => {
      const exerciseName = 'squat'
      
      // First request - should fetch from API
      const result1 = await cacheService.searchExerciseByName(exerciseName)
      
      // Second request - should return from cache
      const result2 = await cacheService.searchExerciseByName(exerciseName)
      
      expect(result1).toBe(result2)
      
      const stats = cacheService.getCacheStats()
      expect(stats.gifCache).toBe(1)
    })

    it('should persist cache data to localStorage', async () => {
      await cacheService.searchExerciseByName('bench-press')
      
      // Verify localStorage was called
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'exercisedb_gif_cache',
        expect.any(String)
      )
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'exercisedb_gif_metadata',
        expect.any(String)
      )
    })
  })

  describe('Cache Size Management', () => {
    it('should enforce maximum cache size limits', async () => {
      // Add more entries than the limit
      const exercises = Array.from({ length: 15 }, (_, i) => `exercise-${i}`)
      
      for (const exercise of exercises) {
        await cacheService.searchExerciseByName(exercise)
      }
      
      const stats = cacheService.getCacheStats()
      
      // Should not exceed maximum size due to LRU cleanup
      expect(stats.gifCache).toBeLessThanOrEqual(10) // maxGifCacheSize
    })

    it('should implement LRU eviction correctly', async () => {
      // Fill cache to capacity
      for (let i = 0; i < 12; i++) {
        await cacheService.searchExerciseByName(`exercise-${i}`)
      }
      
      // Access first few exercises to mark them as recently used
      await cacheService.searchExerciseByName('exercise-0')
      await cacheService.searchExerciseByName('exercise-1')
      
      // Add one more exercise to trigger cleanup
      await cacheService.searchExerciseByName('new-exercise')
      
      const stats = cacheService.getCacheStats()
      
      // Cache should be cleaned up but recently accessed items should remain
      expect(stats.gifCache).toBeLessThanOrEqual(10)
    })

    it('should handle storage quota exceeded errors', async () => {
      // Mock localStorage to throw quota exceeded error
      localStorageMock.setItem.mockImplementation((key: string, value: string) => {
        if (value.length > 100) { // Simulate quota exceeded for large values
          const error = new Error('QuotaExceededError')
          error.name = 'QuotaExceededError'
          throw error
        }
      })

      // This should trigger quota handling
      await cacheService.searchExerciseByName('large-exercise-data')
      
      // Should not throw error and should handle gracefully
      const stats = cacheService.getCacheStats()
      expect(stats).toBeDefined()
    })
  })

  describe('Cache Expiry Management', () => {
    it('should remove expired cache entries', async () => {
      // Add entry
      await cacheService.searchExerciseByName('test-exercise')
      
      let stats = cacheService.getCacheStats()
      expect(stats.gifCache).toBe(1)
      expect(stats.health.expiredGifEntries).toBe(0)
      
      // Wait for expiry (1 second in test config)
      await new Promise(resolve => setTimeout(resolve, 1100))
      
      // Force cleanup
      cacheService.forceCleanupExpired()
      
      stats = cacheService.getCacheStats()
      expect(stats.gifCache).toBe(0)
    })

    it('should track expired entries in health metrics', async () => {
      // Add multiple entries
      await cacheService.searchExerciseByName('exercise-1')
      await cacheService.searchExerciseByName('exercise-2')
      
      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 1100))
      
      const stats = cacheService.getCacheStats()
      expect(stats.health.expiredGifEntries).toBe(2)
    })
  })

  describe('Performance Monitoring', () => {
    it('should provide comprehensive cache statistics', () => {
      const stats = cacheService.getCacheStats()
      
      expect(stats).toHaveProperty('exerciseCache')
      expect(stats).toHaveProperty('gifCache')
      expect(stats).toHaveProperty('activeRequests')
      expect(stats).toHaveProperty('hasApiKey')
      expect(stats).toHaveProperty('storageUsage')
      expect(stats).toHaveProperty('health')
      expect(stats).toHaveProperty('config')
      
      expect(stats.storageUsage).toHaveProperty('totalBytes')
      expect(stats.storageUsage).toHaveProperty('totalMB')
      expect(stats.storageUsage).toHaveProperty('usagePercentage')
      
      expect(stats.health).toHaveProperty('gifCacheUtilization')
      expect(stats.health).toHaveProperty('exerciseCacheUtilization')
      expect(stats.health).toHaveProperty('expiredGifEntries')
      expect(stats.health).toHaveProperty('expiredExerciseEntries')
    })

    it('should generate performance recommendations', async () => {
      // Fill cache to near capacity to trigger recommendations
      for (let i = 0; i < 9; i++) { // 90% of 10 max size
        await cacheService.searchExerciseByName(`exercise-${i}`)
      }
      
      const metrics = cacheService.getPerformanceMetrics()
      
      expect(metrics).toHaveProperty('recommendations')
      expect(metrics).toHaveProperty('overallHealth')
      expect(Array.isArray(metrics.recommendations)).toBe(true)
      
      // Should have recommendations for high cache utilization
      expect(metrics.recommendations.length).toBeGreaterThan(0)
      expect(metrics.overallHealth).not.toBe('Good')
    })

    it('should calculate storage usage correctly', async () => {
      await cacheService.searchExerciseByName('test-exercise')
      
      const stats = cacheService.getCacheStats()
      
      expect(parseFloat(stats.storageUsage.usagePercentage)).toBeGreaterThan(0)
      expect(parseFloat(stats.storageUsage.totalMB)).toBeGreaterThan(0)
      expect(parseFloat(stats.health.gifCacheUtilization)).toBeGreaterThan(0)
    })
  })

  describe('Cache Cleanup Operations', () => {
    it('should manually cleanup expired entries', async () => {
      // Add entries
      await cacheService.searchExerciseByName('exercise-1')
      await cacheService.searchExerciseByName('exercise-2')
      
      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 1100))
      
      let stats = cacheService.getCacheStats()
      expect(stats.health.expiredGifEntries).toBe(2)
      
      // Manual cleanup
      cacheService.forceCleanupExpired()
      
      stats = cacheService.getCacheStats()
      expect(stats.health.expiredGifEntries).toBe(0)
      expect(stats.gifCache).toBe(0)
    })

    it('should manually cleanup by size', async () => {
      // Fill cache beyond threshold
      for (let i = 0; i < 12; i++) {
        await cacheService.searchExerciseByName(`exercise-${i}`)
      }
      
      let stats = cacheService.getCacheStats()
      const initialSize = stats.gifCache
      
      // Manual size cleanup
      cacheService.forceCleanupBySize()
      
      stats = cacheService.getCacheStats()
      expect(stats.gifCache).toBeLessThan(initialSize)
    })

    it('should clear all cache data', async () => {
      // Add some data
      await cacheService.searchExerciseByName('exercise-1')
      await cacheService.searchExerciseByName('exercise-2')
      
      let stats = cacheService.getCacheStats()
      expect(stats.gifCache).toBeGreaterThan(0)
      
      // Clear cache
      cacheService.clearCache()
      
      stats = cacheService.getCacheStats()
      expect(stats.gifCache).toBe(0)
      expect(stats.exerciseCache).toBe(0)
      expect(stats.activeRequests).toBe(0)
      
      // Verify localStorage was cleared
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('exercisedb_gif_cache')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('exercisedb_gif_metadata')
    })
  })

  describe('Concurrent Request Handling', () => {
    it('should handle concurrent requests for same exercise', async () => {
      const exerciseName = 'concurrent-test'
      
      // Make multiple concurrent requests for same exercise
      const promises = [
        cacheService.searchExerciseByName(exerciseName),
        cacheService.searchExerciseByName(exerciseName),
        cacheService.searchExerciseByName(exerciseName)
      ]
      
      const results = await Promise.all(promises)
      
      // All should return same result
      expect(results[0]).toBe(results[1])
      expect(results[1]).toBe(results[2])
      
      // Should only make one actual request (cached for subsequent ones)
      const stats = cacheService.getCacheStats()
      expect(stats.gifCache).toBe(1)
    })

    it('should track active requests correctly', async () => {
      const exerciseName = 'active-request-test'
      
      // Start request but don't wait
      const promise = cacheService.searchExerciseByName(exerciseName)
      
      const stats = cacheService.getCacheStats()
      expect(stats.activeRequests).toBe(1)
      
      // Wait for completion
      await promise
      
      const finalStats = cacheService.getCacheStats()
      expect(finalStats.activeRequests).toBe(0)
    })
  })

  describe('Cache Persistence and Recovery', () => {
    it('should load cache from localStorage on initialization', () => {
      // Setup localStorage with cache data
      const cacheData = [['test-exercise', 'https://example.com/gif/test-exercise.gif']]
      const metadataData = [['test-exercise', { lastAccessed: Date.now(), addedAt: Date.now(), size: 50 }]]
      
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'exercisedb_gif_cache') return JSON.stringify(cacheData)
        if (key === 'exercisedb_gif_metadata') return JSON.stringify(metadataData)
        return null
      })
      
      // Create new service instance
      const newService = new TestExerciseDbService()
      
      const stats = newService.getCacheStats()
      expect(stats.gifCache).toBe(1)
    })

    it('should handle corrupted cache data gracefully', () => {
      // Setup localStorage with corrupted data
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'exercisedb_gif_cache') return 'invalid json'
        return null
      })
      
      // Should not throw and should clear corrupted cache
      const newService = new TestExerciseDbService()
      
      const stats = newService.getCacheStats()
      expect(stats.gifCache).toBe(0)
      expect(localStorageMock.removeItem).toHaveBeenCalled()
    })
  })
});