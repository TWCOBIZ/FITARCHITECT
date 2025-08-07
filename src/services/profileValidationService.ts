import { UserProfile } from '../types/user'

export interface ProfileCompletenessResult {
  isComplete: boolean
  completionPercentage: number
  missingFields: string[]
  missingCriticalFields: string[]
  categories: {
    basic: ProfileCategoryResult
    fitness: ProfileCategoryResult
    nutrition: ProfileCategoryResult
    preferences: ProfileCategoryResult
  }
}

export interface ProfileCategoryResult {
  isComplete: boolean
  completionPercentage: number
  missingFields: string[]
  requiredFields: string[]
}

export interface ValidationRule {
  field: keyof UserProfile
  required: boolean
  category: 'basic' | 'fitness' | 'nutrition' | 'preferences'
  displayName: string
  validator?: (value: any) => boolean
}

// Define validation rules for all profile fields
const VALIDATION_RULES: ValidationRule[] = [
  // Basic information (critical for most calculations)
  { field: 'firstName', required: true, category: 'basic', displayName: 'First Name' },
  { field: 'lastName', required: true, category: 'basic', displayName: 'Last Name' },
  { field: 'email', required: true, category: 'basic', displayName: 'Email' },
  { field: 'dateOfBirth', required: true, category: 'basic', displayName: 'Date of Birth' },
  { field: 'gender', required: true, category: 'basic', displayName: 'Gender' },
  { field: 'height', required: true, category: 'basic', displayName: 'Height', validator: (v) => v > 0 },
  { field: 'weight', required: true, category: 'basic', displayName: 'Weight', validator: (v) => v > 0 },

  // Fitness information (critical for workout generation)
  { field: 'fitnessGoals', required: true, category: 'fitness', displayName: 'Fitness Goals', validator: (v) => Array.isArray(v) && v.length > 0 },
  { field: 'activityLevel', required: true, category: 'fitness', displayName: 'Activity Level' },
  { field: 'equipmentAvailability', required: true, category: 'fitness', displayName: 'Available Equipment', validator: (v) => Array.isArray(v) && v.length > 0 },
  { field: 'preferredWorkoutDuration', required: true, category: 'fitness', displayName: 'Preferred Workout Duration' },
  { field: 'daysPerWeek', required: false, category: 'fitness', displayName: 'Workout Days Per Week' },

  // Nutrition information (important for meal planning)
  { field: 'dietaryPreferences', required: false, category: 'nutrition', displayName: 'Dietary Preferences' },

  // Preferences and optional fields
  { field: 'profilePicture', required: false, category: 'preferences', displayName: 'Profile Picture' },
  { field: 'timezone', required: false, category: 'preferences', displayName: 'Timezone' },
  { field: 'notificationPreferences', required: false, category: 'preferences', displayName: 'Notification Preferences' }
]

/**
 * Validate a profile field according to its rules
 */
function validateField(profile: UserProfile | null | undefined, rule: ValidationRule): boolean {
  if (!profile) return false
  
  const value = profile[rule.field]
  
  // Check if field exists and is not null/undefined/empty
  if (value === null || value === undefined || value === '') {
    return false
  }
  
  // Apply custom validator if provided
  if (rule.validator) {
    return rule.validator(value)
  }
  
  return true
}

/**
 * Analyze profile completeness by category
 */
function analyzeCategory(profile: UserProfile | null | undefined, category: string): ProfileCategoryResult {
  const categoryRules = VALIDATION_RULES.filter(rule => rule.category === category)
  const requiredRules = categoryRules.filter(rule => rule.required)
  
  const missingFields: string[] = []
  const requiredFields = requiredRules.map(rule => rule.displayName)
  
  // Check all fields in category (required and optional)
  categoryRules.forEach(rule => {
    if (!validateField(profile, rule)) {
      missingFields.push(rule.displayName)
    }
  })
  
  // Calculate completion percentage based on all fields in category
  const completionPercentage = categoryRules.length > 0 
    ? Math.round(((categoryRules.length - missingFields.length) / categoryRules.length) * 100)
    : 100
  
  // Category is complete if all required fields are present
  const isComplete = requiredRules.every(rule => validateField(profile, rule))
  
  return {
    isComplete,
    completionPercentage,
    missingFields,
    requiredFields
  }
}

