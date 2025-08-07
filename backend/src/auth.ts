import { Request, Response, NextFunction } from 'express';
import { prisma } from './db/prisma';
import jwt from 'jsonwebtoken';
import { logger } from './utils/logger';

const JWT_SECRET = process.env.JWT_SECRET!;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set and at least 32 characters long');
}

interface UserData {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  type: string;
  tier: string;
  subscriptionStatus: string;
  parqCompleted: boolean;
  parqAnswers?: any;
  height?: number | null;
  weight?: number | null;
  age?: number | null;
  gender?: string;
  fitnessGoals?: string[];
  activityLevel?: string;
  dietaryPreferences?: string[];
  emailNotifications?: boolean;
  telegramEnabled?: boolean;
  telegramChatId?: string | null;
  twoFactorEnabled?: boolean;
  notificationPreferences?: any;
  healthConditions?: string | null;
  injuryHistory?: string | null;
  equipmentAvailability?: string[];
  preferredWorkoutDuration?: number | null;
  avatar?: string | null;
  trialEndDate?: Date | null;
  freeWorkoutTrialStartDate?: Date | null;
  freeWorkoutTrialUsed?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthenticatedRequest extends Request {
  user?: UserData;
  admin?: UserData;
}

// Helper function to normalize equipment availability data
const normalizeEquipmentAvailability = (equipment: string[] | string | null | undefined): string[] => {
  if (!equipment) return [];
  if (Array.isArray(equipment)) return equipment;
  if (typeof equipment === 'string') {
    // Convert comma-separated string to array
    const result = equipment.split(',').map(item => item.trim()).filter(item => item.length > 0);
    return result.length > 0 ? result : [];
  }
  return [];
};

export interface UserPayload {
  userId: string;
  email: string;
  type?: 'guest' | 'registered';
  isAdmin?: boolean;
}

// Unified authentication middleware that handles both user and admin tokens
export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'development' && process.env.DEBUG_AUTH === 'true') {
    console.log('🔐 Authentication middleware called for:', req.method, req.url);
  }
  
  const auth = req.headers.authorization;
  
  if (!auth || !auth.startsWith('Bearer ')) {
    if (process.env.NODE_ENV === 'development' && process.env.DEBUG_AUTH === 'true') {
      console.log('❌ No valid authorization header:', auth ? 'Invalid format' : 'Missing header');
    }
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = auth.split(' ')[1];
  if (process.env.NODE_ENV === 'development' && process.env.DEBUG_AUTH === 'true') {
    console.log('🔐 Token received:', token ? `${token.substring(0, 10)}...` : 'None');
  }
  
  try {
    const payload = jwt.verify(token, JWT_SECRET) as UserPayload;
    
    // Find user in database
    const user = await prisma.userProfile.findUnique({ 
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        type: true,
        tier: true,
        subscriptionStatus: true,
        parqCompleted: true,
        parqAnswers: true,
        height: true,
        weight: true,
        age: true,
        gender: true,
        fitnessGoals: true,
        activityLevel: true,
        equipmentAvailability: true,
        preferredWorkoutDuration: true,
        dietaryPreferences: true,
        telegramEnabled: true,
        telegramChatId: true,
        twoFactorEnabled: true,
        avatar: true,
        trialEndDate: true,
        freeWorkoutTrialStartDate: true,
        freeWorkoutTrialUsed: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Normalize equipment availability data and add user to request object
    const normalizedUser: UserData = {
      ...user,
      equipmentAvailability: normalizeEquipmentAvailability(user.equipmentAvailability)
    };
    req.user = normalizedUser;
    
    // Also add admin flag for backward compatibility
    if (user.isAdmin) {
      req.admin = normalizedUser;
    }

    next();
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Auth middleware error:', error);
      console.error('Auth error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        token: token ? `${token.substring(0, 10)}...` : 'No token'
      });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Admin-only middleware that requires admin privileges
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  
  next();
};

// Guest-compatible middleware that allows guest users
export const authenticateOptional = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const auth = req.headers.authorization;
  
  // No token is fine for guest access
  if (!auth || !auth.startsWith('Bearer ')) {
    return next();
  }

  const token = auth.split(' ')[1];
  
  try {
    const payload = jwt.verify(token, JWT_SECRET) as UserPayload;
    
    const user = await prisma.userProfile.findUnique({ 
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        type: true,
        tier: true,
        subscriptionStatus: true,
        parqCompleted: true,
        parqAnswers: true,
        height: true,
        weight: true,
        age: true,
        gender: true,
        fitnessGoals: true,
        activityLevel: true,
        equipmentAvailability: true,
        preferredWorkoutDuration: true,
        dietaryPreferences: true,
        telegramEnabled: true,
        telegramChatId: true,
        twoFactorEnabled: true,
        avatar: true,
        trialEndDate: true,
        freeWorkoutTrialStartDate: true,
        freeWorkoutTrialUsed: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (user) {
      // Normalize equipment availability data
      const normalizedUser: UserData = {
        ...user,
        equipmentAvailability: normalizeEquipmentAvailability(user.equipmentAvailability)
      };
      req.user = normalizedUser;
      if (user.isAdmin) {
        req.admin = normalizedUser;
      }
    }
  } catch (error) {
    // Invalid token but we allow guest access
  }
  
  next();
};

// Validate subscription status helper
export const hasValidSubscription = (user: UserData | null, requiredTier: 'basic' | 'premium'): boolean => {
  if (!user) return false;
  
  const userTier = user.tier || 'free';
  const tierHierarchy = { free: 0, basic: 1, premium: 2 };
  const requiredLevel = tierHierarchy[requiredTier];
  const userLevel = tierHierarchy[userTier as keyof typeof tierHierarchy] || 0;
  
  // Check if user meets tier requirement
  if (userLevel >= requiredLevel) {
    // For paid subscriptions, check subscription status
    if (user.subscriptionStatus === 'active') return true;
  }
  
  // For guests with trials, check if trial is still valid
  if (user.type === 'guest' && user.trialEndDate) {
    const now = new Date();
    const trialEnd = new Date(user.trialEndDate);
    return trialEnd > now;
  }
  
  // For free users requesting basic or premium tier, check 3-day trial eligibility
  if ((requiredTier === 'basic' || requiredTier === 'premium') && userTier === 'free') {
    // Check if user has completed PAR-Q (required for trial)
    if (!user.parqCompleted) return false;
    
    // Check if trial is active
    if (user.trialEndDate) {
      const now = new Date();
      const trialEnd = new Date(user.trialEndDate);
      return trialEnd > now;
    }
    
    // Check if trial hasn't been used yet
    if (!user.freeWorkoutTrialUsed) {
      return true; // Eligible for trial activation
    }
  }
  
  return false;
};

// Activate 3-day premium trial for free users after PAR-Q completion
export const activateFreeWorkoutTrial = async (userId: string): Promise<boolean> => {
  try {
    const user = await prisma.userProfile.findUnique({
      where: { id: userId },
      select: { 
        tier: true, 
        parqCompleted: true, 
        freeWorkoutTrialUsed: true,
        trialEndDate: true
      }
    });

    if (!user) return false;
    
    // Only activate for free users who completed PAR-Q and haven't used trial
    if (user.tier !== 'free' || !user.parqCompleted || user.freeWorkoutTrialUsed) {
      return false;
    }

    // Check if trial is already active
    if (user.trialEndDate) {
      const now = new Date();
      const trialEnd = new Date(user.trialEndDate);
      if (trialEnd > now) {
        return true; // Trial already active
      }
    }

    // Activate 3-day trial
    const trialStartDate = new Date();
    const trialEndDate = new Date(trialStartDate.getTime() + (3 * 24 * 60 * 60 * 1000)); // 3 days

    await prisma.userProfile.update({
      where: { id: userId },
      data: {
        freeWorkoutTrialStartDate: trialStartDate,
        trialEndDate: trialEndDate,
        freeWorkoutTrialUsed: true
      }
    });

    console.log(`Activated 3-day trial for user ${userId} until ${trialEndDate.toISOString()}`);
    return true;
  } catch (error) {
    console.error('Error activating trial:', error);
    return false;
  }
};

// Check trial status for free users
export const getTrialStatus = (user: UserData | null): { 
  isEligible: boolean;
  isActive: boolean;
  daysRemaining: number;
  hasUsed: boolean;
} => {
  const defaultStatus = { isEligible: false, isActive: false, daysRemaining: 0, hasUsed: false };
  
  if (!user || user.tier !== 'free') return defaultStatus;

  const hasUsed = !!user.freeWorkoutTrialUsed;
  const isEligible = user.parqCompleted && !hasUsed;
  
  if (!user.trialEndDate) {
    return { isEligible, isActive: false, daysRemaining: isEligible ? 3 : 0, hasUsed };
  }

  const now = new Date();
  const trialEnd = new Date(user.trialEndDate);
  const isActive = trialEnd > now;
  const daysRemaining = isActive ? Math.ceil((trialEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)) : 0;

  return { isEligible, isActive, daysRemaining, hasUsed };
};

// Subscription tier validation middleware
export const requireSubscription = (requiredTier: 'basic' | 'premium') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Use the hasValidSubscription helper for consistent logic
    if (!hasValidSubscription(req.user, requiredTier)) {
      const userTier = req.user.tier || 'free';
      return res.status(403).json({ 
        error: 'Valid subscription required',
        requiredTier,
        currentTier: userTier,
        subscriptionStatus: req.user.subscriptionStatus
      });
    }

    next();
  };
};

// PAR-Q completion validation middleware
export const requireParqCompletion = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.user.parqCompleted) {
    return res.status(403).json({ 
      error: 'PAR-Q health assessment must be completed before accessing this feature'
    });
  }

  next();
};

