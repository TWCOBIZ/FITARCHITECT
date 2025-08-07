export interface ExerciseData {
  id: string
  name: string
  category: 'push' | 'pull' | 'legs' | 'core' | 'cardio' | 'fullbody'
  muscleGroups: string[]
  equipment: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  description: string
  instructions: string[]
  tips?: string[]
  imageUrl?: string
  videoUrl?: string
}

export const exerciseDatabase: ExerciseData[] = [
  // PUSH EXERCISES
  {
    id: 'push-001',
    name: 'Push-Ups',
    category: 'push',
    muscleGroups: ['chest', 'shoulders', 'triceps'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    description: 'Classic bodyweight exercise for upper body strength',
    instructions: [
      'Start in a plank position with hands shoulder-width apart',
      'Lower your body until chest nearly touches the floor',
      'Push back up to starting position',
      'Keep core engaged throughout the movement'
    ],
    tips: ['Keep body in straight line', 'Breathe in on the way down, out on the way up'],
    imageUrl: '/exercises/pushups.jpg'
  },
  {
    id: 'push-002',
    name: 'Bench Press',
    category: 'push',
    muscleGroups: ['chest', 'shoulders', 'triceps'],
    equipment: ['barbell', 'bench'],
    difficulty: 'intermediate',
    description: 'Compound movement for building upper body mass and strength',
    instructions: [
      'Lie on bench with eyes under the bar',
      'Grip bar slightly wider than shoulder-width',
      'Lower bar to chest with control',
      'Press bar back up to starting position'
    ],
    imageUrl: '/exercises/bench-press.jpg'
  },
  {
    id: 'push-003',
    name: 'Dumbbell Shoulder Press',
    category: 'push',
    muscleGroups: ['shoulders', 'triceps'],
    equipment: ['dumbbells'],
    difficulty: 'intermediate',
    description: 'Build strong, rounded shoulders with this pressing movement',
    instructions: [
      'Hold dumbbells at shoulder height with palms facing forward',
      'Press weights overhead until arms are fully extended',
      'Lower weights back to starting position with control',
      'Keep core tight throughout movement'
    ],
    imageUrl: '/exercises/shoulder-press.jpg'
  },
  {
    id: 'push-004',
    name: 'Dips',
    category: 'push',
    muscleGroups: ['chest', 'triceps', 'shoulders'],
    equipment: ['dip bars', 'parallel bars'],
    difficulty: 'intermediate',
    description: 'Powerful bodyweight exercise for chest and triceps development',
    instructions: [
      'Support yourself on dip bars with arms extended',
      'Lower body by bending elbows to 90 degrees',
      'Push back up to starting position',
      'Lean forward slightly for more chest emphasis'
    ],
    imageUrl: '/exercises/dips.jpg'
  },
  {
    id: 'push-005',
    name: 'Diamond Push-Ups',
    category: 'push',
    muscleGroups: ['triceps', 'chest'],
    equipment: ['bodyweight'],
    difficulty: 'advanced',
    description: 'Advanced push-up variation targeting triceps',
    instructions: [
      'Form diamond shape with hands by touching thumbs and index fingers',
      'Place hands under chest',
      'Lower body maintaining tight core',
      'Push back up focusing on triceps contraction'
    ],
    imageUrl: '/exercises/diamond-pushups.jpg'
  },

  // PULL EXERCISES
  {
    id: 'pull-001',
    name: 'Pull-Ups',
    category: 'pull',
    muscleGroups: ['back', 'biceps', 'lats'],
    equipment: ['pull-up bar'],
    difficulty: 'intermediate',
    description: 'Essential upper body exercise for back development',
    instructions: [
      'Hang from bar with overhand grip, hands shoulder-width apart',
      'Pull body up until chin clears the bar',
      'Lower with control to full arm extension',
      'Engage core to prevent swinging'
    ],
    tips: ['Use assisted machine or bands if needed', 'Focus on pulling with back, not arms'],
    imageUrl: '/exercises/pullups.jpg'
  },
  {
    id: 'pull-002',
    name: 'Barbell Rows',
    category: 'pull',
    muscleGroups: ['back', 'lats', 'rhomboids', 'biceps'],
    equipment: ['barbell'],
    difficulty: 'intermediate',
    description: 'Fundamental rowing movement for back thickness',
    instructions: [
      'Bend at hips with knees slightly bent',
      'Grip bar slightly wider than shoulder-width',
      'Pull bar to lower chest/upper abdomen',
      'Lower with control, maintaining bent position'
    ],
    imageUrl: '/exercises/barbell-rows.jpg'
  },
  {
    id: 'pull-003',
    name: 'Lat Pulldowns',
    category: 'pull',
    muscleGroups: ['lats', 'back', 'biceps'],
    equipment: ['cable machine', 'lat pulldown'],
    difficulty: 'beginner',
    description: 'Cable exercise for building lat width',
    instructions: [
      'Sit at lat pulldown machine with thighs secured',
      'Grip bar wider than shoulders',
      'Pull bar down to upper chest',
      'Control weight back to starting position'
    ],
    imageUrl: '/exercises/lat-pulldowns.jpg'
  },
  {
    id: 'pull-004',
    name: 'Face Pulls',
    category: 'pull',
    muscleGroups: ['rear delts', 'upper back', 'rhomboids'],
    equipment: ['cable machine', 'rope attachment'],
    difficulty: 'beginner',
    description: 'Excellent for rear deltoid and upper back development',
    instructions: [
      'Set cable at face height with rope attachment',
      'Pull rope toward face, separating hands at end',
      'Squeeze shoulder blades together',
      'Return to start with control'
    ],
    imageUrl: '/exercises/face-pulls.jpg'
  },
  {
    id: 'pull-005',
    name: 'Dumbbell Rows',
    category: 'pull',
    muscleGroups: ['back', 'lats', 'biceps'],
    equipment: ['dumbbells', 'bench'],
    difficulty: 'beginner',
    description: 'Unilateral rowing movement for balanced back development',
    instructions: [
      'Place one knee and hand on bench',
      'Hold dumbbell in free hand',
      'Row weight to hip, elbow close to body',
      'Lower with control and repeat'
    ],
    imageUrl: '/exercises/dumbbell-rows.jpg'
  },

  // LEGS EXERCISES
  {
    id: 'legs-001',
    name: 'Squats',
    category: 'legs',
    muscleGroups: ['quadriceps', 'glutes', 'hamstrings'],
    equipment: ['barbell', 'squat rack'],
    difficulty: 'intermediate',
    description: 'The king of all exercises for lower body development',
    instructions: [
      'Position bar on upper traps',
      'Stand with feet shoulder-width apart',
      'Lower hips back and down until thighs parallel to floor',
      'Drive through heels to return to standing'
    ],
    tips: ['Keep knees tracking over toes', 'Maintain neutral spine'],
    imageUrl: '/exercises/squats.jpg'
  },
  {
    id: 'legs-002',
    name: 'Lunges',
    category: 'legs',
    muscleGroups: ['quadriceps', 'glutes', 'hamstrings'],
    equipment: ['bodyweight', 'dumbbells'],
    difficulty: 'beginner',
    description: 'Unilateral leg exercise for strength and balance',
    instructions: [
      'Step forward with one leg',
      'Lower hips until both knees at 90 degrees',
      'Push through front heel to return to start',
      'Alternate legs or complete all reps on one side'
    ],
    imageUrl: '/exercises/lunges.jpg'
  },
  {
    id: 'legs-003',
    name: 'Romanian Deadlifts',
    category: 'legs',
    muscleGroups: ['hamstrings', 'glutes', 'lower back'],
    equipment: ['barbell', 'dumbbells'],
    difficulty: 'intermediate',
    description: 'Hip hinge movement targeting posterior chain',
    instructions: [
      'Hold weight with feet hip-width apart',
      'Push hips back while maintaining slight knee bend',
      'Lower weight along legs until feel hamstring stretch',
      'Drive hips forward to return to start'
    ],
    imageUrl: '/exercises/romanian-deadlifts.jpg'
  },
  {
    id: 'legs-004',
    name: 'Leg Press',
    category: 'legs',
    muscleGroups: ['quadriceps', 'glutes', 'hamstrings'],
    equipment: ['leg press machine'],
    difficulty: 'beginner',
    description: 'Machine-based exercise for safe leg development',
    instructions: [
      'Sit in leg press with feet shoulder-width apart',
      'Lower weight by bending knees to 90 degrees',
      'Press through heels to extend legs',
      'Avoid locking knees at top'
    ],
    imageUrl: '/exercises/leg-press.jpg'
  },
  {
    id: 'legs-005',
    name: 'Bulgarian Split Squats',
    category: 'legs',
    muscleGroups: ['quadriceps', 'glutes', 'hamstrings'],
    equipment: ['bench', 'dumbbells'],
    difficulty: 'intermediate',
    description: 'Advanced single-leg exercise for leg strength and stability',
    instructions: [
      'Place rear foot on bench behind you',
      'Lower into lunge position with front leg',
      'Drive through front heel to return to start',
      'Keep torso upright throughout movement'
    ],
    imageUrl: '/exercises/bulgarian-split-squats.jpg'
  },
  {
    id: 'legs-006',
    name: 'Calf Raises',
    category: 'legs',
    muscleGroups: ['calves'],
    equipment: ['bodyweight', 'dumbbells'],
    difficulty: 'beginner',
    description: 'Isolation exercise for calf development',
    instructions: [
      'Stand with balls of feet on edge of platform',
      'Rise up onto toes as high as possible',
      'Lower heels below platform level',
      'Pause at bottom for stretch'
    ],
    imageUrl: '/exercises/calf-raises.jpg'
  },

  // CORE EXERCISES
  {
    id: 'core-001',
    name: 'Plank',
    category: 'core',
    muscleGroups: ['abs', 'core'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    description: 'Isometric core exercise for stability and strength',
    instructions: [
      'Start in push-up position on forearms',
      'Keep body in straight line from head to heels',
      'Engage core and hold position',
      'Breathe normally throughout hold'
    ],
    tips: ['Start with 30 seconds, build up to 2+ minutes'],
    imageUrl: '/exercises/plank.jpg'
  },
  {
    id: 'core-002',
    name: 'Russian Twists',
    category: 'core',
    muscleGroups: ['obliques', 'abs'],
    equipment: ['bodyweight', 'medicine ball', 'dumbbell'],
    difficulty: 'intermediate',
    description: 'Rotational core exercise for oblique strength',
    instructions: [
      'Sit with knees bent, feet slightly off ground',
      'Lean back to create V-shape with torso and thighs',
      'Rotate torso side to side',
      'Keep chest up and core engaged'
    ],
    imageUrl: '/exercises/russian-twists.jpg'
  },
  {
    id: 'core-003',
    name: 'Dead Bug',
    category: 'core',
    muscleGroups: ['abs', 'core'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    description: 'Core stability exercise with opposite arm/leg movement',
    instructions: [
      'Lie on back with arms extended toward ceiling',
      'Bring knees to 90-degree angle',
      'Lower opposite arm and leg toward floor',
      'Return to start and repeat other side'
    ],
    imageUrl: '/exercises/dead-bug.jpg'
  },
  {
    id: 'core-004',
    name: 'Hanging Knee Raises',
    category: 'core',
    muscleGroups: ['lower abs', 'hip flexors'],
    equipment: ['pull-up bar'],
    difficulty: 'intermediate',
    description: 'Hanging exercise for lower abdominal development',
    instructions: [
      'Hang from pull-up bar with arms extended',
      'Raise knees toward chest',
      'Lower with control',
      'Avoid swinging or using momentum'
    ],
    imageUrl: '/exercises/hanging-knee-raises.jpg'
  },
  {
    id: 'core-005',
    name: 'Bicycle Crunches',
    category: 'core',
    muscleGroups: ['abs', 'obliques'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    description: 'Dynamic core exercise targeting abs and obliques',
    instructions: [
      'Lie on back with hands behind head',
      'Bring opposite elbow to knee while extending other leg',
      'Alternate sides in cycling motion',
      'Keep lower back pressed to floor'
    ],
    imageUrl: '/exercises/bicycle-crunches.jpg'
  },

  // CARDIO EXERCISES
  {
    id: 'cardio-001',
    name: 'Burpees',
    category: 'cardio',
    muscleGroups: ['full body'],
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    description: 'High-intensity full-body exercise for conditioning',
    instructions: [
      'Start standing, drop to push-up position',
      'Perform push-up',
      'Jump feet back to hands',
      'Jump up with arms overhead'
    ],
    tips: ['Modify by removing push-up or jump for beginners'],
    imageUrl: '/exercises/burpees.jpg'
  },
  {
    id: 'cardio-002',
    name: 'Mountain Climbers',
    category: 'cardio',
    muscleGroups: ['core', 'legs', 'shoulders'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    description: 'Dynamic cardio exercise that also builds core strength',
    instructions: [
      'Start in plank position',
      'Drive one knee toward chest',
      'Quickly switch legs',
      'Continue alternating at rapid pace'
    ],
    imageUrl: '/exercises/mountain-climbers.jpg'
  },
  {
    id: 'cardio-003',
    name: 'Jump Rope',
    category: 'cardio',
    muscleGroups: ['calves', 'shoulders', 'core'],
    equipment: ['jump rope'],
    difficulty: 'beginner',
    description: 'Classic cardio exercise for coordination and endurance',
    instructions: [
      'Hold rope handles at hip height',
      'Jump with both feet together',
      'Land softly on balls of feet',
      'Keep elbows close to body'
    ],
    imageUrl: '/exercises/jump-rope.jpg'
  },
  {
    id: 'cardio-004',
    name: 'High Knees',
    category: 'cardio',
    muscleGroups: ['legs', 'core'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    description: 'Running in place with exaggerated knee lift',
    instructions: [
      'Stand with feet hip-width apart',
      'Run in place bringing knees to waist height',
      'Pump arms as you run',
      'Land on balls of feet'
    ],
    imageUrl: '/exercises/high-knees.jpg'
  },
  {
    id: 'cardio-005',
    name: 'Box Jumps',
    category: 'cardio',
    muscleGroups: ['legs', 'glutes'],
    equipment: ['plyo box', 'bench'],
    difficulty: 'intermediate',
    description: 'Explosive plyometric exercise for power development',
    instructions: [
      'Stand facing box with feet shoulder-width apart',
      'Jump onto box landing with both feet',
      'Stand fully upright on box',
      'Step down carefully and repeat'
    ],
    imageUrl: '/exercises/box-jumps.jpg'
  },

  // FULL BODY EXERCISES
  {
    id: 'fullbody-001',
    name: 'Deadlifts',
    category: 'fullbody',
    muscleGroups: ['back', 'glutes', 'hamstrings', 'traps'],
    equipment: ['barbell'],
    difficulty: 'intermediate',
    description: 'Compound movement for total body strength',
    instructions: [
      'Stand with feet hip-width apart, bar over mid-foot',
      'Bend at hips and knees to grip bar',
      'Lift bar by extending hips and knees simultaneously',
      'Lock out at top with shoulders back'
    ],
    tips: ['Keep bar close to body throughout lift', 'Maintain neutral spine'],
    imageUrl: '/exercises/deadlifts.jpg'
  },
  {
    id: 'fullbody-002',
    name: 'Clean and Press',
    category: 'fullbody',
    muscleGroups: ['shoulders', 'legs', 'back', 'core'],
    equipment: ['barbell', 'dumbbells'],
    difficulty: 'advanced',
    description: 'Olympic lift variation for power and strength',
    instructions: [
      'Start with weight on floor',
      'Explosively pull weight to shoulders',
      'Dip slightly and press weight overhead',
      'Lower with control to starting position'
    ],
    imageUrl: '/exercises/clean-press.jpg'
  },
  {
    id: 'fullbody-003',
    name: 'Thrusters',
    category: 'fullbody',
    muscleGroups: ['legs', 'shoulders', 'core'],
    equipment: ['barbell', 'dumbbells'],
    difficulty: 'intermediate',
    description: 'Combination squat and press for full-body conditioning',
    instructions: [
      'Hold weight at shoulder level',
      'Perform full squat',
      'Drive up explosively',
      'Press weight overhead as you stand'
    ],
    imageUrl: '/exercises/thrusters.jpg'
  },
  {
    id: 'fullbody-004',
    name: 'Turkish Get-Up',
    category: 'fullbody',
    muscleGroups: ['core', 'shoulders', 'legs'],
    equipment: ['kettlebell', 'dumbbell'],
    difficulty: 'advanced',
    description: 'Complex movement for stability and coordination',
    instructions: [
      'Lie on back holding weight overhead',
      'Roll to elbow, then to hand',
      'Bridge hips and sweep leg under',
      'Stand up keeping weight overhead'
    ],
    imageUrl: '/exercises/turkish-getup.jpg'
  },
  {
    id: 'fullbody-005',
    name: 'Man Makers',
    category: 'fullbody',
    muscleGroups: ['full body'],
    equipment: ['dumbbells'],
    difficulty: 'advanced',
    description: 'Brutal full-body exercise combining multiple movements',
    instructions: [
      'Start in push-up position holding dumbbells',
      'Perform push-up',
      'Row each dumbbell to hip',
      'Jump feet to hands and clean weights to shoulders',
      'Stand and press overhead'
    ],
    imageUrl: '/exercises/man-makers.jpg'
  },

  // Additional exercises to reach 50+
  {
    id: 'push-006',
    name: 'Incline Dumbbell Press',
    category: 'push',
    muscleGroups: ['upper chest', 'shoulders', 'triceps'],
    equipment: ['dumbbells', 'incline bench'],
    difficulty: 'intermediate',
    description: 'Target upper chest with angled pressing movement',
    instructions: [
      'Set bench to 30-45 degree incline',
      'Press dumbbells from chest level to overhead',
      'Lower with control, feeling stretch in chest',
      'Press back up with power'
    ],
    imageUrl: '/exercises/incline-dumbbell-press.jpg'
  },
  {
    id: 'push-007',
    name: 'Cable Flyes',
    category: 'push',
    muscleGroups: ['chest'],
    equipment: ['cable machine'],
    difficulty: 'beginner',
    description: 'Isolation exercise for chest development',
    instructions: [
      'Set cables at chest height',
      'Step forward with slight lean',
      'Bring hands together in arc motion',
      'Control weight back to start'
    ],
    imageUrl: '/exercises/cable-flyes.jpg'
  },
  {
    id: 'pull-006',
    name: 'Chin-Ups',
    category: 'pull',
    muscleGroups: ['biceps', 'back', 'lats'],
    equipment: ['pull-up bar'],
    difficulty: 'intermediate',
    description: 'Underhand grip variation emphasizing biceps',
    instructions: [
      'Grip bar with palms facing you',
      'Pull up until chin clears bar',
      'Lower with control',
      'Focus on bicep contraction'
    ],
    imageUrl: '/exercises/chinups.jpg'
  },
  {
    id: 'legs-007',
    name: 'Goblet Squats',
    category: 'legs',
    muscleGroups: ['quadriceps', 'glutes', 'core'],
    equipment: ['dumbbell', 'kettlebell'],
    difficulty: 'beginner',
    description: 'Front-loaded squat variation for beginners',
    instructions: [
      'Hold weight at chest level',
      'Squat down between legs',
      'Keep chest up and core tight',
      'Drive through heels to stand'
    ],
    imageUrl: '/exercises/goblet-squats.jpg'
  },
  {
    id: 'core-006',
    name: 'Cable Woodchoppers',
    category: 'core',
    muscleGroups: ['obliques', 'core'],
    equipment: ['cable machine'],
    difficulty: 'intermediate',
    description: 'Rotational power exercise for core',
    instructions: [
      'Set cable at shoulder height',
      'Rotate from high to low across body',
      'Keep arms extended throughout',
      'Control return to start position'
    ],
    imageUrl: '/exercises/woodchoppers.jpg'
  }
]

// Helper function to get exercises by category
export const getExercisesByCategory = (category: string): ExerciseData[] => {
  return exerciseDatabase.filter(ex => ex.category === category)
}

// Helper function to get exercises by equipment
export const getExercisesByEquipment = (equipment: string[]): ExerciseData[] => {
  return exerciseDatabase.filter(ex => 
    ex.equipment.some(eq => equipment.includes(eq))
  )
}

// Helper function to get exercises by difficulty
export const getExercisesByDifficulty = (difficulty: string): ExerciseData[] => {
  return exerciseDatabase.filter(ex => ex.difficulty === difficulty)
}

// Helper function to get random exercises
export const getRandomExercises = (count: number, filters?: {
  category?: string
  equipment?: string[]
  difficulty?: string
}): ExerciseData[] => {
  let filtered = [...exerciseDatabase]
  
  if (filters?.category) {
    filtered = filtered.filter(ex => ex.category === filters.category)
  }
  if (filters?.equipment) {
    filtered = filtered.filter(ex => 
      ex.equipment.some(eq => filters.equipment!.includes(eq))
    )
  }
  if (filters?.difficulty) {
    filtered = filtered.filter(ex => ex.difficulty === filters.difficulty)
  }
  
  // Shuffle and return requested count
  const shuffled = filtered.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

// Default placeholder image URLs by category
export const categoryPlaceholders: Record<string, string> = {
  push: '/placeholders/push-exercise.svg',
  pull: '/placeholders/pull-exercise.svg',
  legs: '/placeholders/legs-exercise.svg',
  core: '/placeholders/core-exercise.svg',
  cardio: '/placeholders/cardio-exercise.svg',
  fullbody: '/placeholders/fullbody-exercise.svg'
}

// Get exercise image with fallback
export const getExerciseImage = (exercise: ExerciseData): string => {
  return exercise.imageUrl || categoryPlaceholders[exercise.category] || '/placeholders/default-exercise.svg'
}