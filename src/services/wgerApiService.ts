import axios from 'axios'
import { logger } from '../utils/logger'

interface WgerExercise {
  id: number
  uuid: string
  name: string
  description: string
  category: {
    id: number
    name: string
  }
  muscles: Array<{
    id: number
    name: string
    is_front: boolean
  }>
  muscles_secondary: Array<{
    id: number
    name: string
    is_front: boolean
  }>
  equipment: Array<{
    id: number
    name: string
  }>
  language: {
    id: number
    short_name: string
    full_name: string
  }
  license: {
    id: number
    full_name: string
    short_name: string
    url: string
  }
  license_author: string
  images: Array<{
    id: number
    uuid: string
    exercise: number
    image: string
    is_main: boolean
    style: string
    license: number
    license_author: string
  }>
  variations: number[]
}

interface WgerSearchResult {
  count: number
  next: string | null
  previous: string | null
  results: WgerExercise[]
}

interface WgerCategory {
  id: number
  name: string
}

interface WgerMuscle {
  id: number
  name: string
  is_front: boolean
  image_url_main: string
  image_url_secondary: string
}

interface WgerEquipment {
  id: number
  name: string
}

class WgerApiService {
  private baseUrl = 'https://wger.de/api/v2'
  private exercisesCache = new Map<string, WgerExercise[]>()
  private categoriesCache: WgerCategory[] | null = null
  private musclesCache: WgerMuscle[] | null = null
  private equipmentCache: WgerEquipment[] | null = null
  private cacheTimestamp = new Map<string, number>()
  private readonly cacheExpiration = 30 * 60 * 1000 // 30 minutes
  private requestDelay = 100 // ms between requests to be respectful
  
  constructor() {
    logger.workout.info('WGER API Service initialized', {
      baseUrl: this.baseUrl,
      cacheExpiration: `${this.cacheExpiration / 1000 / 60} minutes`
    })
  }
  
  private async withRateLimit<T>(operation: () => Promise<T>): Promise<T> {
    await new Promise(resolve => setTimeout(resolve, this.requestDelay))
    return operation()
  }
  
  private isCacheValid(cacheKey: string): boolean {
    const timestamp = this.cacheTimestamp.get(cacheKey)
    return timestamp ? (Date.now() - timestamp) < this.cacheExpiration : false
  }
  
  private setCacheTimestamp(cacheKey: string) {
    this.cacheTimestamp.set(cacheKey, Date.now())
  }
  
