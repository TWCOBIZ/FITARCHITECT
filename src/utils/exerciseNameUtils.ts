/**
 * Exercise Name Utilities - Standardization and Normalization Functions
 * 
 * This module provides utilities for standardizing exercise names across different
 * sources and formats to ensure consistent lookups in the exercise registry.
 */

import { EXERCISE_REGISTRY, ExerciseDefinition } from '../data/exerciseRegistry'
import { logger } from './logger'

// Common exercise name variations and their standardized forms
const EXERCISE_NAME_MAPPINGS: Record<string, string> = {
  // Push variations
  'pushup': 'PUSH_UPS',
  'push-up': 'PUSH_UPS',
  'push up': 'PUSH_UPS',
  'press up': 'PUSH_UPS',
  'press-up': 'PUSH_UPS',
  
  // Squat variations
  'squat': 'SQUATS',
  'air squat': 'SQUATS',
  'air-squat': 'SQUATS',
  'bodyweight squat': 'SQUATS',
  'body weight squat': 'SQUATS',
  
  // Lunge variations
  'lunge': 'LUNGES',
  'forward lunge': 'LUNGES',
  'forward-lunge': 'LUNGES',
  'static lunge': 'LUNGES',
  
  // Plank variations
  'forearm plank': 'PLANK',
  'front plank': 'PLANK',
  'elbow plank': 'PLANK',
  
  // Jumping jack variations
  'jumping jack': 'JUMPING_JACKS',
  'star jump': 'JUMPING_JACKS',
  'star-jump': 'JUMPING_JACKS',
  'side straddle hop': 'JUMPING_JACKS',
  
  // Warm-up variations
  'arm circle': 'ARM_CIRCLES',
  'arm rotation': 'ARM_CIRCLES',
  'shoulder circle': 'ARM_CIRCLES',
  'shoulder roll': 'SHOULDER_ROLLS',
  'shoulder shrug': 'SHOULDER_ROLLS',
  'leg swing': 'LEG_SWINGS',
  'hip swing': 'LEG_SWINGS',
  'torso twist': 'TORSO_TWISTS',
  'spinal twist': 'TORSO_TWISTS',
  'trunk rotation': 'TORSO_TWISTS',
  'hip circle': 'HIP_CIRCLES',
  'hip rotation': 'HIP_CIRCLES',
  'high knee': 'WALKING_HIGH_KNEES',
  'high knees': 'WALKING_HIGH_KNEES',
  'knee lift': 'WALKING_HIGH_KNEES',
  'butt kick': 'BUTT_KICKERS',
  'butt-kick': 'BUTT_KICKERS',
  'heel kick': 'BUTT_KICKERS',
  
  // Flexibility/cooldown variations
  'childs pose': 'CHILD_POSE',
  'child pose': 'CHILD_POSE',
  'balasana': 'CHILD_POSE',
  'cobra': 'COBRA_STRETCH',
  'cobra pose': 'COBRA_STRETCH',
  'bhujangasana': 'COBRA_STRETCH'
}

// Common words to remove when normalizing exercise names
const STOP_WORDS = [
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'exercise', 'movement', 'workout', 'training'
]

/**
 * Normalize an exercise name for consistent lookup (Enhanced version)
 * @param name - Raw exercise name from any source
 * @returns Normalized string suitable for matching
 */
export const normalizeExerciseName = (name: string): string => {
  if (!name || typeof name !== 'string') {
    return ''
  }
  
  return name
    .toLowerCase()
    .trim()
    // Remove special characters except hyphens and spaces
    .replace(/[^\w\s-]/g, '')
    // Replace multiple spaces/hyphens with single space
    .replace(/[\s-]+/g, ' ')
    // Remove stop words
    .split(' ')
    .filter(word => word.length > 0 && !STOP_WORDS.includes(word))
    .join(' ')
    .trim()
}

/**
 * Convert normalized name to standardized registry key
 * @param normalizedName - Normalized exercise name
 * @returns UPPER_SNAKE_CASE registry key
 */
