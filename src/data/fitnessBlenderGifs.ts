// Exercise GIF Database - Unified Local and Downloaded GIFs
// Comprehensive mapping of exercise names to local GIF files
// Includes both manually curated and auto-downloaded ExerciseDB GIFs

// Import downloaded exercise GIFs from ExerciseDB (populated by download script)
import { localExerciseGifs } from './localExerciseGifs'

export interface ExerciseGifMapping {
  [key: string]: {
    gif: string
    category: string
    muscleGroups: string[]
    difficulty: 'beginner' | 'intermediate' | 'advanced'
    equipment: string[]
    description?: string // Optional detailed description when GIF unavailable
  }
}

export const FITNESS_BLENDER_GIFS: ExerciseGifMapping = {
  // PUSH EXERCISES
  'push-up': {
    gif: '/exercise-gifs/push-up.gif',
    category: 'push',
    muscleGroups: ['chest', 'triceps', 'shoulders'],
    difficulty: 'beginner',
    equipment: ['bodyweight']
  },
  'pushup': {
    gif: '/exercise-gifs/push-up.gif',
    category: 'push',
    muscleGroups: ['chest', 'triceps', 'shoulders'],
    difficulty: 'beginner',
    equipment: ['bodyweight']
  },
  'push up': {
    gif: '/exercise-gifs/push-up.gif',
    category: 'push',
    muscleGroups: ['chest', 'triceps', 'shoulders'],
    difficulty: 'beginner',
    equipment: ['bodyweight']
  },
  'incline push-up': {
    gif: '/exercise-gifs/incline-push-up.gif',
    category: 'push',
    muscleGroups: ['chest', 'triceps', 'shoulders'],
    difficulty: 'beginner',
    equipment: ['bodyweight']
  },
  'decline push-up': {
    gif: '/exercise-gifs/decline-push-up.gif',
    category: 'push',
    muscleGroups: ['chest', 'triceps', 'shoulders'],
    difficulty: 'intermediate',
    equipment: ['bodyweight']
  },
  'diamond push-up': {
    gif: '/exercise-gifs/diamond-push-up.gif',
    category: 'push',
    muscleGroups: ['chest', 'triceps', 'shoulders'],
    difficulty: 'advanced',
    equipment: ['bodyweight']
  },
  'bench press': {
    gif: '/exercise-gifs/bench-press.gif',
    category: 'push',
    muscleGroups: ['chest', 'triceps', 'shoulders'],
    difficulty: 'intermediate',
    equipment: ['barbell', 'bench']
  },
  'dumbbell bench press': {
    gif: '/exercise-gifs/dumbbell-bench-press.gif',
    category: 'push',
    muscleGroups: ['chest', 'triceps', 'shoulders'],
    difficulty: 'intermediate',
    equipment: ['dumbbells', 'bench']
  },
  'overhead press': {
    gif: '/exercise-gifs/overhead-press.gif',
    category: 'push',
    muscleGroups: ['shoulders', 'triceps'],
    difficulty: 'intermediate',
    equipment: ['barbell']
  },
  'shoulder press': {
    gif: '/exercise-gifs/shoulder-press.gif',
    category: 'push',
    muscleGroups: ['shoulders', 'triceps'],
    difficulty: 'intermediate',
    equipment: ['dumbbells']
  },
  'tricep dips': {
    gif: '/exercise-gifs/tricep-dips.gif',
    category: 'push',
    muscleGroups: ['triceps', 'chest'],
    difficulty: 'intermediate',
    equipment: ['bodyweight']
  },

  // PULL EXERCISES
  'pull-up': {
    gif: '/exercise-gifs/pull-up.gif',
    category: 'pull',
    muscleGroups: ['back', 'biceps'],
    difficulty: 'advanced',
    equipment: ['pull-up bar']
  },
  'pullup': {
    gif: '/exercise-gifs/pull-up.gif',
    category: 'pull',
    muscleGroups: ['back', 'biceps'],
    difficulty: 'advanced',
    equipment: ['pull-up bar']
  },
  'chin-up': {
    gif: '/exercise-gifs/chin-up.gif',
    category: 'pull',
    muscleGroups: ['back', 'biceps'],
    difficulty: 'advanced',
    equipment: ['pull-up bar']
  },
  'lat pulldown': {
    gif: '/exercise-gifs/lat-pulldown.gif',
    category: 'pull',
    muscleGroups: ['back', 'biceps'],
    difficulty: 'intermediate',
    equipment: ['cable machine']
  },
  'bent-over row': {
    gif: '/exercise-gifs/bent-over-row.gif',
    category: 'pull',
    muscleGroups: ['back', 'biceps'],
    difficulty: 'intermediate',
    equipment: ['barbell']
  },
  'dumbbell row': {
    gif: '/exercise-gifs/dumbbell-row.gif',
    category: 'pull',
    muscleGroups: ['back', 'biceps'],
    difficulty: 'intermediate',
    equipment: ['dumbbells']
  },
  'bicep curls': {
    gif: '/exercise-gifs/bicep-curls.gif',
    category: 'pull',
    muscleGroups: ['biceps'],
    difficulty: 'beginner',
    equipment: ['dumbbells']
  },
  'hammer curls': {
    gif: '/exercise-gifs/hammer-curls.gif',
    category: 'pull',
    muscleGroups: ['biceps'],
    difficulty: 'beginner',
    equipment: ['dumbbells']
  },

  // LEG EXERCISES
  'squat': {
    gif: '/exercise-gifs/squat.gif',
    category: 'legs',
    muscleGroups: ['quadriceps', 'glutes'],
    difficulty: 'beginner',
    equipment: ['bodyweight']
  },
  'bodyweight squat': {
    gif: '/exercise-gifs/squat.gif',
    category: 'legs',
    muscleGroups: ['quadriceps', 'glutes'],
    difficulty: 'beginner',
    equipment: ['bodyweight']
  },
  'goblet squat': {
    gif: '/exercise-gifs/goblet-squat.gif',
    category: 'legs',
    muscleGroups: ['quadriceps', 'glutes'],
    difficulty: 'intermediate',
    equipment: ['dumbbells']
  },
  'jump squat': {
    gif: '/exercise-gifs/jump-squat.gif',
    category: 'legs',
    muscleGroups: ['quadriceps', 'glutes'],
    difficulty: 'intermediate',
    equipment: ['bodyweight']
  },
  'lunge': {
    gif: '/exercise-gifs/lunge.gif',
    category: 'legs',
    muscleGroups: ['quadriceps', 'glutes'],
    difficulty: 'beginner',
    equipment: ['bodyweight']
  },
  'lunges': {
    gif: '/exercise-gifs/lunge.gif',
    category: 'legs',
    muscleGroups: ['quadriceps', 'glutes'],
    difficulty: 'beginner',
    equipment: ['bodyweight']
  },
  'reverse lunge': {
    gif: '/exercise-gifs/reverse-lunge.gif',
    category: 'legs',
    muscleGroups: ['quadriceps', 'glutes'],
    difficulty: 'beginner',
    equipment: ['bodyweight']
  },
  'deadlift': {
    gif: '/exercise-gifs/deadlift.gif',
    category: 'legs',
    muscleGroups: ['hamstrings', 'glutes', 'back'],
    difficulty: 'intermediate',
    equipment: ['barbell']
  },
  'romanian deadlift': {
    gif: '/exercise-gifs/romanian-deadlift.gif',
    category: 'legs',
    muscleGroups: ['hamstrings', 'glutes'],
    difficulty: 'intermediate',
    equipment: ['dumbbells']
  },
  'calf raises': {
    gif: '/exercise-gifs/calf-raises.gif',
    category: 'legs',
    muscleGroups: ['calves'],
    difficulty: 'beginner',
    equipment: ['bodyweight']
  },
  'leg press': {
    gif: '/exercise-gifs/leg-press.gif',
    category: 'legs',
    muscleGroups: ['quadriceps', 'glutes'],
    difficulty: 'intermediate',
    equipment: ['machine']
  },

  // CORE EXERCISES
  'plank': {
    gif: '/exercise-gifs/plank.gif',
    category: 'core',
    muscleGroups: ['core'],
    difficulty: 'beginner',
    equipment: ['bodyweight']
  },
  'side plank': {
    gif: '/exercise-gifs/side-plank.gif',
    category: 'core',
    muscleGroups: ['core', 'obliques'],
    difficulty: 'intermediate',
    equipment: ['bodyweight']
  },
  'mountain climbers': {
    gif: '/exercise-gifs/mountain-climbers.gif',
    category: 'core',
    muscleGroups: ['core'],
    difficulty: 'intermediate',
    equipment: ['bodyweight']
  },
  'crunches': {
    gif: '/exercise-gifs/crunches.gif',
    category: 'core',
    muscleGroups: ['abs'],
    difficulty: 'beginner',
    equipment: ['bodyweight']
  },
  'bicycle crunches': {
    gif: '/exercise-gifs/bicycle-crunches.gif',
    category: 'core',
    muscleGroups: ['abs', 'obliques'],
    difficulty: 'intermediate',
    equipment: ['bodyweight']
  },
  'russian twists': {
    gif: '/exercise-gifs/russian-twists.gif',
    category: 'core',
    muscleGroups: ['obliques'],
    difficulty: 'intermediate',
    equipment: ['bodyweight']
  },
  'leg raises': {
    gif: '/exercise-gifs/leg-raises.gif',
    category: 'core',
    muscleGroups: ['abs'],
    difficulty: 'intermediate',
    equipment: ['bodyweight']
  },
  'dead bug': {
    gif: '/exercise-gifs/dead-bug.gif',
    category: 'core',
    muscleGroups: ['core'],
    difficulty: 'beginner',
    equipment: ['bodyweight']
  },

  // CARDIO/FULL BODY
  'burpee': {
    gif: '/exercise-gifs/burpee.gif',
    category: 'fullbody',
    muscleGroups: ['fullbody'],
    difficulty: 'intermediate',
    equipment: ['bodyweight']
  },
  'burpees': {
    gif: '/exercise-gifs/burpee.gif',
    category: 'fullbody',
    muscleGroups: ['fullbody'],
    difficulty: 'intermediate',
    equipment: ['bodyweight']
  },
  'high knees': {
    gif: '/exercise-gifs/high-knees.gif',
    category: 'cardio',
    muscleGroups: ['legs'],
    difficulty: 'beginner',
    equipment: ['bodyweight']
  },
  'squat thrusts': {
    gif: '/exercise-gifs/squat-thrusts.gif',
    category: 'fullbody',
    muscleGroups: ['fullbody'],
    difficulty: 'intermediate',
    equipment: ['bodyweight']
  },
  'bear crawl': {
    gif: '/exercise-gifs/bear-crawl.gif',
    category: 'fullbody',
    muscleGroups: ['fullbody'],
    difficulty: 'intermediate',
    equipment: ['bodyweight']
  },

  // WARM-UP & STRETCHING EXERCISES (with thorough descriptions when GIFs unavailable)
  
  // Upper Body Active Stretches
  'arm circles': {
    gif: '/exercise-gifs/cardio/arm-circles.gif', // May not exist - will fall back to description
    category: 'warmup',
    muscleGroups: ['shoulders', 'upper back'],
    difficulty: 'beginner',
    equipment: ['bodyweight'],
    description: 'Stand with feet shoulder-width apart. Extend arms out to sides at shoulder height. Make small circles forward for 10 reps, then backward for 10 reps. Gradually increase circle size to fully activate shoulder joints and improve range of motion.'
  },
  'arm circle': {
    gif: '/exercise-gifs/cardio/arm-circles.gif',
    category: 'warmup',
    muscleGroups: ['shoulders', 'upper back'],
    difficulty: 'beginner',
    equipment: ['bodyweight'],
    description: 'Stand with feet shoulder-width apart. Extend arms out to sides at shoulder height. Make small circles forward for 10 reps, then backward for 10 reps. Gradually increase circle size to fully activate shoulder joints and improve range of motion.'
  },
  'shoulder rolls': {
    gif: '/exercise-gifs/cardio/shoulder-rolls.gif', // May not exist
    category: 'warmup',
    muscleGroups: ['shoulders', 'upper back', 'neck'],
    difficulty: 'beginner',
    equipment: ['bodyweight'],
    description: 'Stand tall with arms at your sides. Lift shoulders up toward your ears, roll them back, down, and forward in a smooth circular motion. Complete 10 rolls backward, then 10 rolls forward. Focus on full range of motion to release tension.'
  },
  'shoulder roll': {
    gif: '/exercise-gifs/cardio/shoulder-rolls.gif',
    category: 'warmup',
    muscleGroups: ['shoulders', 'upper back', 'neck'],
    difficulty: 'beginner',
    equipment: ['bodyweight'],
    description: 'Stand tall with arms at your sides. Lift shoulders up toward your ears, roll them back, down, and forward in a smooth circular motion. Complete 10 rolls backward, then 10 rolls forward. Focus on full range of motion to release tension.'
  },
  'arm swings': {
    gif: '/exercise-gifs/cardio/arm-swings.gif', // May not exist
    category: 'warmup',
    muscleGroups: ['shoulders', 'chest', 'upper back'],
    difficulty: 'beginner',
    equipment: ['bodyweight'],
    description: 'Cross-body swings: Swing right arm across body to left side, then back. Repeat 10 times each arm. Overhead swings: Swing arms up overhead and down by your sides in large circular motions. Perform 10 forward and 10 backward swings to activate shoulder joints.'
  },
  'torso twists': {
    gif: '/exercise-gifs/core/torso-twists.gif', // May not exist
    category: 'warmup',
    muscleGroups: ['core', 'obliques', 'lower back'],
    difficulty: 'beginner',
    equipment: ['bodyweight'],
    description: 'Stand with feet hip-width apart, hands on hips or crossed over chest. Keep hips facing forward and rotate your torso side to side in a controlled motion. Twist as far as comfortable while maintaining good posture. Complete 15-20 twists each direction to warm up your spine.'
  },
  'torso twist': {
    gif: '/exercise-gifs/core/torso-twists.gif',
    category: 'warmup',
    muscleGroups: ['core', 'obliques', 'lower back'],
    difficulty: 'beginner',
    equipment: ['bodyweight'],
    description: 'Stand with feet hip-width apart, hands on hips or crossed over chest. Keep hips facing forward and rotate your torso side to side in a controlled motion. Twist as far as comfortable while maintaining good posture. Complete 15-20 twists each direction to warm up your spine.'
  },

  // Lower Body Active Stretches
  'walking lunge': {
    gif: '/exercise-gifs/cardio/leg-swings.gif', // May not exist
    category: 'warmup',
    muscleGroups: ['hips', 'hamstrings', 'quadriceps'],
    difficulty: 'beginner',
    equipment: ['bodyweight'],
    description: 'Hold onto a wall or stable surface for balance. Front-to-back: Swing one leg forward and backward in a controlled pendulum motion, 15 reps each leg. Side-to-side: Swing leg across body and out to the side, 15 reps each leg. Keep torso upright and control the movement.'
  },
  'walking high knees': {
    gif: '/exercise-gifs/cardio/walking-high-knees.gif', // May not exist
    category: 'warmup',
    muscleGroups: ['hip flexors', 'quadriceps', 'core'],
    difficulty: 'beginner',
    equipment: ['bodyweight'],
    description: 'Walk forward while lifting knees to waist height with each step. Maintain upright posture and engage your core. Pump arms naturally. Take 20-30 steps forward, focusing on controlled knee lifts rather than speed. Great for activating hip flexors and warming up legs.'
  },
  'butt kickers': {
    gif: '/exercise-gifs/cardio/butt-kickers.gif', // May not exist
    category: 'warmup',
    muscleGroups: ['hamstrings', 'quadriceps', 'glutes'],
    difficulty: 'beginner',
    equipment: ['bodyweight'],
    description: 'Walk forward while bringing heels up toward your glutes with each step. Keep knees pointing down and maintain upright posture. Lightly tap heels to glutes if flexibility allows. Take 20-30 steps forward, focusing on hamstring activation and dynamic stretching.'
  },
  'walking lunges': {
    gif: '/exercise-gifs/walking-lunges.gif', // This one should exist
    category: 'warmup',
    muscleGroups: ['quadriceps', 'glutes', 'hip flexors'],
    difficulty: 'beginner',
    equipment: ['bodyweight'],
    description: 'Step forward into a lunge position, lowering back knee toward ground. Push through front heel to bring back leg forward into next lunge. Alternate legs with each step forward. Keep torso upright and control the descent. Perform 10-15 lunges total for dynamic leg warming.'
  },

  // Full Body Dynamic Movements
  'hip circles': {
    gif: '/exercise-gifs/cardio/hip-circles.gif', // May not exist
    category: 'warmup',
    muscleGroups: ['hips', 'core', 'lower back'],
    difficulty: 'beginner',
    equipment: ['bodyweight'],
    description: 'Stand with feet hip-width apart, hands on hips. Make large circular motions with your hips, as if you were using a hula hoop. Keep upper body stable and focus on moving from the hips. Complete 10 circles in each direction to activate hip joints and improve mobility.'
  },
  'hip circle': {
    gif: '/exercise-gifs/cardio/hip-circles.gif',
    category: 'warmup',
    muscleGroups: ['hips', 'core', 'lower back'],
    difficulty: 'beginner',
    equipment: ['bodyweight'],
    description: 'Stand with feet hip-width apart, hands on hips. Make large circular motions with your hips, as if you were using a hula hoop. Keep upper body stable and focus on moving from the hips. Complete 10 circles in each direction to activate hip joints and improve mobility.'
  },
  'cat-cow stretches': {
    gif: '/exercise-gifs/core/cat-cow.gif', // May not exist
    category: 'warmup',
    muscleGroups: ['spine', 'core', 'shoulders'],
    difficulty: 'beginner',
    equipment: ['bodyweight'],
    description: 'Start on hands and knees in tabletop position. Cat: Round your back toward ceiling, tuck chin to chest. Cow: Arch your back, lift chest and tailbone toward ceiling. Flow smoothly between positions for 10-15 repetitions, focusing on spinal flexion and extension mobility.'
  },
  'inchworm': {
    gif: '/exercise-gifs/inchworm.gif', // This should exist
    category: 'warmup',
    muscleGroups: ['fullbody', 'core', 'shoulders'],
    difficulty: 'intermediate',
    equipment: ['bodyweight'],
    description: 'Stand tall, then bend forward and place hands on ground. Walk hands out to plank position while keeping legs straight. Hold briefly, then walk hands back to feet and return to standing. Perform 5-8 repetitions to activate entire body and improve flexibility.'
  },
  'jumping jacks': {
    gif: '/exercise-gifs/jumping-jacks.gif', // This should exist
    category: 'warmup',
    muscleGroups: ['fullbody', 'cardiovascular'],
    difficulty: 'beginner',
    equipment: ['bodyweight'],
    description: 'Stand with feet together, arms at sides. Jump feet apart while raising arms overhead. Jump back to starting position. Maintain steady rhythm and land softly on balls of feet. Perform 20-30 repetitions for classic full-body activation and cardiovascular warm-up.'
  }
}

