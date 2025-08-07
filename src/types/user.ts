export interface UserProfile {
  id: string
  email: string
  name: string
  firstName?: string
  lastName?: string
  dateOfBirth?: Date
  gender: string
  height?: number // in inches
  weight?: number // in lbs
  age?: number
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced'
  fitnessGoals: string[]
  goals?: string[]
  activityLevel: string
  dietaryPreferences: string[]
  availableEquipment?: string[]
  equipmentAvailability: string[]
  preferredWorkoutDuration?: string | number // in minutes
  daysPerWeek?: number
  medicalConditions?: string[]
  injuries?: string[]
  createdAt: Date
  updatedAt: Date
  parqAnswers?: any
  parqCompleted: boolean
  subscriptionStatus?: string
  tier?: string
  isAdmin?: boolean
  type?: string
  trialEndDate?: Date | string
  freeWorkoutTrialUsed?: boolean
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  notifications: {
    workoutReminders: boolean
    progressUpdates: boolean
    achievementAlerts: boolean
  }
  units: {
    weight: 'lbs' // Default to imperial
    height: 'inches' // Default to imperial 
    distance: 'mi' // Default to imperial
  }
}

export interface User {
  id: string
  email: string
  name?: string
  profile: UserProfile
  preferences: UserPreferences
  subscription?: {
    plan: string
    status: 'active' | 'cancelled' | 'expired'
    startDate: Date
    endDate: Date
  }
  subscriptionStatus?: 'active' | 'cancelled' | 'expired'
  parqCompleted: boolean
  createdAt: Date
  updatedAt: Date
  type?: 'guest' | 'registered'
  isGuest?: boolean
  tier?: string
  isAdmin?: boolean
  active?: boolean
  trialEndDate?: Date | string
  freeWorkoutTrialUsed?: boolean
  // Additional fields accessed in components
  fitnessGoals?: string[]
  activityLevel?: string
  equipmentAvailability?: string[]
  dietaryPreferences?: string[]
  daysPerWeek?: number
  preferredWorkoutDuration?: number
  age?: number
  gender?: string
  height?: number
  weight?: number
} 