/**
 * Comprehensive profile completeness analysis
 */
export function analyzeProfileCompleteness(profile: UserProfile | null | undefined): ProfileCompletenessResult {
  const categories = {
    basic: analyzeCategory(profile, 'basic'),
    fitness: analyzeCategory(profile, 'fitness'),
    nutrition: analyzeCategory(profile, 'nutrition'),
    preferences: analyzeCategory(profile, 'preferences')
  }
  
  // Collect all missing fields
  const allMissingFields = Object.values(categories).flatMap(cat => cat.missingFields)
  
  // Critical fields are required fields from basic and fitness categories
  const criticalRules = VALIDATION_RULES.filter(rule => 
    rule.required && (rule.category === 'basic' || rule.category === 'fitness')
  )
  const missingCriticalFields = criticalRules
    .filter(rule => !validateField(profile, rule))
    .map(rule => rule.displayName)
  
  // Overall completion percentage (weighted by importance)
  const basicWeight = 0.4
  const fitnessWeight = 0.4
  const nutritionWeight = 0.15
  const preferencesWeight = 0.05
  
  const overallCompletion = Math.round(
    categories.basic.completionPercentage * basicWeight +
    categories.fitness.completionPercentage * fitnessWeight +
    categories.nutrition.completionPercentage * nutritionWeight +
    categories.preferences.completionPercentage * preferencesWeight
  )
  
  // Profile is considered complete if all critical categories are complete
  const isComplete = categories.basic.isComplete && categories.fitness.isComplete
  
  return {
    isComplete,
    completionPercentage: overallCompletion,
    missingFields: allMissingFields,
    missingCriticalFields,
    categories
  }
}

/**
 * Check if profile has sufficient data for specific features
 */
export function canUseFeature(profile: UserProfile | null | undefined, feature: string): boolean {
  const analysis = analyzeProfileCompleteness(profile)
  
  switch (feature) {
    case 'workout-generation':
      return analysis.categories.basic.isComplete && analysis.categories.fitness.isComplete
    
    case 'nutrition-calculation':
      // Requires basic info for BMR/TDEE calculation
      return validateField(profile, { field: 'height', required: true, category: 'basic', displayName: 'Height' }) &&
             validateField(profile, { field: 'weight', required: true, category: 'basic', displayName: 'Weight' }) &&
             validateField(profile, { field: 'dateOfBirth', required: true, category: 'basic', displayName: 'Date of Birth' }) &&
             validateField(profile, { field: 'gender', required: true, category: 'basic', displayName: 'Gender' })
    
    case 'meal-planning':
      // Can work with partial profile but works better with more data
      return true // Always allow but show warnings for missing data
    
    case 'analytics':
      // Requires some basic data for meaningful analytics
      return analysis.completionPercentage >= 50
    
    default:
      return analysis.isComplete
  }
}

/**
 * Get recommendations for improving profile completeness
 */
export function getProfileRecommendations(profile: UserProfile | null | undefined): string[] {
  const analysis = analyzeProfileCompleteness(profile)
  const recommendations: string[] = []
  
  if (!analysis.categories.basic.isComplete) {
    recommendations.push('Complete your basic information for personalized calorie and macro calculations')
  }
  
  if (!analysis.categories.fitness.isComplete) {
    recommendations.push('Add your fitness goals and available equipment for better workout recommendations')
  }
  
  if (analysis.categories.nutrition.missingFields.includes('Dietary Preferences')) {
    recommendations.push('Set your dietary preferences for more suitable meal plans')
  }
  
  if (analysis.completionPercentage < 80) {
    recommendations.push('Complete your profile to unlock all personalized features')
  }
  
  return recommendations
}

/**
 * Legacy compatibility function
 */
export function isProfileComplete(user: any): boolean {
  const profile = user?.profile || user
  const analysis = analyzeProfileCompleteness(profile)
  return analysis.isComplete
}