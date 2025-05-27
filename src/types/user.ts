export interface UserProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  dateOfBirth: Date
  gender: 'male' | 'female' | 'other'
  height: number // in cm
  weight: number // in kg
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced'
  goals: string[]
  availableEquipment: string[]
  preferredWorkoutDuration: number // in minutes
  daysPerWeek: number
  medicalConditions?: string[]
  injuries?: string[]
  createdAt: Date
  updatedAt: Date
  parqAnswers?: Record<number, boolean>
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  notifications: {
    workoutReminders: boolean
    progressUpdates: boolean
    achievementAlerts: boolean
  }
  units: {
    weight: 'kg' | 'lbs'
    height: 'cm' | 'ft' | 'inches'
    distance: 'km' | 'mi'
  }
}

export interface User {
  id: string
  email: string
  profile: UserProfile
  preferences: UserPreferences
  subscription?: {
    plan: string
    status: 'active' | 'cancelled' | 'expired'
    startDate: Date
    endDate: Date
  }
  parqCompleted: boolean
  createdAt: Date
  updatedAt: Date
  type?: 'guest' | 'registered'
  isGuest?: boolean
} 