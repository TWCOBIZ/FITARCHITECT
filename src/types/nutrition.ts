export interface FoodEntry {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  servingSize: string
  servingUnit: string
  imageUrl?: string
  description?: string
  barcode?: string
  dietaryRestrictions?: string[]
  allergens?: string[]
  ingredients?: string[]
  nutritionFacts?: {
    fiber?: number
    sugar?: number
    sodium?: number
    cholesterol?: number
    vitamins?: Record<string, number>
    minerals?: Record<string, number>
  }
}

export interface DailyLog {
  date: Date
  calories: number
  calorieGoal: number
  protein: number
  proteinGoal: number
  carbs: number
  carbsGoal: number
  fat: number
  fatGoal: number
  entries: FoodEntry[]
}

export interface Meal {
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  items: FoodEntry[]
}

export interface MealPlanDay {
  date: string
  meals: Meal[]
}

export type MealPlan = MealPlanDay[]

export interface NutritionPreferences {
  dietaryRestrictions: string[]
  allergies: string[]
  favoriteFoods: string[]
} 