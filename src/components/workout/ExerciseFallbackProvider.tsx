import React, { createContext, useContext, useEffect, useState } from 'react'
import { exerciseSourceManager, ExerciseData, ExerciseSearchResult, ExerciseSource } from '../../services/ExerciseSourceManager'
import { exerciseDbService } from '../../services/exerciseDbService'
import { freeExerciseDbService } from '../../services/freeExerciseDbService'
import { wgerApiService } from '../../services/wgerApiService'
import { findLocalExerciseGif, normalizeExerciseName, checkLocalGifExists } from '../../data/fitnessBlenderGifs'
import { smartExerciseLookup } from '../../utils/exerciseNameUtils'
import { logger } from '../../utils/logger'
import { unifiedGifRegistry } from '../../services/UnifiedGifRegistry'
import { getExerciseByNameWithGif } from '../../data/exerciseRegistry'

interface ExerciseFallbackContextType {
  searchExercise: (exerciseName: string) => Promise<ExerciseSearchResult>
  getExerciseGif: (exerciseName: string) => Promise<string | null>
  sourceStatus: Record<ExerciseSource, any>
  isInitialized: boolean
  resetSources: () => void
  clearCache: () => void
}

const ExerciseFallbackContext = createContext<ExerciseFallbackContextType | null>(null)

// Note: checkLocalGifExists is now imported from fitnessBlenderGifs.ts

interface ExerciseFallbackProviderProps {
  children: React.ReactNode
}

