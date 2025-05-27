// Utility to check if a user profile is complete
export function isProfileComplete(user: any): boolean {
  if (!user) return false;
  // Test user always passes
  if (user.email === 'nepacreativeagency@icloud.com') return true;
  const profile = user.profile || user;
  return (
    !!profile.name &&
    !!profile.email &&
    typeof profile.height === 'number' && profile.height > 0 &&
    typeof profile.weight === 'number' && profile.weight > 0 &&
    typeof profile.age === 'number' && profile.age > 0 &&
    ['male','female','other'].includes(profile.gender) &&
    Array.isArray(profile.fitnessGoals) && profile.fitnessGoals.length > 0 &&
    ['sedentary','light','moderate','active','very_active'].includes(profile.activityLevel) &&
    Array.isArray(profile.dietaryPreferences) &&
    profile.notifications && typeof profile.notifications.email === 'boolean' && typeof profile.notifications.telegram === 'boolean'
  );
} 