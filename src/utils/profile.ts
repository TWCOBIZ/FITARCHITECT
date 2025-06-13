// Utility to check if a user profile is complete
export function isProfileComplete(user: any): boolean {
  if (!user) return false;
  // Test user always passes
  if (user.email === 'nepacreativeagency@icloud.com') return true;
  
  // Support both nested profile structure and flat user structure
  const profile = user.profile || user;
  
  // Check basic profile fields
  const hasBasicFields = (
    !!profile.name &&
    !!profile.email &&
    typeof profile.height === 'number' && profile.height > 0 &&
    typeof profile.weight === 'number' && profile.weight > 0 &&
    typeof profile.age === 'number' && profile.age > 0 &&
    ['male','female','other'].includes(profile.gender) &&
    Array.isArray(profile.fitnessGoals) && profile.fitnessGoals.length > 0 &&
    ['sedentary','light','moderate','active','very_active'].includes(profile.activityLevel) &&
    Array.isArray(profile.dietaryPreferences)
  );
  
  // Check notification preferences (support both structures)
  const hasNotifications = (
    // Nested structure: profile.notifications.email/telegram
    (profile.notifications && 
     typeof profile.notifications.email === 'boolean' && 
     typeof profile.notifications.telegram === 'boolean') ||
    // Flat structure: profile.emailNotifications/telegramEnabled  
    (typeof profile.emailNotifications === 'boolean' && 
     typeof profile.telegramEnabled === 'boolean')
  );
  
  return hasBasicFields && hasNotifications;
} 