export const ExerciseFallbackProvider: React.FC<ExerciseFallbackProviderProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false)
  const [sourceStatus, setSourceStatus] = useState<Record<ExerciseSource, any>>({
    'exercisedb': { healthStatus: 'healthy' },
    'freeexercisedb': { healthStatus: 'healthy' },
    'wger': { healthStatus: 'healthy' },
    'fallback': { healthStatus: 'healthy' },
    'cache': { healthStatus: 'healthy' }
  })

  useEffect(() => {
    initializeServices()
  }, [])

  const initializeServices = async () => {
    try {
      logger.workout.info('Initializing Exercise Fallback Provider with UnifiedGifRegistry')
      
      // Initialize the unified GIF registry first
      await unifiedGifRegistry.initialize()
      
      // Inject service dependencies into the source manager (for search functionality)
      exerciseSourceManager.setExerciseDbService(exerciseDbService)
      exerciseSourceManager.setFreeExerciseDbService(freeExerciseDbService)
      exerciseSourceManager.setWgerApiService(wgerApiService)
      
      // Update source status
      setSourceStatus(exerciseSourceManager.getSourceStatus())
      setIsInitialized(true)
      
      logger.workout.info('Exercise Fallback Provider initialized successfully with UnifiedGifRegistry')
      
    } catch (error: any) {
      logger.workout.error('Failed to initialize Exercise Fallback Provider:', error.message)
      setIsInitialized(true) // Still mark as initialized to prevent blocking
    }
  }

  const searchExercise = async (exerciseName: string): Promise<ExerciseSearchResult> => {
    if (!isInitialized) {
      logger.workout.warn('Exercise Fallback Provider not yet initialized')
      return {
        exercises: [],
        source: 'fallback',
        isLoading: false,
        error: 'Service not initialized'
      }
    }

    try {
      const result = await exerciseSourceManager.searchExerciseByName(exerciseName)
      
      // Update source status after each search
      setSourceStatus(exerciseSourceManager.getSourceStatus())
      
      return result
      
    } catch (error: any) {
      logger.workout.error(`Failed to search for exercise "${exerciseName}":`, error.message)
      
      return {
        exercises: [],
        source: 'fallback',
        isLoading: false,
        error: error.message
      }
    }
  }

  const getExerciseGif = async (exerciseName: string): Promise<string | null> => {
    try {
      logger.workout.debug(`🎯 UnifiedGifRegistry lookup: "${exerciseName}"`)
      
      // PRIMARY STRATEGY: Use UnifiedGifRegistry with intelligent matching
      try {
        // First, try to get exercise with GIF from our curated registry
        const exerciseWithGif = await getExerciseByNameWithGif(exerciseName, false) // Only approved GIFs for users
        if (exerciseWithGif?.gifPath) {
          logger.workout.debug(`✅ Exercise Registry: Found "${exerciseWithGif.gifPath}" for "${exerciseName}"`)
          return exerciseWithGif.gifPath
        }
        
        // If not in curated registry, try direct UnifiedGifRegistry lookup with smart matching
        const gifPath = await unifiedGifRegistry.getExerciseGif(exerciseName, undefined, false) // Only approved
        if (gifPath) {
          logger.workout.debug(`✅ UnifiedGifRegistry: Found "${gifPath}" for "${exerciseName}"`)
          return gifPath
        }
        
      } catch (registryError) {
        logger.workout.warn(`UnifiedGifRegistry lookup failed for "${exerciseName}":`, registryError)
      }
      
      // LEGACY FALLBACK CHAIN (only used when unified registry fails)
      logger.workout.debug(`🔄 Falling back to legacy lookup chain for "${exerciseName}"`)
      
      // Legacy fallback 1: Try old registry system 
      const registryExercise = smartExerciseLookup(exerciseName)
      if (registryExercise?.gifPath) {
        const exists = await checkLocalGifExists(registryExercise.gifPath)
        if (exists) {
          logger.workout.debug(`✅ Legacy Registry: Found "${registryExercise.gifPath}" for "${exerciseName}"`)
          return registryExercise.gifPath
        }
      }
      
      // Legacy fallback 2: Try local GIF files
      const localGifPath = findLocalExerciseGif(exerciseName)
      if (localGifPath) {
        const exists = await checkLocalGifExists(localGifPath)
        if (exists) {
          logger.workout.debug(`✅ Local GIF (legacy): Found "${localGifPath}" for "${exerciseName}"`)
          return localGifPath
        }
      }
      
      // Legacy fallback 3: Try ExerciseDB API
      const apiGif = await exerciseDbService.searchExerciseByName(exerciseName)
      if (apiGif) {
        logger.workout.debug(`✅ ExerciseDB API: Found GIF for "${exerciseName}"`)
        return apiGif
      }
      
      // Legacy fallback 4: Try external sources
      const result = await searchExercise(exerciseName)
      if (result.exercises.length > 0) {
        const exercise = result.exercises[0]
        
        if (exercise.gifUrl) {
          logger.workout.debug(`✅ External Source: Found GIF for "${exerciseName}"`)
          return exercise.gifUrl
        }
        
        if (exercise.imageUrls && exercise.imageUrls.length > 0) {
          logger.workout.debug(`✅ External Source: Found image for "${exerciseName}"`)
          return exercise.imageUrls[0]
        }
      }
      
      // Final fallback: Default external GIF
      const fallbackGif = exerciseDbService.getFallbackGif(exerciseName)
      if (fallbackGif) {
        logger.workout.debug(`✅ Final Fallback: Using external GIF for "${exerciseName}"`)
        return fallbackGif
      }
      
      logger.workout.warn(`❌ No GIF found for "${exerciseName}" - exhausted all lookup strategies`)
      return null
      
    } catch (error: any) {
      logger.workout.error(`Failed to get GIF for exercise "${exerciseName}":`, error.message)
      return exerciseDbService.getFallbackGif(exerciseName)
    }
  }

  const resetSources = () => {
    exerciseSourceManager.resetSourceHealth()
    setSourceStatus(exerciseSourceManager.getSourceStatus())
    logger.workout.info('Exercise source health status reset')
  }

  const clearCache = () => {
    // Clear unified registry cache
    unifiedGifRegistry.reset()
    
    // Clear legacy caches
    exerciseSourceManager.clearCache()
    exerciseDbService.clearCache()
    freeExerciseDbService.clearCache()
    wgerApiService.clearCache()
    
    logger.workout.info('All exercise caches cleared (including UnifiedGifRegistry)')
  }

  const contextValue: ExerciseFallbackContextType = {
    searchExercise,
    getExerciseGif,
    sourceStatus,
    isInitialized,
    resetSources,
    clearCache
  }

  return (
    <ExerciseFallbackContext.Provider value={contextValue}>
      {children}
    </ExerciseFallbackContext.Provider>
  )
}

