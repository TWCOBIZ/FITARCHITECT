import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { prisma } from '../db/prisma';
import { 
  authenticate, 
  requireAdmin, 
  generateToken, 
  AuthenticatedRequest 
} from '../auth';
import { 
  handleValidationErrors, 
  AppError
} from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: { error: 'Too many authentication attempts. Please try again later.' }
});

const errorReportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 error reports per windowMs
  message: { error: 'Too many error reports. Please try again later.' }
});

// Registration validation
const registrationValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('type').optional().isIn(['user', 'guest']).withMessage('Invalid user type')
];

// Registration handler
const registrationHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { email, password, name, type = 'user' } = req.body;
  
  logger.info('Registration attempt', { email, type });
  
  // Check if user already exists
  const existingUser = await prisma.userProfile.findUnique({ 
    where: { email } 
  });
  
  if (existingUser) {
    throw new AppError(409, 'Account with this email already exists');
  }
  
  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);
  
  // Create user
  const user = await prisma.userProfile.create({
    data: {
      email,
      password: hashedPassword,
      name,
      type,
      tier: type === 'guest' ? 'guest' : 'free',
      active: true, // Fixed field name
      parqCompleted: false,
      isAdmin: false,
      gender: 'not_specified',
      activityLevel: 'moderate',
      fitnessGoals: [],
      equipmentAvailability: []
    }
  });
  
  // Generate token
  const token = generateToken({ 
    id: user.id, 
    email: user.email, 
    type: user.type 
  });
  
  logger.info('Registration successful', { userId: user.id, email });
  
  res.status(201).json({ 
    success: true,
    token, 
    user: { 
      id: user.id, 
      email: user.email, 
      name: user.name, 
      tier: user.tier,
      type: user.type,
      parqCompleted: user.parqCompleted,
      isAdmin: user.isAdmin
    }
  });
});

// Login validation
const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 1 }).withMessage('Password required')
];

// Login handler
const loginHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { email, password } = req.body;
  
  logger.info('Login attempt', { email });
  
  // Find user
  const user = await prisma.userProfile.findUnique({ 
    where: { email } 
  });
  
  if (!user) {
    throw new AppError(401, 'Invalid email or password');
  }
  
  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError(401, 'Invalid email or password');
  }
  
  // Check if user is active
  if (!user.active) {
    throw new AppError(403, 'Your account has been deactivated. Please contact support.');
  }
  
  // Generate token
  const token = generateToken({ 
    id: user.id, 
    email: user.email, 
    type: user.type 
  });
  
  logger.info('Login successful', { userId: user.id, email });
  
  res.json({ 
    success: true,
    token, 
    user: { 
      id: user.id, 
      email: user.email, 
      name: user.name, 
      tier: user.tier,
      type: user.type,
      parqCompleted: user.parqCompleted,
      isAdmin: user.isAdmin
    }
  });
});

// Admin login handler
const adminLoginHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { email, password } = req.body;
  
  logger.info('Admin login attempt', { email });
  
  // Find admin user
  const user = await prisma.userProfile.findUnique({ 
    where: { 
      email,
      isAdmin: true,
      active: true
    } 
  });
  
  if (!user) {
    throw new AppError(401, 'Invalid admin credentials');
  }
  
  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError(401, 'Invalid admin credentials');
  }
  
  // Generate token
  const token = generateToken({ 
    id: user.id, 
    email: user.email, 
    type: user.type 
  });
  
  logger.info('Admin login successful', { userId: user.id, email });
  
  res.json({ 
    success: true,
    token, 
    user: { 
      id: user.id, 
      email: user.email, 
      name: user.name, 
      tier: user.tier,
      type: user.type,
      parqCompleted: user.parqCompleted,
      isAdmin: user.isAdmin
    }
  });
});

// Guest registration handler
const guestRegistrationHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { email, name } = req.body;
  
  logger.info('Guest registration attempt', { email });
  
  // Check if user already exists
  const existingUser = await prisma.userProfile.findUnique({ 
    where: { email } 
  });
  
  if (existingUser) {
    throw new AppError(409, 'Account with this email already exists');
  }
  
  // Create temporary password for guest
  const tempPassword = Math.random().toString(36).substring(2, 15);
  const hashedPassword = await bcrypt.hash(tempPassword, 12);
  
  // Create guest user
  const user = await prisma.userProfile.create({
    data: {
      email,
      password: hashedPassword,
      name: name || 'Guest User',
      type: 'guest',
      tier: 'guest',
      active: true,
      parqCompleted: false,
      isAdmin: false
    }
  });
  
  // Generate token
  const token = generateToken({ 
    id: user.id, 
    email: user.email, 
    type: 'guest' 
  });
  
  logger.info('Guest registration successful', { userId: user.id, email });
  
  res.status(201).json({ 
    success: true,
    token, 
    user: { 
      id: user.id, 
      email: user.email, 
      name: user.name, 
      tier: user.tier,
      type: user.type,
      parqCompleted: user.parqCompleted,
      isAdmin: user.isAdmin
    }
  });
});

// Routes
router.post('/register', 
  authLimiter, 
  registrationValidation, 
  handleValidationErrors, 
  registrationHandler
);

router.post('/login', 
  authLimiter, 
  loginValidation, 
  handleValidationErrors, 
  loginHandler
);

router.post('/admin/login', 
  authLimiter, 
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 })
  ], 
  handleValidationErrors, 
  adminLoginHandler
);

router.post('/logout', 
  authenticate, 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // For JWT tokens, logout is handled client-side by removing the token
    // Here we could implement token blacklisting if needed
    logger.info('User logged out', { userId: req.user?.id });
    res.json({ success: true, message: 'Logged out successfully' });
  })
);

router.post('/guest-register', 
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters')
  ],
  handleValidationErrors,
  guestRegistrationHandler
);

// Error reporting endpoint
router.post('/report-error', 
  errorReportLimiter,
  [
    body('message').isString().isLength({ min: 1, max: 1000 }),
    body('stack').optional().isString().isLength({ max: 5000 }),
    body('userAgent').optional().isString().isLength({ max: 500 }),
    body('url').optional().isString().isLength({ max: 500 }),
  ],
  handleValidationErrors,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { message, stack, userAgent, url } = req.body;
    
    logger.error('Client error report', {
      message,
      stack,
      userAgent,
      url,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    
    // Could also save to database or send to monitoring service
    
    res.json({ success: true, message: 'Error report received' });
  })
);

export default router;