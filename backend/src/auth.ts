import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

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
  height?: number;
  weight?: number;
  age?: number;
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
  equipmentAvailability?: string | null;
  preferredWorkoutDuration?: string | null;
  avatar?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthenticatedRequest extends Request {
  user?: UserData;
  admin?: UserData;
}

export interface UserPayload {
  userId: string;
  email: string;
  type?: 'guest' | 'registered';
  isAdmin?: boolean;
}

// Unified authentication middleware that handles both user and admin tokens
export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const auth = req.headers.authorization;
  
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = auth.split(' ')[1];
  
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
        dietaryPreferences: true,
        telegramEnabled: true,
        telegramChatId: true,
        twoFactorEnabled: true,
        avatar: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Add user to request object
    req.user = user;
    
    // Also add admin flag for backward compatibility
    if (user.isAdmin) {
      req.admin = user;
    }

    next();
  } catch (error) {
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
        dietaryPreferences: true,
        telegramEnabled: true,
        telegramChatId: true,
        twoFactorEnabled: true,
        avatar: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (user) {
      req.user = user;
      if (user.isAdmin) {
        req.admin = user;
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
  
  return userLevel >= requiredLevel && user.subscriptionStatus === 'active';
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

export default {
  authenticate,
  requireAdmin,
  authenticateOptional,
  requireSubscription,
  requireParqCompletion,
  requireWorkoutAccess,
  generateToken,
  hasValidSubscription,
  canAccessFeature
};