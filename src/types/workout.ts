export interface Exercise {
  id: string
  name: string
  description: string
  muscleGroups: MuscleGroup[]
  equipment: Equipment[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  instructions: string[]
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
  weight?: number // in kg
  notes?: string
}

export interface WorkoutPlan {
  id: string
  name: string
  description: string
  duration: number // in weeks
  workouts: Workout[]
  targetMuscleGroups: MuscleGroup[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  createdAt: Date
  updatedAt: Date
}

export interface WorkoutLog {
  id: string
  userId: string
  workoutId: string
  date: Date
  exercises: WorkoutLogExercise[]
  duration: number // in minutes
  notes?: string
  rating?: number // 1-5
  completed: boolean
}

export interface WorkoutLogExercise {
  exerciseId: string
  sets: WorkoutLogSet[]
  notes?: string
}

export interface WorkoutLogSet {
  reps: number
  weight: number // in kg
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
  | 'core'
  | 'fullBody'

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'kettlebell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'resistanceBand'
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