// Combined middleware for features requiring both subscription and PAR-Q
export const requireWorkoutAccess = [
  authenticate,
  requireSubscription('basic'),
  requireParqCompletion
];

// Generate JWT token helper
export const generateToken = (user: { id: string; email: string; type?: string; isAdmin?: boolean }): string => {
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email, 
      type: user.type || 'registered',
      isAdmin: user.isAdmin || false
    }, 
    JWT_SECRET, 
    { expiresIn: '7d' }
  );
};

// Check if user can access feature helper
export const canAccessFeature = (user: UserData | null, feature: string): boolean => {
  if (!user) return false;

  // Feature access rules
  const featureRules = {
    'workout-generation': { tier: 'basic', parq: true },
    'nutrition-tracking': { tier: 'free', parq: false },
    'meal-planning': { tier: 'free', parq: false },
    'barcode-scanning': { tier: 'premium', parq: false },
    'telegram-notifications': { tier: 'premium', parq: false },
    'analytics': { tier: 'free', parq: false }
  };

  const rule = featureRules[feature as keyof typeof featureRules];
  if (!rule) return false;

  // Check subscription tier
  if (!hasValidSubscription(user, rule.tier as 'basic' | 'premium') && rule.tier !== 'free') {
    return false;
  }

  // Check PAR-Q completion if required
  if (rule.parq && !user.parqCompleted) {
    return false;
  }

  return true;
};

