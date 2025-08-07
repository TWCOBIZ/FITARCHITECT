import { exerciseDbService } from '../services/exerciseDbService'
import { smartExerciseLookup } from './exerciseNameUtils'
import { logger } from './logger'

// Exercise category icons as SVG components
export const ExerciseIcons = {
  push: () => (
    <svg className="w-full h-full text-white" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 5.5V8.5L21 9ZM3 7V9L9 8.5V5.5L3 7ZM14 9C14 9.55 13.55 10 13 10H11C10.45 10 10 9.55 10 9V8H14V9ZM12 11L13.5 12.5L12 14L10.5 12.5L12 11ZM12 22C10.9 22 10 21.1 10 20C10 18.9 10.9 18 12 18C13.1 18 14 18.9 14 20C14 21.1 13.1 22 12 22Z"/>
    </svg>
  ),
  pull: () => (
    <svg className="w-full h-full text-white" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM4 7V9L10 8.5V5.5L4 7ZM20 7L14 5.5V8.5L20 9V7ZM10 10C10 10.55 10.45 11 11 11H13C13.55 11 14 10.55 14 10V9H10V10ZM12 13.5L10.5 12L12 10.5L13.5 12L12 13.5ZM10 20C10 21.1 10.9 22 12 22C13.1 22 14 21.1 14 20C14 18.9 13.1 18 12 18C10.9 18 10 18.9 10 20Z"/>
    </svg>
  ),
  legs: () => (
    <svg className="w-full h-full text-white" fill="currentColor" viewBox="0 0 24 24">
      <path d="M13.5 5.5C13.5 6.3 12.8 7 12 7S10.5 6.3 10.5 5.5 11.2 4 12 4 13.5 4.7 13.5 5.5M9.89 9.38L10.31 8L8.75 7L7.06 8.69C6.67 9.08 6.67 9.71 7.06 10.1L10.75 13.79C11.14 14.18 11.77 14.18 12.16 13.79L15.85 10.1C16.24 9.71 16.24 9.08 15.85 8.69L14.16 7L12.6 8L13.02 9.38L12 10.4L9.89 9.38M10.89 15.38L11.31 14L9.75 13L8.06 14.69C7.67 15.08 7.67 15.71 8.06 16.1L11.75 19.79C12.14 20.18 12.77 20.18 13.16 19.79L16.85 16.1C17.24 15.71 17.24 15.08 16.85 14.69L15.16 13L13.6 14L14.02 15.38L13 16.4L10.89 15.38Z"/>
    </svg>
  ),
  core: () => (
    <svg className="w-full h-full text-white" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM19 7H16V9H19V7ZM8 7H5V9H8V7ZM14 7H10V9H14V7ZM12 22C10.9 22 10 21.1 10 20C10 18.9 10.9 18 12 18C13.1 18 14 18.9 14 20C14 21.1 13.1 22 12 22ZM18 11H15V13H18V11ZM9 11H6V13H9V11ZM14 11H10V13H14V11ZM18 15H15V17H18V15ZM9 15H6V17H9V15ZM14 15H10V17H14V15Z"/>
    </svg>
  ),
  cardio: () => (
    <svg className="w-full h-full text-white" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.27 2 8.5C2 5.41 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.08C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.41 22 8.5C22 12.27 18.6 15.36 13.45 20.03L12 21.35Z"/>
    </svg>
  ),
  fullbody: () => (
    <svg className="w-full h-full text-white" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM15.89 8.11C15.5 7.72 14.83 7.68 14.39 8.03L13 9V15L15.79 21.95C16.03 22.5 16.69 22.75 17.24 22.5C17.79 22.26 18.04 21.6 17.8 21.05L15.5 15H19C19.55 15 20 14.55 20 14C20 13.45 19.55 13 19 13H15C14.65 13 14.32 13.14 14.08 13.39L11 16.59V10.5L12.11 9.39C12.89 8.61 13 7.38 12.22 6.61C11.44 5.83 10.17 5.83 9.39 6.61L7.61 8.39C7.22 8.78 7.22 9.41 7.61 9.8L8.5 10.69V15L5.71 21.95C5.47 22.5 5.72 23.16 6.27 23.4C6.82 23.64 7.48 23.39 7.72 22.84L10.5 15.84V11.31L9.61 10.42L11.39 8.64C11.61 8.42 11.97 8.39 12.22 8.64C12.47 8.89 12.5 9.25 12.28 9.47L11.17 10.58L12.11 9.39C13.56 7.94 15.56 8.11 15.89 8.11Z"/>
    </svg>
  )
}

// Category gradient colors
export const categoryGradients = {
  push: 'from-orange-600 to-red-600',
  pull: 'from-blue-600 to-indigo-600', 
  legs: 'from-green-600 to-emerald-600',
  core: 'from-purple-600 to-pink-600',
  cardio: 'from-red-600 to-rose-600',
  fullbody: 'from-yellow-600 to-orange-600'
}