export const toStandardizedKey = (normalizedName: string): string => {
  return normalizedName
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_')
    // Remove any remaining special characters
    .replace(/[^\w_]/g, '')
    // Clean up multiple underscores
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
}

/**
 * Smart exercise name lookup with multiple fallback strategies
 * @param rawName - Raw exercise name from any source
 * @returns Exercise definition or null if not found
 */
export const smartExerciseLookup = (rawName: string): ExerciseDefinition | null => {
  if (!rawName) {
    return null
  }
  
  const originalName = rawName.trim()
  logger.workout.debug(`🔍 Smart lookup for: "${originalName}"`)
  
  // Strategy 1: Direct registry lookup by standardized key
  const normalizedName = normalizeExerciseName(originalName)
  const standardizedKey = toStandardizedKey(normalizedName)
  
  if (EXERCISE_REGISTRY[standardizedKey]) {
    logger.workout.debug(`✅ Found by direct lookup: ${standardizedKey}`)
    return EXERCISE_REGISTRY[standardizedKey]
  }
  
  // Strategy 2: Check common name mappings
  const lowerName = normalizedName.toLowerCase()
  if (EXERCISE_NAME_MAPPINGS[lowerName]) {
    const mappedKey = EXERCISE_NAME_MAPPINGS[lowerName]
    if (EXERCISE_REGISTRY[mappedKey]) {
      logger.workout.debug(`✅ Found by name mapping: ${lowerName} -> ${mappedKey}`)
      return EXERCISE_REGISTRY[mappedKey]
    }
  }
  
  // Strategy 3: Search through exercise names and alternatives
  for (const [key, exercise] of Object.entries(EXERCISE_REGISTRY)) {
    // Check main name
    if (normalizeExerciseName(exercise.name) === normalizedName) {
      logger.workout.debug(`✅ Found by main name match: "${exercise.name}"`)
      return exercise
    }
    
    // Check alternatives
    if (exercise.alternatives) {
      for (const alt of exercise.alternatives) {
        if (normalizeExerciseName(alt) === normalizedName) {
          logger.workout.debug(`✅ Found by alternative match: "${alt}" -> "${exercise.name}"`)
          return exercise
        }
      }
    }
  }
  
  // Strategy 4: Fuzzy matching - check if normalized name contains key parts
  for (const [key, exercise] of Object.entries(EXERCISE_REGISTRY)) {
    const exerciseNormalized = normalizeExerciseName(exercise.name)
    const words = normalizedName.split(' ')
    const exerciseWords = exerciseNormalized.split(' ')
    
    // Check if all main exercise words are present
    if (exerciseWords.length > 0 && exerciseWords.every(word => words.includes(word))) {
      logger.workout.debug(`✅ Found by fuzzy match: "${normalizedName}" contains "${exerciseNormalized}"`)
      return exercise
    }
  }
  
  // Strategy 5: Partial matching - check if any significant word matches
  const significantWords = normalizedName.split(' ').filter(word => word.length > 3)
  if (significantWords.length > 0) {
    for (const [key, exercise] of Object.entries(EXERCISE_REGISTRY)) {
      const exerciseWords = normalizeExerciseName(exercise.name).split(' ')
      
      // Check if any significant word matches
      if (significantWords.some(word => exerciseWords.includes(word))) {
        logger.workout.debug(`✅ Found by partial match: "${normalizedName}" shares words with "${exercise.name}"`)
        return exercise
      }
    }
  }
  
  logger.workout.warn(`❌ No match found for: "${originalName}" (normalized: "${normalizedName}")`)
  return null
}

// Legacy functions kept for backwards compatibility
export const generateExerciseId = (name: string): string => {
  return normalizeExerciseName(name)
    .replace(/\s+/g, '-')
    .toLowerCase()
}