// Feature access middleware
export const requireFeatureAccess = (feature: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!canAccessFeature(req.user, feature)) {
      const featureRules = {
        'workout-generation': { tier: 'basic', parq: true },
        'nutrition-tracking': { tier: 'free', parq: false },
        'meal-planning': { tier: 'free', parq: false },
        'barcode-scanning': { tier: 'premium', parq: false },
        'telegram-notifications': { tier: 'premium', parq: false },
        'analytics': { tier: 'free', parq: false }
      };

      const rule = featureRules[feature as keyof typeof featureRules];
      let errorMessage = 'Access denied to this feature';
      let action = 'upgrade_subscription';

      if (rule?.parq && !req.user.parqCompleted) {
        errorMessage = 'Please complete the PAR-Q health assessment to access this feature';
        action = 'complete_parq';
      } else if (rule?.tier !== 'free') {
        errorMessage = `${rule.tier} subscription required for this feature`;
        action = 'upgrade_subscription';
      }

      return res.status(403).json({ 
        error: errorMessage,
        action,
        requiredTier: rule?.tier,
        requiresParq: rule?.parq,
        userTier: req.user.tier,
        parqCompleted: req.user.parqCompleted
      });
    }

    next();
  };
};

// Dedicated middleware for PAR-Q validation with detailed error messages
export const requireParqCompleted = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.user.parqCompleted) {
    logger.warn(`PAR-Q not completed for user ${req.user.id} (${req.user.email})`);
    return res.status(403).json({
      error: 'PAR-Q health assessment must be completed before accessing this feature',
      action: 'complete_parq',
      requiredField: 'parqCompleted', // Explicitly note this is the field name, not 'isCleared'
      currentValue: req.user.parqCompleted,
      message: 'Please complete the Physical Activity Readiness Questionnaire to ensure safe exercise participation'
    });
  }

  next();
};

export default {
  authenticate,
  requireAdmin,
  authenticateOptional,
  requireSubscription,
  requireParqCompletion,
  requireWorkoutAccess,
  requireParqCompleted,
  generateToken,
  hasValidSubscription,
  canAccessFeature,
  activateFreeWorkoutTrial,
  getTrialStatus
};