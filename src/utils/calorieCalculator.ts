import { UserProfile } from '../types/user'

export interface CalorieGoals {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface ActivityMultipliers {
  sedentary: number
  lightly_active: number
  moderately_active: number
  very_active: number
  extra_active: number
}

const ACTIVITY_MULTIPLIERS: ActivityMultipliers = {
  sedentary: 1.2,        // Little to no exercise
  lightly_active: 1.375, // Light exercise 1-3 days/week
  moderately_active: 1.55, // Moderate exercise 3-5 days/week
  very_active: 1.725,    // Hard exercise 6-7 days/week
  extra_active: 1.9      // Very hard exercise, physical job
}

/**
 * Calculate Basal Metabolic Rate (BMR) using Mifflin-St Jeor Equation
 * More accurate than Harris-Benedict for most people
 * Imperial version: weight in lbs, height in inches
 */
export function calculateBMR(
  weight: number, // lbs
  height: number, // inches
  age: number,    // years
  gender: 'male' | 'female' | 'other'
): number {
  // Convert imperial to metric for calculation
  const weightKg = weight * 0.453592 // lbs to kg
  const heightCm = height * 2.54     // inches to cm
  
  if (gender === 'male') {
    return (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5
  } else {
    // Use female formula for 'female' and 'other'
    return (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161
  }
}

/**
 * Calculate Total Daily Energy Expenditure (TDEE)
 */
export function calculateTDEE(bmr: number, activityLevel: string): number {
  const level = activityLevel.toLowerCase().replace(' ', '_') as keyof ActivityMultipliers
  const multiplier = ACTIVITY_MULTIPLIERS[level] || ACTIVITY_MULTIPLIERS.moderately_active
  return Math.round(bmr * multiplier)
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: Date): number {
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  return age
}

/**
 * Adjust calories based on fitness goals
 */
export function adjustCaloriesForGoals(tdee: number, goals: string[]): number {
  // Check for primary goal
  if (goals.includes('weight_loss') || goals.includes('fat_loss')) {
    return Math.round(tdee * 0.8) // 20% deficit
  } else if (goals.includes('muscle_gain') || goals.includes('bulk')) {
    return Math.round(tdee * 1.1) // 10% surplus
  } else if (goals.includes('strength') && goals.includes('muscle_gain')) {
    return Math.round(tdee * 1.15) // 15% surplus for strength + muscle
  }
  
  // Maintenance for general fitness, endurance, etc.
  return tdee
}

/**
 * Calculate macro distribution based on goals and body composition
 */
export function calculateMacros(calories: number, goals: string[], weight: number): {
  protein: number
  carbs: number
  fat: number
} {
  let proteinGramsPerLb = 0.73 // Default moderate protein (1.6g/kg converted to lbs)
  
  // Adjust protein based on goals
  if (goals.includes('muscle_gain') || goals.includes('strength')) {
    proteinGramsPerLb = 1.0 // Higher protein for muscle building (2.2g/kg converted)
  } else if (goals.includes('weight_loss')) {
    proteinGramsPerLb = 0.91 // Higher protein to preserve muscle during cut (2.0g/kg converted)
  } else if (goals.includes('endurance')) {
    proteinGramsPerLb = 0.64 // Moderate protein for endurance (1.4g/kg converted)
  }
  
  const protein = Math.round(weight * proteinGramsPerLb)
  const proteinCalories = protein * 4
  
  // Fat: 25-35% of calories (default 30%)
  let fatPercentage = 0.30
  if (goals.includes('weight_loss')) {
    fatPercentage = 0.25 // Lower fat for weight loss
  } else if (goals.includes('muscle_gain')) {
    fatPercentage = 0.25 // Lower fat, higher carbs for muscle gain
  }
  
  const fatCalories = calories * fatPercentage
  const fat = Math.round(fatCalories / 9)
  
  // Carbs: Fill remaining calories
  const remainingCalories = calories - proteinCalories - fatCalories
  const carbs = Math.round(remainingCalories / 4)
  
  return {
    protein,
    carbs: Math.max(carbs, 100), // Minimum 100g carbs
    fat
  }
}

/**
 * Main function to calculate comprehensive calorie and macro goals
 */
export function calculateNutritionGoals(profile: UserProfile): CalorieGoals {
  // Calculate age from date of birth
  const age = calculateAge(profile.dateOfBirth)
  
  // Calculate BMR
  const bmr = calculateBMR(profile.weight, profile.height, age, profile.gender)
  
  // Map fitness level to activity level
  const activityLevel = mapFitnessLevelToActivity(profile.fitnessLevel || 'intermediate', profile.daysPerWeek)
  
  // Calculate TDEE
  const tdee = calculateTDEE(bmr, activityLevel)
  
  // Adjust for goals
  const targetCalories = adjustCaloriesForGoals(tdee, profile.goals || [])
  
  // Calculate macros
  const macros = calculateMacros(targetCalories, profile.goals || [], profile.weight)
  
  return {
    calories: targetCalories,
    protein: macros.protein,
    carbs: macros.carbs,
    fat: macros.fat
  }
}

/**
 * Map fitness level and workout frequency to activity level
 */
function mapFitnessLevelToActivity(fitnessLevel: string, daysPerWeek: number): string {
  if (daysPerWeek >= 6) {
    return 'very_active'
  } else if (daysPerWeek >= 4) {
    return 'moderately_active'
  } else if (daysPerWeek >= 2) {
    return 'lightly_active'
  } else {
    return 'sedentary'
  }
}

/**
 * Get default nutrition goals for users without complete profiles
 */
/**
 * Check if user profile has sufficient data for personalized nutrition calculation
 */
export function isProfileCompleteForNutrition(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false
  
  // Required fields for nutrition calculation
  const requiredFields = [
    profile.weight,
    profile.height, 
    profile.dateOfBirth,
    profile.gender
  ]
  
  // Check if all required fields have valid values
  return requiredFields.every(field => field !== null && field !== undefined && field !== '')
}

export function getDefaultNutritionGoals(): CalorieGoals {
  return {
    calories: 2000,
    protein: 150,
    carbs: 250,
    fat: 65
  }
}

/**
 * Calculate accurate nutrition from food items with portion adjustments
 */
export function calculateAccurateNutrition(foodItems: any[]): {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
  sodium: number
} {
  return foodItems.reduce((total, item) => {
    // Parse serving size and calculate multiplier
    const servingMultiplier = calculateServingMultiplier(
      item.servingSize || '1',
      item.servingUnit || 'serving',
      item.actualAmount || 1,
      item.actualUnit || item.servingUnit || 'serving'
    );

    return {
      calories: total.calories + ((item.calories || 0) * servingMultiplier),
      protein: total.protein + ((item.protein || 0) * servingMultiplier),
      carbs: total.carbs + ((item.carbs || 0) * servingMultiplier),
      fat: total.fat + ((item.fat || 0) * servingMultiplier),
      fiber: total.fiber + ((item.fiber || 0) * servingMultiplier),
      sugar: total.sugar + ((item.sugar || 0) * servingMultiplier),
      sodium: total.sodium + ((item.sodium || 0) * servingMultiplier)
    };
  }, {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0
  });
}

/**
 * Calculate serving size multiplier for accurate nutrition
 */
export function calculateServingMultiplier(
  baseServingSize: string | number,
  baseServingUnit: string,
  actualAmount: number,
  actualUnit: string
): number {
  // If units match, simple ratio
  if (baseServingUnit === actualUnit) {
    const baseAmount = typeof baseServingSize === 'string' 
      ? parseFloat(baseServingSize) || 1 
      : baseServingSize;
    return actualAmount / baseAmount;
  }

  // Convert to common units for comparison
  const baseGrams = convertToGrams(
    typeof baseServingSize === 'string' ? parseFloat(baseServingSize) || 1 : baseServingSize,
    baseServingUnit
  );
  const actualGrams = convertToGrams(actualAmount, actualUnit);

  if (baseGrams > 0 && actualGrams > 0) {
    return actualGrams / baseGrams;
  }

  // Fallback to 1:1 ratio if conversion fails
  return 1;
}

/**
 * Convert various units to grams for standardized calculations
 */
export function convertToGrams(amount: number, unit: string): number {
  const unitConversions: { [key: string]: number } = {
    // Weight units
    'g': 1,
    'gram': 1,
    'grams': 1,
    'kg': 1000,
    'kilogram': 1000,
    'kilograms': 1000,
    'oz': 28.35,
    'ounce': 28.35,
    'ounces': 28.35,
    'lb': 453.59,
    'pound': 453.59,
    'pounds': 453.59,
    
    // Volume units (approximate for common foods)
    'ml': 1, // Assuming density ~1g/ml for liquids
    'milliliter': 1,
    'milliliters': 1,
    'l': 1000,
    'liter': 1000,
    'liters': 1000,
    'cup': 240, // Approximate for most foods
    'cups': 240,
    'tbsp': 15,
    'tablespoon': 15,
    'tablespoons': 15,
    'tsp': 5,
    'teaspoon': 5,
    'teaspoons': 5,
    'fl oz': 30,
    'fluid ounce': 30,
    'fluid ounces': 30,
    
    // Common serving sizes (estimates)
    'serving': 100, // Default serving ~100g
    'servings': 100,
    'piece': 50, // Medium piece ~50g
    'pieces': 50,
    'slice': 30, // Medium slice ~30g
    'slices': 30,
    'medium': 150, // Medium fruit/vegetable
    'large': 200,
    'small': 100,
    'whole': 150
  };

  const normalizedUnit = unit.toLowerCase().trim();
  const conversionFactor = unitConversions[normalizedUnit];
  
  if (conversionFactor !== undefined) {
    return amount * conversionFactor;
  }

  // If no conversion found, return original amount
  // This maintains some calculation rather than defaulting to 0
  return amount;
}

/**
 * Validate and normalize nutrition data
 */
export function validateNutritionData(nutrition: any): {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
  sodium: number
} {
  const safeNum = (value: any): number => {
    const num = parseFloat(value);
    return isNaN(num) || num < 0 ? 0 : Math.round(num * 100) / 100;
  };

  const validated = {
    calories: safeNum(nutrition.calories),
    protein: safeNum(nutrition.protein),
    carbs: safeNum(nutrition.carbs),
    fat: safeNum(nutrition.fat),
    fiber: safeNum(nutrition.fiber),
    sugar: safeNum(nutrition.sugar),
    sodium: safeNum(nutrition.sodium)
  };

  // Validate that macros don't exceed calories (common data error)
  const macroCalories = (validated.protein * 4) + (validated.carbs * 4) + (validated.fat * 9);
  if (macroCalories > validated.calories * 1.2) { // Allow 20% tolerance
    console.warn('Macro calories exceed total calories, data may be inaccurate');
  }

  return validated;
}

/**
 * Calculate nutrition density score (nutrients per calorie)
 */
export function calculateNutritionDensity(nutrition: any): number {
  const { calories, protein, fiber } = validateNutritionData(nutrition);
  
  if (calories <= 0) return 0;
  
  // Simple nutrition density score based on protein and fiber content
  const proteinScore = (protein * 4) / calories; // Protein calories as % of total
  const fiberScore = Math.min(fiber / 25, 1); // Fiber as % of daily value (25g)
  
  return Math.round((proteinScore + fiberScore) * 50); // Scale to 0-100
}