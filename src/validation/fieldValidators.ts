import { z } from 'zod';

export const nameValidator = z.string().min(1, 'Name is required');
export const emailValidator = z.string().email('Invalid email');
export const ageValidator = z.number().int().min(10).max(120);
export const genderValidator = z.enum(['male', 'female', 'other']);
export const heightValidator = z.number().min(50).max(250);
export const weightValidator = z.number().min(20).max(300);
export const fitnessGoalsValidator = z.string().min(1, 'Fitness goal required');
export const availableEquipmentValidator = z.array(z.string());
export const workoutFrequencyValidator = z.number().min(1).max(14);
export const sessionDurationValidator = z.number().min(10).max(180);
export const experienceLevelValidator = z.enum(['beginner', 'intermediate', 'advanced']);
export const calorieGoalValidator = z.number().min(800).max(6000);
export const activityLevelValidator = z.enum(['sedentary', 'light', 'moderate', 'active', 'very active']);
export const dietaryPreferencesValidator = z.array(z.string());
export const allergiesValidator = z.array(z.string());
export const healthConditionsValidator = z.array(z.string());
export const medicationsValidator = z.array(z.string());
export const physicalLimitationsValidator = z.array(z.string());
export const parqClearedValidator = z.boolean();
export const subscriptionTierValidator = z.enum(['free', 'premium', 'pro']);

export const fieldValidators: Record<string, z.ZodTypeAny> = {
  name: nameValidator,
  email: emailValidator,
  age: ageValidator,
  gender: genderValidator,
  height: heightValidator,
  weight: weightValidator,
  fitnessGoals: fitnessGoalsValidator,
  availableEquipment: availableEquipmentValidator,
  workoutFrequency: workoutFrequencyValidator,
  sessionDuration: sessionDurationValidator,
  experienceLevel: experienceLevelValidator,
  calorieGoal: calorieGoalValidator,
  activityLevel: activityLevelValidator,
  dietaryPreferences: dietaryPreferencesValidator,
  allergies: allergiesValidator,
  healthConditions: healthConditionsValidator,
  medications: medicationsValidator,
  physicalLimitations: physicalLimitationsValidator,
  parqCleared: parqClearedValidator,
  subscriptionTier: subscriptionTierValidator,
}; 