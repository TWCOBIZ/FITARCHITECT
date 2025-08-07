/**
 * Unified Exercise Registry - Simple Exercise Name Mapping System
 * 
 * This registry provides O(1) lookups for exercise names to their standardized
 * properties. GIF paths are now dynamically resolved through UnifiedGifRegistry.
 * 
 * DESIGN PRINCIPLES:
 * - Static hash map for O(1) performance (vs O(n) linear searches)
 * - UPPER_SNAKE_CASE naming convention for consistency
 * - Single source of truth for all exercise data
 * - Dynamic GIF resolution through UnifiedGifRegistry
 * - Eliminates complex 4-layer fallback chains
 */

import { unifiedGifRegistry } from '../services/UnifiedGifRegistry'
import type { ExerciseContext } from '../utils/exerciseMatching'

// Core exercise definition interface
export interface ExerciseDefinition {
  name: string
  standardizedName: string // UPPER_SNAKE_CASE version
  description: string
  category: 'warmup' | 'strength' | 'cardio' | 'cooldown' | 'flexibility' | 'plyometric'
  muscleGroups: string[]
  equipment: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  instructions: string[]
  tips?: string[]
  alternatives?: string[] // Alternative exercise names that map to this exercise
  source: 'curated' | 'wger' | 'exercisedb' | 'manual'
  metadata?: {
    duration?: number // For timed exercises (seconds)
    restTime?: number // Recommended rest time
    videoUrl?: string // External video URL
    imageUrl?: string // Static image fallback
  }
  // Note: gifPath removed - now resolved dynamically via UnifiedGifRegistry
}

// Extended interface that includes dynamically resolved GIF path
export interface ExerciseWithGif extends ExerciseDefinition {
  gifPath: string | null
}