// Hook for components to use the exercise fallback system
export const useExerciseFallback = (): ExerciseFallbackContextType => {
  const context = useContext(ExerciseFallbackContext)
  
  if (!context) {
    throw new Error('useExerciseFallback must be used within an ExerciseFallbackProvider')
  }
  
  return context
}

// Higher-order component for easy integration
export const withExerciseFallback = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return React.forwardRef<any, P>((props, ref) => (
    <ExerciseFallbackProvider>
      <Component {...props} ref={ref} />
    </ExerciseFallbackProvider>
  ))
}

// Exercise GIF component with automatic fallback handling
interface ExerciseGifProps {
  exerciseName: string
  className?: string
  alt?: string
  onLoad?: () => void
  onError?: (error: string) => void
  showLoadingSpinner?: boolean
}

export const ExerciseGif: React.FC<ExerciseGifProps> = ({
  exerciseName,
  className = '',
  alt,
  onLoad,
  onError,
  showLoadingSpinner = true
}) => {
  const { getExerciseGif } = useExerciseFallback()
  const [gifUrl, setGifUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadExerciseGif()
  }, [exerciseName])

  const loadExerciseGif = async () => {
    if (!exerciseName) return

    setIsLoading(true)
    setError(null)

    try {
      const url = await getExerciseGif(exerciseName)
      
      if (url) {
        setGifUrl(url)
        onLoad?.()
      } else {
        const errorMsg = `No demonstration available for "${exerciseName}"`
        setError(errorMsg)
        onError?.(errorMsg)
      }
      
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to load exercise demonstration'
      setError(errorMsg)
      onError?.(errorMsg)
      
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && showLoadingSpinner) {
    return (
      <div className={`flex items-center justify-center bg-gray-800/50 rounded-lg ${className}`}>
        <div className="flex flex-col items-center gap-2 p-4">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-gray-400">Loading exercise...</span>
        </div>
      </div>
    )
  }

  if (error || !gifUrl) {
    return (
      <div className={`flex items-center justify-center bg-gray-800/50 rounded-lg ${className}`}>
        <div className="flex flex-col items-center gap-2 p-4 text-center">
          <div className="w-8 h-8 text-gray-500">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.9 1 3 1.9 3 3V21C3 22.1 3.9 23 5 23H19C20.1 23 21 22.1 21 21V9M19 9H12V16H19V9Z"/>
            </svg>
          </div>
          <span className="text-xs text-gray-500">
            {error || 'No demonstration available'}
          </span>
        </div>
      </div>
    )
  }

  return (
    <img
      src={gifUrl}
      alt={alt || `${exerciseName} demonstration`}
      className={`rounded-lg ${className}`}
      onLoad={onLoad}
      onError={() => {
        const errorMsg = `Failed to load image for "${exerciseName}"`
        setError(errorMsg)
        onError?.(errorMsg)
      }}
    />
  )
}

// Exercise source status indicator component
export const ExerciseSourceStatus: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { sourceStatus, isInitialized, resetSources } = useExerciseFallback()

  if (!isInitialized) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        Initializing exercise sources...
      </div>
    )
  }

  const healthyCount = Object.values(sourceStatus).filter(s => s.healthStatus === 'healthy').length
  const totalCount = Object.keys(sourceStatus).length

  return (
    <div className={`text-sm ${className}`}>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${
          healthyCount === totalCount ? 'bg-green-400' :
          healthyCount > totalCount / 2 ? 'bg-yellow-400' :
          'bg-red-400'
        }`}></span>
        <span className="text-gray-300">
          Exercise Sources: {healthyCount}/{totalCount} healthy
        </span>
        {healthyCount < totalCount && (
          <button
            onClick={resetSources}
            className="text-xs text-blue-400 hover:text-blue-300 underline"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  )
}