export enum ExerciseType {
  WARMUP = 'warmup',
  STRENGTH = 'strength', 
  CARDIO = 'cardio',
  COOLDOWN = 'cooldown',
  FLEXIBILITY = 'flexibility',
  MOBILITY = 'mobility'
}

export interface Exercise {
  id: string
  name: string
  description: string
  muscleGroups: MuscleGroup[]
  muscles?: number[] // For WGER compatibility
  equipment: Equipment[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  instructions: string[]
  type?: ExerciseType // Exercise categorization for workout structure
  videoUrl?: string
  imageUrl?: string
}

export interface Workout {
  id: string
  name: string
  description: string
  type: WorkoutType
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  duration: number // in minutes
  exercises: WorkoutExercise[]
  targetMuscleGroups: MuscleGroup[]
  equipment: Equipment[]
  caloriesBurned?: number
  createdAt: Date
  updatedAt: Date
}

export interface WorkoutExercise {
  exercise: Exercise
  sets: number
  reps: number
  restTime: number // in seconds
  weight?: number // in lbs
  notes?: string
}

// Workout structure breakdown for enforcing proper workout format
export interface WorkoutStructure {
  warmup: {
    duration: number // in minutes
    exercises: WorkoutExercise[]
    targetDuration: number // ideal duration range
  }
  main: {
    duration: number // in minutes  
    exercises: WorkoutExercise[]
    targetDuration: number // ideal duration range
  }
  cooldown: {
    duration: number // in minutes
    exercises: WorkoutExercise[]
    targetDuration: number // ideal duration range
  }
  totalDuration: number // calculated total
}

export interface WeekStructure {
  weekNumber: number
  days: DayStructure[]
}

export interface DayStructure {
  dayNumber: number
  exercises: WorkoutExercise[]
  name?: string
  description?: string
  type?: WorkoutType
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  duration?: number // in minutes
  targetMuscleGroups?: MuscleGroup[]
  equipment?: Equipment[]
  isCompleted?: boolean
  completedAt?: Date
  isRestDay?: boolean
  workoutId?: string // unique identifier for completion tracking
  rating?: number // 1-5 star rating if completed
  notes?: string // completion notes
}

// Workout completion status interface
export interface WorkoutCompletionStatus {
  completed: boolean
  completedAt?: string
  rating?: number
  notes?: string
  duration?: number // workout duration in minutes
}

// Individual workout completion data
export interface WorkoutCompletion {
  [workoutId: string]: WorkoutCompletionStatus
}

// Progress tracking data
export interface ProgressData {
  totalWorkouts: number
  completedCount: number
  weeklyProgress: { [weekNumber: string]: number }
  streaks: {
    current: number
    longest: number
  }
  lastCompletedWorkout?: string
}

// Enhanced workout plan progress
export interface WorkoutPlanProgress {
  planId: string
  planName: string
  totalWorkouts: number
  completedCount: number
  completionPercentage: number
  weeks: WeekProgress[]
  lastWorkoutCompleted?: Date
  isFullyCompleted: boolean
}

// Week progress tracking
export interface WeekProgress {
  weekNumber: number
  days: DayProgress[]
  weekCompletion: number
}

// Day progress tracking
export interface DayProgress {
  dayNumber: number
  name: string
  isRestDay: boolean
  isCompleted: boolean
  completedAt?: string
  rating?: number
  workoutId: string
}

export interface WorkoutPlan {
  id: string
  name: string
  description: string
  duration: number // duration in weeks
  weeks: WeekStructure[] // Primary structure - 3-week progressive program
  workouts?: Workout[] // Deprecated - kept for backward compatibility
  targetMuscleGroups: MuscleGroup[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedDuration?: number // estimated workout duration in minutes
  equipment?: Equipment[] // required equipment
  source?: string // generation source: 'wger', 'openai', 'exercisedb', 'manual'
  // New completion tracking fields
  completedWorkouts?: WorkoutCompletion
  lastWorkoutCompleted?: Date
  progressData?: ProgressData
  createdAt: Date
  updatedAt: Date
}

export interface WorkoutLog {
  id: string
  userId: string
  planId: string
  workoutId: string
  date: Date
  exercises: any[] // JSON field in database
  notes?: string
  completed?: boolean
  duration?: number // workout duration in minutes
  rating?: number // 1-5 star rating
  completionRate?: number // percentage of exercises completed
}

export interface WorkoutLogExercise {
  exerciseId: string
  sets: WorkoutLogSet[]
  notes?: string
}

export interface WorkoutLogSet {
  reps: number
  weight: number // in lbs
  completed: boolean
  notes?: string
}

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'legs'
  | 'glutes'
  | 'hamstrings'
  | 'calves'
  | 'core'
  | 'fullBody'

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'dumbbells'
  | 'kettlebell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'resistanceBand'
  | 'resistance bands'
  | 'pull-up bar'
  | 'medicineBall'
  | 'stabilityBall'
  | 'foamRoller'

export type WorkoutType =
  | 'strength'
  | 'cardio'
  | 'hiit'
  | 'flexibility'
  | 'recovery'
  | 'custom' 

// Utility functions for data structure conversion
export const workoutPlanUtils = {
  // Convert legacy workouts[] format to weeks[] format
  convertWorkoutsToWeeks: (workouts: Workout[], duration: number = 3): WeekStructure[] => {
    const weeks: WeekStructure[] = []
    const workoutsPerWeek = Math.ceil(workouts.length / duration)
    
    for (let weekNum = 1; weekNum <= duration; weekNum++) {
      const weekStartIndex = (weekNum - 1) * workoutsPerWeek
      const weekWorkouts = workouts.slice(weekStartIndex, weekStartIndex + workoutsPerWeek)
      
      const days: DayStructure[] = []
      weekWorkouts.forEach((workout, index) => {
        days.push({
          dayNumber: index + 1,
          name: workout.name,
          description: workout.description,
          type: workout.type,
          difficulty: workout.difficulty,
          duration: workout.duration,
          exercises: workout.exercises,
          targetMuscleGroups: workout.targetMuscleGroups,
          equipment: workout.equipment,
          isCompleted: false
        })
      })
      
      // Add rest days if needed (typical 3-4 workout days per week)
      while (days.length < 7) {
        days.push({
          dayNumber: days.length + 1,
          name: 'Rest Day',
          description: 'Recovery and rest',
          exercises: [],
          isRestDay: true,
          isCompleted: false
        })
      }
      
      weeks.push({
        weekNumber: weekNum,
        days
      })
    }
    
    return weeks
  },

  // Convert weeks[] format to legacy workouts[] format
  convertWeeksToWorkouts: (weeks: WeekStructure[]): Workout[] => {
    const workouts: Workout[] = []
    
    weeks.forEach(week => {
      week.days.forEach(day => {
        if (!day.isRestDay && day.exercises && day.exercises.length > 0) {
          workouts.push({
            id: `week-${week.weekNumber}-day-${day.dayNumber}`,
            name: day.name || `Week ${week.weekNumber}, Day ${day.dayNumber}`,
            description: day.description || 'Workout session',
            type: day.type || 'strength',
            difficulty: day.difficulty || 'beginner',
            duration: day.duration || 45,
            exercises: day.exercises,
            targetMuscleGroups: day.targetMuscleGroups || [],
            equipment: day.equipment || [],
            caloriesBurned: 200,
            createdAt: new Date(),
            updatedAt: new Date()
          })
        }
      })
    })
    
    return workouts
  },

  // Ensure a plan has the weeks structure
  ensureWeeksStructure: (plan: WorkoutPlan): WorkoutPlan => {
    if (plan.weeks && plan.weeks.length > 0) {
      return plan // Already has weeks structure
    }
    
    if (plan.workouts && plan.workouts.length > 0) {
      // Convert workouts to weeks
      return {
        ...plan,
        weeks: workoutPlanUtils.convertWorkoutsToWeeks(plan.workouts, plan.duration),
        workouts: plan.workouts // Keep for backward compatibility
      }
    }
    
    return plan
  }
}