// The unified exercise registry - single source of truth
export const EXERCISE_REGISTRY: Record<string, ExerciseDefinition> = {
  
  // ===== WARM-UP EXERCISES =====
  ARM_CIRCLES: {
    name: 'Arm Circles',
    standardizedName: 'ARM_CIRCLES',
    description: 'Forward and backward circular motions with arms extended to warm up shoulders',
    category: 'warmup',
    muscleGroups: ['shoulders', 'arms'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    instructions: [
      'Stand with feet shoulder-width apart',
      'Extend arms out to sides parallel to the floor',
      'Make small circles with your arms, gradually increasing size',
      'Complete 10 circles forward, then 10 backward'
    ],
    alternatives: ['arm rotations', 'shoulder circles', 'arm swings'],
    source: 'curated',
    metadata: { duration: 30, restTime: 0 }
  },

  SHOULDER_ROLLS: {
    name: 'Shoulder Rolls',
    standardizedName: 'SHOULDER_ROLLS',
    description: 'Rolling shoulders backward and forward to release tension and improve mobility',
    category: 'warmup',
    muscleGroups: ['shoulders', 'upper back'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    instructions: [
      'Stand tall with arms at your sides',
      'Slowly roll shoulders up and back in a circular motion',
      'Complete 8-10 rolls backward, then forward',
      'Focus on full range of motion'
    ],
    alternatives: ['shoulder shrugs', 'shoulder rotations'],
    source: 'curated',
    metadata: { duration: 20, restTime: 0 }
  },

  WALKING_LUNGE: {
    name: 'Walking Lunge',
    standardizedName: 'WALKING_LUNGE',
    description: 'Dynamic leg movements to warm up hips and improve range of motion',
    category: 'warmup',
    muscleGroups: ['hips', 'legs', 'glutes'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    instructions: [
      'Stand next to a wall or support for balance',
      'Swing one leg forward and backward in controlled motion',
      'Keep torso upright and engaged',
      'Complete 10-12 swings each direction per leg'
    ],
    alternatives: ['leg swings', 'hip swings', 'dynamic leg raises', 'pendulum swings'],
    source: 'curated',
    metadata: { duration: 40, restTime: 0 }
  },

  TORSO_TWISTS: {
    name: 'Torso Twists',
    standardizedName: 'TORSO_TWISTS',
    description: 'Rotational movement to warm up the spine and core muscles',
    category: 'warmup',
    muscleGroups: ['core', 'obliques', 'lower back'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    instructions: [
      'Stand with feet hip-width apart, hands on hips or extended',
      'Slowly rotate torso left and right',
      'Keep hips facing forward',
      'Control the movement - don\'t bounce'
    ],
    alternatives: ['spinal twists', 'trunk rotations', 'standing twists'],
    source: 'curated',
    metadata: { duration: 30, restTime: 0 }
  },

  HIP_CIRCLES: {
    name: 'Hip Circles',
    standardizedName: 'HIP_CIRCLES',
    description: 'Circular hip movements to mobilize hip joints and warm up the pelvis',
    category: 'warmup',
    muscleGroups: ['hips', 'glutes', 'core'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    instructions: [
      'Stand with hands on hips, feet shoulder-width apart',
      'Make slow, controlled circles with your hips',
      'Complete 8-10 circles in each direction',
      'Focus on smooth, fluid motion'
    ],
    alternatives: ['hip rotations', 'pelvic circles'],
    source: 'curated',
    metadata: { duration: 25, restTime: 0 }
  },

  WALKING_HIGH_KNEES: {
    name: 'Walking High Knees',
    standardizedName: 'WALKING_HIGH_KNEES',
    description: 'Dynamic walking movement bringing knees up to hip level to activate legs',
    category: 'warmup',
    muscleGroups: ['legs', 'hip flexors', 'core'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    instructions: [
      'Start walking forward at a moderate pace',
      'Lift knees up toward chest with each step',
      'Maintain upright posture',
      'Pump arms naturally with the movement'
    ],
    alternatives: ['high knee walks', 'marching in place', 'knee lifts'],
    source: 'curated',
    metadata: { duration: 30, restTime: 0 }
  },

  BUTT_KICKERS: {
    name: 'Butt Kickers',
    standardizedName: 'BUTT_KICKERS',
    description: 'Dynamic movement bringing heels toward glutes to warm up hamstrings',
    category: 'warmup',
    muscleGroups: ['hamstrings', 'calves', 'glutes'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    instructions: [
      'Stand tall with feet hip-width apart',
      'Alternate bringing heels up toward glutes',
      'Keep knees pointing down',
      'Start slowly and gradually increase pace'
    ],
    alternatives: ['heel kicks', 'hamstring curls standing'],
    source: 'curated',
    metadata: { duration: 30, restTime: 0 }
  },

  // ===== STRENGTH EXERCISES =====
  PUSH_UPS: {
    name: 'Push-ups',
    standardizedName: 'PUSH_UPS',
    description: 'Classic bodyweight exercise targeting chest, shoulders, and triceps',
    category: 'strength',
    muscleGroups: ['chest', 'shoulders', 'triceps', 'core'],
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    instructions: [
      'Start in plank position with hands slightly wider than shoulders',
      'Lower chest to floor while keeping body straight',
      'Push back up to starting position',
      'Keep core engaged throughout movement'
    ],
    alternatives: ['pushups', 'press ups'],
    source: 'curated'
  },

  SQUATS: {
    name: 'Squats',
    standardizedName: 'SQUATS',
    description: 'Fundamental lower body exercise targeting quads, glutes, and hamstrings',
    category: 'strength',
    muscleGroups: ['quadriceps', 'glutes', 'hamstrings', 'calves'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    instructions: [
      'Stand with feet shoulder-width apart',
      'Lower body as if sitting back into a chair',
      'Keep knees behind toes and chest up',
      'Push through heels to return to standing'
    ],
    alternatives: ['bodyweight squats', 'air squats'],
    source: 'curated'
  },

  LUNGES: {
    name: 'Lunges',
    standardizedName: 'LUNGES',
    description: 'Unilateral leg exercise that targets quads, glutes, and improves balance',
    category: 'strength',
    muscleGroups: ['quadriceps', 'glutes', 'hamstrings', 'calves'],
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    instructions: [
      'Step forward into a long stride',
      'Lower back knee toward ground',
      'Keep front knee over ankle',
      'Push back to starting position and repeat on other leg'
    ],
    alternatives: ['forward lunges', 'static lunges'],
    source: 'curated'
  },

  PLANK: {
    name: 'Plank',
    standardizedName: 'PLANK',
    description: 'Isometric core exercise that strengthens abs, back, and shoulders',
    category: 'strength',
    muscleGroups: ['core', 'abs', 'shoulders', 'back'],
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    instructions: [
      'Start in push-up position on forearms',
      'Keep body in straight line from head to heels',
      'Engage core and avoid sagging hips',
      'Hold position while breathing normally'
    ],
    alternatives: ['forearm plank', 'front plank'],
    source: 'curated',
    metadata: { duration: 30 }
  },

  JUMPING_JACKS: {
    name: 'Jumping Jacks',
    standardizedName: 'JUMPING_JACKS',
    description: 'Full-body cardio exercise involving jumping and arm movements',
    category: 'cardio',
    muscleGroups: ['full body', 'legs', 'shoulders'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    instructions: [
      'Start with feet together and arms at sides',
      'Jump while spreading legs and raising arms overhead',
      'Jump back to starting position',
      'Maintain steady rhythm'
    ],
    alternatives: ['star jumps', 'side straddle hops'],
    source: 'curated'
  },

  // ===== COOLDOWN/FLEXIBILITY EXERCISES =====
  CHILD_POSE: {
    name: 'Child\'s Pose',
    standardizedName: 'CHILD_POSE',
    description: 'Relaxing yoga pose that stretches the back, hips, and shoulders',
    category: 'cooldown',
    muscleGroups: ['back', 'hips', 'shoulders'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    instructions: [
      'Kneel on floor with big toes touching',
      'Sit back on heels and separate knees',
      'Lean forward with arms extended or at sides',
      'Rest forehead on ground and breathe deeply'
    ],
    alternatives: ['childs pose', 'balasana'],
    source: 'curated',
    metadata: { duration: 60 }
  },

  COBRA_STRETCH: {
    name: 'Cobra Stretch',
    standardizedName: 'COBRA_STRETCH',
    description: 'Back extension stretch that opens the chest and stretches hip flexors',
    category: 'flexibility',
    muscleGroups: ['back', 'chest', 'hip flexors'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    instructions: [
      'Lie face down with palms under shoulders',
      'Press through hands to lift chest off ground',
      'Keep hips pressed to floor',
      'Hold stretch while breathing deeply'
    ],
    alternatives: ['cobra pose', 'bhujangasana'],
    source: 'curated',
    metadata: { duration: 30 }
  }
}

// Helper function to get exercise by standardized name
export const getExerciseByStandardName = (standardName: string): ExerciseDefinition | null => {
  return EXERCISE_REGISTRY[standardName.toUpperCase()] || null
}

// Helper function to search by alternative names
export const getExerciseByName = (name: string): ExerciseDefinition | null => {
  const normalizedName = name.toLowerCase().trim()
  
  // First try direct lookup by standardized name
  const standardName = normalizedName.toUpperCase().replace(/\s+/g, '_')
  if (EXERCISE_REGISTRY[standardName]) {
    return EXERCISE_REGISTRY[standardName]
  }
  
  // Then search through alternatives
  for (const exercise of Object.values(EXERCISE_REGISTRY)) {
    if (exercise.name.toLowerCase() === normalizedName) {
      return exercise
    }
    
    if (exercise.alternatives?.some(alt => alt.toLowerCase() === normalizedName)) {
      return exercise
    }
  }
  
  return null
}

// Get all exercises by category
export const getExercisesByCategory = (category: ExerciseDefinition['category']): ExerciseDefinition[] => {
  return Object.values(EXERCISE_REGISTRY).filter(ex => ex.category === category)
}

// Get exercises by muscle group
export const getExercisesByMuscleGroup = (muscleGroup: string): ExerciseDefinition[] => {
  const normalizedGroup = muscleGroup.toLowerCase()
  return Object.values(EXERCISE_REGISTRY).filter(ex => 
    ex.muscleGroups.some(mg => mg.toLowerCase().includes(normalizedGroup))
  )
}

// Get exercises by difficulty
export const getExercisesByDifficulty = (difficulty: ExerciseDefinition['difficulty']): ExerciseDefinition[] => {
  return Object.values(EXERCISE_REGISTRY).filter(ex => ex.difficulty === difficulty)
}

// Get exercises that require specific equipment
export const getExercisesByEquipment = (equipment: string): ExerciseDefinition[] => {
  const normalizedEquipment = equipment.toLowerCase()
  return Object.values(EXERCISE_REGISTRY).filter(ex =>
    ex.equipment.some(eq => eq.toLowerCase().includes(normalizedEquipment))
  )
}

// Get all available categories
export const getAvailableCategories = (): string[] => {
  return [...new Set(Object.values(EXERCISE_REGISTRY).map(ex => ex.category))]
}

// Get all available muscle groups
export const getAvailableMuscleGroups = (): string[] => {
  const allGroups = Object.values(EXERCISE_REGISTRY).flatMap(ex => ex.muscleGroups)
  return [...new Set(allGroups)]
}

// Get all available equipment types
export const getAvailableEquipment = (): string[] => {
  const allEquipment = Object.values(EXERCISE_REGISTRY).flatMap(ex => ex.equipment)
  return [...new Set(allEquipment)]
}

// Registry statistics (updated for UnifiedGifRegistry)
export const getRegistryStats = async () => {
  const exercises = Object.values(EXERCISE_REGISTRY)
  
  // Count exercises with dynamically resolved GIFs
  let exercisesWithGifs = 0
  for (const exercise of exercises) {
    const context: ExerciseContext = {
      category: exercise.category,
      muscleGroups: exercise.muscleGroups,
      equipment: exercise.equipment,
      difficulty: exercise.difficulty
    }
    const gifPath = await unifiedGifRegistry.getExerciseGif(exercise.name, context)
    if (gifPath) exercisesWithGifs++
  }
  
  const categories = getAvailableCategories()
  
  return {
    totalExercises: exercises.length,
    exercisesWithGifs,
    gifCoverage: ((exercisesWithGifs / exercises.length) * 100).toFixed(1) + '%',
    categories: categories.length,
    categoryBreakdown: categories.reduce((acc, cat) => {
      acc[cat] = exercises.filter(ex => ex.category === cat).length
      return acc
    }, {} as Record<string, number>)
  }
}

/**
 * Get exercise with dynamically resolved GIF path
 */
export const getExerciseWithGif = async (
  standardName: string,
  includeUnapproved = false
): Promise<ExerciseWithGif | null> => {
  const exercise = EXERCISE_REGISTRY[standardName.toUpperCase()]
  if (!exercise) return null
  
  const context: ExerciseContext = {
    category: exercise.category,
    muscleGroups: exercise.muscleGroups,
    equipment: exercise.equipment,
    difficulty: exercise.difficulty
  }
  
  const gifPath = await unifiedGifRegistry.getExerciseGif(
    exercise.name, 
    context, 
    includeUnapproved
  )
  
  return {
    ...exercise,
    gifPath
  }
}

/**
 * Get exercise by name with GIF resolution
 */
export const getExerciseByNameWithGif = async (
  name: string,
  includeUnapproved = false
): Promise<ExerciseWithGif | null> => {
  const exercise = getExerciseByName(name)
  if (!exercise) return null
  
  const context: ExerciseContext = {
    category: exercise.category,
    muscleGroups: exercise.muscleGroups,
    equipment: exercise.equipment,
    difficulty: exercise.difficulty
  }
  
  const gifPath = await unifiedGifRegistry.getExerciseGif(
    exercise.name, 
    context, 
    includeUnapproved
  )
  
  return {
    ...exercise,
    gifPath
  }
}

/**
 * Get all exercises by category with GIF resolution
 */
export const getExercisesByCategoryWithGifs = async (
  category: ExerciseDefinition['category'],
  includeUnapproved = false
): Promise<ExerciseWithGif[]> => {
  const exercises = getExercisesByCategory(category)
  const exercisesWithGifs: ExerciseWithGif[] = []
  
  for (const exercise of exercises) {
    const context: ExerciseContext = {
      category: exercise.category,
      muscleGroups: exercise.muscleGroups,
      equipment: exercise.equipment,
      difficulty: exercise.difficulty
    }
    
    const gifPath = await unifiedGifRegistry.getExerciseGif(
      exercise.name, 
      context, 
      includeUnapproved
    )
    
    exercisesWithGifs.push({
      ...exercise,
      gifPath
    })
  }
  
  return exercisesWithGifs
}

/**
 * Bulk resolve GIF paths for multiple exercises
 */
export const bulkResolveExerciseGifs = async (
  exercises: ExerciseDefinition[],
  includeUnapproved = false
): Promise<ExerciseWithGif[]> => {
  const resolved: ExerciseWithGif[] = []
  
  for (const exercise of exercises) {
    const context: ExerciseContext = {
      category: exercise.category,
      muscleGroups: exercise.muscleGroups,
      equipment: exercise.equipment,
      difficulty: exercise.difficulty
    }
    
    const gifPath = await unifiedGifRegistry.getExerciseGif(
      exercise.name, 
      context, 
      includeUnapproved
    )
    
    resolved.push({
      ...exercise,
      gifPath
    })
  }
  
  return resolved
}