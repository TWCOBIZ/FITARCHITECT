/**
 * Test User Utility Functions
 * 
 * Centralized logic for identifying test users with full privileges
 * throughout the FitArchitect application.
 */

export const TEST_USER_EMAILS = [
  'nepacreativeagency@icloud.com',
  'test@fitarchitect.com'
] as const;

/**
 * Check if a user email belongs to a test account with full privileges
 * @param email - User email to check
 * @returns true if user is a test account, false otherwise
 */
export const isTestUser = (email: string | undefined | null): boolean => {
  if (!email) return false;
  return TEST_USER_EMAILS.includes(email as any);
};

/**
 * Check if a user object belongs to a test account
 * @param user - User object with email property
 * @returns true if user is a test account, false otherwise
 */
export const isTestUserObject = (user: { email?: string } | null | undefined): boolean => {
  return isTestUser(user?.email);
};