// Exercise name normalization for fuzzy matching
export const normalizeExerciseName = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except hyphens
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\s/g, '-') // Replace spaces with hyphens
}

// Find best matching GIF for an exercise name
export const findExerciseGif = (exerciseName: string): string | null => {
  if (!exerciseName) return null
  
  const normalized = normalizeExerciseName(exerciseName)
  
  // Direct match
  if (FITNESS_BLENDER_GIFS[normalized]) {
    return FITNESS_BLENDER_GIFS[normalized].gif
  }
  
  // Partial match - look for key words
  const keyWords = normalized.split('-').filter(word => word.length > 2)
  
  for (const [key, data] of Object.entries(FITNESS_BLENDER_GIFS)) {
    const keyParts = key.split('-')
    
    // Check if any significant word matches
    if (keyWords.some(word => keyParts.includes(word))) {
      return data.gif
    }
  }
  
  // Fuzzy matching for common variations
  const fuzzyMatches: { [key: string]: string } = {
    'pushup': 'push-up',
    'pullup': 'pull-up',
    'situp': 'crunches',
    'crunch': 'crunches',
    'ab': 'crunches',
    'curl': 'bicep-curls',
    'press': 'shoulder-press',
    'row': 'dumbbell-row',
    'raise': 'calf-raises'
  }
  
  for (const [fuzzy, exact] of Object.entries(fuzzyMatches)) {
    if (normalized.includes(fuzzy) && FITNESS_BLENDER_GIFS[exact]) {
      return FITNESS_BLENDER_GIFS[exact].gif
    }
  }
  
  return null
}

