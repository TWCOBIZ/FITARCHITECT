export interface NutritionProfile {
  calorieGoal: number;
  dietaryPreferences: string[];
  allergies: string[];
  macroTargets: {
    protein: number;
    carbs: number;
    fat: number;
  };
}

// Canonical UserProfile type for the entire app
export interface UserProfile {
  id: string // DB: id
  email: string // DB: email
  firstName: string // DB: name (split if needed)
  lastName: string // DB: name (split if needed)
  dateOfBirth: Date // DB: (not present, can be derived from age if needed)
  gender: 'male' | 'female' | 'other' // DB: gender
  height: number // in cm (DB: height, may be in inches)
  weight: number // in kg (DB: weight, may be in lbs)
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced' // DB: experienceLevel
  goals: string[] // DB: fitnessGoals
  availableEquipment: string[] // DB: equipmentPreferences
  preferredWorkoutDuration: number // in minutes (DB: preferredWorkoutDuration)
  daysPerWeek: number // DB: daysPerWeek
  parqAnswers?: Record<number, boolean> // DB: parqAnswers
  nutritionProfile?: NutritionProfile // DB: nutritionProfile
  activityLevel?: string // DB: activityLevel
  dietaryPreferences?: string[] // DB: dietaryPreferences
  notifications?: {
    email: boolean
    telegram: boolean
    telegramChatId?: string
  } // DB: emailNotifications, telegramEnabled, telegramChatId
  createdAt?: Date // DB: createdAt
  updatedAt?: Date // DB: updatedAt
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

export interface Profile {
  // Basic
  name: string;
  email: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  height: number;
  weight: number;
  // Fitness
  fitnessGoals: string;
  availableEquipment: string[];
  workoutFrequency: number;
  sessionDuration: number;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  // Nutrition
  calorieGoal: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very active';
  dietaryPreferences: string[];
  allergies: string[];
  // PAR-Q/Health
  healthConditions: string[];
  medications: string[];
  physicalLimitations: string[];
  parqCleared: boolean;
  // Subscription
  subscriptionTier: 'free' | 'premium' | 'pro';
}

export type ProfileUpdate = Partial<Profile>; 