  async searchExercises(query: string, options: {
    category?: number
    muscles?: number[]
    equipment?: number[]
    language?: string
    limit?: number
  } = {}): Promise<WgerExercise[]> {
    
    const {
      category,
      muscles,
      equipment,
      language = 'en',
      limit = 20
    } = options
    
    const cacheKey = `search:${query}:${JSON.stringify(options)}`
    
    // Check cache first
    if (this.exercisesCache.has(cacheKey) && this.isCacheValid(cacheKey)) {
      logger.workout.debug(`WGER cache hit for search: ${query}`)
      return this.exercisesCache.get(cacheKey)!
    }
    
    try {
      logger.workout.debug(`Searching WGER API for: ${query}`)
      
      // Build query parameters
      const params: any = {
        search: query,
        language,
        limit
      }
      
      if (category) params.category = category
      if (muscles && muscles.length > 0) params.muscles = muscles.join(',')
      if (equipment && equipment.length > 0) params.equipment = equipment.join(',')
      
      const response = await this.withRateLimit(() =>
        axios.get<WgerSearchResult>(`${this.baseUrl}/exercise/`, {
          params,
          timeout: 15000,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'FitArchitect-ExerciseService'
          }
        })
      )
      
      const exercises = response.data.results || []
      
      // Filter out exercises without meaningful content
      const filteredExercises = exercises.filter(exercise => 
        exercise.name && 
        exercise.description &&
        exercise.description.trim().length > 10
      )
      
      logger.workout.info(`WGER API returned ${filteredExercises.length} exercises for: ${query}`)
      
      // Cache the results
      this.exercisesCache.set(cacheKey, filteredExercises)
      this.setCacheTimestamp(cacheKey)
      
      return filteredExercises
      
    } catch (error: any) {
      logger.workout.error('WGER API search failed:', {
        query,
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      })
      
      // Return empty array on error
      return []
    }
  }
  
  async getExerciseById(id: number): Promise<WgerExercise | null> {
    const cacheKey = `exercise:${id}`
    
    // Check cache first
    if (this.exercisesCache.has(cacheKey) && this.isCacheValid(cacheKey)) {
      const cached = this.exercisesCache.get(cacheKey)!
      return cached.length > 0 ? cached[0] : null
    }
    
    try {
      logger.workout.debug(`Fetching WGER exercise by ID: ${id}`)
      
      const response = await this.withRateLimit(() =>
        axios.get<WgerExercise>(`${this.baseUrl}/exercise/${id}/`, {
          timeout: 10000,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'FitArchitect-ExerciseService'
          }
        })
      )
      
      const exercise = response.data
      
      // Cache the result
      this.exercisesCache.set(cacheKey, [exercise])
      this.setCacheTimestamp(cacheKey)
      
      return exercise
      
    } catch (error: any) {
      logger.workout.error(`WGER API failed to fetch exercise ${id}:`, {
        error: error.message,
        status: error.response?.status
      })
      
      return null
    }
  }
  
  async getCategories(): Promise<WgerCategory[]> {
    // Check cache first
    if (this.categoriesCache && this.isCacheValid('categories')) {
      return this.categoriesCache
    }
    
    try {
      logger.workout.debug('Fetching WGER exercise categories')
      
      const response = await this.withRateLimit(() =>
        axios.get<{ results: WgerCategory[] }>(`${this.baseUrl}/exercisecategory/`, {
          params: { limit: 100 },
          timeout: 10000,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'FitArchitect-ExerciseService'
          }
        })
      )
      
      const categories = response.data.results || []
      
      // Cache the results
      this.categoriesCache = categories
      this.setCacheTimestamp('categories')
      
      logger.workout.info(`Loaded ${categories.length} categories from WGER`)
      
      return categories
      
    } catch (error: any) {
      logger.workout.error('WGER API failed to fetch categories:', error.message)
      return this.categoriesCache || []
    }
  }
  
  async getMuscles(): Promise<WgerMuscle[]> {
    // Check cache first
    if (this.musclesCache && this.isCacheValid('muscles')) {
      return this.musclesCache
    }
    
    try {
      logger.workout.debug('Fetching WGER muscle groups')
      
      const response = await this.withRateLimit(() =>
        axios.get<{ results: WgerMuscle[] }>(`${this.baseUrl}/muscle/`, {
          params: { limit: 100 },
          timeout: 10000,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'FitArchitect-ExerciseService'
          }
        })
      )
      
      const muscles = response.data.results || []
      
      // Cache the results
      this.musclesCache = muscles
      this.setCacheTimestamp('muscles')
      
      logger.workout.info(`Loaded ${muscles.length} muscle groups from WGER`)
      
      return muscles
      
    } catch (error: any) {
      logger.workout.error('WGER API failed to fetch muscles:', error.message)
      return this.musclesCache || []
    }
  }
  
  async getEquipment(): Promise<WgerEquipment[]> {
    // Check cache first
    if (this.equipmentCache && this.isCacheValid('equipment')) {
      return this.equipmentCache
    }
    
    try {
      logger.workout.debug('Fetching WGER equipment types')
      
      const response = await this.withRateLimit(() =>
        axios.get<{ results: WgerEquipment[] }>(`${this.baseUrl}/equipment/`, {
          params: { limit: 100 },
          timeout: 10000,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'FitArchitect-ExerciseService'
          }
        })
      )
      
      const equipment = response.data.results || []
      
      // Cache the results
      this.equipmentCache = equipment
      this.setCacheTimestamp('equipment')
      
      logger.workout.info(`Loaded ${equipment.length} equipment types from WGER`)
      
      return equipment
      
    } catch (error: any) {
      logger.workout.error('WGER API failed to fetch equipment:', error.message)
      return this.equipmentCache || []
    }
  }
  
  async getExercisesByMuscle(muscleId: number, limit = 20): Promise<WgerExercise[]> {
    try {
      return await this.searchExercises('', {
        muscles: [muscleId],
        limit
      })
    } catch (error) {
      logger.workout.error(`Failed to get exercises for muscle ${muscleId}:`, error)
      return []
    }
  }
  
  async getExercisesByCategory(categoryId: number, limit = 20): Promise<WgerExercise[]> {
    try {
      return await this.searchExercises('', {
        category: categoryId,
        limit
      })
    } catch (error) {
      logger.workout.error(`Failed to get exercises for category ${categoryId}:`, error)
      return []
    }
  }
  
  async getExercisesByEquipment(equipmentId: number, limit = 20): Promise<WgerExercise[]> {
    try {
      return await this.searchExercises('', {
        equipment: [equipmentId],
        limit
      })
    } catch (error) {
      logger.workout.error(`Failed to get exercises for equipment ${equipmentId}:`, error)
      return []
    }
  }
  
  // Utility methods
  getMainImage(exercise: WgerExercise): string | null {
    const mainImage = exercise.images?.find(img => img.is_main)
    return mainImage?.image || exercise.images?.[0]?.image || null
  }
  
  getAllImages(exercise: WgerExercise): string[] {
    return exercise.images?.map(img => img.image) || []
  }
  
  getPrimaryMuscles(exercise: WgerExercise): string[] {
    return exercise.muscles?.map(muscle => muscle.name) || []
  }
  
  getSecondaryMuscles(exercise: WgerExercise): string[] {
    return exercise.muscles_secondary?.map(muscle => muscle.name) || []
  }
  
  getEquipmentNames(exercise: WgerExercise): string[] {
    return exercise.equipment?.map(eq => eq.name) || []
  }
  
  // Helper to clean HTML from descriptions
  cleanDescription(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&amp;/g, '&') // Replace HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim()
  }
  
  // Cache management
  clearCache() {
    this.exercisesCache.clear()
    this.categoriesCache = null
    this.musclesCache = null
    this.equipmentCache = null
    this.cacheTimestamp.clear()
    logger.workout.info('WGER API cache cleared')
  }
  
  getCacheInfo() {
    return {
      exerciseCacheSize: this.exercisesCache.size,
      hasCategoriesCache: !!this.categoriesCache,
      hasMusclesCache: !!this.musclesCache,
      hasEquipmentCache: !!this.equipmentCache,
      cacheTimestamps: Object.fromEntries(this.cacheTimestamp.entries())
    }
  }
  
  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.withRateLimit(() =>
        axios.get(`${this.baseUrl}/exercise/`, {
          params: { limit: 1 },
          timeout: 5000,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'FitArchitect-ExerciseService'
          }
        })
      )
      
      return response.status === 200
    } catch (error) {
      logger.workout.error('WGER API health check failed:', error)
      return false
    }
  }
  
  // Diagnostic information
  getDiagnosticInfo() {
    const cacheInfo = this.getCacheInfo()
    
    return {
      serviceName: 'WGER API',
      baseUrl: this.baseUrl,
      requestDelay: this.requestDelay,
      cacheExpiration: this.cacheExpiration,
      ...cacheInfo,
      recommendations: [
        ...(cacheInfo.exerciseCacheSize === 0 ? ['No cached exercises - first searches will be slower'] : []),
        ...(!cacheInfo.hasCategoriesCache ? ['Categories not cached - category filtering unavailable'] : []),
        ...(!cacheInfo.hasMusclesCache ? ['Muscles not cached - muscle-based searches unavailable'] : [])
      ]
    }
  }
}

// Export singleton instance
export const wgerApiService = new WgerApiService()

// Export types for external use
export type { 
  WgerExercise, 
  WgerCategory, 
  WgerMuscle, 
  WgerEquipment, 
  WgerSearchResult 
}