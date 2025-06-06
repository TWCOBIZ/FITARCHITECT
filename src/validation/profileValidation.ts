import { z } from 'zod';
import { ProfileUpdate } from '../types/user';

export const BasicProfileSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().int().min(10).max(120),
  gender: z.enum(['male', 'female', 'other']),
  height: z.number().min(50).max(250),
  weight: z.number().min(20).max(300),
});

export const FitnessProfileSchema = z.object({
  fitnessGoals: z.string().min(1),
  availableEquipment: z.array(z.string()),
  workoutFrequency: z.number().min(1).max(14),
  sessionDuration: z.number().min(10).max(180),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']),
});

export const NutritionProfileSchema = z.object({
  calorieGoal: z.number().min(800).max(6000),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very active']),
  dietaryPreferences: z.array(z.string()),
  allergies: z.array(z.string()),
});

export const ParqProfileSchema = z.object({
  healthConditions: z.array(z.string()),
  medications: z.array(z.string()),
  physicalLimitations: z.array(z.string()),
  parqCleared: z.boolean(),
});

export const SubscriptionProfileSchema = z.object({
  subscriptionTier: z.enum(['free', 'premium', 'pro']),
});

export const ProfileUpdateSchema = BasicProfileSchema.merge(FitnessProfileSchema)
  .merge(NutritionProfileSchema)
  .merge(ParqProfileSchema)
  .merge(SubscriptionProfileSchema);

export function validateProfile(update: ProfileUpdate) {
  const result = ProfileUpdateSchema.safeParse(update);
  if (result.success) {
    return { isValid: true, errors: null };
  } else {
    const errors: Record<string, string> = {};
    result.error.errors.forEach(e => {
      if (e.path.length) errors[e.path.join('.')] = e.message;
    });
    return { isValid: false, errors };
  }
} 