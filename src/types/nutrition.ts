export interface FoodEntry {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  servingSize: string
  servingUnit: string
  barcode?: string
  dietaryRestrictions?: string[]
  allergens?: string[]
  ingredients?: string[]
  // Additional properties used in services
  fiber?: number
  sugars?: number
  sodium?: number
  brand?: string
  date?: string
  mealType?: string
  quantity?: number
  imageUrl?: string
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

export interface MealPlan {
  name: string
  meals: Meal[]
}

export interface NutritionPreferences {
  dietaryRestrictions: string[]
  allergies: string[]
  favoriteFoods: string[]
} 