// Difficulty indicators
export const difficultyColors = {
  beginner: 'bg-green-600',
  intermediate: 'bg-yellow-600', 
  advanced: 'bg-red-600'
}

// Equipment badges
export const equipmentIcons = {
  bodyweight: '🤸‍♂️',
  dumbbells: '🏋️‍♂️',
  barbell: '🏋️‍♀️',
  'pull-up bar': '🔗',
  'cable machine': '⚙️',
  bench: '🛏️',
  'dip bars': '🔗',
  'parallel bars': '🔗',
  'jump rope': '🪢',
  'plyo box': '📦',
  kettlebell: '⚫',
  'resistance bands': '🎗️',
  'medicine ball': '⚽',
  'lat pulldown': '⚙️',
  'rope attachment': '🪢',
  'leg press machine': '⚙️',
  'incline bench': '🛏️'
}

// Get exercise category from muscle groups
export const getExerciseCategory = (muscleGroups: string[]): string => {
  if (!muscleGroups || muscleGroups.length === 0) return 'fullbody'
  
  const muscle = muscleGroups[0].toLowerCase()
  
  if (['chest', 'shoulders', 'triceps'].some(m => muscle.includes(m))) return 'push'
  if (['back', 'lats', 'biceps', 'rhomboids', 'rear delts'].some(m => muscle.includes(m))) return 'pull'
  if (['legs', 'quadriceps', 'glutes', 'hamstrings', 'calves'].some(m => muscle.includes(m))) return 'legs'
  if (['abs', 'core', 'obliques'].some(m => muscle.includes(m))) return 'core'
  if (['cardio', 'full body'].some(m => muscle.includes(m))) return 'cardio'
  
  return 'fullbody'
}

// Exercise card component props
export interface ExerciseCardProps {
  exercise: any
  sets?: number
  reps?: number
  restTime?: number
  notes?: string
  onClick?: () => void
  showDetails?: boolean
  exerciseProgress?: {
    completed: boolean
    sets: { completed: boolean; reps: number; weight?: number }[]
  } | null
}

// Generate exercise image with fallback
export const getExerciseImageWithFallback = (exercise: any): { 
  imageUrl?: string
  videoUrl?: string
  isGif?: boolean
  category: string
  gradient: string
  icon: () => JSX.Element
} => {
  // Handle nested exercise structure
  const exerciseData = exercise?.exercise || exercise
  const muscleGroups = exerciseData?.muscleGroups || exercise?.muscleGroups || []
  const category = getExerciseCategory(muscleGroups)
  
  const imageUrl = exerciseData?.imageUrl || exercise?.imageUrl
  const videoUrl = exerciseData?.videoUrl || exercise?.videoUrl
  const isGif = imageUrl?.endsWith('.gif') || videoUrl?.endsWith('.gif')
  
  return {
    imageUrl,
    videoUrl,
    isGif,
    category,
    gradient: categoryGradients[category as keyof typeof categoryGradients] || categoryGradients.fullbody,
    icon: ExerciseIcons[category as keyof typeof ExerciseIcons] || ExerciseIcons.fullbody
  }
}