export const exerciseNameSimilarity = (name1: string, name2: string): number => {
  const norm1 = normalizeExerciseName(name1)
  const norm2 = normalizeExerciseName(name2)
  
  if (norm1 === norm2) return 1.0
  
  // Calculate Levenshtein distance
  const matrix: number[][] = []
  
  for (let i = 0; i <= norm2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= norm1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= norm2.length; i++) {
    for (let j = 1; j <= norm1.length; j++) {
      if (norm2.charAt(i - 1) === norm1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }
  
  const maxLength = Math.max(norm1.length, norm2.length)
  return maxLength === 0 ? 1.0 : 1.0 - (matrix[norm2.length][norm1.length] / maxLength)
}

export const findSimilarExercises = (targetName: string, exerciseList: string[], threshold = 0.7): string[] => {
  return exerciseList
    .map(name => ({
      name,
      similarity: exerciseNameSimilarity(targetName, name)
    }))
    .filter(({ similarity }) => similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .map(({ name }) => name)
}

/**
 * Generate alternative name variations for an exercise
 * @param exerciseName - Base exercise name
 * @returns Array of possible name variations
 */
export const generateNameVariations = (exerciseName: string): string[] => {
  if (!exerciseName) return []
  
  const normalized = normalizeExerciseName(exerciseName)
  const variations = new Set<string>()
  
  // Add original name
  variations.add(exerciseName.toLowerCase())
  variations.add(normalized)
  
  // Add singular/plural variations
  if (normalized.endsWith('s')) {
    variations.add(normalized.slice(0, -1)) // Remove 's'
  } else {
    variations.add(normalized + 's') // Add 's'
  }
  
  // Add hyphenated/space variations
  variations.add(normalized.replace(/\s+/g, '-'))
  variations.add(normalized.replace(/-+/g, ' '))
  
  // Remove empty variations
  return Array.from(variations).filter(v => v.length > 0)
}

/**
 * Validate exercise name against registry
 * @param name - Exercise name to validate
 * @returns Validation result with suggestions
 */
export const validateExerciseName = (name: string): {
  isValid: boolean
  standardizedName?: string
  suggestions: string[]
  confidence: number
} => {
  const result = smartExerciseLookup(name)
  
  if (result) {
    return {
      isValid: true,
      standardizedName: result.standardizedName,
      suggestions: [],
      confidence: 1.0
    }
  }
  
  // Generate suggestions based on partial matches
  const normalizedInput = normalizeExerciseName(name)
  const suggestions: Array<{exercise: ExerciseDefinition, score: number}> = []
  
  for (const exercise of Object.values(EXERCISE_REGISTRY)) {
    const exerciseName = normalizeExerciseName(exercise.name)
    const inputWords = normalizedInput.split(' ')
    const exerciseWords = exerciseName.split(' ')
    
    // Calculate similarity score
    let score = 0
    const totalWords = Math.max(inputWords.length, exerciseWords.length)
    
    // Count matching words
    const matchingWords = inputWords.filter(word => exerciseWords.includes(word)).length
    score += (matchingWords / totalWords) * 0.7
    
    // Bonus for exact substring matches
    if (exerciseName.includes(normalizedInput) || normalizedInput.includes(exerciseName)) {
      score += 0.3
    }
    
    if (score > 0.3) { // Only include decent matches
      suggestions.push({ exercise, score })
    }
  }
  
  // Sort by score and take top 5
  suggestions.sort((a, b) => b.score - a.score)
  const topSuggestions = suggestions.slice(0, 5).map(s => s.exercise.name)
  
  return {
    isValid: false,
    suggestions: topSuggestions,
    confidence: suggestions.length > 0 ? suggestions[0].score : 0
  }
}

/**
 * Get exercise registry statistics for debugging
 */
export const getNameMappingStats = () => {
  const registrySize = Object.keys(EXERCISE_REGISTRY).length
  const mappingSize = Object.keys(EXERCISE_NAME_MAPPINGS).length
  const totalAlternatives = Object.values(EXERCISE_REGISTRY)
    .reduce((sum, ex) => sum + (ex.alternatives?.length || 0), 0)
  
  return {
    registrySize,
    commonMappings: mappingSize,
    totalAlternatives,
    totalLookupVariations: mappingSize + totalAlternatives
  }
}