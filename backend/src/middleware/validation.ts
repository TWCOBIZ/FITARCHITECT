import { Request, Response, NextFunction } from 'express';
import { validationResult, body, param, query } from 'express-validator';
import { AppError } from './errorHandler';

// Re-export AppError for convenience
export { AppError };
import { AuthenticatedRequest } from '../auth';
import { prisma } from '../db/prisma';

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    throw new AppError(400, errorMessages.join(', '));
  }
  next();
};

export const requireCompleteProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError(401, 'Authentication required');
    }

    const user = await prisma.userProfile.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Check required profile fields  
    const requiredFields = [
      'age', 'weight', 'height', 'activityLevel', 
      'fitnessGoals', 'equipmentAvailability'
    ];

    const missingFields = requiredFields.filter(field => {
      const value = user[field as keyof typeof user];
      return !value || (Array.isArray(value) && value.length === 0);
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Please complete your profile to access this feature',
        missingFields,
        profileComplete: false
      });
    }

    // Add user data to request for use in route handlers
    req.userProfile = user;
    next();
  } catch (error) {
    next(error);
  }
};

// Common validation schemas
export const authValidation = {
  register: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    body('name')
      .trim()
      .isLength({ min: 2 })
      .withMessage('Name must be at least 2 characters long')
  ],
  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ]
};

export const profileValidation = [
  body('age')
    .optional()
    .isInt({ min: 13, max: 120 })
    .withMessage('Age must be between 13 and 120'),
  body('weight')
    .optional()
    .isNumeric()
    .withMessage('Weight must be a number'),
  body('height')
    .optional()
    .isNumeric()
    .withMessage('Height must be a number'),
  body('fitnessLevel')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Fitness level must be beginner, intermediate, or advanced')
];

export const workoutValidation = [
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object'),
  body('preferences.duration')
    .optional()
    .isInt({ min: 15, max: 180 })
    .withMessage('Duration must be between 15 and 180 minutes'),
  body('preferences.fitnessLevel')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Invalid fitness level')
];

export const subscriptionValidation = [
  body('planType')
    .isIn(['free', 'basic', 'premium'])
    .withMessage('Invalid plan type'),
  body('paymentMethodId')
    .optional()
    .isString()
    .withMessage('Payment method ID must be a string')
];

// Admin endpoint validations
export const exerciseCreateValidation = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Exercise name must be between 3 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  body('category')
    .optional()
    .isIn(['warmup', 'strength', 'cardio', 'cooldown', 'flexibility', 'sports', 'functional', 'rehabilitation', 'core', 'legs', 'push', 'pull', 'fullbody'])
    .withMessage('Invalid exercise category'),
  body('difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Difficulty must be beginner, intermediate, or advanced'),
  body('muscleGroups')
    .optional()
    .isArray()
    .withMessage('Muscle groups must be an array'),
  body('equipment')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Equipment must be a non-empty array'),
  body('instructions')
    .optional()
    .isArray()
    .withMessage('Instructions must be an array'),
  body('gifPath')
    .optional()
    .isString()
    .withMessage('GIF path must be a string')
];

export const exerciseUpdateValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Exercise name must be between 3 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  body('category')
    .optional()
    .isIn(['warmup', 'strength', 'cardio', 'cooldown', 'flexibility', 'sports', 'functional', 'rehabilitation', 'core', 'legs', 'push', 'pull', 'fullbody'])
    .withMessage('Invalid exercise category'),
  body('difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Difficulty must be beginner, intermediate, or advanced'),
  body('approvalStatus')
    .optional()
    .isIn(['pending', 'approved', 'flagged', 'hidden'])
    .withMessage('Invalid approval status'),
  body('gifPath')
    .optional()
    .isString()
    .withMessage('GIF path must be a string')
];

export const workoutCreateValidation = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Workout name must be between 3 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  body('category')
    .optional()
    .isIn(['strength', 'cardio', 'flexibility', 'sports', 'functional', 'rehabilitation', 'fullbody'])
    .withMessage('Invalid workout category'),
  body('difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Difficulty must be beginner, intermediate, or advanced'),
  body('duration')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('Duration must be between 1 and 12 weeks'),
  body('weeks')
    .isObject()
    .withMessage('Weeks structure is required'),
  body('targetMuscleGroups')
    .optional()
    .isArray()
    .withMessage('Target muscle groups must be an array'),
  body('equipment')
    .optional()
    .isArray()
    .withMessage('Equipment must be an array')
];

export const workoutUpdateValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Workout name must be between 3 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  body('category')
    .optional()
    .isIn(['strength', 'cardio', 'flexibility', 'sports', 'functional', 'rehabilitation', 'fullbody'])
    .withMessage('Invalid workout category'),
  body('difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Difficulty must be beginner, intermediate, or advanced'),
  body('duration')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('Duration must be between 1 and 12 weeks')
];

export const notificationCreateValidation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  body('message')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Message must be between 10 and 500 characters'),
  body('type')
    .optional()
    .isIn(['system', 'user', 'error', 'warning', 'info'])
    .withMessage('Invalid notification type'),
  body('severity')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid severity level')
];

export const flaggedContentActionValidation = [
  body('action')
    .isIn(['approve', 'reject', 'ban'])
    .withMessage('Action must be approve, reject, or ban'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Reason must be less than 200 characters')
];

export const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search term must be less than 100 characters')
];

export const idValidation = [
  param('id')
    .notEmpty()
    .withMessage('ID parameter is required')
];