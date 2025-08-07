import { logger } from '../utils/logger'

export interface ExerciseData {
  id: string
  name: string
  target?: string
  equipment?: string
  bodyPart?: string
  instructions?: string[]
  category?: string
  primaryMuscles?: string[]
  secondaryMuscles?: string[]
  level?: string
  force?: string
  mechanic?: string
  gifUrl?: string
  imageUrls?: string[]
  source: ExerciseSource
}

export interface ExerciseSearchResult {
  exercises: ExerciseData[]
  source: ExerciseSource
  isLoading: boolean
  error: string | null
}

export type ExerciseSource = 'exercisedb' | 'freeexercisedb' | 'wger' | 'fallback' | 'cache'

interface SourceConfig {
  name: string
  priority: number
  enabled: boolean
  healthStatus: 'healthy' | 'degraded' | 'failed'
  lastCheck: number
  failureCount: number
  maxFailures: number
}

export class ExerciseSourceManager {
  private sources: Map<ExerciseSource, SourceConfig> = new Map()
  private cache = new Map<string, ExerciseData[]>()
  private healthCheckInterval: NodeJS.Timeout | null = null
  private circuitBreakers = new Map<ExerciseSource, { failures: number; lastFailure: number; isOpen: boolean }>()
  
  // Circuit breaker configuration
  private readonly circuitBreakerConfig = {
    failureThreshold: 3, // Open circuit after 3 failures
    timeout: 30000, // 30 seconds before trying again
    resetTimeout: 60000 // 1 minute before fully resetting
  }
  
  // Source-specific services (to be injected)
  private exerciseDbService: any = null
  private freeExerciseDbService: any = null
  private wgerApiService: any = null
  
  constructor() {
    this.initializeSources()
    this.initializeCircuitBreakers()
    this.startHealthChecking()
  }
  
  private initializeSources() {
    this.sources.set('exercisedb', {
      name: 'ExerciseDB API',
      priority: 1,
      enabled: true,
      healthStatus: 'failed', // Start as failed since we know v2 URLs are broken
      lastCheck: 0,
      failureCount: 3,
      maxFailures: 3
    })
    
    this.sources.set('freeexercisedb', {
      name: 'Free Exercise DB',
      priority: 2,
      enabled: true,
      healthStatus: 'healthy',
      lastCheck: 0,
      failureCount: 0,
      maxFailures: 2
    })
    
    this.sources.set('wger', {
      name: 'WGER API',
      priority: 3,
      enabled: true,
      healthStatus: 'healthy',
      lastCheck: 0,
      failureCount: 0,
      maxFailures: 2
    })
    
    this.sources.set('fallback', {
      name: 'Static Fallbacks',
      priority: 4,
      enabled: true,
      healthStatus: 'healthy',
      lastCheck: 0,
      failureCount: 0,
      maxFailures: 0 // Always available
    })
  }
  
  private initializeCircuitBreakers() {
    for (const source of this.sources.keys()) {
      this.circuitBreakers.set(source, {
        failures: source === 'exercisedb' ? 3 : 0, // Start exercisedb as failed
        lastFailure: source === 'exercisedb' ? Date.now() : 0,
        isOpen: source === 'exercisedb' // Circuit open for exercisedb
      })
    }
  }
  
  // Inject service dependencies
  setExerciseDbService(service: any) {
    this.exerciseDbService = service
  }
  
  setFreeExerciseDbService(service: any) {
    this.freeExerciseDbService = service
  }
  
  setWgerApiService(service: any) {
    this.wgerApiService = service
  }
  
  async searchExerciseByName(exerciseName: string): Promise<ExerciseSearchResult> {
    const cacheKey = `search:${exerciseName.toLowerCase()}`
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      logger.workout.debug(`Cache hit for exercise search: ${exerciseName}`)
      return {
        exercises: this.cache.get(cacheKey)!,
        source: 'cache',
        isLoading: false,
        error: null
      }
    }
    
    // Get healthy sources in priority order
    const healthySources = this.getHealthySourcesInOrder()
    
    for (const source of healthySources) {
      try {
        logger.workout.debug(`Trying source ${source} for exercise: ${exerciseName}`)
        
        const result = await this.searchFromSource(source, exerciseName)
        
        if (result.exercises.length > 0) {
          // Cache successful results
          this.cache.set(cacheKey, result.exercises)
          this.markSourceSuccess(source)
          
          logger.workout.info(`Found ${result.exercises.length} exercises for "${exerciseName}" from ${source}`)
          return result
        }
        
      } catch (error: any) {
        logger.workout.warn(`Source ${source} failed for exercise "${exerciseName}":`, error.message)
        this.markSourceFailure(source)
        continue
      }
    }
    
