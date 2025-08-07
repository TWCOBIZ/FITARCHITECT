import { isTestUser } from './testUsers';
import { 
  analyzeProfileCompleteness, 
  canUseFeature, 
  getProfileRecommendations,
  ProfileCompletenessResult 
} from '../services/profileValidationService';

// Legacy utility to check if a user profile is complete
// Now uses the centralized profile validation service
export function isProfileComplete(user: any): boolean {
  if (!user) {
    return false;
  }
  
  // Test user always passes
  if (isTestUser(user.email)) {
    return true;
  }
  
  // Use centralized profile validation service
  const profile = user.profile || user;
  const analysis = analyzeProfileCompleteness(profile);
  
  return analysis.isComplete;
}

// Enhanced profile analysis functions
export function getProfileAnalysis(user: any): ProfileCompletenessResult {
  const profile = user?.profile || user;
  return analyzeProfileCompleteness(profile);
}

export function canUserAccessFeature(user: any, feature: string): boolean {
  // Test users get full access
  if (user?.email && isTestUser(user.email)) {
    return true;
  }
  
  const profile = user?.profile || user;
  return canUseFeature(profile, feature);
}

export function getUserProfileRecommendations(user: any): string[] {
  const profile = user?.profile || user;
  return getProfileRecommendations(profile);
} 