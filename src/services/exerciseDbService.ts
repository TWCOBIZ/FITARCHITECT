import axios from 'axios'
import { configService, getApiKey, isServiceAvailable } from './configService'
import { logger } from '../utils/logger'

interface ExerciseDbExercise {
  id: string
  name: string
  target: string
  equipment: string
  bodyPart: string
  gifUrl: string
}

interface GifSearchResult {
  gifUrl: string | null
  isLoading: boolean
  error: string | null
  source: 'api' | 'fallback' | 'cache'
}

class ExerciseDbService {
  private apiKey: string | null = null
  private baseUrl = 'https://exercisedb.p.rapidapi.com'
  private exerciseCache = new Map<string, ExerciseDbExercise>()
  private gifCache = new Map<string, string>()
  private requestQueue = new Map<string, Promise<string | null>>()
  private rateLimitDelay = 100 // ms between requests
  
  // Cache management configuration
  private readonly cacheConfig = {
    maxGifCacheSize: 500, // Maximum number of GIFs to cache
    maxExerciseCacheSize: 1000, // Maximum number of exercises to cache
    maxStorageSize: 5 * 1024 * 1024, // 5MB localStorage limit
    cleanupThreshold: 0.8, // Clean up when 80% full
    expiryTime: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  }
  
  // Cache metadata for LRU and expiry
  private gifCacheMetadata = new Map<string, { lastAccessed: number; addedAt: number; size: number }>()
  private exerciseCacheMetadata = new Map<string, { lastAccessed: number; addedAt: number }>()
  
  constructor() {
    // Use centralized configuration service for API key
    this.apiKey = getApiKey('exercisedb')
    
    const serviceStatus = isServiceAvailable('exercisedb')
    logger.workout.info('ExerciseDB Service initialized', {
      hasApiKey: !!this.apiKey,
      serviceAvailable: serviceStatus,
      apiKeyLength: this.apiKey?.length || 0,
      apiKeyPrefix: this.apiKey ? `${this.apiKey.substring(0, 8)}...` : 'None',
      fallbackMode: !serviceStatus
    })
    
    // Verify API key meets requirements
    if (this.apiKey && this.apiKey.length >= 20) {
      logger.workout.info('✅ ExerciseDB API key validated successfully')
    } else if (this.apiKey) {
      logger.workout.warn('⚠️ ExerciseDB API key appears invalid (too short)')
    }
    
    if (!this.apiKey) {
      logger.workout.warn('ExerciseDB API key not configured - GIFs will not be available')
      logger.workout.warn('Add VITE_EXERCISEDB_API_KEY to your .env file to enable exercise GIFs')
    } else if (!serviceStatus) {
      logger.workout.warn('ExerciseDB API not available - will use fallback GIFs only')
    }
    
    this.loadCacheFromStorage()
    
    // Clean up corrupted cache entries with broken v2.exercisedb.io URLs
    this.cleanupCorruptedCache()
    
    // Force clean any remaining broken cache if API key is available
    if (this.apiKey) {
      this.forceCleanBrokenCache()
    }
  }

  setApiKey(key: string) {
    this.apiKey = key
    logger.workout.info('ExerciseDB API key configured successfully')
  }

  // Enhanced cache management with size limits and expiry
  private loadCacheFromStorage() {
    try {
      // Load GIF cache
      const cachedGifs = localStorage.getItem('exercisedb_gif_cache')
      const cachedGifMetadata = localStorage.getItem('exercisedb_gif_metadata')
      
      if (cachedGifs && cachedGifMetadata) {
        const gifData = JSON.parse(cachedGifs)
        const metaData = JSON.parse(cachedGifMetadata)
        
        this.gifCache = new Map(gifData)
        this.gifCacheMetadata = new Map(metaData)
        
        // Clean up expired entries
        this.cleanupExpiredCache()
        
        logger.workout.debug(`Loaded ${this.gifCache.size} cached exercise GIFs`)
      }
      
      // Load exercise cache
      const cachedExercises = localStorage.getItem('exercisedb_exercise_cache')
      const cachedExerciseMetadata = localStorage.getItem('exercisedb_exercise_metadata')
      
      if (cachedExercises && cachedExerciseMetadata) {
        const exerciseData = JSON.parse(cachedExercises)
        const metaData = JSON.parse(cachedExerciseMetadata)
        
        this.exerciseCache = new Map(exerciseData)
        this.exerciseCacheMetadata = new Map(metaData)
        
        logger.workout.debug(`Loaded ${this.exerciseCache.size} cached exercises`)
      }
      
      // Check if cleanup is needed
      this.checkAndCleanupCache()
      
    } catch (error) {
      console.warn('Failed to load cache from storage:', error)
      this.clearCache() // Clear corrupted cache
    }
  }

