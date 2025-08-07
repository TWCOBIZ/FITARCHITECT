import type { Exercise, MuscleGroup, Equipment } from './workout'

// WGER API Response Types
export interface WgerExercise {
  id: number
  uuid?: string
  name: string
  description: string
  muscles: number[]
  muscles_secondary: number[]
  equipment: number[]
  category: number
  instructions: string[]
  variations?: number[]
  comments?: string[]
}

export interface WgerMuscle {
  id: number
  name: string
  name_en: string
  is_front: boolean
}

export interface WgerEquipment {
  id: number
  name: string
}

export interface WgerCategory {
  id: number
  name: string
}

// Search and filtering types
export interface ExerciseSearchResult {
  exercises: Exercise[]
  total: number
  page: number
  hasMore: boolean
}

export interface WgerExerciseFilters {
  muscle?: number[]
  equipment?: number[]
  category?: number
  language?: string
  limit?: number
  offset?: number
  search?: string
}

// WGER API Response wrapper
export interface WgerApiResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}