// Find exercise description (useful when GIF is unavailable)
export const findExerciseDescription = (exerciseName: string): string | null => {
  if (!exerciseName) return null
  
  const normalized = normalizeExerciseName(exerciseName)
  
  // Direct match
  if (FITNESS_BLENDER_GIFS[normalized]?.description) {
    return FITNESS_BLENDER_GIFS[normalized].description
  }
  
  // Partial match - look for key words
  const keyWords = normalized.split('-').filter(word => word.length > 2)
  
  for (const [key, data] of Object.entries(FITNESS_BLENDER_GIFS)) {
    const keyParts = key.split('-')
    
    // Check if any significant word matches
    if (keyWords.some(word => keyParts.includes(word)) && data.description) {
      return data.description
    }
  }
  
  return null
}

// Get complete exercise data (GIF, description, category, etc.)
export const getExerciseData = (exerciseName: string) => {
  if (!exerciseName) return null
  
  const normalized = normalizeExerciseName(exerciseName)
  
  // Direct match
  if (FITNESS_BLENDER_GIFS[normalized]) {
    return FITNESS_BLENDER_GIFS[normalized]
  }
  
  // Partial match - look for key words
  const keyWords = normalized.split('-').filter(word => word.length > 2)
  
  for (const [key, data] of Object.entries(FITNESS_BLENDER_GIFS)) {
    const keyParts = key.split('-')
    
    // Check if any significant word matches
    if (keyWords.some(word => keyParts.includes(word))) {
      return data
    }
  }
  
  return null
}

