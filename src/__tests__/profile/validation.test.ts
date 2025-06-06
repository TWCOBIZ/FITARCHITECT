import { validateProfile } from '../../validation/profileValidation';

describe('profileValidation', () => {
  it('validates a correct profile update', () => {
    const valid = {
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      gender: 'male',
      height: 180,
      weight: 80,
      fitnessGoals: 'Lose weight',
      availableEquipment: ['dumbbells'],
      workoutFrequency: 3,
      sessionDuration: 45,
      experienceLevel: 'beginner',
      calorieGoal: 2000,
      activityLevel: 'moderate',
      dietaryPreferences: ['vegetarian'],
      allergies: [],
      healthConditions: [],
      medications: [],
      physicalLimitations: [],
      parqCleared: true,
      subscriptionTier: 'free',
    };
    const result = validateProfile(valid);
    expect(result.isValid).toBe(true);
    expect(result.errors).toBeNull();
  });

  it('returns errors for invalid profile update', () => {
    const invalid = {
      name: '',
      email: 'not-an-email',
      age: 5,
      gender: 'alien',
      height: 10,
      weight: 5,
      fitnessGoals: '',
      availableEquipment: [],
      workoutFrequency: 0,
      sessionDuration: 5,
      experienceLevel: 'expert',
      calorieGoal: 100,
      activityLevel: 'super-active',
      dietaryPreferences: [],
      allergies: [],
      healthConditions: [],
      medications: [],
      physicalLimitations: [],
      parqCleared: true,
      subscriptionTier: 'gold',
    };
    const result = validateProfile(invalid as any);
    expect(result.isValid).toBe(false);
    expect(result.errors).not.toBeNull();
  });
}); 