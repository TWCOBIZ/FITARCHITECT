import axios from 'axios'
import { logger } from '../utils/logger'

interface FreeExerciseDbExercise {
  id: string
  name: string
  force?: string
  level: string
  mechanic?: string
  equipment?: string
  primaryMuscles: string[]
  secondaryMuscles: string[]
  instructions: string[]
  category: string
  images: string[]
}

interface ExerciseSearchOptions {
  limit?: number
  muscle?: string
  equipment?: string
  level?: string
  category?: string
}

class FreeExerciseDbService {
  private baseUrl = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main'
  private imageBaseUrl = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises'
  private exercisesCache: FreeExerciseDbExercise[] | null = null
  private cacheTimestamp: number = 0
  private readonly cacheExpiration = 60 * 60 * 1000 // 1 hour in milliseconds
  
  constructor() {
    logger.workout.info('Free Exercise DB Service initialized', {
      baseUrl: this.baseUrl,
      cacheExpiration: `${this.cacheExpiration / 1000 / 60} minutes`
    })
  }
  
  private async loadExercises(): Promise<FreeExerciseDbExercise[]> {
    // Check if cache is still valid
    if (this.exercisesCache && (Date.now() - this.cacheTimestamp) < this.cacheExpiration) {
      logger.workout.debug('Using cached Free Exercise DB data')
      return this.exercisesCache
    }
    
    try {
      logger.workout.debug('Fetching exercises from Free Exercise DB')
      
      const response = await axios.get(`${this.baseUrl}/dist/exercises.json`, {
        timeout: 15000, // 15 second timeout
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'FitArchitect-ExerciseService'
        }
      })
      
      if (!Array.isArray(response.data)) {
        throw new Error('Invalid response format: expected array of exercises')
      }
      
      // Validate and clean the data
      const exercises = response.data.filter((exercise: any) => {
        return exercise.name && 
               exercise.id && 
               Array.isArray(exercise.instructions) &&
               Array.isArray(exercise.primaryMuscles)
      })
      
      logger.workout.info(`Loaded ${exercises.length} exercises from Free Exercise DB`)
      
      // Cache the results
      this.exercisesCache = exercises
      this.cacheTimestamp = Date.now()
      
      return exercises
      
    } catch (error: any) {
      logger.workout.error('Failed to load exercises from Free Exercise DB:', {
        error: error.message,
        status: error.response?.status,
        url: error.config?.url
      })
      
      // Return empty array if loading fails and no cache available
      if (!this.exercisesCache) {
        return []
      }
      
      // Return stale cache if available
      logger.workout.warn('Using stale cached data due to fetch failure')
      return this.exercisesCache
    }
  }
  
  async searchExercises(query: string, options: ExerciseSearchOptions = {}): Promise<FreeExerciseDbExercise[]> {
    const exercises = await this.loadExercises()
    
    if (exercises.length === 0) {
      logger.workout.warn('No exercises available for search')
      return []
    }
    
    const searchTerm = query.toLowerCase().trim()
    const { limit = 10, muscle, equipment, level, category } = options
    
    let filtered = exercises.filter(exercise => {
      // Name matching
      const nameMatch = exercise.name.toLowerCase().includes(searchTerm)
      
      // Muscle matching
      const muscleMatch = muscle ? 
        exercise.primaryMuscles.some(m => m.toLowerCase().includes(muscle.toLowerCase())) ||
        exercise.secondaryMuscles.some(m => m.toLowerCase().includes(muscle.toLowerCase())) :
        true
      
      // Equipment matching
      const equipmentMatch = equipment ? 
        exercise.equipment?.toLowerCase().includes(equipment.toLowerCase()) :
        true
      
      // Level matching
      const levelMatch = level ? 
        exercise.level?.toLowerCase() === level.toLowerCase() :
        true
      
      // Category matching
      const categoryMatch = category ? 
        exercise.category?.toLowerCase().includes(category.toLowerCase()) :
        true
      
      return nameMatch && muscleMatch && equipmentMatch && levelMatch && categoryMatch
    })
    
    // Sort by relevance (exact name matches first)
    filtered.sort((a, b) => {
      const aExact = a.name.toLowerCase() === searchTerm
      const bExact = b.name.toLowerCase() === searchTerm
      
      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1
      
      const aStarts = a.name.toLowerCase().startsWith(searchTerm)
      const bStarts = b.name.toLowerCase().startsWith(searchTerm)
      
      if (aStarts && !bStarts) return -1
      if (!aStarts && bStarts) return 1
      
      return a.name.localeCompare(b.name)
    })
    
    // Apply limit
    filtered = filtered.slice(0, limit)
    
    logger.workout.debug(`Free Exercise DB search: "${query}" returned ${filtered.length} results`)
    
    return filtered
  }
  
  async getExerciseById(id: string): Promise<FreeExerciseDbExercise | null> {
    const exercises = await this.loadExercises()
    const exercise = exercises.find(ex => ex.id === id)
    
    if (!exercise) {
      logger.workout.warn(`Exercise not found in Free Exercise DB: ${id}`)
      return null
    }
    
    return exercise
  }
  
  async getExercisesByMuscle(muscle: string, limit = 20): Promise<FreeExerciseDbExercise[]> {
    const exercises = await this.loadExercises()
    
    const muscleFilter = muscle.toLowerCase()
    const filtered = exercises.filter(exercise => 
      exercise.primaryMuscles.some(m => m.toLowerCase().includes(muscleFilter)) ||
      exercise.secondaryMuscles.some(m => m.toLowerCase().includes(muscleFilter))
    )
    
    logger.workout.debug(`Found ${filtered.length} exercises targeting muscle: ${muscle}`)
    
    return filtered.slice(0, limit)
  }
  
  async getExercisesByEquipment(equipment: string, limit = 20): Promise<FreeExerciseDbExercise[]> {
    const exercises = await this.loadExercises()
    
    const equipmentFilter = equipment.toLowerCase()
    const filtered = exercises.filter(exercise => 
      exercise.equipment?.toLowerCase().includes(equipmentFilter)
    )
    
    logger.workout.debug(`Found ${filtered.length} exercises using equipment: ${equipment}`)
    
    return filtered.slice(0, limit)
  }
  
  async getExercisesByCategory(category: string, limit = 20): Promise<FreeExerciseDbExercise[]> {
    const exercises = await this.loadExercises()
    
    const categoryFilter = category.toLowerCase()
    const filtered = exercises.filter(exercise => 
      exercise.category?.toLowerCase().includes(categoryFilter)
    )
    
    logger.workout.debug(`Found ${filtered.length} exercises in category: ${category}`)
    
    return filtered.slice(0, limit)
  }
  
  getImageUrl(imagePath: string): string {
    // Handle both full paths and relative paths
    if (imagePath.startsWith('http')) {
      return imagePath
    }
    
    return `${this.imageBaseUrl}/${imagePath}`
  }
  
  async getRandomExercises(count = 10): Promise<FreeExerciseDbExercise[]> {
    const exercises = await this.loadExercises()
    
    if (exercises.length === 0) {
      return []
    }
    
    // Shuffle array and take requested count
    const shuffled = [...exercises].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, count)
  }
  
  // Get available filter options
  async getAvailableOptions(): Promise<{
    muscles: string[]
    equipment: string[]
    levels: string[]
    categories: string[]
  }> {
    const exercises = await this.loadExercises()
    
    const muscles = new Set<string>()
    const equipment = new Set<string>()
    const levels = new Set<string>()
    const categories = new Set<string>()
    
    exercises.forEach(exercise => {
      exercise.primaryMuscles.forEach(muscle => muscles.add(muscle))
      exercise.secondaryMuscles.forEach(muscle => muscles.add(muscle))
      
      if (exercise.equipment) {
        equipment.add(exercise.equipment)
      }
      
      if (exercise.level) {
        levels.add(exercise.level)
      }
      
      if (exercise.category) {
        categories.add(exercise.category)
      }
    })
    
    return {
      muscles: Array.from(muscles).sort(),
      equipment: Array.from(equipment).sort(),
      levels: Array.from(levels).sort(),
      categories: Array.from(categories).sort()
    }
  }
  
  // Cache management
  clearCache() {
    this.exercisesCache = null
    this.cacheTimestamp = 0
    logger.workout.info('Free Exercise DB cache cleared')
  }
  
  getCacheInfo() {
    return {
      hasCachedData: !!this.exercisesCache,
      exerciseCount: this.exercisesCache?.length || 0,
      cacheAge: this.cacheTimestamp ? Date.now() - this.cacheTimestamp : 0,
      cacheExpiration: this.cacheExpiration,
      isExpired: this.cacheTimestamp ? (Date.now() - this.cacheTimestamp) > this.cacheExpiration : true
    }
  }
  
  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      const exercises = await this.loadExercises()
      return exercises.length > 0
    } catch (error) {
      logger.workout.error('Free Exercise DB health check failed:', error)
      return false
    }
  }
  
  // Service diagnostic information
  getDiagnosticInfo() {
    const cacheInfo = this.getCacheInfo()
    
    return {
      serviceName: 'Free Exercise DB',
      baseUrl: this.baseUrl,
      imageBaseUrl: this.imageBaseUrl,
      ...cacheInfo,
      recommendations: [
        ...(cacheInfo.isExpired ? ['Cache is expired - next request will refresh data'] : []),
        ...(!cacheInfo.hasCachedData ? ['No cached data - first request will download exercise database'] : [])
      ]
    }
  }
}

// Export singleton instance
export const freeExerciseDbService = new FreeExerciseDbService()

// Export types for external use
export type { FreeExerciseDbExercise, ExerciseSearchOptions }