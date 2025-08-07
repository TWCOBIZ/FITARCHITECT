/**
 * Filename Normalization Utilities for Exercise-GIF Matching
 * 
 * Converts GIF filenames to standardized exercise names for matching
 * Examples: 
 * - mountain-climber.gif → Mountain Climber
 * - walking-high-knees-lunge.gif → Walking High Knees Lunge
 * - barbell-bench-press.gif → Barbell Bench Press
 */

/**
 * Convert a GIF filename to a normalized exercise name
 * @param filename - The GIF filename (e.g., "mountain-climber.gif")
 * @returns Normalized exercise name (e.g., "Mountain Climber")
 */
export const filenameToExerciseName = (filename: string): string => {
  // Remove file extension
  const nameWithoutExtension = filename.replace(/\.(gif|png|jpg|jpeg)$/i, '')
  
  // Convert kebab-case to Title Case
  const titleCase = nameWithoutExtension
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
  
  // Handle special cases and corrections
  const correctedName = applySpecialCases(titleCase)
  
  return correctedName
}

/**
 * Convert exercise name back to filename format (for reverse lookups)
 * @param exerciseName - Exercise name (e.g., "Mountain Climber")
 * @returns Filename format (e.g., "mountain-climber")
 */
export const exerciseNameToFilename = (exerciseName: string): string => {
  return exerciseName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '') // Remove special characters
}

/**
 * Apply special case corrections for common exercise naming patterns
 */
const applySpecialCases = (name: string): string => {
  const specialCases: Record<string, string> = {
    // Common exercise corrections
    'Push Up': 'Push-up',
    'Pull Up': 'Pull-up',
    'Set Up': 'Set-up',
    'Warm Up': 'Warm-up',
    'Cool Down': 'Cool-down',
    
    // Equipment naming
    'Db': 'Dumbbell',
    'Bb': 'Barbell',
    
    // Body parts
    'Lat': 'Lateral',
    'Tri': 'Triceps',
    'Bi': 'Biceps',
    'Delts': 'Deltoids',
    
    // Common abbreviations
    'V 2': 'V2',
    'V 3': 'V3',
    'Alt': 'Alternate',
    'Ext': 'Extension',
    'Rev': 'Reverse'
  }
  
  let correctedName = name
  
  // Apply word-level replacements
  Object.entries(specialCases).forEach(([from, to]) => {
    const regex = new RegExp(`\\b${from}\\b`, 'gi')
    correctedName = correctedName.replace(regex, to)
  })
  
  return correctedName
}

/**
 * Generate possible exercise name variations for matching
 * Handles pluralization and common variations
 */
export const generateExerciseVariations = (exerciseName: string): string[] => {
  const variations = new Set<string>()
  const baseName = exerciseName.toLowerCase()
  
  // Add original name
  variations.add(exerciseName)
  variations.add(baseName)
  
  // Add plural/singular variations
  if (baseName.endsWith('s') && baseName.length > 3) {
    // Try removing 's' for singular
    variations.add(baseName.slice(0, -1))
    variations.add(capitalizeFirst(baseName.slice(0, -1)))
  } else {
    // Add 's' for plural
    variations.add(baseName + 's')
    variations.add(capitalizeFirst(baseName + 's'))
  }
  
  // Add variations with different spacing/punctuation
  variations.add(baseName.replace(/\s+/g, ''))
  variations.add(baseName.replace(/[\-_]/g, ' '))
  variations.add(baseName.replace(/\s+/g, '-'))
  variations.add(baseName.replace(/\s+/g, '_'))
  
  // Add title case variations
  variations.add(toTitleCase(baseName))
  
  return Array.from(variations)
}

/**
 * Helper function to capitalize first letter
 */
const capitalizeFirst = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Helper function to convert to title case
 */
const toTitleCase = (str: string): string => {
  return str
    .split(/\s+/)
    .map(word => capitalizeFirst(word))
    .join(' ')
}

/**
 * Calculate similarity score between two exercise names (0-1)
 * Used for fuzzy matching when exact matches aren't found
 */
export const calculateNameSimilarity = (name1: string, name2: string): number => {
  const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '')
  
  const normalized1 = normalize(name1)
  const normalized2 = normalize(name2)
  
  // Simple Levenshtein distance-based similarity
  const distance = levenshteinDistance(normalized1, normalized2)
  const maxLength = Math.max(normalized1.length, normalized2.length)
  
  if (maxLength === 0) return 1
  
  return 1 - (distance / maxLength)
}

/**
 * Calculate Levenshtein distance between two strings
 */
const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix = []
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
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
  
  return matrix[str2.length][str1.length]
}

/**
 * Extract category from GIF file path
 * @param gifPath - Full path to GIF file
 * @returns Category (e.g., 'warmup', 'strength', 'cardio')
 */
export const extractCategoryFromPath = (gifPath: string): string => {
  const pathParts = gifPath.split('/')
  
  // Look for category in path segments
  for (const part of pathParts) {
    if (['warmup', 'strength', 'cardio', 'core', 'legs', 'arms', 'back', 'chest', 'shoulders', 'full-body'].includes(part.toLowerCase())) {
      return part.toLowerCase()
    }
  }
  
  // Default category based on common patterns
  if (gifPath.includes('barbell') || gifPath.includes('dumbbell') || gifPath.includes('cable')) {
    return 'strength'
  }
  
  if (gifPath.includes('cardio') || gifPath.includes('running') || gifPath.includes('jump')) {
    return 'cardio'
  }
  
  return 'general'
}