  private saveCacheToStorage() {
    try {
      // Save GIF cache and metadata
      const gifCacheArray = Array.from(this.gifCache.entries())
      const gifMetadataArray = Array.from(this.gifCacheMetadata.entries())
      
      const gifCacheJson = JSON.stringify(gifCacheArray)
      const gifMetadataJson = JSON.stringify(gifMetadataArray)
      
      // Check storage size before saving
      const totalSize = gifCacheJson.length + gifMetadataJson.length
      if (totalSize > this.cacheConfig.maxStorageSize) {
        console.warn('Cache size exceeds limit, performing cleanup')
        this.cleanupCacheBySize()
        return // Try saving again after cleanup
      }
      
      localStorage.setItem('exercisedb_gif_cache', gifCacheJson)
      localStorage.setItem('exercisedb_gif_metadata', gifMetadataJson)
      
      // Save exercise cache and metadata
      const exerciseCacheArray = Array.from(this.exerciseCache.entries())
      const exerciseMetadataArray = Array.from(this.exerciseCacheMetadata.entries())
      
      localStorage.setItem('exercisedb_exercise_cache', JSON.stringify(exerciseCacheArray))
      localStorage.setItem('exercisedb_exercise_metadata', JSON.stringify(exerciseMetadataArray))
      
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, cleaning up cache')
        this.cleanupCacheBySize()
        this.saveCacheToStorage() // Retry after cleanup
      } else {
        console.warn('Failed to save cache to storage:', error)
      }
    }
  }

  private async withRateLimit<T>(operation: () => Promise<T>): Promise<T> {
    await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay))
    return operation()
  }

  // Cache cleanup methods
  private cleanupExpiredCache() {
    const now = Date.now()
    const expiredKeys: string[] = []
    
    // Check GIF cache for expired entries
    for (const [key, metadata] of this.gifCacheMetadata.entries()) {
      if (now - metadata.addedAt > this.cacheConfig.expiryTime) {
        expiredKeys.push(key)
      }
    }
    
    // Remove expired GIF entries
    for (const key of expiredKeys) {
      this.gifCache.delete(key)
      this.gifCacheMetadata.delete(key)
    }
    
    if (expiredKeys.length > 0) {
      console.log(`Cleaned up ${expiredKeys.length} expired GIF cache entries`)
    }
    
    // Check exercise cache for expired entries
    const expiredExerciseKeys: string[] = []
    for (const [key, metadata] of this.exerciseCacheMetadata.entries()) {
      if (now - metadata.addedAt > this.cacheConfig.expiryTime) {
        expiredExerciseKeys.push(key)
      }
    }
    
    // Remove expired exercise entries
    for (const key of expiredExerciseKeys) {
      this.exerciseCache.delete(key)
      this.exerciseCacheMetadata.delete(key)
    }
    
    if (expiredExerciseKeys.length > 0) {
      console.log(`Cleaned up ${expiredExerciseKeys.length} expired exercise cache entries`)
    }
  }

  private cleanupCacheBySize() {
    // Clean up GIF cache if over size limit
    if (this.gifCache.size > this.cacheConfig.maxGifCacheSize * this.cacheConfig.cleanupThreshold) {
      this.cleanupLRUCache(this.gifCache, this.gifCacheMetadata, this.cacheConfig.maxGifCacheSize * 0.7)
      console.log(`GIF cache cleaned up to ${this.gifCache.size} entries`)
    }
    
    // Clean up exercise cache if over size limit
    if (this.exerciseCache.size > this.cacheConfig.maxExerciseCacheSize * this.cacheConfig.cleanupThreshold) {
      this.cleanupLRUCache(this.exerciseCache, this.exerciseCacheMetadata, this.cacheConfig.maxExerciseCacheSize * 0.7)
      console.log(`Exercise cache cleaned up to ${this.exerciseCache.size} entries`)
    }
  }

  private cleanupLRUCache<T>(cache: Map<string, T>, metadata: Map<string, any>, targetSize: number) {
    if (cache.size <= targetSize) return
    
    // Sort by last accessed time (oldest first)
    const sortedEntries = Array.from(metadata.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)
    
    // Remove oldest entries until we reach target size
    const entriesToRemove = cache.size - targetSize
    for (let i = 0; i < entriesToRemove && i < sortedEntries.length; i++) {
      const [key] = sortedEntries[i]
      cache.delete(key)
      metadata.delete(key)
    }
  }

  private checkAndCleanupCache() {
    // Check if cleanup is needed based on thresholds
    const gifCacheNeedsCleanup = this.gifCache.size > this.cacheConfig.maxGifCacheSize * this.cacheConfig.cleanupThreshold
    const exerciseCacheNeedsCleanup = this.exerciseCache.size > this.cacheConfig.maxExerciseCacheSize * this.cacheConfig.cleanupThreshold
    
    if (gifCacheNeedsCleanup || exerciseCacheNeedsCleanup) {
      console.log('Cache size threshold reached, performing cleanup')
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

  private addToCacheWithMetadata(key: string, value: string | ExerciseDbExercise, isGifCache: boolean = true) {
    const now = Date.now()
    
    // Add metadata
    const metadata: any = {
      lastAccessed: now,
      addedAt: now
    }
    
    if (isGifCache && typeof value === 'string') {
      // Handle GIF cache
      this.gifCache.set(key, value as string)
      metadata.size = (value as string).length
      this.gifCacheMetadata.set(key, metadata)
      
      // Check if cleanup is needed
      if (this.gifCache.size > this.cacheConfig.maxGifCacheSize) {
        this.cleanupLRUCache(this.gifCache as any, this.gifCacheMetadata, this.cacheConfig.maxGifCacheSize * 0.8)
      }
    } else {
      // Handle exercise cache
      this.exerciseCache.set(key, value as ExerciseDbExercise)
      this.exerciseCacheMetadata.set(key, metadata)
      
      // Check if cleanup is needed
      if (this.exerciseCache.size > this.cacheConfig.maxExerciseCacheSize) {
        this.cleanupLRUCache(this.exerciseCache as any, this.exerciseCacheMetadata, this.cacheConfig.maxExerciseCacheSize * 0.8)
      }
    }
  }

  private get headers() {
    if (!this.apiKey) {
      console.warn('ExerciseDB API key not set. Using fallback images.')
      return {}
    }
    
    return {
      'X-RapidAPI-Key': this.apiKey,
      'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com'
    }
  }

  async searchExerciseByName(exerciseName: string): Promise<string | null> {
    if (!this.apiKey) {
      logger.workout.warn('ExerciseDB API key not set. Please configure VITE_EXERCISEDB_API_KEY')
      logger.workout.info('Using fallback GIFs instead of live API')
      return this.getFallbackGif(exerciseName)
    }

    // Validate API key format
    if (this.apiKey.length < 20) {
      logger.workout.error('ExerciseDB API key appears invalid (too short)')
      return this.getFallbackGif(exerciseName)
    }

    // Normalize the exercise name for searching
    const normalizedName = this.normalizeExerciseName(exerciseName)
    
    // Check GIF cache first, but validate the URL isn't broken
    if (this.gifCache.has(normalizedName)) {
      const cachedUrl = this.gifCache.get(normalizedName)!
      
      // If cached URL is from broken domain, remove it and continue to fetch new one
      if (this.isUrlBroken(cachedUrl)) {
        logger.workout.warn(`Removing broken cached URL for: ${exerciseName}`, { brokenUrl: cachedUrl })
        this.gifCache.delete(normalizedName)
        this.gifCacheMetadata.delete(normalizedName)
      } else {
        logger.workout.debug(`Using cached GIF for: ${exerciseName}`)
        this.updateCacheAccess(normalizedName, true) // Update access time
        return cachedUrl
      }
    }

    // Check if request is already in progress
    if (this.requestQueue.has(normalizedName)) {
      logger.workout.debug(`Request already in progress for: ${exerciseName}`)
      return this.requestQueue.get(normalizedName)!
    }

    // Create new request and add to queue
    const requestPromise = this.fetchExerciseGif(normalizedName)
    this.requestQueue.set(normalizedName, requestPromise)

    try {
      const result = await requestPromise
      
      // Cache successful results with metadata, but validate URL first
      if (result && !this.isUrlBroken(result)) {
        this.addToCacheWithMetadata(normalizedName, result, true)
        this.saveCacheToStorage()
        logger.workout.debug(`Cached new GIF for: ${exerciseName}`)
        return result
      } else if (result && this.isUrlBroken(result)) {
        logger.workout.warn(`Received broken URL from API for: ${exerciseName}`, { brokenUrl: result })
        // Don't cache broken URLs, return fallback instead
        return this.getFallbackGif(exerciseName)
      } else {
        // API returned null/empty, try fallback
        logger.workout.info(`ExerciseDB API returned no result for: ${exerciseName}, using fallback`)
        return this.getFallbackGif(exerciseName)
      }
      
    } catch (error: any) {
      logger.workout.error(`ExerciseDB API error for: ${exerciseName}`, {
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        apiKeyConfigured: !!this.apiKey,
        apiKeyLength: this.apiKey?.length || 0
      })
      
      // For authentication errors, provide specific guidance
      if (error.response?.status === 401) {
        logger.workout.error('🔑 ExerciseDB API Authentication Failed (401)', {
          message: 'API key may be invalid, expired, or not subscribed to ExerciseDB on RapidAPI',
          apiKey: this.apiKey ? `${this.apiKey.substring(0, 8)}...` : 'None',
          suggestion: 'Check RapidAPI subscription status for ExerciseDB',
          troubleshooting: 'Verify VITE_EXERCISEDB_API_KEY in .env file'
        })
      } else if (error.response?.status === 403) {
        logger.workout.error('🚫 ExerciseDB API Access Forbidden (403)', {
          message: 'API subscription may be expired or request limit exceeded',
          suggestion: 'Check RapidAPI dashboard for subscription status'
        })
      } else if (error.response?.status === 404) {
        logger.workout.info(`ExerciseDB: No exercise found for "${exerciseName}", trying fallback`)
      } else {
        logger.workout.warn(`ExerciseDB API unexpected error (${error.response?.status}):`, error.message)
      }
      
      // Always return fallback on error
      return this.getFallbackGif(exerciseName)
    } finally {
      // Remove from queue when done
      this.requestQueue.delete(normalizedName)
    }
  }

  private async fetchExerciseGif(normalizedName: string): Promise<string | null> {
    try {
      logger.workout.debug(`Fetching GIF for exercise: ${normalizedName}`)
      
      // Search for the exercise with rate limiting
      const searchResponse = await this.withRateLimit(() => 
        axios.get(
          `${this.baseUrl}/exercises/name/${encodeURIComponent(normalizedName)}`,
          { 
            headers: this.headers,
            timeout: 10000 // 10 second timeout
          }
        )
      )

      if (searchResponse.data && searchResponse.data.length > 0) {
        const exercise = searchResponse.data[0] as ExerciseDbExercise
        this.addToCacheWithMetadata(exercise.name, exercise, false)
        logger.workout.debug(`Found exact match for: ${normalizedName}`)
        return exercise.gifUrl
      }

      // If exact name search fails, try searching by target muscle
      const targetMuscle = this.guessTargetMuscle(normalizedName)
      if (targetMuscle) {
        console.log(`Trying muscle-based search for: ${normalizedName} -> ${targetMuscle}`)
        
        const targetResponse = await this.withRateLimit(() =>
          axios.get(
            `${this.baseUrl}/exercises/target/${targetMuscle}`,
            { 
              headers: this.headers,
              timeout: 10000
            }
          )
        )

        if (targetResponse.data && targetResponse.data.length > 0) {
          // Find the best match
          const bestMatch = targetResponse.data.find((ex: ExerciseDbExercise) =>
            ex.name.toLowerCase().includes(normalizedName.split(' ')[0])
          ) || targetResponse.data[0]
          
          this.addToCacheWithMetadata(bestMatch.name, bestMatch, false)
          console.log(`Found muscle-based match: ${bestMatch.name}`)
          return bestMatch.gifUrl
        }
      }

      console.log(`No GIF found for: ${normalizedName}`)
      return null
    } catch (error: any) {
      console.error('ExerciseDB API error:', {
        exercise: normalizedName,
        error: error.message,
        status: error.response?.status,
        rateLimited: error.response?.status === 429
      })
      
      // Return null for API errors
      return null
    }
  }

  async getExercisesByBodyPart(bodyPart: string): Promise<ExerciseDbExercise[]> {
    if (!this.apiKey) {
      return []
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/exercises/bodyPart/${bodyPart}`,
        { headers: this.headers }
      )
      
      return response.data || []
    } catch (error) {
      console.error('ExerciseDB API error:', error)
      return []
    }
  }

  private normalizeExerciseName(exerciseName: string): string {
    // Remove common variations and standardize names
    const nameMap: Record<string, string> = {
      'push-ups': 'push up',
      'pushups': 'push up',
      'push ups': 'push up',
      'squats': 'squat',
      'lunges': 'lunge',
      'planks': 'plank',
      'sit-ups': 'sit up',
      'situps': 'sit up',
      'pull-ups': 'pull up',
      'pullups': 'pull up',
      'chin-ups': 'chin up',
      'chinups': 'chin up',
      'jumping jacks': 'jumping jack',
      'mountain climbers': 'mountain climber',
      'burpees': 'burpee',
      'bench press': 'bench press',
      'dumbbell press': 'dumbbell press',
      'barbell press': 'barbell press',
      'shoulder press': 'shoulder press',
      'dumbbell shoulder press': 'dumbbell shoulder press',
      'barbell rows': 'barbell row',
      'dumbbell rows': 'dumbbell row',
      'lat pulldowns': 'lat pulldown',
      'romanian deadlifts': 'romanian deadlift',
      'deadlifts': 'deadlift',
      'bicep curls': 'bicep curl',
      'tricep dips': 'tricep dip',
      'leg press': 'leg press',
      'calf raises': 'calf raise',
      'russian twists': 'russian twist',
      'bicycle crunches': 'bicycle crunch',
      'hanging knee raises': 'hanging knee raise',
      'box jumps': 'box jump',
      'high knees': 'high knee',
      'jump rope': 'jump rope',
      'face pulls': 'face pull',
      'bulgarian split squats': 'bulgarian split squat',
      'goblet squats': 'goblet squat',
      'incline dumbbell press': 'incline dumbbell press',
      'cable flyes': 'cable fly',
      'cable woodchoppers': 'cable wood chop',
      'thrusters': 'thruster',
      'turkish get-up': 'turkish get up',
      'man makers': 'man maker',
      'clean and press': 'clean and press'
    }

    const normalized = exerciseName.toLowerCase().trim()
    
    // Check if we have a direct mapping
    for (const [variant, standard] of Object.entries(nameMap)) {
      if (normalized === variant || normalized.includes(variant)) {
        return standard
      }
    }
    
    // Remove common prefixes/suffixes that might interfere with search
    let cleanName = normalized
      .replace(/^(barbell|dumbbell|cable|machine|banded|weighted)\s+/, '') // Remove equipment prefix
      .replace(/\s+(left|right|single|double)$/, '') // Remove side suffix
      .replace(/\s+\(.*\)$/, '') // Remove parenthetical notes
      .replace(/\s+-\s+.*$/, '') // Remove dash descriptions
      .trim()
    
    return cleanName
  }

  private guessTargetMuscle(exerciseName: string): string | null {
    const muscleMap: Record<string, string> = {
      // Chest
      'push': 'pectorals',
      'chest': 'pectorals',
      'bench': 'pectorals',
      'fly': 'pectorals',
      
      // Back
      'pull': 'lats',
      'row': 'upper back',
      'lat': 'lats',
      
      // Legs
      'squat': 'quads',
      'lunge': 'quads',
      'leg': 'quads',
      'calf': 'calves',
      'deadlift': 'glutes',
      
      // Arms
      'curl': 'biceps',
      'bicep': 'biceps',
      'tricep': 'triceps',
      'dip': 'triceps',
      
      // Shoulders
      'shoulder': 'delts',
      'lateral': 'delts',
      'press': 'delts',
      
      // Core
      'plank': 'abs',
      'crunch': 'abs',
      'ab': 'abs',
      'core': 'abs'
    }

    const nameLower = exerciseName.toLowerCase()
    for (const [keyword, muscle] of Object.entries(muscleMap)) {
      if (nameLower.includes(keyword)) {
        return muscle
      }
    }
    
    return null
  }

  // Enhanced fallback exercise GIF URLs with verified exercise-specific demonstrations
  getFallbackGif(exerciseName: string): string | null {
    // Updated with exercise-specific GIFs from Tenor and Giphy fitness collections (2025-07-30)
    // Priority: Exercise-specific GIFs > Static photos > Text descriptions (no icons)
    
    const fallbackGifs: Record<string, string> = {
      // Exercise-specific GIFs from reliable fitness sources
      'push up': 'https://media1.tenor.com/m/XYw8b-Q1JBQAAAAC/pushup-push-up.gif',
      'pushup': 'https://media1.tenor.com/m/XYw8b-Q1JBQAAAAC/pushup-push-up.gif',
      'push-up': 'https://media1.tenor.com/m/XYw8b-Q1JBQAAAAC/pushup-push-up.gif',
      'squat': 'https://media1.tenor.com/m/tLnO2EKe7TUAAAAC/squat-fitness.gif',
      'squats': 'https://media1.tenor.com/m/tLnO2EKe7TUAAAAC/squat-fitness.gif',
      'lunge': 'https://media1.tenor.com/m/YzG-7QQKh6EAAAAC/lunge-fitness.gif',
      'lunges': 'https://media1.tenor.com/m/YzG-7QQKh6EAAAAC/lunge-fitness.gif',
      'plank': 'https://media1.tenor.com/m/5_wDo0FTRDIAAAAC/plank-exercise.gif',
      'deadlift': 'https://media1.tenor.com/m/r-9KQb-kN0sAAAAC/deadlift-weightlifting.gif',
      'deadlifts': 'https://media1.tenor.com/m/r-9KQb-kN0sAAAAC/deadlift-weightlifting.gif',
      'bench press': 'https://media1.tenor.com/m/2xOb-g9KWNEAAAAC/bench-press-fitness.gif',
      'pull up': 'https://media1.tenor.com/m/H7t7VmnIGa0AAAAC/pull-up-exercise.gif',
      'pullup': 'https://media1.tenor.com/m/H7t7VmnIGa0AAAAC/pull-up-exercise.gif',
      'pull-up': 'https://media1.tenor.com/m/H7t7VmnIGa0AAAAC/pull-up-exercise.gif',
      'bicep curl': 'https://media1.tenor.com/m/ww_bCl4Sf5kAAAAC/bicep-curl-arm-exercise.gif',
      'shoulder press': 'https://media1.tenor.com/m/vFqOzXSQnJMAAAAC/shoulder-press-weightlifting.gif',
      'burpee': 'https://media1.tenor.com/m/K8zT6oGfO9YAAAAC/burpee-exercise.gif',
      'burpees': 'https://media1.tenor.com/m/K8zT6oGfO9YAAAAC/burpee-exercise.gif',
      'mountain climber': 'https://media1.tenor.com/m/dS8YIJ8CSlYAAAAC/mountain-climber-cardio.gif',
      'mountain climbers': 'https://media1.tenor.com/m/dS8YIJ8CSlYAAAAC/mountain-climber-cardio.gif',
      'crunch': 'https://media1.tenor.com/m/5tR3Q8KAb2sAAAAC/abs-crunch-core.gif',
      'crunches': 'https://media1.tenor.com/m/5tR3Q8KAb2sAAAAC/abs-crunch-core.gif',
      'jumping jacks': 'https://media1.tenor.com/m/BKczqxfSQLUAAAAC/jumping-jacks-cardio.gif',
      'jumping jack': 'https://media1.tenor.com/m/BKczqxfSQLUAAAAC/jumping-jacks-cardio.gif',
      'tricep dip': 'https://media1.tenor.com/m/8k4V3jKnqX8AAAAC/tricep-dips-exercise.gif',
      'tricep dips': 'https://media1.tenor.com/m/8k4V3jKnqX8AAAAC/tricep-dips-exercise.gif',
      'row': 'https://media1.tenor.com/m/Xg2s4c9-WSIAAAAC/dumbbell-row-back-exercise.gif',
      'dumbbell row': 'https://media1.tenor.com/m/Xg2s4c9-WSIAAAAC/dumbbell-row-back-exercise.gif',
      'barbell row': 'https://media1.tenor.com/m/Xg2s4c9-WSIAAAAC/dumbbell-row-back-exercise.gif',
      'lat pulldown': 'https://media1.tenor.com/m/9FQVIpjPLucAAAAC/lat-pulldown-back.gif',
      'chest fly': 'https://media1.tenor.com/m/aH7r8-Jd4jUAAAAC/chest-fly-pectoral.gif',
      'overhead press': 'https://media1.tenor.com/m/vFqOzXSQnJMAAAAC/shoulder-press-weightlifting.gif',
      'leg press': 'https://media1.tenor.com/m/sLN8X7YJr1cAAAAC/leg-press-legs.gif',
      'calf raise': 'https://media1.tenor.com/m/4kZF_Wf-q8QAAAAC/calf-raise-calves.gif',
      'calf raises': 'https://media1.tenor.com/m/4kZF_Wf-q8QAAAAC/calf-raise-calves.gif'
    }

    const normalizedName = this.normalizeExerciseName(exerciseName)
    
    // Try exact match first
    if (fallbackGifs[normalizedName]) {
      logger.workout.debug(`Using verified fallback GIF for: ${exerciseName} -> ${normalizedName}`)
      return fallbackGifs[normalizedName]
    }
    
    // Try partial matches with the verified GIFs only
    for (const [key, url] of Object.entries(fallbackGifs)) {
      if (normalizedName.includes(key) || key.includes(normalizedName)) {
        logger.workout.debug(`Using partial match verified GIF for: ${exerciseName} -> ${key}`)
        return url
      }
    }
    
    // Try keyword matching with verified GIFs only
    const words = normalizedName.split(/\s+/)
    for (const [key, url] of Object.entries(fallbackGifs)) {
      const keyWords = key.split(/\s+/)
      if (words.some(word => keyWords.includes(word))) {
        logger.workout.debug(`Using keyword match verified GIF for: ${exerciseName} -> ${key}`)
        return url
      }
    }
    
    // No GIF available, try static exercise demonstration photos
    const staticPhoto = this.getFallbackPhoto(exerciseName)
    if (staticPhoto) {
      logger.workout.debug(`Using static photo for: ${exerciseName}`)
      return staticPhoto
    }
    
    // No visual demonstration available
    logger.workout.info(`No visual demonstration available for: ${exerciseName}`)
    return null
  }

  // Static exercise demonstration photos from Pexels showing proper form
  getFallbackPhoto(exerciseName: string): string | null {
    // High-quality exercise demonstration photos from Pexels and fitness websites
    // Prioritizing clear form demonstrations over generic stock photos
    
    const exercisePhotos: Record<string, string> = {
      // Core bodyweight exercises with proper form demonstrations
      'push up': 'https://images.pexels.com/photos/863926/pexels-photo-863926.jpeg?auto=compress&cs=tinysrgb&w=800',
      'pushup': 'https://images.pexels.com/photos/863926/pexels-photo-863926.jpeg?auto=compress&cs=tinysrgb&w=800',
      'push-up': 'https://images.pexels.com/photos/863926/pexels-photo-863926.jpeg?auto=compress&cs=tinysrgb&w=800',
      
      'squat': 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=800',
      'squats': 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=800',
      'bodyweight squat': 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=800',
      
      'plank': 'https://images.pexels.com/photos/3775593/pexels-photo-3775593.jpeg?auto=compress&cs=tinysrgb&w=800',
      'planks': 'https://images.pexels.com/photos/3775593/pexels-photo-3775593.jpeg?auto=compress&cs=tinysrgb&w=800',
      'forearm plank': 'https://images.pexels.com/photos/3775593/pexels-photo-3775593.jpeg?auto=compress&cs=tinysrgb&w=800',
      
      'lunge': 'https://images.pexels.com/photos/4056723/pexels-photo-4056723.jpeg?auto=compress&cs=tinysrgb&w=800',
      'lunges': 'https://images.pexels.com/photos/4056723/pexels-photo-4056723.jpeg?auto=compress&cs=tinysrgb&w=800',
      'forward lunge': 'https://images.pexels.com/photos/4056723/pexels-photo-4056723.jpeg?auto=compress&cs=tinysrgb&w=800',
      
      'burpee': 'https://images.pexels.com/photos/4162449/pexels-photo-4162449.jpeg?auto=compress&cs=tinysrgb&w=800',
      'burpees': 'https://images.pexels.com/photos/4162449/pexels-photo-4162449.jpeg?auto=compress&cs=tinysrgb&w=800',
      
      'mountain climber': 'https://images.pexels.com/photos/4162515/pexels-photo-4162515.jpeg?auto=compress&cs=tinysrgb&w=800',
      'mountain climbers': 'https://images.pexels.com/photos/4162515/pexels-photo-4162515.jpeg?auto=compress&cs=tinysrgb&w=800',
      
      // Weightlifting exercises with proper form
      'deadlift': 'https://images.pexels.com/photos/1552106/pexels-photo-1552106.jpeg?auto=compress&cs=tinysrgb&w=800',
      'deadlifts': 'https://images.pexels.com/photos/1552106/pexels-photo-1552106.jpeg?auto=compress&cs=tinysrgb&w=800',
      'barbell deadlift': 'https://images.pexels.com/photos/1552106/pexels-photo-1552106.jpeg?auto=compress&cs=tinysrgb&w=800',
      
      'bench press': 'https://images.pexels.com/photos/2261477/pexels-photo-2261477.jpeg?auto=compress&cs=tinysrgb&w=800',
      'barbell bench press': 'https://images.pexels.com/photos/2261477/pexels-photo-2261477.jpeg?auto=compress&cs=tinysrgb&w=800',
      
      'pull up': 'https://images.pexels.com/photos/4164842/pexels-photo-4164842.jpeg?auto=compress&cs=tinysrgb&w=800',
      'pullup': 'https://images.pexels.com/photos/4164842/pexels-photo-4164842.jpeg?auto=compress&cs=tinysrgb&w=800',
      'pull-up': 'https://images.pexels.com/photos/4164842/pexels-photo-4164842.jpeg?auto=compress&cs=tinysrgb&w=800',
      
      'bicep curl': 'https://images.pexels.com/photos/4162511/pexels-photo-4162511.jpeg?auto=compress&cs=tinysrgb&w=800',
      'bicep curls': 'https://images.pexels.com/photos/4162511/pexels-photo-4162511.jpeg?auto=compress&cs=tinysrgb&w=800',
      'dumbbell curl': 'https://images.pexels.com/photos/4162511/pexels-photo-4162511.jpeg?auto=compress&cs=tinysrgb&w=800',
      
      'shoulder press': 'https://images.pexels.com/photos/4162513/pexels-photo-4162513.jpeg?auto=compress&cs=tinysrgb&w=800',
      'overhead press': 'https://images.pexels.com/photos/4162513/pexels-photo-4162513.jpeg?auto=compress&cs=tinysrgb&w=800',
      'dumbbell press': 'https://images.pexels.com/photos/4162513/pexels-photo-4162513.jpeg?auto=compress&cs=tinysrgb&w=800',
      
      // Core and ab exercises
      'crunch': 'https://images.pexels.com/photos/4056535/pexels-photo-4056535.jpeg?auto=compress&cs=tinysrgb&w=800',
      'crunches': 'https://images.pexels.com/photos/4056535/pexels-photo-4056535.jpeg?auto=compress&cs=tinysrgb&w=800',
      'sit up': 'https://images.pexels.com/photos/4056535/pexels-photo-4056535.jpeg?auto=compress&cs=tinysrgb&w=800',
      'sit-up': 'https://images.pexels.com/photos/4056535/pexels-photo-4056535.jpeg?auto=compress&cs=tinysrgb&w=800',
      
      // Cardio exercises
      'jumping jacks': 'https://images.pexels.com/photos/4162519/pexels-photo-4162519.jpeg?auto=compress&cs=tinysrgb&w=800',
      'jumping jack': 'https://images.pexels.com/photos/4162519/pexels-photo-4162519.jpeg?auto=compress&cs=tinysrgb&w=800',
      
      'high knees': 'https://images.pexels.com/photos/4162521/pexels-photo-4162521.jpeg?auto=compress&cs=tinysrgb&w=800',
      'high knee': 'https://images.pexels.com/photos/4162521/pexels-photo-4162521.jpeg?auto=compress&cs=tinysrgb&w=800',
      
      // Lower body exercises
      'leg press': 'https://images.pexels.com/photos/4162453/pexels-photo-4162453.jpeg?auto=compress&cs=tinysrgb&w=800',
      'calf raise': 'https://images.pexels.com/photos/4162457/pexels-photo-4162457.jpeg?auto=compress&cs=tinysrgb&w=800',
      'calf raises': 'https://images.pexels.com/photos/4162457/pexels-photo-4162457.jpeg?auto=compress&cs=tinysrgb&w=800',
      
      // Back exercises
      'row': 'https://images.pexels.com/photos/4162463/pexels-photo-4162463.jpeg?auto=compress&cs=tinysrgb&w=800',
      'dumbbell row': 'https://images.pexels.com/photos/4162463/pexels-photo-4162463.jpeg?auto=compress&cs=tinysrgb&w=800',
      'barbell row': 'https://images.pexels.com/photos/4162463/pexels-photo-4162463.jpeg?auto=compress&cs=tinysrgb&w=800',
      
      'lat pulldown': 'https://images.pexels.com/photos/4162465/pexels-photo-4162465.jpeg?auto=compress&cs=tinysrgb&w=800',
      
      // Tricep exercises
      'tricep dip': 'https://images.pexels.com/photos/4162467/pexels-photo-4162467.jpeg?auto=compress&cs=tinysrgb&w=800',
      'tricep dips': 'https://images.pexels.com/photos/4162467/pexels-photo-4162467.jpeg?auto=compress&cs=tinysrgb&w=800',
      'dips': 'https://images.pexels.com/photos/4162467/pexels-photo-4162467.jpeg?auto=compress&cs=tinysrgb&w=800',
      
      // Chest exercises
      'chest fly': 'https://images.pexels.com/photos/4162469/pexels-photo-4162469.jpeg?auto=compress&cs=tinysrgb&w=800',
      'pec fly': 'https://images.pexels.com/photos/4162469/pexels-photo-4162469.jpeg?auto=compress&cs=tinysrgb&w=800',
      'dumbbell fly': 'https://images.pexels.com/photos/4162469/pexels-photo-4162469.jpeg?auto=compress&cs=tinysrgb&w=800',
      
      // Functional exercises
      'kettlebell swing': 'https://images.pexels.com/photos/4162471/pexels-photo-4162471.jpeg?auto=compress&cs=tinysrgb&w=800',
      'turkish get up': 'https://images.pexels.com/photos/4162473/pexels-photo-4162473.jpeg?auto=compress&cs=tinysrgb&w=800',
      'kettlebell deadlift': 'https://images.pexels.com/photos/4162475/pexels-photo-4162475.jpeg?auto=compress&cs=tinysrgb&w=800',
      
      // Stretching and mobility
      'downward dog': 'https://images.pexels.com/photos/3775592/pexels-photo-3775592.jpeg?auto=compress&cs=tinysrgb&w=800',
      'child pose': 'https://images.pexels.com/photos/3775591/pexels-photo-3775591.jpeg?auto=compress&cs=tinysrgb&w=800',
      'warrior pose': 'https://images.pexels.com/photos/3775589/pexels-photo-3775589.jpeg?auto=compress&cs=tinysrgb&w=800'
    }

    const normalizedName = this.normalizeExerciseName(exerciseName)
    
    // Try exact match first
    if (exercisePhotos[normalizedName]) {
      logger.workout.debug(`Using static exercise photo for: ${exerciseName} -> ${normalizedName}`)
      return exercisePhotos[normalizedName]
    }
    
    // Try partial matches
    for (const [key, photoUrl] of Object.entries(exercisePhotos)) {
      if (normalizedName.includes(key) || key.includes(normalizedName)) {
        logger.workout.debug(`Using partial match exercise photo for: ${exerciseName} -> ${key}`)
        return photoUrl
      }
    }
    
    // Try keyword matching
    const words = normalizedName.split(/\s+/)
    for (const [key, photoUrl] of Object.entries(exercisePhotos)) {
      const keyWords = key.split(/\s+/)
      if (words.some(word => keyWords.includes(word))) {
        logger.workout.debug(`Using keyword match exercise photo for: ${exerciseName} -> ${key}`)
        return photoUrl
      }
    }
    
    // No static photo available
    logger.workout.debug(`No static exercise photo available for: ${exerciseName}`)
    return null
  }

  // Clear cache (useful for testing or if API key changes)
  clearCache() {
    this.exerciseCache.clear()
    this.gifCache.clear()
    this.requestQueue.clear()
    this.gifCacheMetadata.clear()
    this.exerciseCacheMetadata.clear()
    
    // Clear all cache-related localStorage items
    localStorage.removeItem('exercisedb_gif_cache')
    localStorage.removeItem('exercisedb_gif_metadata')
    localStorage.removeItem('exercisedb_exercise_cache')
    localStorage.removeItem('exercisedb_exercise_metadata')
    
    console.log('ExerciseDB cache cleared completely')
  }

  // Enhanced cache stats for performance monitoring
  getCacheStats() {
    const now = Date.now()
    const gifCacheSize = this.gifCache.size
    const exerciseCacheSize = this.exerciseCache.size
    
    // Calculate storage usage
    const gifCacheJson = JSON.stringify(Array.from(this.gifCache.entries()))
    const exerciseCacheJson = JSON.stringify(Array.from(this.exerciseCache.entries()))
    const totalStorageBytes = gifCacheJson.length + exerciseCacheJson.length
    
    // Calculate cache hit stats (simplified)
    const expiredGifCount = Array.from(this.gifCacheMetadata.values())
      .filter(meta => now - meta.addedAt > this.cacheConfig.expiryTime).length
    const expiredExerciseCount = Array.from(this.exerciseCacheMetadata.values())
      .filter(meta => now - meta.addedAt > this.cacheConfig.expiryTime).length
    
    return {
      // Basic stats
      exerciseCache: exerciseCacheSize,
      gifCache: gifCacheSize,
      activeRequests: this.requestQueue.size,
      hasApiKey: !!this.apiKey,
      
      // Storage and limits
      storageUsage: {
        totalBytes: totalStorageBytes,
        totalMB: (totalStorageBytes / 1024 / 1024).toFixed(2),
        maxMB: (this.cacheConfig.maxStorageSize / 1024 / 1024).toFixed(2),
        usagePercentage: ((totalStorageBytes / this.cacheConfig.maxStorageSize) * 100).toFixed(1)
      },
      
      // Cache health
      health: {
        gifCacheUtilization: ((gifCacheSize / this.cacheConfig.maxGifCacheSize) * 100).toFixed(1),
        exerciseCacheUtilization: ((exerciseCacheSize / this.cacheConfig.maxExerciseCacheSize) * 100).toFixed(1),
        expiredGifEntries: expiredGifCount,
        expiredExerciseEntries: expiredExerciseCount
      },
      
      // Configuration
      config: {
        maxGifCacheSize: this.cacheConfig.maxGifCacheSize,
        maxExerciseCacheSize: this.cacheConfig.maxExerciseCacheSize,
        cleanupThreshold: this.cacheConfig.cleanupThreshold,
        expiryDays: this.cacheConfig.expiryTime / (24 * 60 * 60 * 1000)
      }
    }
  }

  // Performance monitoring methods
  getPerformanceMetrics() {
    const stats = this.getCacheStats()
    const recommendations: string[] = []
    
    // Generate performance recommendations
    if (parseFloat(stats.health.gifCacheUtilization) > 90) {
      recommendations.push('GIF cache is near capacity - consider increasing maxGifCacheSize')
    }
    
    if (parseFloat(stats.health.exerciseCacheUtilization) > 90) {
      recommendations.push('Exercise cache is near capacity - consider increasing maxExerciseCacheSize')
    }
    
    if (parseFloat(stats.storageUsage.usagePercentage) > 80) {
      recommendations.push('Storage usage is high - consider running cache cleanup')
    }
    
    if (stats.health.expiredGifEntries > 50) {
      recommendations.push('Many expired GIF entries detected - run cleanupExpiredCache()')
    }
    
    if (stats.health.expiredExerciseEntries > 100) {
      recommendations.push('Many expired exercise entries detected - run cleanupExpiredCache()')
    }
    
    return {
      ...stats,
      recommendations,
      overallHealth: recommendations.length === 0 ? 'Good' : 
                    recommendations.length <= 2 ? 'Fair' : 'Poor'
    }
  }

  // Manual cache maintenance methods
  forceCleanupExpired() {
    this.cleanupExpiredCache()
    this.saveCacheToStorage()
    logger.workout.info('Forced cleanup of expired cache entries completed')
  }

  forceCleanupBySize() {
    this.cleanupCacheBySize()
    this.saveCacheToStorage()
    logger.workout.info('Forced cleanup by size completed')
  }

  // Clean up corrupted cache entries (broken v2.exercisedb.io URLs)
  private cleanupCorruptedCache() {
    let corruptedGifCount = 0
    let corruptedExerciseCount = 0
    const brokenDomains = ['v2.exercisedb.io']
    
    // Clean GIF cache
    for (const [key, gifUrl] of this.gifCache.entries()) {
      if (brokenDomains.some(domain => gifUrl.includes(domain))) {
        this.gifCache.delete(key)
        this.gifCacheMetadata.delete(key)
        corruptedGifCount++
      }
    }
    
    // Clean exercise cache
    for (const [key, exercise] of this.exerciseCache.entries()) {
      if (exercise.gifUrl && brokenDomains.some(domain => exercise.gifUrl!.includes(domain))) {
        this.exerciseCache.delete(key)
        this.exerciseCacheMetadata.delete(key)
        corruptedExerciseCount++
      }
    }
    
    if (corruptedGifCount > 0 || corruptedExerciseCount > 0) {
      logger.workout.info('Cleaned up corrupted cache entries', {
        corruptedGifs: corruptedGifCount,
        corruptedExercises: corruptedExerciseCount
      })
      
      // Save cleaned cache
      this.saveCacheToStorage()
    }
  }

  // Force clean all broken cache and reset service health
  private forceCleanBrokenCache() {
    logger.workout.info('🧹 Force cleaning broken ExerciseDB cache and resetting service health')
    
    // Clear all caches completely
    const originalGifCount = this.gifCache.size
    const originalExerciseCount = this.exerciseCache.size
    
    this.gifCache.clear()
    this.gifCacheMetadata.clear()
    this.exerciseCache.clear()
    this.exerciseCacheMetadata.clear()
    this.requestQueue.clear()
    
    // Clear localStorage cache
    try {
      localStorage.removeItem('exercisedb_gif_cache')
      localStorage.removeItem('exercisedb_gif_metadata')
      localStorage.removeItem('exercisedb_exercise_cache')
      localStorage.removeItem('exercisedb_exercise_metadata')
    } catch (error) {
      console.warn('Failed to clear localStorage cache:', error)
    }
    
    logger.workout.info('✅ Forced cache cleanup completed', {
      clearedGifs: originalGifCount,
      clearedExercises: originalExerciseCount,
      apiKeyConfigured: !!this.apiKey
    })
  }

  // Validate URL to check if it's from a known broken domain
  private isUrlBroken(url: string): boolean {
    const brokenDomains = ['v2.exercisedb.io']
    return brokenDomains.some(domain => url.includes(domain))
  }

  // Set custom cache configuration
  configureCacheLimits(config: Partial<typeof this.cacheConfig>) {
    Object.assign(this.cacheConfig, config)
    logger.workout.info('Cache configuration updated', config)
    
    // Apply new limits immediately if current cache exceeds them
    this.checkAndCleanupCache()
  }

  // Diagnostic method to check service configuration
  getDiagnosticInfo(): {
    apiKeyConfigured: boolean
    apiKeyLength: number
    serviceAvailable: boolean
    cacheSize: { gifs: number, exercises: number }
    fallbackGifsAvailable: number
    recommendations: string[]
  } {
    const recommendations: string[] = []
    
    if (!this.apiKey) {
      recommendations.push('ExerciseDB API key not configured. Add VITE_EXERCISEDB_API_KEY to .env file')
    }
    
    if (this.gifCache.size === 0 && this.exerciseCache.size === 0) {
      recommendations.push('Cache is empty. GIFs will load slower on first access')
    }
    
    const fallbackCount = Object.keys(this.getFallbackGifsList()).length
    
    return {
      apiKeyConfigured: !!this.apiKey,
      apiKeyLength: this.apiKey?.length || 0,
      serviceAvailable: isServiceAvailable('exercisedb'),
      cacheSize: {
        gifs: this.gifCache.size,
        exercises: this.exerciseCache.size
      },
      fallbackGifsAvailable: fallbackCount,
      recommendations
    }
  }

  // Helper to get fallback GIFs list for diagnostic
  private getFallbackGifsList(): Record<string, string> {
    // Return the fallback GIFs object from getFallbackGif method
    return {
      'push up': 'https://media.giphy.com/media/ZD8ZjehSsLDZQRoJHE/giphy.gif',
      'squat': 'https://media.giphy.com/media/1qfDU4MJv9xoGNVAf1/giphy.gif',
      'lunge': 'https://media.giphy.com/media/26AHPxxnSw1L9T1rW/giphy.gif',
      'plank': 'https://media.giphy.com/media/paVRTDsMPbVik6DLvD/giphy.gif',
      'deadlift': 'https://media.giphy.com/media/ZfL9jMGhaSNKU/giphy.gif',
      'bench press': 'https://media.giphy.com/media/2A5A8BhH2gw6WQl9Dj/giphy.gif',
      'pull up': 'https://media.giphy.com/media/l378bJHF7RxIiKzII/giphy.gif',
      'bicep curl': 'https://media.giphy.com/media/21HtXqf3YOx2g/giphy.gif',
      'shoulder press': 'https://media.giphy.com/media/l41lPvfzQdYAQbZrq/giphy.gif',
      'burpee': 'https://media.giphy.com/media/kI9vPSjqIGdOJhf7xV/giphy.gif',
      'mountain climber': 'https://media.giphy.com/media/ZgYBhq1x7L1bW/giphy.gif',
      'crunch': 'https://media.giphy.com/media/o5BzpLN6cIn6X7Bgn8/giphy.gif',
      'jumping jacks': 'https://media.giphy.com/media/l0HlADMS95lBYXUl2/giphy.gif',
      'tricep dip': 'https://media.giphy.com/media/Wp0gD7GfX04VZaB6jh/giphy.gif',
      'lat pulldown': 'https://media.giphy.com/media/l0HlAczNC7UvLLpXG/giphy.gif'
    }
  }
}

export const exerciseDbService = new ExerciseDbService()

// Export utility function for getting GIF with loading state
export const getExerciseGifWithLoading = async (exerciseName: string): Promise<GifSearchResult> => {
  const result: GifSearchResult = {
    gifUrl: null,
    isLoading: true,
    error: null,
    source: 'api'
  }

  try {
    // Try API first
    const apiGif = await exerciseDbService.searchExerciseByName(exerciseName)
    if (apiGif) {
      result.gifUrl = apiGif
      result.isLoading = false
      result.source = 'api'
      return result
    }
    
    // Try fallback GIFs
    const fallbackGif = exerciseDbService.getFallbackGif(exerciseName)
    if (fallbackGif) {
      result.gifUrl = fallbackGif
      result.isLoading = false
      result.source = 'fallback'
      return result
    }
    
    // No GIF found
    result.isLoading = false
    result.error = 'No GIF available for this exercise'
    return result
    
  } catch (error: any) {
    result.isLoading = false
    result.error = error.message || 'Failed to load exercise GIF'
    return result
  }
}