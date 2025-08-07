import { Exercise, MuscleGroup, Equipment } from '../types/workout'

export interface ComprehensiveExercise extends Exercise {
  category: 'push' | 'pull' | 'legs' | 'core' | 'cardio' | 'fullbody'
  primaryMuscle: string
  secondaryMuscles: string[]
  movement: 'compound' | 'isolation'
  progressions: {
    beginner: string
    intermediate: string
    advanced: string
  }
  alternatives: string[]
  injuryModifications: string[]
  formCues: string[]
  commonMistakes: string[]
  benefits: string[]
}

export const COMPREHENSIVE_EXERCISE_DATABASE: ComprehensiveExercise[] = [
  // PUSH EXERCISES (Upper Body - Chest, Shoulders, Triceps)
  {
    id: 'push-up',
    name: 'Push-up',
    description: 'A fundamental upper body bodyweight exercise',
    muscleGroups: ['chest', 'triceps', 'shoulders'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    instructions: [
      'Start in a plank position with hands shoulder-width apart',
      'Lower your body until chest nearly touches the floor',
      'Push back up to starting position',
      'Keep your core tight throughout the movement'
    ],
    category: 'push',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    movement: 'compound',
    progressions: {
      beginner: 'Wall push-ups or knee push-ups',
      intermediate: 'Standard push-ups',
      advanced: 'Diamond push-ups or decline push-ups'
    },
    alternatives: ['Chest press', 'Dumbbell press'],
    injuryModifications: ['Knee push-ups', 'Incline push-ups'],
    formCues: ['Keep core tight', 'Full range of motion'],
    commonMistakes: ['Sagging hips', 'Partial range of motion'],
    benefits: ['Upper body strength', 'Core stability']
  },
  {
    id: 'diamond-push-up',
    name: 'Diamond Push-up',
    description: 'Advanced push-up variation targeting triceps',
    muscleGroups: ['triceps', 'chest', 'shoulders'],
    equipment: ['bodyweight'],
    difficulty: 'advanced',
    instructions: [
      'Form diamond shape with hands under chest',
      'Lower body keeping elbows close to sides',
      'Push back up maintaining diamond hand position'
    ],
    category: 'push',
    primaryMuscle: 'triceps',
    secondaryMuscles: ['chest', 'shoulders'],
    movement: 'compound',
    progressions: {
      beginner: 'Regular push-ups',
      intermediate: 'Close-grip push-ups',
      advanced: 'Single-arm push-ups'
    },
    alternatives: ['Close-grip bench press', 'Tricep dips'],
    injuryModifications: ['Incline diamond push-ups', 'Knee diamond push-ups'],
    formCues: ['Keep elbows close to body', 'Maintain straight line'],
    commonMistakes: ['Flaring elbows out', 'Partial range of motion'],
    benefits: ['Targets triceps intensely', 'Builds pushing strength']
  },
  {
    id: 'dumbbell-press',
    name: 'Dumbbell Chest Press',
    description: 'Classic chest building exercise with dumbbells',
    muscleGroups: ['chest', 'triceps', 'shoulders'],
    equipment: ['dumbbells'],
    difficulty: 'intermediate',
    instructions: [
      'Lie on bench holding dumbbells above chest',
      'Lower weights to chest level with control',
      'Press dumbbells back up to starting position'
    ],
    category: 'push',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    movement: 'compound',
    progressions: {
      beginner: 'Floor press with light weights',
      intermediate: 'Standard bench press',
      advanced: 'Incline or decline variations'
    },
    alternatives: ['Barbell bench press', 'Push-ups'],
    injuryModifications: ['Neutral grip for wrists', 'Partial range for shoulders'],
    formCues: ['Retract shoulder blades', 'Control the negative'],
    commonMistakes: ['Bouncing off chest', 'Pressing too wide'],
    benefits: ['Builds chest mass', 'Improves pressing strength']
  },
  {
    id: 'overhead-press',
    name: 'Overhead Press',
    description: 'Standing shoulder press with dumbbells',
    muscleGroups: ['shoulders', 'triceps', 'core'],
    equipment: ['dumbbells'],
    difficulty: 'intermediate',
    instructions: [
      'Stand with feet shoulder-width apart',
      'Hold dumbbells at shoulder height',
      'Press weights overhead until arms are fully extended',
      'Lower with control back to shoulders'
    ],
    category: 'push',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['triceps', 'core'],
    movement: 'compound',
    progressions: {
      beginner: 'Seated press',
      intermediate: 'Standing press',
      advanced: 'Single-arm press'
    },
    alternatives: ['Military press', 'Pike push-ups'],
    injuryModifications: ['Seated variation', 'Neutral grip'],
    formCues: ['Keep core tight', 'Don\'t arch back excessively'],
    commonMistakes: ['Pressing in front of head', 'Excessive back arch'],
    benefits: ['Builds shoulder strength', 'Improves core stability']
  },
  {
    id: 'pike-push-ups',
    name: 'Pike Push-ups',
    description: 'Bodyweight shoulder exercise',
    muscleGroups: ['shoulders', 'triceps', 'core'],
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    instructions: [
      'Start in downward dog position',
      'Lower head toward ground',
      'Push back up to starting position'
    ],
    category: 'push',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['triceps', 'core'],
    movement: 'compound',
    progressions: {
      beginner: 'Incline pike push-ups',
      intermediate: 'Standard pike push-ups',
      advanced: 'Handstand push-ups'
    },
    alternatives: ['Overhead press', 'Handstand push-ups'],
    injuryModifications: ['Hands on elevation', 'Partial range'],
    formCues: ['Keep legs straight', 'Look at hands'],
    commonMistakes: ['Bending legs', 'Not going full range'],
    benefits: ['Shoulder strength', 'Handstand progression']
  },

  // PULL EXERCISES (Upper Body - Back, Biceps)
  {
    id: 'pull-up',
    name: 'Pull-up',
    description: 'Classic bodyweight back exercise',
    muscleGroups: ['back', 'biceps', 'shoulders'],
    equipment: ['pull-up bar'],
    difficulty: 'advanced',
    instructions: [
      'Hang from bar with overhand grip',
      'Pull body up until chin clears bar',
      'Lower with control to full arm extension'
    ],
    category: 'pull',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps', 'shoulders'],
    movement: 'compound',
    progressions: {
      beginner: 'Assisted pull-ups or inverted rows',
      intermediate: 'Standard pull-ups',
      advanced: 'Weighted pull-ups'
    },
    alternatives: ['Lat pulldowns', 'Inverted rows'],
    injuryModifications: ['Assisted variations', 'Partial range'],
    formCues: ['Lead with chest', 'Squeeze shoulder blades'],
    commonMistakes: ['Swinging', 'Not going full range'],
    benefits: ['Builds back width', 'Improves grip strength']
  },
  {
    id: 'inverted-row',
    name: 'Inverted Row',
    description: 'Horizontal pulling exercise using body weight',
    muscleGroups: ['back', 'biceps', 'shoulders'],
    equipment: ['barbell'],
    difficulty: 'beginner',
    instructions: [
      'Set bar at waist height',
      'Lie under bar and grab with overhand grip',
      'Pull chest to bar keeping body straight',
      'Lower with control'
    ],
    category: 'pull',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps', 'shoulders'],
    movement: 'compound',
    progressions: {
      beginner: 'Higher bar position',
      intermediate: 'Lower bar position',
      advanced: 'Feet elevated or weighted'
    },
    alternatives: ['Dumbbell rows', 'Resistance band rows'],
    injuryModifications: ['Higher bar for easier angle'],
    formCues: ['Keep body straight', 'Squeeze shoulder blades'],
    commonMistakes: ['Sagging hips', 'Not pulling to chest'],
    benefits: ['Builds pulling strength', 'Improves posture']
  },
  {
    id: 'dumbbell-row',
    name: 'Dumbbell Row',
    description: 'Single-arm back exercise with dumbbell',
    muscleGroups: ['back', 'biceps', 'shoulders'],
    equipment: ['dumbbells'],
    difficulty: 'beginner',
    instructions: [
      'Place one knee and hand on bench',
      'Hold dumbbell in opposite hand',
      'Pull weight to ribcage squeezing shoulder blade',
      'Lower with control'
    ],
    category: 'pull',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps', 'shoulders'],
    movement: 'compound',
    progressions: {
      beginner: 'Light weight focus on form',
      intermediate: 'Moderate weight',
      advanced: 'Heavy weight or tempo variations'
    },
    alternatives: ['Barbell rows', 'Cable rows'],
    injuryModifications: ['Chest-supported row', 'Lighter weight'],
    formCues: ['Pull to hip not shoulder', 'Keep back neutral'],
    commonMistakes: ['Rotating torso', 'Pulling too high'],
    benefits: ['Builds back thickness', 'Unilateral strength']
  },
  {
    id: 'face-pulls',
    name: 'Face Pulls',
    description: 'Rear deltoid and upper back exercise',
    muscleGroups: ['shoulders', 'back'],
    equipment: ['resistance bands'],
    difficulty: 'beginner',
    instructions: [
      'Attach band at chest height',
      'Pull band toward face with elbows high',
      'Squeeze shoulder blades together',
      'Return with control'
    ],
    category: 'pull',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['back'],
    movement: 'isolation',
    progressions: {
      beginner: 'Light resistance',
      intermediate: 'Moderate resistance',
      advanced: 'Heavy resistance or single arm'
    },
    alternatives: ['Reverse flyes', 'Band pull-aparts'],
    injuryModifications: ['Lighter resistance', 'Smaller range'],
    formCues: ['Keep elbows high', 'Squeeze shoulder blades'],
    commonMistakes: ['Elbows dropping', 'Using momentum'],
    benefits: ['Improves posture', 'Shoulder health']
  },

  // LEG EXERCISES (Lower Body - Quads, Glutes, Hamstrings, Calves)
  {
    id: 'squat',
    name: 'Squat',
    description: 'Fundamental lower body exercise',
    muscleGroups: ['legs', 'glutes'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    instructions: [
      'Stand with feet shoulder-width apart',
      'Lower hips back and down',
      'Go down until thighs parallel to floor',
      'Drive through heels to return to standing'
    ],
    category: 'legs',
    primaryMuscle: 'legs',
    secondaryMuscles: ['glutes', 'core'],
    movement: 'compound',
    progressions: {
      beginner: 'Chair squats',
      intermediate: 'Bodyweight squats',
      advanced: 'Jump squats or pistol squats'
    },
    alternatives: ['Leg press', 'Goblet squats'],
    injuryModifications: ['Shallow squats', 'Chair-assisted squats'],
    formCues: ['Keep chest up', 'Weight on heels', 'Knees track over toes'],
    commonMistakes: ['Knees caving in', 'Forward lean', 'Not going deep enough'],
    benefits: ['Lower body strength', 'Functional movement']
  },
  {
    id: 'lunges',
    name: 'Lunges',
    description: 'Single-leg exercise for lower body strength',
    muscleGroups: ['legs', 'glutes'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    instructions: [
      'Step forward into lunge position',
      'Lower back knee toward ground',
      'Push through front heel to return',
      'Alternate legs or complete one side first'
    ],
    category: 'legs',
    primaryMuscle: 'legs',
    secondaryMuscles: ['glutes', 'core'],
    movement: 'compound',
    progressions: {
      beginner: 'Stationary lunges',
      intermediate: 'Walking lunges',
      advanced: 'Jump lunges or weighted'
    },
    alternatives: ['Step-ups', 'Bulgarian split squats'],
    injuryModifications: ['Smaller range of motion', 'Hand support'],
    formCues: ['Keep front knee over ankle', 'Don\'t lean forward'],
    commonMistakes: ['Knee caving in', 'Too small steps'],
    benefits: ['Unilateral leg strength', 'Improves balance']
  },
  {
    id: 'deadlift',
    name: 'Romanian Deadlift',
    description: 'Hip hinge movement with dumbbells',
    muscleGroups: ['back', 'glutes', 'hamstrings'],
    equipment: ['dumbbells'],
    difficulty: 'intermediate',
    instructions: [
      'Hold dumbbells in front of thighs',
      'Hinge at hips pushing butt back',
      'Lower weights while keeping back straight',
      'Drive hips forward to return to standing'
    ],
    category: 'legs',
    primaryMuscle: 'glutes',
    secondaryMuscles: ['hamstrings', 'back'],
    movement: 'compound',
    progressions: {
      beginner: 'Light dumbbells or bodyweight',
      intermediate: 'Moderate weight',
      advanced: 'Heavy weight or single-leg'
    },
    alternatives: ['Good mornings', 'Glute bridges'],
    injuryModifications: ['Partial range', 'Lighter weight'],
    formCues: ['Chest up', 'Weight in heels', 'Hinge don\'t squat'],
    commonMistakes: ['Rounding back', 'Weights drifting away'],
    benefits: ['Posterior chain strength', 'Hip mobility']
  },
  {
    id: 'glute-bridges',
    name: 'Glute Bridges',
    description: 'Hip extension exercise targeting glutes',
    muscleGroups: ['glutes', 'hamstrings'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    instructions: [
      'Lie on back with knees bent',
      'Squeeze glutes and lift hips up',
      'Hold briefly at the top',
      'Lower with control'
    ],
    category: 'legs',
    primaryMuscle: 'glutes',
    secondaryMuscles: ['hamstrings'],
    movement: 'isolation',
    progressions: {
      beginner: 'Basic glute bridges',
      intermediate: 'Single-leg bridges',
      advanced: 'Weighted bridges'
    },
    alternatives: ['Hip thrusts', 'Romanian deadlifts'],
    injuryModifications: ['Smaller range', 'Pillow under back'],
    formCues: ['Squeeze glutes at top', 'Don\'t arch back'],
    commonMistakes: ['Using back instead of glutes', 'Not squeezing'],
    benefits: ['Glute activation', 'Hip mobility']
  },
  {
    id: 'calf-raises',
    name: 'Calf Raises',
    description: 'Isolation exercise for calf muscles',
    muscleGroups: ['calves'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    instructions: [
      'Stand with feet hip-width apart',
      'Rise up onto toes as high as possible',
      'Hold briefly at the top',
      'Lower slowly with control'
    ],
    category: 'legs',
    primaryMuscle: 'calves',
    secondaryMuscles: [],
    movement: 'isolation',
    progressions: {
      beginner: 'Both feet',
      intermediate: 'Single leg',
      advanced: 'Weighted or elevated'
    },
    alternatives: ['Seated calf raises', 'Jump rope'],
    injuryModifications: ['Seated variation', 'Partial range'],
    formCues: ['Rise up high', 'Control the descent'],
    commonMistakes: ['Bouncing', 'Not full range'],
    benefits: ['Calf strength', 'Ankle stability']
  },
  {
    id: 'step-ups',
    name: 'Step-ups',
    description: 'Single-leg functional movement',
    muscleGroups: ['legs', 'glutes'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    instructions: [
      'Place one foot on sturdy box or step',
      'Step up driving through heel',
      'Step down with control',
      'Complete reps on one side before switching'
    ],
    category: 'legs',
    primaryMuscle: 'legs',
    secondaryMuscles: ['glutes', 'core'],
    movement: 'compound',
    progressions: {
      beginner: 'Low step',
      intermediate: 'Higher step',
      advanced: 'Weighted or lateral step-ups'
    },
    alternatives: ['Lunges', 'Bulgarian split squats'],
    injuryModifications: ['Lower step height', 'Hand support'],
    formCues: ['Drive through heel', 'Control the descent'],
    commonMistakes: ['Using momentum', 'Pushing off bottom leg'],
    benefits: ['Unilateral strength', 'Functional movement']
  },

  // CORE EXERCISES
  {
    id: 'plank',
    name: 'Plank',
    description: 'Isometric core strengthening exercise',
    muscleGroups: ['core'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    instructions: [
      'Start in push-up position',
      'Lower to forearms',
      'Hold straight line from head to heels',
      'Breathe normally while holding'
    ],
    category: 'core',
    primaryMuscle: 'core',
    secondaryMuscles: ['shoulders'],
    movement: 'isolation',
    progressions: {
      beginner: 'Knee plank',
      intermediate: 'Standard plank',
      advanced: 'Single-arm or weighted'
    },
    alternatives: ['Dead bug', 'Bird dog'],
    injuryModifications: ['Knee plank', 'Incline plank'],
    formCues: ['Straight line', 'Don\'t hold breath'],
    commonMistakes: ['Sagging hips', 'Raised butt'],
    benefits: ['Core stability', 'Improves posture']
  },
  {
    id: 'crunches',
    name: 'Crunches',
    description: 'Traditional abdominal exercise',
    muscleGroups: ['core'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    instructions: [
      'Lie on back with knees bent',
      'Place hands behind head',
      'Curl shoulders up toward knees',
      'Lower with control'
    ],
    category: 'core',
    primaryMuscle: 'core',
    secondaryMuscles: [],
    movement: 'isolation',
    progressions: {
      beginner: 'Basic crunches',
      intermediate: 'Bicycle crunches',
      advanced: 'Weighted crunches'
    },
    alternatives: ['Sit-ups', 'Leg raises'],
    injuryModifications: ['Partial range', 'Towel under lower back'],
    formCues: ['Curl up don\'t sit up', 'Don\'t pull on neck'],
    commonMistakes: ['Pulling on neck', 'Using momentum'],
    benefits: ['Abdominal strength', 'Core definition']
  },
  {
    id: 'mountain-climbers',
    name: 'Mountain Climbers',
    description: 'Dynamic core and cardio exercise',
    muscleGroups: ['core', 'shoulders'],
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    instructions: [
      'Start in plank position',
      'Bring one knee toward chest',
      'Quickly switch legs',
      'Maintain steady rhythm'
    ],
    category: 'core',
    primaryMuscle: 'core',
    secondaryMuscles: ['shoulders'],
    movement: 'compound',
    progressions: {
      beginner: 'Slow controlled movement',
      intermediate: 'Standard pace',
      advanced: 'Fast pace or cross-body'
    },
    alternatives: ['High knees', 'Burpees'],
    injuryModifications: ['Slower pace', 'Hands elevated'],
    formCues: ['Keep hips level', 'Don\'t bounce'],
    commonMistakes: ['Hips too high', 'Hands moving'],
    benefits: ['Core strength', 'Cardiovascular fitness']
  },
  {
    id: 'russian-twists',
    name: 'Russian Twists',
    description: 'Rotational core exercise',
    muscleGroups: ['core'],
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    instructions: [
      'Sit with knees bent, feet lifted',
      'Lean back slightly',
      'Rotate torso side to side',
      'Keep chest up throughout'
    ],
    category: 'core',
    primaryMuscle: 'core',
    secondaryMuscles: [],
    movement: 'isolation',
    progressions: {
      beginner: 'Feet on ground',
      intermediate: 'Feet elevated',
      advanced: 'Weighted or slower tempo'
    },
    alternatives: ['Wood chops', 'Bicycle crunches'],
    injuryModifications: ['Smaller range', 'Feet on ground'],
    formCues: ['Keep chest up', 'Control the movement'],
    commonMistakes: ['Moving too fast', 'Hunching shoulders'],
    benefits: ['Rotational strength', 'Core stability']
  },
  {
    id: 'dead-bug',
    name: 'Dead Bug',
    description: 'Core stability exercise',
    muscleGroups: ['core'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    instructions: [
      'Lie on back with arms up and knees bent at 90 degrees',
      'Lower opposite arm and leg',
      'Return to starting position',
      'Alternate sides'
    ],
    category: 'core',
    primaryMuscle: 'core',
    secondaryMuscles: [],
    movement: 'isolation',
    progressions: {
      beginner: 'Arms only or legs only',
      intermediate: 'Standard dead bug',
      advanced: 'With resistance band'
    },
    alternatives: ['Bird dog', 'Plank'],
    injuryModifications: ['Smaller range', 'One limb at a time'],
    formCues: ['Keep lower back flat', 'Move slowly'],
    commonMistakes: ['Arching back', 'Moving too fast'],
    benefits: ['Core stability', 'Coordination']
  },

  // CARDIO/CONDITIONING EXERCISES
  {
    id: 'burpees',
    name: 'Burpees',
    description: 'Full body exercise combining squat, plank, and jump',
    muscleGroups: ['fullBody'],
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    instructions: [
      'Start standing',
      'Squat down and place hands on floor',
      'Jump feet back to plank',
      'Do push-up (optional)',
      'Jump feet back to squat',
      'Jump up with arms overhead'
    ],
    category: 'fullbody',
    primaryMuscle: 'fullBody',
    secondaryMuscles: [],
    movement: 'compound',
    progressions: {
      beginner: 'Step back instead of jumping',
      intermediate: 'Standard burpees',
      advanced: 'Burpee box jumps'
    },
    alternatives: ['Squat thrusts', 'Bear crawls'],
    injuryModifications: ['Step movements', 'No push-up'],
    formCues: ['Control the movement', 'Land softly'],
    commonMistakes: ['Poor plank position', 'Hard landings'],
    benefits: ['Full body conditioning', 'Cardiovascular fitness']
  },
  {
    id: 'jumping-jacks',
    name: 'Jumping Jacks',
    description: 'Classic cardio exercise',
    muscleGroups: ['fullBody'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    instructions: [
      'Start with feet together, arms at sides',
      'Jump feet apart while raising arms overhead',
      'Jump back to starting position',
      'Maintain steady rhythm'
    ],
    category: 'cardio',
    primaryMuscle: 'fullBody',
    secondaryMuscles: [],
    movement: 'compound',
    progressions: {
      beginner: 'Step touch instead of jumping',
      intermediate: 'Standard jumping jacks',
      advanced: 'Star jumps or weighted'
    },
    alternatives: ['Step touches', 'Arm circles'],
    injuryModifications: ['Step version', 'Upper body only'],
    formCues: ['Land softly', 'Keep rhythm steady'],
    commonMistakes: ['Hard landings', 'Arms not overhead'],
    benefits: ['Cardiovascular health', 'Coordination']
  },
  {
    id: 'high-knees',
    name: 'High Knees',
    description: 'Running in place with high knee lifts',
    muscleGroups: ['legs', 'core'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    instructions: [
      'Run in place',
      'Lift knees to hip height',
      'Pump arms naturally',
      'Maintain quick tempo'
    ],
    category: 'cardio',
    primaryMuscle: 'legs',
    secondaryMuscles: ['core'],
    movement: 'compound',
    progressions: {
      beginner: 'Marching in place',
      intermediate: 'Standard high knees',
      advanced: 'Faster tempo or longer duration'
    },
    alternatives: ['Butt kicks', 'Mountain climbers'],
    injuryModifications: ['Marching instead of running', 'Lower knees'],
    formCues: ['Land on balls of feet', 'Keep chest up'],
    commonMistakes: ['Leaning forward', 'Not lifting knees high'],
    benefits: ['Cardiovascular fitness', 'Leg strength']
  },
  {
    id: 'wall-sit',
    name: 'Wall Sit',
    description: 'Isometric leg exercise against wall',
    muscleGroups: ['legs', 'glutes'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    instructions: [
      'Stand with back against wall',
      'Slide down until thighs parallel to floor',
      'Hold position',
      'Keep weight in heels'
    ],
    category: 'legs',
    primaryMuscle: 'legs',
    secondaryMuscles: ['glutes'],
    movement: 'isolation',
    progressions: {
      beginner: 'Shallow angle',
      intermediate: 'Thighs parallel',
      advanced: 'Single leg or weighted'
    },
    alternatives: ['Squats', 'Leg press'],
    injuryModifications: ['Higher position', 'Shorter holds'],
    formCues: ['Keep back flat against wall', 'Weight in heels'],
    commonMistakes: ['Sliding down wall', 'Weight on toes'],
    benefits: ['Leg endurance', 'Isometric strength']
  },

  // ADDITIONAL PUSH EXERCISES
  {
    id: 'incline-push-ups',
    name: 'Incline Push-ups',
    description: 'Push-ups performed with hands elevated',
    muscleGroups: ['chest', 'triceps', 'shoulders'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    instructions: [
      'Place hands on elevated surface (bench, step)',
      'Assume plank position with feet on ground',
      'Lower chest to surface',
      'Push back up to starting position'
    ],
    category: 'push',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    movement: 'compound',
    progressions: {
      beginner: 'Higher incline',
      intermediate: 'Lower incline',
      advanced: 'Standard push-ups'
    },
    alternatives: ['Wall push-ups', 'Knee push-ups'],
    injuryModifications: ['Higher surface', 'Smaller range'],
    formCues: ['Keep body straight', 'Full range of motion'],
    commonMistakes: ['Sagging hips', 'Partial movement'],
    benefits: ['Upper body strength progression', 'Proper form development']
  },
  {
    id: 'tricep-dips',
    name: 'Tricep Dips',
    description: 'Bodyweight exercise targeting triceps',
    muscleGroups: ['triceps', 'shoulders'],
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    instructions: [
      'Sit on edge of chair or bench',
      'Place hands beside hips',
      'Lower body by bending elbows',
      'Push back up to starting position'
    ],
    category: 'push',
    primaryMuscle: 'triceps',
    secondaryMuscles: ['shoulders'],
    movement: 'compound',
    progressions: {
      beginner: 'Bent knees, feet close',
      intermediate: 'Straight legs',
      advanced: 'Feet elevated or weighted'
    },
    alternatives: ['Diamond push-ups', 'Close-grip push-ups'],
    injuryModifications: ['Partial range', 'Assisted with feet'],
    formCues: ['Keep elbows close', 'Control the movement'],
    commonMistakes: ['Flaring elbows', 'Going too low'],
    benefits: ['Tricep strength', 'Functional pushing power']
  },
  {
    id: 'lateral-raises',
    name: 'Lateral Raises',
    description: 'Dumbbell exercise for shoulder development',
    muscleGroups: ['shoulders'],
    equipment: ['dumbbells'],
    difficulty: 'beginner',
    instructions: [
      'Stand with dumbbells at sides',
      'Raise arms out to sides to shoulder height',
      'Lower with control',
      'Keep slight bend in elbows'
    ],
    category: 'push',
    primaryMuscle: 'shoulders',
    secondaryMuscles: [],
    movement: 'isolation',
    progressions: {
      beginner: 'Light weights',
      intermediate: 'Moderate weights',
      advanced: 'Heavy weights or tempo variations'
    },
    alternatives: ['Resistance band lateral raises', 'Cable lateral raises'],
    injuryModifications: ['Lighter weights', 'Partial range'],
    formCues: ['Lead with pinkies', 'Control the descent'],
    commonMistakes: ['Using momentum', 'Raising too high'],
    benefits: ['Shoulder width', 'Deltoid development']
  },

  // ADDITIONAL PULL EXERCISES
  {
    id: 'chin-ups',
    name: 'Chin-ups',
    description: 'Underhand grip pull-up variation',
    muscleGroups: ['back', 'biceps'],
    equipment: ['pull-up bar'],
    difficulty: 'intermediate',
    instructions: [
      'Hang from bar with underhand grip',
      'Pull body up until chin clears bar',
      'Lower with control to full extension'
    ],
    category: 'pull',
    primaryMuscle: 'biceps',
    secondaryMuscles: ['back'],
    movement: 'compound',
    progressions: {
      beginner: 'Assisted chin-ups',
      intermediate: 'Standard chin-ups',
      advanced: 'Weighted chin-ups'
    },
    alternatives: ['Bicep curls', 'Inverted rows'],
    injuryModifications: ['Assisted variations', 'Partial range'],
    formCues: ['Lead with chest', 'Squeeze biceps'],
    commonMistakes: ['Swinging', 'Not full range'],
    benefits: ['Bicep strength', 'Pulling power']
  },
  {
    id: 'bent-over-row',
    name: 'Bent-over Row',
    description: 'Barbell row exercise for back development',
    muscleGroups: ['back', 'biceps'],
    equipment: ['barbell'],
    difficulty: 'intermediate',
    instructions: [
      'Hold barbell with overhand grip',
      'Hinge at hips, keep back straight',
      'Pull bar to lower chest',
      'Lower with control'
    ],
    category: 'pull',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps'],
    movement: 'compound',
    progressions: {
      beginner: 'Light weight',
      intermediate: 'Moderate weight',
      advanced: 'Heavy weight or tempo variations'
    },
    alternatives: ['Dumbbell rows', 'Cable rows'],
    injuryModifications: ['Chest-supported row', 'Lighter weight'],
    formCues: ['Keep back straight', 'Pull to lower chest'],
    commonMistakes: ['Rounding back', 'Using momentum'],
    benefits: ['Back thickness', 'Pulling strength']
  },
  {
    id: 'bicep-curls',
    name: 'Bicep Curls',
    description: 'Classic bicep isolation exercise',
    muscleGroups: ['biceps'],
    equipment: ['dumbbells'],
    difficulty: 'beginner',
    instructions: [
      'Stand with dumbbells at sides',
      'Curl weights up to shoulders',
      'Squeeze biceps at top',
      'Lower with control'
    ],
    category: 'pull',
    primaryMuscle: 'biceps',
    secondaryMuscles: [],
    movement: 'isolation',
    progressions: {
      beginner: 'Light weights',
      intermediate: 'Moderate weights',
      advanced: 'Heavy weights or variations'
    },
    alternatives: ['Hammer curls', 'Cable curls'],
    injuryModifications: ['Seated curls', 'Lighter weights'],
    formCues: ['Keep elbows stationary', 'Full range of motion'],
    commonMistakes: ['Swinging weights', 'Using momentum'],
    benefits: ['Bicep strength', 'Arm definition']
  },

  // ADDITIONAL LEG EXERCISES
  {
    id: 'bulgarian-split-squat',
    name: 'Bulgarian Split Squat',
    description: 'Single-leg squat with rear foot elevated',
    muscleGroups: ['legs', 'glutes'],
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    instructions: [
      'Stand with rear foot elevated on bench',
      'Lower into lunge position',
      'Drive through front heel to return',
      'Complete all reps before switching legs'
    ],
    category: 'legs',
    primaryMuscle: 'legs',
    secondaryMuscles: ['glutes'],
    movement: 'compound',
    progressions: {
      beginner: 'Stationary lunges',
      intermediate: 'Bulgarian split squats',
      advanced: 'Weighted or jump variations'
    },
    alternatives: ['Lunges', 'Step-ups'],
    injuryModifications: ['Lower bench', 'Hand support'],
    formCues: ['Front knee over ankle', 'Keep torso upright'],
    commonMistakes: ['Knee caving in', 'Too much weight on back foot'],
    benefits: ['Unilateral leg strength', 'Balance improvement']
  },
  {
    id: 'goblet-squat',
    name: 'Goblet Squat',
    description: 'Squat holding weight at chest',
    muscleGroups: ['legs', 'glutes', 'core'],
    equipment: ['dumbbells'],
    difficulty: 'beginner',
    instructions: [
      'Hold dumbbell at chest level',
      'Squat down keeping weight close',
      'Drive through heels to stand',
      'Keep chest up throughout'
    ],
    category: 'legs',
    primaryMuscle: 'legs',
    secondaryMuscles: ['glutes', 'core'],
    movement: 'compound',
    progressions: {
      beginner: 'Light weight',
      intermediate: 'Moderate weight',
      advanced: 'Heavy weight or tempo variations'
    },
    alternatives: ['Bodyweight squats', 'Front squats'],
    injuryModifications: ['Lighter weight', 'Partial range'],
    formCues: ['Weight close to chest', 'Knees track over toes'],
    commonMistakes: ['Weight drifting away', 'Knees caving'],
    benefits: ['Squat progression', 'Core engagement']
  },
  {
    id: 'single-leg-deadlift',
    name: 'Single-leg Deadlift',
    description: 'Unilateral hip hinge movement',
    muscleGroups: ['glutes', 'hamstrings', 'core'],
    equipment: ['dumbbells'],
    difficulty: 'intermediate',
    instructions: [
      'Stand on one leg holding dumbbell',
      'Hinge at hip, extend free leg back',
      'Lower weight toward ground',
      'Return to standing position'
    ],
    category: 'legs',
    primaryMuscle: 'glutes',
    secondaryMuscles: ['hamstrings', 'core'],
    movement: 'compound',
    progressions: {
      beginner: 'Bodyweight or light weight',
      intermediate: 'Moderate weight',
      advanced: 'Heavy weight or eyes closed'
    },
    alternatives: ['Romanian deadlifts', 'Glute bridges'],
    injuryModifications: ['Hand support', 'Shorter range'],
    formCues: ['Keep hips square', 'Control the movement'],
    commonMistakes: ['Rotating hips', 'Using momentum'],
    benefits: ['Unilateral strength', 'Balance and stability']
  },
  {
    id: 'hip-thrusts',
    name: 'Hip Thrusts',
    description: 'Glute-focused hip extension exercise',
    muscleGroups: ['glutes', 'hamstrings'],
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    instructions: [
      'Sit with upper back against bench',
      'Place feet flat on ground',
      'Drive hips up squeezing glutes',
      'Lower with control'
    ],
    category: 'legs',
    primaryMuscle: 'glutes',
    secondaryMuscles: ['hamstrings'],
    movement: 'isolation',
    progressions: {
      beginner: 'Glute bridges on floor',
      intermediate: 'Hip thrusts',
      advanced: 'Weighted hip thrusts'
    },
    alternatives: ['Glute bridges', 'Romanian deadlifts'],
    injuryModifications: ['Smaller range', 'Pad for comfort'],
    formCues: ['Squeeze glutes at top', 'Don\'t arch back'],
    commonMistakes: ['Using back instead of glutes', 'Partial range'],
    benefits: ['Glute strength', 'Hip power']
  },

  // ADDITIONAL CORE EXERCISES
  {
    id: 'bicycle-crunches',
    name: 'Bicycle Crunches',
    description: 'Dynamic core exercise with rotation',
    muscleGroups: ['core'],
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    instructions: [
      'Lie on back with hands behind head',
      'Bring opposite elbow to knee',
      'Alternate sides in cycling motion',
      'Keep other leg extended'
    ],
    category: 'core',
    primaryMuscle: 'core',
    secondaryMuscles: [],
    movement: 'compound',
    progressions: {
      beginner: 'Slow controlled movement',
      intermediate: 'Standard pace',
      advanced: 'Faster tempo or longer holds'
    },
    alternatives: ['Russian twists', 'Mountain climbers'],
    injuryModifications: ['Smaller range', 'Slower pace'],
    formCues: ['Don\'t pull on neck', 'Keep core engaged'],
    commonMistakes: ['Pulling on neck', 'Moving too fast'],
    benefits: ['Core strength', 'Rotational power']
  },
  {
    id: 'leg-raises',
    name: 'Leg Raises',
    description: 'Lower abdominal exercise',
    muscleGroups: ['core'],
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    instructions: [
      'Lie on back with legs straight',
      'Raise legs to 90 degrees',
      'Lower with control without touching ground',
      'Keep lower back pressed down'
    ],
    category: 'core',
    primaryMuscle: 'core',
    secondaryMuscles: [],
    movement: 'isolation',
    progressions: {
      beginner: 'Bent knee raises',
      intermediate: 'Straight leg raises',
      advanced: 'Weighted or hanging leg raises'
    },
    alternatives: ['Knee raises', 'Reverse crunches'],
    injuryModifications: ['Bent knees', 'Hands under lower back'],
    formCues: ['Keep lower back down', 'Control the movement'],
    commonMistakes: ['Arching back', 'Using momentum'],
    benefits: ['Lower ab strength', 'Hip flexor control']
  },
  {
    id: 'side-plank',
    name: 'Side Plank',
    description: 'Lateral core stability exercise',
    muscleGroups: ['core'],
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    instructions: [
      'Lie on side with forearm on ground',
      'Lift hips creating straight line',
      'Hold position',
      'Switch sides and repeat'
    ],
    category: 'core',
    primaryMuscle: 'core',
    secondaryMuscles: [],
    movement: 'isolation',
    progressions: {
      beginner: 'Knee side plank',
      intermediate: 'Standard side plank',
      advanced: 'Side plank with leg lifts'
    },
    alternatives: ['Regular plank', 'Russian twists'],
    injuryModifications: ['Knee variation', 'Shorter holds'],
    formCues: ['Straight line from head to feet', 'Don\'t let hips sag'],
    commonMistakes: ['Sagging hips', 'Rolling forward or back'],
    benefits: ['Lateral core strength', 'Spine stability']
  },

  // FLEXIBILITY AND MOBILITY
  {
    id: 'cat-cow-stretch',
    name: 'Cat-Cow Stretch',
    description: 'Spinal mobility exercise',
    muscleGroups: ['back', 'core'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    instructions: [
      'Start on hands and knees',
      'Arch back looking up (cow)',
      'Round back looking down (cat)',
      'Flow smoothly between positions'
    ],
    category: 'core',
    primaryMuscle: 'back',
    secondaryMuscles: ['core'],
    movement: 'isolation',
    progressions: {
      beginner: 'Slow controlled movement',
      intermediate: 'Standard flow',
      advanced: 'Extended range or holds'
    },
    alternatives: ['Child\'s pose', 'Spinal twists'],
    injuryModifications: ['Smaller range', 'Seated variation'],
    formCues: ['Move slowly', 'Feel the stretch'],
    commonMistakes: ['Moving too fast', 'Forcing the range'],
    benefits: ['Spinal mobility', 'Back flexibility']
  },

  // FUNCTIONAL MOVEMENTS
  {
    id: 'bear-crawl',
    name: 'Bear Crawl',
    description: 'Quadrupedal movement pattern',
    muscleGroups: ['fullBody'],
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    instructions: [
      'Start on hands and knees',
      'Lift knees slightly off ground',
      'Crawl forward moving opposite hand and foot',
      'Keep core tight and hips low'
    ],
    category: 'fullbody',
    primaryMuscle: 'fullBody',
    secondaryMuscles: [],
    movement: 'compound',
    progressions: {
      beginner: 'Knees on ground',
      intermediate: 'Standard bear crawl',
      advanced: 'Faster pace or longer distances'
    },
    alternatives: ['Mountain climbers', 'Plank walks'],
    injuryModifications: ['Knees down', 'Smaller movements'],
    formCues: ['Keep hips low', 'Opposite hand and foot'],
    commonMistakes: ['Hips too high', 'Moving same side limbs'],
    benefits: ['Full body coordination', 'Core stability']
  },
  {
    id: 'turkish-get-up',
    name: 'Turkish Get-up',
    description: 'Complex full-body movement',
    muscleGroups: ['fullBody'],
    equipment: ['dumbbells'],
    difficulty: 'advanced',
    instructions: [
      'Lie on back holding weight overhead',
      'Roll to elbow, then to hand',
      'Bridge up and step through',
      'Stand up while keeping weight overhead',
      'Reverse the movement to return'
    ],
    category: 'fullbody',
    primaryMuscle: 'fullBody',
    secondaryMuscles: [],
    movement: 'compound',
    progressions: {
      beginner: 'Practice movement without weight',
      intermediate: 'Light weight',
      advanced: 'Heavier weight or faster tempo'
    },
    alternatives: ['Get-up progressions', 'Overhead carries'],
    injuryModifications: ['Practice individual components', 'No weight'],
    formCues: ['Keep eyes on weight', 'Move slowly'],
    commonMistakes: ['Rushing the movement', 'Losing weight overhead'],
    benefits: ['Total body strength', 'Movement coordination']
  },

  // POWER AND PLYOMETRIC EXERCISES
  {
    id: 'jump-squats',
    name: 'Jump Squats',
    description: 'Explosive squat variation',
    muscleGroups: ['legs', 'glutes'],
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    instructions: [
      'Start in squat position',
      'Jump up explosively',
      'Land softly back in squat',
      'Immediately repeat'
    ],
    category: 'legs',
    primaryMuscle: 'legs',
    secondaryMuscles: ['glutes'],
    movement: 'compound',
    progressions: {
      beginner: 'Small jumps',
      intermediate: 'Standard jump squats',
      advanced: 'Higher jumps or weighted'
    },
    alternatives: ['Regular squats', 'Box jumps'],
    injuryModifications: ['Remove jump', 'Smaller range'],
    formCues: ['Land softly', 'Use arms for momentum'],
    commonMistakes: ['Hard landings', 'Knees caving'],
    benefits: ['Explosive power', 'Athletic performance']
  },
  {
    id: 'box-jumps',
    name: 'Box Jumps',
    description: 'Vertical jump onto elevated surface',
    muscleGroups: ['legs', 'glutes'],
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    instructions: [
      'Stand facing box or platform',
      'Jump up onto box landing softly',
      'Stand fully on box',
      'Step down carefully'
    ],
    category: 'legs',
    primaryMuscle: 'legs',
    secondaryMuscles: ['glutes'],
    movement: 'compound',
    progressions: {
      beginner: 'Low box',
      intermediate: 'Medium height box',
      advanced: 'Higher box or weighted'
    },
    alternatives: ['Jump squats', 'Step-ups'],
    injuryModifications: ['Lower box', 'Step-ups instead'],
    formCues: ['Land softly', 'Use arms for momentum'],
    commonMistakes: ['Landing with straight legs', 'Jumping down'],
    benefits: ['Vertical power', 'Athletic coordination']
  }
]

// Utility functions
export const getExercisesByMuscleGroup = (muscleGroup: MuscleGroup): ComprehensiveExercise[] => {
  return COMPREHENSIVE_EXERCISE_DATABASE.filter(exercise => 
    exercise.muscleGroups.includes(muscleGroup)
  )
}

export const getExercisesByDifficulty = (difficulty: 'beginner' | 'intermediate' | 'advanced'): ComprehensiveExercise[] => {
  return COMPREHENSIVE_EXERCISE_DATABASE.filter(exercise => 
    exercise.difficulty === difficulty
  )
}

export const getExercisesByEquipment = (equipment: Equipment): ComprehensiveExercise[] => {
  return COMPREHENSIVE_EXERCISE_DATABASE.filter(exercise => 
    exercise.equipment.includes(equipment)
  )
}