// Enhanced GIF finder that prioritizes downloaded GIFs over curated ones
export const findLocalExerciseGif = (exerciseName: string): string | null => {
  if (!exerciseName) return null
  
  // Clean and normalize the exercise name to lowercase with spaces
  const cleaned = exerciseName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except hyphens
    .replace(/[-\s]+/g, ' ') // Convert hyphens and multiple spaces to single space
    .trim()
  
  // PRIORITY 1: Downloaded ExerciseDB GIFs (211 exercises in category structure)
  
  // Step 1a: Direct exact match in downloaded GIFs
  if (localExerciseGifs[cleaned]) {
    console.log(`🎯 Direct match: "${cleaned}" -> ${localExerciseGifs[cleaned]}`)
    return localExerciseGifs[cleaned]
  }
  
  // Step 1b: CORRECTED exercise name mappings for downloaded GIFs
  const exerciseNameMappings: Record<string, string> = {
    // Push exercises - map to closest available option
    // Note: 'incline push up depth jump' is the only push-up variant available
    'push up': 'incline push up depth jump',
    'push ups': 'incline push up depth jump', 
    'push-up': 'incline push up depth jump',
    'push-ups': 'incline push up depth jump',
    'pushup': 'incline push up depth jump',
    'pushups': 'incline push up depth jump',
    
    // Squat exercises - use better basic squat option
    'squat': 'barbell full squat',
    'squats': 'barbell full squat',
    'bodyweight squat': 'barbell full squat',
    'air squat': 'barbell full squat',
    'air squats': 'barbell full squat',
    
    // Lunge exercises
    'lunge': 'barbell lunge',
    'lunges': 'barbell lunge',
    'forward lunge': 'barbell lunge',
    'forward lunges': 'barbell lunge',
    'reverse lunge': 'barbell rear lunge',
    'reverse lunges': 'barbell rear lunge',
    
    // Plank exercises
    'plank': 'front plank with twist',
    'planks': 'front plank with twist',
    'front plank': 'front plank with twist',
    'forearm plank': 'front plank with twist',
    
    // Cardio exercises
    'mountain climber': 'mountain climber',
    'mountain climbers': 'mountain climber',
    'burpee': 'jack burpee', // Keep jack burpee as it's the only burpee variant available
    'burpees': 'jack burpee',
    // Remove incorrect jumping jack mapping - better to have no GIF than wrong GIF
    // 'jumping jacks': 'jack burpee', // REMOVED - this was causing confusion
    // 'jumping jack': 'jack burpee', // REMOVED - this was causing confusion
    'high knees': 'walking high knees lunge',
    'high knee': 'walking high knees lunge',
    
    // Pull exercises
    'pull up': 'pull up neutral grip',
    'pull ups': 'pull up neutral grip',
    'pullup': 'pull up neutral grip',
    'pullups': 'pull up neutral grip',
    'chin up': 'pull up neutral grip',
    'chin ups': 'pull up neutral grip',
    'lat pulldown': 'reverse grip machine lat pulldown',
    'lat pulldowns': 'reverse grip machine lat pulldown',
    
    // Press exercises
    'bench press': 'barbell bench press',
    'chest press': 'barbell bench press',
    'shoulder press': 'cable alternate shoulder press',
    'overhead press': 'barbell seated overhead press',
    'military press': 'barbell seated overhead press',
    
    // Leg exercises
    'deadlift': 'barbell deadlift',
    'deadlifts': 'barbell deadlift',
    'leg press': 'sled 45 leg press',
    'calf raise': 'barbell seated calf raise',
    'calf raises': 'barbell seated calf raise',
    
    // Arm exercises
    'bicep curl': 'lever bicep curl',
    'bicep curls': 'lever bicep curl',
    'biceps curl': 'lever bicep curl',
    'biceps curls': 'lever bicep curl',
    'curl': 'lever bicep curl',
    'curls': 'lever bicep curl',
    'tricep dip': 'weighted tricep dips',
    'tricep dips': 'weighted tricep dips',
    'triceps dip': 'weighted tricep dips',
    'triceps dips': 'weighted tricep dips',
    'dip': 'weighted tricep dips',
    'dips': 'weighted tricep dips',
    
    // Back exercises
    'row': 'barbell bent over row',
    'rows': 'barbell bent over row',
    'bent over row': 'barbell bent over row',
    'bent over rows': 'barbell bent over row',
    'barbell row': 'barbell bent over row',
    'barbell rows': 'barbell bent over row',
    
    // Core exercises
    'crunch': 'cable kneeling crunch',
    'crunches': 'cable kneeling crunch',
    'sit up': '34 sit up',
    'sit ups': '34 sit up',
    'sit-up': '34 sit up',
    'sit-ups': '34 sit up',
    'russian twist': 'assisted motion russian twist',
    'russian twists': 'assisted motion russian twist',
    
    // Chest exercises
    'chest fly': 'cable one arm decline chest fly',
    'chest flye': 'cable one arm decline chest fly',
    'fly': 'cable one arm decline chest fly',
    'flye': 'cable one arm decline chest fly',
    
    // WARM-UP EXERCISES - Map to existing exercises or use best available match
    // 'arm circles': removed - let registry handle it properly
    // 'arm circle': removed - let registry handle it properly
    'shoulder rolls': 'walking high knees lunge', // Active movement
    'shoulder roll': 'walking high knees lunge',
    'arm swings': 'walking high knees lunge', // Dynamic upper body
    'arm swing': 'walking high knees lunge',
    'torso twists': 'assisted motion russian twist', // Use existing twist movement
    'torso twist': 'assisted motion russian twist',
    
    // Lower Body Warm-ups
    'leg swings': 'walking lunge', // Map old name to new
    'leg swing': 'walking lunge',
    'walking high knees': 'walking high knees lunge', // Direct match
    'butt kickers': 'walking high knees lunge', // Similar leg activation
    'butt kicker': 'walking high knees lunge',
    'walking lunges': 'barbell lunge', // Use existing lunge movement
    'walking lunge': 'barbell lunge',
    
    // Full Body Warm-ups  
    'hip circles': 'walking high knees lunge', // Active hip movement
    'hip circle': 'walking high knees lunge',
    'cat cow stretches': 'front plank with twist', // Core mobility
    'cat cow stretch': 'front plank with twist',
    'cat cow': 'front plank with twist',
    'inchworms': 'inchworm', // Direct match - should exist
    'jumping jacks': 'jack burpee', // Closest cardio movement available
    'jumping jack': 'jack burpee'
  }
  
  // Check comprehensive mappings
  if (exerciseNameMappings[cleaned] && localExerciseGifs[exerciseNameMappings[cleaned]]) {
    console.log(`🎯 Mapped: "${cleaned}" -> "${exerciseNameMappings[cleaned]}" -> ${localExerciseGifs[exerciseNameMappings[cleaned]]}`)
    return localExerciseGifs[exerciseNameMappings[cleaned]]
  }
  
  // Step 1c: Partial matches in downloaded GIFs (more specific matching)
  const partialMatches: string[] = []
  for (const [key, path] of Object.entries(localExerciseGifs)) {
    // Check if cleaned name contains the key or key contains cleaned name
    if (cleaned.includes(key) || key.includes(cleaned)) {
      partialMatches.push(key)
    }
  }
  
  // If we found partial matches, prefer the shortest one (most specific)
  if (partialMatches.length > 0) {
    const bestMatch = partialMatches.sort((a, b) => a.length - b.length)[0]
    console.log(`🎯 Partial match: "${cleaned}" -> "${bestMatch}" -> ${localExerciseGifs[bestMatch]}`)
    return localExerciseGifs[bestMatch]
  }
  
  // Step 1d: Keyword matching in downloaded GIFs
  const words = cleaned.split(/\s+/).filter(word => word.length > 2) // Skip short words
  const keywordMatches: string[] = []
  
  for (const [key, path] of Object.entries(localExerciseGifs)) {
    const keyWords = key.split(/\s+/)
    if (words.some(word => keyWords.includes(word))) {
      keywordMatches.push(key)
    }
  }
  
  // If we found keyword matches, apply quality filtering and prefer exact exercise type matches
  if (keywordMatches.length > 0) {
    // Filter out obviously wrong matches (different exercise types)
    const filteredMatches = keywordMatches.filter(match => {
      const matchLower = match.toLowerCase()
      const cleanedLower = cleaned.toLowerCase()
      
      // Prevent stretching exercises from matching cable routines
      if (cleanedLower.includes('stretch') && (matchLower.includes('cable') || matchLower.includes('pulldown'))) {
        console.log(`🚫 Rejected mismatch: "${cleaned}" -> "${match}" (stretch to cable)`)
        return false
      }
      
      // Prevent cardio exercises from matching strength exercises  
      if ((cleanedLower.includes('jumping') || cleanedLower.includes('jack')) && 
          (matchLower.includes('burpee') && !cleanedLower.includes('burpee'))) {
        console.log(`🚫 Rejected mismatch: "${cleaned}" -> "${match}" (jumping jack to burpee)`)
        return false
      }
      
      return true
    })
    
    if (filteredMatches.length > 0) {
      const bestKeywordMatch = filteredMatches.sort((a, b) => {
        const aMatches = words.filter(word => a.split(/\s+/).includes(word)).length
        const bMatches = words.filter(word => b.split(/\s+/).includes(word)).length
        return bMatches - aMatches // Sort by most matches first
      })[0]
      console.log(`🎯 Keyword match: "${cleaned}" -> "${bestKeywordMatch}" -> ${localExerciseGifs[bestKeywordMatch]}`)
      return localExerciseGifs[bestKeywordMatch]
    } else {
      console.log(`🚫 All keyword matches rejected for: "${cleaned}"`)
    }
  }
  
  // PRIORITY 2: Only fall back to curated GIFs if no downloaded GIF found
  // (Note: Most curated GIFs don't actually exist, so this is mainly for logging)
  const fitnessBlenderGif = findExerciseGif(exerciseName)
  if (fitnessBlenderGif) {
    console.log(`⚠️ Falling back to curated GIF: "${exerciseName}" -> ${fitnessBlenderGif}`)
    return fitnessBlenderGif
  }
  
  console.log(`❌ No GIF found for: "${exerciseName}" (cleaned: "${cleaned}")`)
  return null
}

