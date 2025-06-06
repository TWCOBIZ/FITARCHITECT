const fs = require('fs');

const legacy = JSON.parse(fs.readFileSync('user_profiles_backup.json', 'utf-8'));

const transformed = legacy.map(u => {
  return {
    user: {
      id: u.id,
      email: u.email,
      password: u.password, // If hashed, keep as is
      createdAt: u.createdat || u.created_at || new Date(),
      updatedAt: u.updatedat || u.updated_at || new Date(),
    },
    profile: {
      userId: u.id,
      name: u.name,
      age: u.age,
      gender: u.gender,
      height: Math.round(u.height),
      weight: Math.round(u.weight),
      fitnessGoals: (Array.isArray(u.fitnessgoals) ? u.fitnessgoals[0] : u.fitnessgoals) || '',
      availableEquipment: u.equipmentpreferences || [],
      workoutFrequency: u.daysperweek || 3,
      sessionDuration: u.preferredworkoutduration || 45,
      experienceLevel: u.experiencelevel || 'beginner',
      calorieGoal: u.nutritionprofile?.calorieGoal || 2000,
      activityLevel: u.activitylevel || 'moderate',
      dietaryPreferences: u.dietarypreferences || [],
      allergies: u.nutritionprofile?.allergies || [],
      healthConditions: u.medicalconditions || [],
      medications: u.medications || [],
      physicalLimitations: u.physicallimitations || [],
      parqCleared: u.parqcompleted || false,
      subscriptionTier: u.tier || 'free',
      createdAt: u.createdat || u.created_at || new Date(),
      updatedAt: u.updatedat || u.updated_at || new Date(),
    }
  }
});

fs.writeFileSync('user_profiles_transformed.json', JSON.stringify(transformed, null, 2));
console.log('Transformed user profiles written to user_profiles_transformed.json'); 