    // If all sources fail, return empty result with error
    return {
      exercises: [],
      source: 'fallback',
      isLoading: false,
      error: `No exercise data found for "${exerciseName}" from any available source`
    }
  }
  
  // Check if circuit breaker allows request
  private canMakeRequest(source: ExerciseSource): boolean {
    const breaker = this.circuitBreakers.get(source)
    if (!breaker) return true
    
    const now = Date.now()
    
    // If circuit is open, check if timeout has passed
    if (breaker.isOpen) {
      if (now - breaker.lastFailure > this.circuitBreakerConfig.timeout) {
        // Half-open state: allow one request
        breaker.isOpen = false
        logger.workout.debug(`Circuit breaker half-open for ${source}`)
        return true
      }
      logger.workout.debug(`Circuit breaker open for ${source}, blocking request`)
      return false
    }
    
    return true
  }
  
  // Record success and reset circuit breaker
  private recordSuccess(source: ExerciseSource) {
    const breaker = this.circuitBreakers.get(source)
    if (breaker) {
      breaker.failures = 0
      breaker.isOpen = false
      breaker.lastFailure = 0
    }
    this.markSourceSuccess(source)
  }
  
  // Record failure and potentially open circuit breaker
  private recordFailure(source: ExerciseSource) {
    const breaker = this.circuitBreakers.get(source)
    if (breaker) {
      breaker.failures++
      breaker.lastFailure = Date.now()
      
      if (breaker.failures >= this.circuitBreakerConfig.failureThreshold) {
        breaker.isOpen = true
        logger.workout.warn(`Circuit breaker opened for ${source} after ${breaker.failures} failures`)
      }
    }
    this.markSourceFailure(source)
  }

  private async searchFromSource(source: ExerciseSource, exerciseName: string): Promise<ExerciseSearchResult> {
    // Check circuit breaker
    if (!this.canMakeRequest(source)) {
      throw new Error(`Circuit breaker open for ${source}`)
    }
    
    try {
      let result: ExerciseSearchResult
      
      switch (source) {
        case 'exercisedb':
          if (!this.exerciseDbService) {
            throw new Error('ExerciseDB service not available')
          }
          result = await this.searchFromExerciseDb(exerciseName)
          break
          
        case 'freeexercisedb':
          if (!this.freeExerciseDbService) {
            throw new Error('Free Exercise DB service not available')
          }
          result = await this.searchFromFreeExerciseDb(exerciseName)
          break
          
        case 'wger':
          if (!this.wgerApiService) {
            throw new Error('WGER API service not available')
          }
          result = await this.searchFromWger(exerciseName)
          break
          
        case 'fallback':
          result = this.getFallbackExercise(exerciseName)
          break
          
        default:
          throw new Error(`Unknown source: ${source}`)
      }
      
      // Record success if we got results
      if (result.exercises.length > 0) {
        this.recordSuccess(source)
      } else {
        this.recordFailure(source)
      }
      
      return result
      
    } catch (error) {
      this.recordFailure(source)
      throw error
    }
  }
  
  private async searchFromExerciseDb(exerciseName: string): Promise<ExerciseSearchResult> {
    const gifUrl = await this.exerciseDbService.searchExerciseByName(exerciseName)
    
    if (gifUrl) {
      const exercise: ExerciseData = {
        id: `exercisedb-${exerciseName.replace(/\s+/g, '-').toLowerCase()}`,
        name: exerciseName,
        gifUrl,
        source: 'exercisedb'
      }
      
      return {
        exercises: [exercise],
        source: 'exercisedb',
        isLoading: false,
        error: null
      }
    }
    
    return {
      exercises: [],
      source: 'exercisedb',
      isLoading: false,
      error: 'No exercise found in ExerciseDB'
    }
  }
  
  private async searchFromFreeExerciseDb(exerciseName: string): Promise<ExerciseSearchResult> {
    const exercises = await this.freeExerciseDbService.searchExercises(exerciseName)
    
    return {
      exercises: exercises.map((ex: any) => ({
        id: `freeexercisedb-${ex.id}`,
        name: ex.name,
        target: ex.primaryMuscles?.[0],
        equipment: ex.equipment,
        bodyPart: ex.category,
        instructions: ex.instructions,
        category: ex.category,
        primaryMuscles: ex.primaryMuscles,
        secondaryMuscles: ex.secondaryMuscles,
        level: ex.level,
        force: ex.force,
        mechanic: ex.mechanic,
        imageUrls: ex.images?.map((img: string) => 
          `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${img}`
        ),
        source: 'freeexercisedb' as ExerciseSource
      })),
      source: 'freeexercisedb',
      isLoading: false,
      error: null
    }
  }
  
  private async searchFromWger(exerciseName: string): Promise<ExerciseSearchResult> {
    const exercises = await this.wgerApiService.searchExercises(exerciseName)
    
    return {
      exercises: exercises.map((ex: any) => ({
        id: `wger-${ex.id}`,
        name: ex.name,
        target: ex.muscles?.[0]?.name,
        equipment: ex.equipment?.[0]?.name,
        bodyPart: ex.category?.name,
        instructions: [ex.description],
        category: ex.category?.name,
        imageUrls: ex.images?.map((img: any) => img.image),
        source: 'wger' as ExerciseSource
      })),
      source: 'wger',
      isLoading: false,
      error: null
    }
  }
  
  private getFallbackExercise(exerciseName: string): ExerciseSearchResult {
    // Enhanced visual fallback system with GIFs and static photos
    // Priority: Tenor/Giphy exercise GIFs > Pexels static photos > Text only
    
    const visualFallbacks = this.getVisualFallbacks(exerciseName)
    
    const fallbackExercises: Record<string, ExerciseData> = {
      'push up': {
        id: 'fallback-push-up',
        name: 'Push Up',
        target: 'Chest',
        equipment: 'Body Weight',
        bodyPart: 'Upper Body',
        instructions: [
          'Start in a plank position with hands slightly wider than shoulder-width apart',
          'Lower your body until your chest nearly touches the ground',
          'Push back up to the starting position',
          'Keep your body in a straight line throughout the movement'
        ],
        category: 'Strength',
        primaryMuscles: ['Chest', 'Shoulders', 'Triceps'],
        level: 'Beginner',
        gifUrl: visualFallbacks.gifUrl,
        imageUrls: visualFallbacks.imageUrls,
        source: 'fallback'
      },
      'squat': {
        id: 'fallback-squat',
        name: 'Squat',
        target: 'Quadriceps',
        equipment: 'Body Weight',
        bodyPart: 'Lower Body',
        instructions: [
          'Stand with feet shoulder-width apart',
          'Lower your body by bending your knees and pushing your hips back',
          'Descend until your thighs are parallel to the ground',
          'Push through your heels to return to starting position'
        ],
        category: 'Strength',
        primaryMuscles: ['Quadriceps', 'Glutes'],
        secondaryMuscles: ['Hamstrings', 'Calves'],
        level: 'Beginner',
        gifUrl: visualFallbacks.gifUrl,
        imageUrls: visualFallbacks.imageUrls,
        source: 'fallback'
      },
      'squats': { // Add plural form that was failing
        id: 'fallback-squats',
        name: 'Squats',
        target: 'Quadriceps',
        equipment: 'Body Weight',
        bodyPart: 'Lower Body',
        instructions: [
          'Stand with feet shoulder-width apart',
          'Lower your body by bending your knees and pushing your hips back',
          'Descend until your thighs are parallel to the ground',
          'Push through your heels to return to starting position'
        ],
        category: 'Strength',
        primaryMuscles: ['Quadriceps', 'Glutes'],
        secondaryMuscles: ['Hamstrings', 'Calves'],
        level: 'Beginner',
        gifUrl: visualFallbacks.gifUrl,
        imageUrls: visualFallbacks.imageUrls,
        source: 'fallback'
      },
      'plank': {
        id: 'fallback-plank',
        name: 'Plank',
        target: 'Core',
        equipment: 'Body Weight',
        bodyPart: 'Core',
        instructions: [
          'Start in a push-up position but rest on your forearms',
          'Keep your body in a straight line from head to heels',
          'Engage your core muscles',
          'Hold the position for the desired duration'
        ],
        category: 'Core',
        primaryMuscles: ['Core', 'Abdominals'],
        level: 'Beginner',
        gifUrl: visualFallbacks.gifUrl,
        imageUrls: visualFallbacks.imageUrls,
        source: 'fallback'
      }
    }
    
    const normalizedName = this.normalizeExerciseName(exerciseName)
    
    // Try exact match first
    if (fallbackExercises[normalizedName]) {
      return {
        exercises: [fallbackExercises[normalizedName]],
        source: 'fallback',
        isLoading: false,
        error: null
      }
    }
    
    // Try partial matches with original name too
    const searchTerms = [normalizedName, exerciseName.toLowerCase().trim()]
    
    for (const searchTerm of searchTerms) {
      for (const [key, exercise] of Object.entries(fallbackExercises)) {
        if (searchTerm.includes(key) || key.includes(searchTerm)) {
          return {
            exercises: [exercise],
            source: 'fallback',
            isLoading: false,
            error: null
          }
        }
      }
    }
    
    return {
      exercises: [],
      source: 'fallback',
      isLoading: false,
      error: `No fallback exercise available for "${exerciseName}"`
    }
  }
  
  // Improve exercise name normalization
  private normalizeExerciseName(exerciseName: string): string {
    return exerciseName
      .toLowerCase()
      .trim()
      .replace(/s$/, '') // Remove trailing 's' to handle plurals
      .replace(/[^a-z\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }
  
  private getHealthySourcesInOrder(): ExerciseSource[] {
    return Array.from(this.sources.entries())
      .filter(([_, config]) => config.enabled && config.healthStatus !== 'failed')
      .sort(([_, a], [__, b]) => a.priority - b.priority)
      .map(([source, _]) => source)
  }
  
  private markSourceSuccess(source: ExerciseSource) {
    const config = this.sources.get(source)
    if (config) {
      config.failureCount = 0
      config.healthStatus = 'healthy'
      config.lastCheck = Date.now()
    }
  }
  
  private markSourceFailure(source: ExerciseSource) {
    const config = this.sources.get(source)
    if (config) {
      config.failureCount++
      config.lastCheck = Date.now()
      
      if (config.failureCount >= config.maxFailures) {
        config.healthStatus = 'failed'
        logger.workout.error(`Source ${source} marked as failed after ${config.failureCount} failures`)
      } else {
        config.healthStatus = 'degraded'
      }
    }
  }
  
  private startHealthChecking() {
    // Check source health every 5 minutes
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks()
    }, 5 * 60 * 1000)
  }
  
  private async performHealthChecks() {
    logger.workout.debug('Performing exercise source health checks')
    
    for (const [source, config] of this.sources.entries()) {
      if (source === 'fallback') continue // Fallback is always healthy
      
      try {
        // Simple health check with a common exercise
        const result = await this.searchFromSource(source, 'push up')
        
        if (result.exercises.length > 0) {
          this.markSourceSuccess(source)
        } else {
          this.markSourceFailure(source)
        }
        
      } catch (error) {
        this.markSourceFailure(source)
      }
    }
  }
  
  // Public methods for monitoring and diagnostics
  getSourceStatus(): Record<ExerciseSource, SourceConfig> {
    return Object.fromEntries(this.sources.entries()) as Record<ExerciseSource, SourceConfig>
  }
  
  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      cacheKeys: Array.from(this.cache.keys())
    }
  }
  
  clearCache() {
    this.cache.clear()
    logger.workout.info('Exercise source cache cleared')
  }
  
  // Reset failed sources (useful for recovery)
  resetSourceHealth(source?: ExerciseSource) {
    if (source) {
      const config = this.sources.get(source)
      if (config) {
        config.failureCount = 0
        config.healthStatus = 'healthy'
        logger.workout.info(`Reset health status for source: ${source}`)
      }
    } else {
      // Reset all sources
      for (const [_, config] of this.sources.entries()) {
        config.failureCount = 0
        config.healthStatus = 'healthy'
      }
      logger.workout.info('Reset health status for all exercise sources')
    }
  }
  
  // Enhanced visual fallback system using exerciseDbService
  private getVisualFallbacks(exerciseName: string): { gifUrl?: string; imageUrls?: string[] } {
    if (!this.exerciseDbService) {
      return {}
    }
    
    try {
      // Get GIF from the enhanced fallback system
      const gifUrl = this.exerciseDbService.getFallbackGif(exerciseName)
      
      // Get static photo if no GIF available
      const staticPhoto = gifUrl ? null : this.exerciseDbService.getFallbackPhoto(exerciseName)
      
      const result: { gifUrl?: string; imageUrls?: string[] } = {}
      
      if (gifUrl) {
        result.gifUrl = gifUrl
        // Also provide static photo as backup in imageUrls
        const photo = this.exerciseDbService.getFallbackPhoto(exerciseName)
        if (photo) {
          result.imageUrls = [photo]
        }
      } else if (staticPhoto) {
        result.imageUrls = [staticPhoto]
      }
      
      logger.workout.debug(`Visual fallbacks for ${exerciseName}:`, {
        hasGif: !!result.gifUrl,
        hasPhoto: !!(result.imageUrls && result.imageUrls.length > 0)
      })
      
      return result
      
    } catch (error: any) {
      logger.workout.warn(`Failed to get visual fallbacks for ${exerciseName}:`, error.message)
      return {}
    }
  }

  cleanup() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
  }
}

// Singleton instance
export const exerciseSourceManager = new ExerciseSourceManager()