// Check if local GIF file exists and is actually a GIF
export const checkLocalGifExists = async (gifPath: string): Promise<boolean> => {
  try {
    const response = await fetch(gifPath, { method: 'HEAD' })
    const exists = response.ok
    const contentType = response.headers.get('content-type') || ''
    
    // Must be 200 OK AND have image/gif content type
    const isValidGif = exists && contentType.includes('image/gif')
    
    console.log(`🔍 checkLocalGifExists: ${gifPath}`)
    console.log(`   Status: ${response.status}, Content-Type: ${contentType}`)
    console.log(`   Result: ${isValidGif ? '✅ VALID GIF' : '❌ INVALID/NOT FOUND'}`)
    
    return isValidGif
  } catch (error) {
    console.log(`🔍 checkLocalGifExists: ${gifPath} -> ❌ ERROR:`, error)
    return false
  }
}

// Get comprehensive GIF stats
export const getLocalGifStats = () => {
  const fitnessBlenderCount = Object.keys(FITNESS_BLENDER_GIFS).length
  const downloadedCount = Object.keys(localExerciseGifs).length
  
  return {
    fitnessBlenderGifs: fitnessBlenderCount,
    downloadedGifs: downloadedCount,
    totalGifs: fitnessBlenderCount + downloadedCount,
    categories: {
      curated: getAvailableCategories(),
      downloaded: getDownloadedCategories()
    }
  }
}

// Get categories from downloaded GIFs
const getDownloadedCategories = (): string[] => {
  const categories = new Set<string>()
  
  Object.values(localExerciseGifs).forEach(path => {
    const pathParts = path.split('/')
    if (pathParts.length >= 3 && pathParts[1] === 'exercise-gifs') {
      categories.add(pathParts[2]) // e.g., 'chest', 'legs', etc.
    }
  })
  
  return Array.from(categories)
}

// Get all available exercise categories
export const getAvailableCategories = (): string[] => {
  const categories = new Set<string>()
  Object.values(FITNESS_BLENDER_GIFS).forEach(gif => categories.add(gif.category))
  return Array.from(categories)
}

// Get exercises by category
export const getExercisesByCategory = (category: string): string[] => {
  return Object.entries(FITNESS_BLENDER_GIFS)
    .filter(([_, data]) => data.category === category)
    .map(([name, _]) => name)
}

// Export the local exercise GIFs for external use
export { localExerciseGifs }