// Enhanced async function with registry-first lookup
export const getExerciseImageWithApi = async (exercise: any, onProgress?: (loading: boolean) => void): Promise<{ 
  imageUrl?: string
  videoUrl?: string
  isGif?: boolean
  category: string
  gradient: string
  icon: () => JSX.Element
  source?: 'registry' | 'api' | 'fallback' | 'cache' | 'default' | 'wger'
  error?: string
}> => {
  const fallbackData = getExerciseImageWithFallback(exercise)
  const exerciseData = exercise?.exercise || exercise
  const exerciseName = exerciseData?.name || exercise?.name
  
  if (!exerciseName) {
    logger.workout.warn('No exercise name provided')
    return { ...fallbackData, source: 'default' }
  }
  
  // Notify loading started
  onProgress?.(true)
  
  try {
    logger.workout.debug(`Registry-first lookup for: ${exerciseName}`)
    
    // 1. NEW: Try exercise registry first (O(1) lookup, fastest)
    const registryExercise = smartExerciseLookup(exerciseName)
    if (registryExercise?.gifPath) {
      logger.workout.debug(`Found registry GIF for: ${exerciseName} - ${registryExercise.gifPath}`)
      onProgress?.(false)
      return {
        ...fallbackData,
        imageUrl: registryExercise.gifPath,
        isGif: true,
        source: 'registry',
        category: registryExercise.category,
        gradient: categoryGradients[registryExercise.category as keyof typeof categoryGradients] || categoryGradients.fullbody,
        icon: ExerciseIcons[registryExercise.category as keyof typeof ExerciseIcons] || ExerciseIcons.fullbody
      }
    }
    
    // 2. If WGER already provided an image, use it but still try API upgrade
    if (fallbackData.imageUrl && !fallbackData.isGif) {
      logger.workout.debug(`WGER image exists for: ${exerciseName}, checking for GIF upgrade`)
    }
    
    // 3. Try ExerciseDB API (reduced priority)
    let apiGif = await exerciseDbService.searchExerciseByName(exerciseName)
    if (apiGif) {
      logger.workout.debug(`Found API GIF for: ${exerciseName} - ${apiGif}`)
      
      // TEMP FIX: ExerciseDB URLs are failing, skip to fallback
      console.log(`⚠️ ExerciseDB API returning invalid URLs, using fallback for: ${exerciseName}`)
    } else {
      // Try name variations only if registry didn't find anything
      const nameVariations = [
        exerciseName.toLowerCase(),
        exerciseName.replace(/s$/, ''), // Remove plural 's'
        exerciseName.replace('-', ' '),
        exerciseName.replace('_', ' ')
      ]
      
      for (const variation of nameVariations) {
        if (variation !== exerciseName) {
          apiGif = await exerciseDbService.searchExerciseByName(variation)
          if (apiGif) {
            logger.workout.debug(`Found API GIF with variation "${variation}" for: ${exerciseName} - ${apiGif}`)
            onProgress?.(false)
            return {
              ...fallbackData,
              imageUrl: apiGif,
              isGif: true,
              source: 'api'
            }
          }
        }
      }
    }
    
    // 4. Try fallback GIFs
    const fallbackGif = exerciseDbService.getFallbackGif(exerciseName)
    if (fallbackGif) {
      logger.workout.debug(`Using fallback GIF for: ${exerciseName} - ${fallbackGif}`)
      onProgress?.(false)
      return {
        ...fallbackData,
        imageUrl: fallbackGif,
        isGif: true,
        source: 'fallback'
      }
    }
    
    // 5. If WGER provided an image, keep it
    if (fallbackData.imageUrl) {
      logger.workout.debug(`Keeping WGER image for: ${exerciseName}`)
      onProgress?.(false)
      return { ...fallbackData, source: 'wger' }
    }
    
    logger.workout.debug(`No image found for: ${exerciseName}`)
    onProgress?.(false)
    return { ...fallbackData, source: 'default' }
    
  } catch (error) {
    logger.workout.error('Error fetching exercise image', error)
    onProgress?.(false)
    
    // If error but WGER image exists, use it
    if (fallbackData.imageUrl) {
      return { ...fallbackData, source: 'wger', error: 'GIF fetch failed, using WGER image' }
    }
    
    return { 
      ...fallbackData, 
      source: 'default',
      error: error instanceof Error ? error.message : 'Failed to load GIF'
    }
  }
}

// Preload GIFs for upcoming exercises in a workout
export const preloadWorkoutGifs = async (exercises: any[], maxConcurrent = 3): Promise<void> => {
  if (!exercises?.length) return
  
  logger.workout.debug(`Preloading GIFs for ${exercises.length} exercises`)
  
  // Process exercises in batches to avoid overwhelming the API
  for (let i = 0; i < exercises.length; i += maxConcurrent) {
    const batch = exercises.slice(i, i + maxConcurrent)
    
    const batchPromises = batch.map(async (exercise) => {
      const exerciseData = exercise?.exercise || exercise
      const exerciseName = exerciseData?.name || exercise?.name
      
      if (exerciseName) {
        try {
          await exerciseDbService.searchExerciseByName(exerciseName)
          logger.workout.debug(`Preloaded: ${exerciseName}`)
        } catch (error) {
          logger.workout.warn(`Failed to preload: ${exerciseName}`, error)
        }
      }
    })
    
    await Promise.allSettled(batchPromises)
    
    // Small delay between batches to be respectful to the API
    if (i + maxConcurrent < exercises.length) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  
  logger.workout.debug('Finished preloading workout GIFs')
}

// Get exercise image with caching and error handling
export const getExerciseImageCached = (exerciseName: string): { 
  imageUrl?: string
  isGif?: boolean
  source: 'cache' | 'fallback' | 'none'
} => {
  // Check ExerciseDB cache first
  const cacheStats = exerciseDbService.getCacheStats()
  if (cacheStats.gifCache > 0) {
    // Access the cache through a getter method we'll need to add
    try {
      const cached = localStorage.getItem('exercisedb_gif_cache')
      if (cached) {
        const gifCache = new Map(JSON.parse(cached))
        const normalizedName = exerciseName.toLowerCase().trim()
        
        if (gifCache.has(normalizedName)) {
          return {
            imageUrl: gifCache.get(normalizedName) as string || '',
            isGif: true,
            source: 'cache'
          }
        }
      }
    } catch (error) {
      logger.workout.warn('Failed to access GIF cache', error)
    }
  }
  
  // Try fallback
  const fallbackGif = exerciseDbService.getFallbackGif(exerciseName)
  if (fallbackGif) {
    return {
      imageUrl: fallbackGif,
      isGif: true,
      source: 'fallback'
    }
  }
  
  return { source: 'none' }
}