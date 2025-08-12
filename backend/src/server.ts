import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import express from 'express';
import { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import Stripe from 'stripe';
import { prisma, checkDatabaseConnection } from './db/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import TelegramBot from 'node-telegram-bot-api';
import multer, { MulterError } from 'multer';
const speakeasy = require('speakeasy');
import { 
  authenticate, 
  requireAdmin, 
  authenticateOptional, 
  requireSubscription, 
  requireParqCompletion, 
  requireWorkoutAccess, 
  generateToken,
  hasValidSubscription,
  activateFreeWorkoutTrial,
  getTrialStatus,
  AuthenticatedRequest 
} from './auth';
import { openaiService } from './services/openaiService';
import { upload, uploadImageBuffer, deleteImage, extractPublicId } from './services/cloudinaryService';
import { cacheWorkoutGeneration, getCacheStats } from './middleware/cache';
import { backendConfigValidator } from './utils/configValidator';
import { logger } from './utils/logger';
import { cacheService } from './services/cacheService';

// Helper function to transform weeks structure to workouts for frontend compatibility
function transformWeeksToWorkouts(weeks: any[]): any[] {
  if (!weeks || !Array.isArray(weeks)) return [];
  
  const workouts: any[] = [];
  
  // Process all weeks, not just the first one
  weeks.forEach((week: any, weekIndex: number) => {
    if (!week || !week.days || !Array.isArray(week.days)) return;
    
    week.days.forEach((day: any, dayIndex: number) => {
      // Include both workout days and rest days for complete weekly structure
      const workout = {
        id: day.workoutId || `workout-week${weekIndex + 1}-day${day.dayNumber || dayIndex + 1}`,
        name: day.name || `Week ${weekIndex + 1} - Day ${day.dayNumber || dayIndex + 1}`,
        description: day.description || (day.isRestDay ? 'Recovery day' : `Workout for week ${weekIndex + 1}, day ${day.dayNumber || dayIndex + 1}`),
        exercises: day.exercises || [],
        dayNumber: day.dayNumber || dayIndex + 1,
        weekNumber: week.weekNumber || weekIndex + 1,
        isRestDay: day.isRestDay || false,
        type: day.type || (day.isRestDay ? 'rest' : 'strength'),
        difficulty: day.difficulty || 'beginner',
        duration: day.duration || (day.isRestDay ? 0 : 45),
        targetMuscleGroups: day.targetMuscleGroups || [],
        equipment: day.equipment || ['bodyweight'],
        caloriesBurned: day.caloriesBurned || (day.isRestDay ? 0 : 200),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      workouts.push(workout);
    });
  });
  
  return workouts;
}

import {
  requestIdMiddleware,
  requestLoggingMiddleware,
  responseLoggingMiddleware,
  errorLoggingMiddleware,
  performanceMonitoringMiddleware,
  rateLimitMonitoringMiddleware,
  healthCheckMiddleware,
  userActivityMiddleware,
  apiAnalyticsMiddleware,
  securityMonitoringMiddleware
} from './middleware/loggingMiddleware';

// Health check interfaces
interface ServiceStatus {
  status: string;
  latency?: number;
  error?: string;
  usage?: any;
}

interface HealthCheckResponse {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
  services: {
    database?: ServiceStatus;
    openai?: ServiceStatus;
    cache?: ServiceStatus;
    stripe?: ServiceStatus;
  };
  error?: string;
}

// Environment validation
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'OPENAI_API_KEY'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Test user utility functions (configurable via environment)
const TEST_USER_EMAILS = process.env.TEST_USER_EMAILS?.split(',') || [];
const isTestUser = (email: string | undefined | null): boolean => {
  if (!email || TEST_USER_EMAILS.length === 0) return false;
  return TEST_USER_EMAILS.includes(email);
};

// Port availability checker
const checkPortAvailability = (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const net = require('net');
    const tester = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => {
        tester.once('close', () => resolve(true)).close();
      })
      .listen(port);
  });
};

const app = express();
const port = parseInt(process.env.PORT || '3001', 10);

// Configure multer for GIF uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const fs = require('fs');
    const path = require('path');
    
    // Get category from form data, default to 'general'
    const category = req.body.category || 'general';
    const uploadPath = path.join(__dirname, '../../public/exercise-gifs', category);
    
    // Ensure directory exists
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Keep original filename but sanitize it
    const sanitizedName = file.originalname
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    cb(null, sanitizedName);
  }
});

const uploadGifs = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Only allow GIF files
    if (file.mimetype === 'image/gif') {
      cb(null, true);
    } else {
      cb(new Error('Only GIF files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 20 // Maximum 20 files at once
  }
});

// Initialize Stripe (with validation)
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY not set. Payment features will be disabled.');
}

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2022-11-15'
}) : null;

// Prisma client is now imported from db/prisma.ts with optimizations
const JWT_SECRET = process.env.JWT_SECRET!;

// Enhanced caching via cacheService (replaces simple cache)
const getFromCache = (key: string): any | null => {
  return cacheService.get(key);
};

const setCache = (key: string, data: any, ttlMinutes: number = 10): void => {
  cacheService.set(key, data, undefined, ttlMinutes);
};

// Validate JWT secret strength
if (JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be at least 32 characters long for security');
  process.exit(1);
}

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
let telegramBot: TelegramBot | null = null;
if (TELEGRAM_BOT_TOKEN) {
  telegramBot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });
} else {
  console.warn('TELEGRAM_BOT_TOKEN not set. Telegram notifications disabled.');
}

// Security Configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || [
    'http://localhost:5173',
    'http://localhost:5174', 
    'http://localhost:5175',
    'http://localhost:5176',
    // Allow any local network IP for mobile testing
    /^http:\/\/192\.168\.\d+\.\d+:5173$/,
    /^http:\/\/10\.\d+\.\d+\.\d+:5173$/,
    /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+:5173$/
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

// Rate limiting configuration
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '50'), // Increased to 50 attempts per window for development
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000)
    });
  }
});

const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes  
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 100 requests per window
  message: {
    error: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Input validation middleware
const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Enhanced error handling middleware
const handleDatabaseError = (error: any, res: Response, operation: string) => {
  console.error(`Database error during ${operation}:`, error);
  
  if (error.code === 'P2002') {
    return res.status(409).json({ 
      error: 'Resource already exists',
      details: 'A record with this information already exists'
    });
  }
  
  if (error.code === 'P2025') {
    return res.status(404).json({ 
      error: 'Resource not found',
      details: 'The requested record was not found'
    });
  }
  
  if (error.code === 'P2003') {
    return res.status(400).json({ 
      error: 'Invalid reference',
      details: 'Referenced record does not exist'
    });
  }
  
  return res.status(500).json({ 
    error: `Failed to ${operation}`,
    details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  });
};

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.openai.com", "https://api.stripe.com"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(cors(corsOptions));
app.use(generalLimiter as any);

// Stripe webhooks need raw body for signature verification
// Must be registered BEFORE JSON body parser
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint for Railway and monitoring
app.get('/health', async (req, res) => {
  try {
    const healthCheck: HealthCheckResponse = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      services: {}
    };

    // Check database connection
    try {
      await checkDatabaseConnection();
      healthCheck.services.database = { status: 'connected', latency: Date.now() };
    } catch (error) {
      healthCheck.services.database = { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown database error'
      };
      healthCheck.status = 'DEGRADED';
    }

    // Check OpenAI service configuration
    try {
      healthCheck.services.openai = {
        status: process.env.OPENAI_API_KEY ? 'configured' : 'not_configured',
        usage: openaiService.getUsageStats()
      };
    } catch (error) {
      healthCheck.services.openai = { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown OpenAI error'
      };
    }

    // Check cache performance
    try {
      const cacheStats = getCacheStats();
      healthCheck.services.cache = {
        status: 'operational',
        ...cacheStats
      };
    } catch (error) {
      healthCheck.services.cache = { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown cache error'
      };
    }

    // Check Stripe configuration
    healthCheck.services.stripe = {
      status: stripe ? 'configured' : 'not_configured'
    };

    const status = healthCheck.status === 'OK' ? 200 : 503;
    res.status(status).json(healthCheck);
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown server error'
    });
  }
});

// Simplified health check for load balancers
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Workout generation metrics endpoint (admin only)
app.get('/api/admin/workout-metrics', authenticate, requireAdmin, (req, res) => {
  try {
    const cacheStats = getCacheStats();
    const openaiStats = openaiService.getUsageStats();
    
    const metrics = {
      cache: cacheStats,
      openai: openaiStats,
      timestamp: new Date().toISOString(),
      server: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        environment: process.env.NODE_ENV
      }
    };
    
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching workout metrics:', error);
    res.status(500).json({ error: 'Failed to fetch workout metrics' });
  }
});

// Diagnostic endpoint to check why features aren't working
app.get('/api/diagnostics', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      user: {
        id: req.user?.id,
        email: req.user?.email,
        tier: req.user?.tier,
        isAdmin: req.user?.isAdmin
      }
    };

    // Check database connectivity
    try {
      await prisma.$queryRaw`SELECT 1`;
      diagnostics.database = { status: 'connected' };
    } catch (error) {
      diagnostics.database = { status: 'error', error: error.message };
    }

    // Check exercise count
    try {
      const exerciseCount = await prisma.exercise.count();
      const activeExercises = await prisma.exercise.count({ where: { isActive: true } });
      diagnostics.exercises = { 
        total: exerciseCount, 
        active: activeExercises,
        status: exerciseCount > 0 ? 'populated' : 'empty' 
      };
    } catch (error) {
      diagnostics.exercises = { status: 'error', error: error.message };
    }

    // Check workout plans
    try {
      const planCount = await prisma.workoutPlan.count();
      const userPlans = await prisma.workoutPlan.count({ 
        where: { userId: req.user?.id } 
      });
      diagnostics.workoutPlans = { 
        total: planCount, 
        userPlans: userPlans,
        status: planCount > 0 ? 'populated' : 'empty'
      };
    } catch (error) {
      diagnostics.workoutPlans = { status: 'error', error: error.message };
    }

    // Check OpenAI configuration
    diagnostics.openai = {
      configured: !!process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'not set',
      keyPrefix: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 10) + '...' : 'not set'
    };

    // Check Stripe configuration
    diagnostics.stripe = {
      configured: !!process.env.STRIPE_SECRET_KEY,
      keyPrefix: process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 10) + '...' : 'not set'
    };

    // Check Cloudinary configuration
    diagnostics.cloudinary = {
      configured: !!process.env.CLOUDINARY_CLOUD_NAME,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'not set'
    };

    res.json(diagnostics);
  } catch (error) {
    console.error('Diagnostics error:', error);
    res.status(500).json({ 
      error: 'Failed to run diagnostics',
      message: error.message 
    });
  }
});

// Comprehensive logging middleware stack
app.use(requestIdMiddleware);
app.use(requestLoggingMiddleware);
app.use(responseLoggingMiddleware);
app.use(performanceMonitoringMiddleware);
app.use(rateLimitMonitoringMiddleware);
app.use(healthCheckMiddleware);
app.use(userActivityMiddleware);
app.use(apiAnalyticsMiddleware);
app.use(securityMonitoringMiddleware);

// Avatar upload endpoint using Cloudinary
app.post('/api/upload-avatar', authenticate, upload.single('avatar'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('📷 Avatar upload request received');
    
    if (!req.file) {
      console.log('❌ No file in upload request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.user?.id;
    if (!userId) {
      console.log('❌ No user ID in authenticated request');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log(`📷 Processing avatar upload for user: ${userId}, file: ${req.file.originalname}, size: ${req.file.size} bytes`);

    // Validate file size and type
    if (req.file.size > 5 * 1024 * 1024) {
      console.log('❌ File too large:', req.file.size);
      return res.status(400).json({ error: 'File size too large. Maximum 5MB allowed.' });
    }

    // Get current user to check for existing avatar
    const currentUser = await prisma.userProfile.findUnique({
      where: { id: userId },
      select: { avatar: true }
    });

    // Delete old avatar if exists
    if (currentUser?.avatar) {
      try {
        const publicId = extractPublicId(currentUser.avatar);
        if (publicId) {
          console.log('🗑️ Deleting old avatar:', publicId);
          await deleteImage(publicId);
        }
      } catch (error) {
        console.warn('⚠️ Could not delete old avatar:', error);
      }
    }

    // Upload new avatar to Cloudinary
    console.log('☁️ Uploading to Cloudinary...');
    const imageUrl = await uploadImageBuffer(req.file.buffer, req.file.originalname);
    console.log('✅ Cloudinary upload successful:', imageUrl);

    // Update user profile with new avatar URL
    await prisma.userProfile.update({
      where: { id: userId },
      data: { avatar: imageUrl }
    });

    console.log('✅ Avatar upload completed successfully');
    res.json({ 
      url: imageUrl,
      message: 'Avatar uploaded successfully' 
    });
  } catch (error) {
    console.error('❌ Avatar upload error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to upload avatar';
    if (error instanceof Error) {
      if (error.message?.includes('cloudinary')) {
        errorMessage = 'Image service temporarily unavailable. Please try again later.';
      } else if (error.message?.includes('prisma')) {
        errorMessage = 'Database error. Please try again later.';
      }
    }
    
    res.status(500).json({ error: errorMessage });
  }
});

// Remove hardcoded test user function - use proper admin flag instead

// Trial status endpoint
app.get('/api/trial-status', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not found' });
    }

    const trialStatus = getTrialStatus(req.user || null);
    
    res.json({
      isEligible: trialStatus.isEligible,
      isActive: trialStatus.isActive,
      daysRemaining: trialStatus.daysRemaining,
      hasUsed: trialStatus.hasUsed,
      userTier: req.user?.tier || 'free',
      parqCompleted: req.user?.parqCompleted || false
    });
  } catch (error) {
    console.error('Trial status error:', error);
    res.status(500).json({ error: 'Failed to get trial status' });
  }
});

// Subscription creation validation
const subscriptionValidation = [
  body('paymentMethodId').isString().isLength({ min: 1, max: 100 }),
  body('planId').isString().isLength({ min: 1, max: 100 }),
  body('planName').isString().isLength({ min: 1, max: 50 }),
  body('userId').optional().isString().isLength({ min: 1, max: 50 })
];

// Create a subscription
app.post('/api/create-subscription', subscriptionValidation, handleValidationErrors, async (req: AuthenticatedRequest, res: Response) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Payment services unavailable' });
  }
  
  try {
    const { paymentMethodId, planId, planName, userId } = req.body;

    // Create or get customer
    const customer = await stripe.customers.create({
      payment_method: paymentMethodId,
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Create subscription in Stripe
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: planId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    // Store subscription in DB
    if (userId && planName) {
      await prisma.subscription.create({
        data: {
          userId,
          planId,
          plan: planName,
          status: 'active',
          startDate: new Date(),
        },
      });
    }

    res.json({
      subscriptionId: subscription.id,
      clientSecret: (subscription.latest_invoice as any).payment_intent.client_secret,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get subscription status
app.get('/api/subscription/:subscriptionId', async (req: AuthenticatedRequest, res: Response) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Payment services unavailable' });
  }
  
  try {
    const subscription = await stripe.subscriptions.retrieve(req.params.subscriptionId)
    res.json(subscription)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Cancel subscription
app.post('/api/cancel-subscription/:subscriptionId', async (req: AuthenticatedRequest, res: Response) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Payment services unavailable' });
  }
  
  try {
    const subscription = await stripe.subscriptions.cancel(req.params.subscriptionId)
    res.json(subscription)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Get available plans
app.get('/api/plans', async (req: AuthenticatedRequest, res: Response) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Payment services unavailable' });
  }
  
  try {
    // Try to get from cache first
    const cacheKey = 'stripe-plans';
    const cachedPlans = getFromCache(cacheKey);
    
    if (cachedPlans) {
      return res.json(cachedPlans);
    }
    
    // Fetch from Stripe if not in cache
    const plans = await stripe.prices.list({
      active: true,
      expand: ['data.product'],
    });
    
    // Cache for 30 minutes since plans don't change frequently
    setCache(cacheKey, plans.data, 30);
    
    res.json(plans.data);
  } catch (error: any) {
    return handleDatabaseError(error, res, 'fetch plans');
  }
})

// Admin login route with rate limiting
const adminLoginHandler = async (req: AuthenticatedRequest, res: Response) => {
  const { email, password } = req.body
  console.log('🔐 Backend: Admin login attempt for:', email)
  
  try {
    const user = await prisma.userProfile.findUnique({ where: { email } })
    console.log('🔐 Backend: User found:', !!user, 'isAdmin:', user?.isAdmin)
    
    if (!user || !user.isAdmin) {
      console.log('🔐 Backend: Admin login failed - user not found or not admin')
      return res.status(401).json({ error: 'Unauthorized' })
    }
    
    // Use bcrypt for password comparison
    const valid = await bcrypt.compare(password, user.password)
    console.log('🔐 Backend: Password valid:', valid)
    
    if (!valid) {
      console.log('🔐 Backend: Admin login failed - invalid password')
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    
    const token = generateToken({ id: user.id, email: user.email, isAdmin: true })
    console.log('🔐 Backend: Admin login successful, token generated')
    res.json({ token })
  } catch (error) {
    console.error('🔐 Backend: Admin login error:', error)
    res.status(500).json({ error: 'Server error' })
  }
};

// Legacy authenticate, requireAdmin function - should be replaced with new auth middleware

// Get current admin info
app.get('/api/admin/me', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  console.log('🔐 Backend: /api/admin/me called')
  try {
    const user = req.user
    console.log('🔐 Backend: User from token:', user ? 'YES' : 'NO', 'isAdmin:', user?.isAdmin)
    
    if (!user || !user.isAdmin) {
      console.log('🔐 Backend: /api/admin/me failed - user not found or not admin')
      return res.status(404).json({ error: 'Not found' })
    }
    
    const responseData = { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin }
    console.log('🔐 Backend: /api/admin/me success, returning:', responseData)
    res.json(responseData)
  } catch (error) {
    console.error('🔐 Backend: /api/admin/me error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Enhanced GET /api/admin/users with filtering/sorting and pagination
app.get('/api/admin/users', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      search = '', 
      status = 'all', 
      role = 'all', 
      sort = 'createdAt-desc',
      page = '1',
      limit = '50'
    } = req.query;
    
    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
    const skip = (pageNum - 1) * limitNum;
    
    let where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status !== 'all') {
      where.active = status === 'active';
    }
    if (role !== 'all') {
      where.isAdmin = role === 'admin';
    }
    
    let orderBy: any = {};
    if (sort === 'name-asc') orderBy = { name: 'asc' };
    else if (sort === 'name-desc') orderBy = { name: 'desc' };
    else if (sort === 'createdAt-asc') orderBy = { createdAt: 'asc' };
    else orderBy = { createdAt: 'desc' };
    
    // Execute queries in parallel for better performance
    const [users, totalCount] = await Promise.all([
      prisma.userProfile.findMany({ 
        where, 
        orderBy,
        skip,
        take: limitNum,
        select: {
          id: true,
          email: true,
          name: true,
          isAdmin: true,
          tier: true,
          subscriptionStatus: true,
          createdAt: true,
          updatedAt: true,
          parqCompleted: true
        }
      }),
      prisma.userProfile.count({ where })
    ]);
    
    res.json({
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (error) {
    return handleDatabaseError(error, res, 'fetch users');
  }
});

// PATCH /api/admin/users/:id for profile updates
app.patch('/api/admin/users/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;
    const user = await prisma.userProfile.update({ where: { id }, data: { name, email } });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// POST /api/admin/users/:id/activate
app.post('/api/admin/users/:id/activate', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Update user active status
    const user = await prisma.userProfile.update({
      where: { id },
      data: { active: true },
      select: { id: true, email: true, name: true, active: true }
    });
    
    // Log admin action
    await prisma.auditLog.create({
      data: {
        adminUserId: req.user?.id || '',
        adminEmail: req.user?.email || '',
        action: 'activate',
        resourceType: 'user',
        resourceId: id,
        resourceName: user.email,
        details: { previousStatus: 'inactive', newStatus: 'active' },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
    
    res.json({ 
      success: true, 
      message: 'User activated successfully',
      user 
    });
  } catch (error: any) {
    console.error('Error activating user:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Failed to activate user' });
  }
});

// POST /api/admin/users/:id/deactivate
app.post('/api/admin/users/:id/deactivate', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // Update user active status
    const user = await prisma.userProfile.update({
      where: { id },
      data: { active: false },
      select: { id: true, email: true, name: true, active: true }
    });
    
    // Log admin action
    await prisma.auditLog.create({
      data: {
        adminUserId: req.user?.id || '',
        adminEmail: req.user?.email || '',
        action: 'deactivate',
        resourceType: 'user',
        resourceId: id,
        resourceName: user.email,
        details: { 
          previousStatus: 'active', 
          newStatus: 'inactive',
          reason: reason || 'Admin deactivation'
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
    
    res.json({ 
      success: true, 
      message: 'User deactivated successfully',
      user 
    });
  } catch (error: any) {
    console.error('Error deactivating user:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

// POST /api/admin/users/:id/reset-password
app.post('/api/admin/users/:id/reset-password', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const hashed = await bcrypt.hash(newPassword, 10);
    const user = await prisma.userProfile.update({ where: { id }, data: { password: hashed } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// POST /api/admin/users/:id/role (promote/demote)
app.post('/api/admin/users/:id/role', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isAdmin } = req.body;
    const user = await prisma.userProfile.update({ where: { id }, data: { isAdmin } });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Get all subscriptions (mock)
// NOTE: Subscriptions endpoint moved to line ~2206 with proper implementation

// Get analytics with real database queries
app.get('/api/admin/analytics', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { start, end } = req.query;
    
    // Calculate date ranges
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const startDate = start ? new Date(start as string) : thirtyDaysAgo;
    const endDate = end ? new Date(end as string) : new Date();

    // Get total users
    const totalUsers = await prisma.userProfile.count();
    
    // Get active users (users who have workout logs in last 30 days)
    const activeUsers = await prisma.userProfile.count({
      where: {
        workoutLogs: {
          some: {
            date: {
              gte: thirtyDaysAgo
            }
          }
        }
      }
    });
    
    // Get new signups in the last 7 days
    const newSignups = await prisma.userProfile.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo
        }
      }
    });
    
    // Calculate subscription breakdown
    const subscriptionBreakdown = await prisma.userProfile.groupBy({
      by: ['tier'],
      _count: {
        tier: true
      }
    });
    
    const subscriptionData = subscriptionBreakdown.reduce((acc, item) => {
      acc[item.tier] = item._count.tier;
      return acc;
    }, {} as Record<string, number>);
    
    // Ensure all tiers are represented
    const finalSubscriptionBreakdown = {
      free: subscriptionData.free || 0,
      basic: subscriptionData.basic || 0,
      premium: subscriptionData.premium || 0
    };
    
    // Calculate churn rate (users who haven't been active in 30 days)
    const inactiveUsers = totalUsers - activeUsers;
    const churnRate = totalUsers > 0 ? Math.round((inactiveUsers / totalUsers) * 100 * 10) / 10 : 0;
    
    // Get workout completion stats
    const completedWorkouts = await prisma.workoutLog.count({
      where: {
        completed: true,
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    });
    
    // Get total workout attempts
    const totalWorkoutAttempts = await prisma.workoutLog.count({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    });
    
    const completionRate = totalWorkoutAttempts > 0 ? 
      Math.round((completedWorkouts / totalWorkoutAttempts) * 100 * 10) / 10 : 0;

    const data = {
      totalUsers,
      activeUsers,
      newSignups,
      churnRate,
      subscriptionBreakdown: finalSubscriptionBreakdown,
      completedWorkouts,
      totalWorkoutAttempts,
      completionRate,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    };
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get PAR-Q flagged users (parqCompleted === false)
app.get('/api/admin/parq', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const flagged = await prisma.userProfile.findMany({ where: { parqCompleted: false } });
    res.json(flagged);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch PAR-Q users' });
  }
});

// User registration endpoint with comprehensive profile and 3-day Premium trial
const registrationValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('name').isLength({ min: 2, max: 50 }).trim(),
  body('height').isFloat({ min: 36, max: 96 }), // Height in inches (3 feet to 8 feet)
  body('weight').isFloat({ min: 30, max: 500 }),
  body('age').isInt({ min: 13, max: 120 })
];

const registrationHandler = async (req: AuthenticatedRequest, res: Response) => {
  const { 
    email, 
    password, 
    name, 
    height, 
    weight, 
    age, 
    gender, 
    fitnessGoals, 
    activityLevel, 
    equipmentAvailability, 
    preferredWorkoutDuration, 
    dietaryPreferences 
  } = req.body;
  
  // Validate required fields
  if (!email || !password || !name || height == null || weight == null || age == null || 
      !gender || !fitnessGoals || !activityLevel || !equipmentAvailability || 
      !preferredWorkoutDuration || !dietaryPreferences) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    const existing = await prisma.userProfile.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    
    const hashed = await bcrypt.hash(password, 10);
    
    // Calculate trial end date (3 days from now)
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 3);
    
    const user = await prisma.userProfile.create({
      data: {
        email,
        password: hashed,
        name,
        height: parseFloat(height),
        weight: parseFloat(weight),
        age: parseInt(age),
        gender,
        fitnessGoals,
        activityLevel,
        equipmentAvailability,
        preferredWorkoutDuration,
        dietaryPreferences,
        parqCompleted: false,
        tier: 'free',  // Start with free tier - users can upgrade later
        subscriptionStatus: 'inactive',
        type: 'registered'
      },
    });
    
    const token = generateToken({ id: user.id, email: user.email, type: 'registered' });
    
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name,
        tier: user.tier,
        type: user.type,
        parqCompleted: user.parqCompleted,
        // trialEndDate: user.trialEndDate, // TODO: Add back when Prisma types are fixed
        // Include profile data for immediate use
        fitnessGoals: user.fitnessGoals,
        activityLevel: user.activityLevel,
        equipmentAvailability: user.equipmentAvailability,
        preferredWorkoutDuration: user.preferredWorkoutDuration,
        height: user.height,
        weight: user.weight,
        age: user.age,
        gender: user.gender
      } 
    });
  } catch (error) {
    console.error('Registration failed:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      requestBody: { ...req.body, password: '[REDACTED]' }
    });
    res.status(500).json({ error: 'Registration failed' });
  }
};

// Apply routes with rate limiting
app.post('/api/admin/login', authLimiter as any, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], handleValidationErrors, adminLoginHandler);

app.post('/api/register', authLimiter as any, registrationValidation, handleValidationErrors, registrationHandler);

// User login endpoint
const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 })
];

const loginHandler = async (req: AuthenticatedRequest, res: Response) => {
  if (process.env.DEBUG_AUTH === 'true') {
    console.log('🔐 Login request received');
  }
  
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  
  try {
    const user = await prisma.userProfile.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    console.log('✅ Login successful for user:', email);
    const token = generateToken({ id: user.id, email: user.email, type: user.type });
    
    res.json({ token, user: { 
      id: user.id, 
      email: user.email, 
      name: user.name, 
      tier: user.tier,
      type: user.type,
      parqCompleted: user.parqCompleted,
      isAdmin: user.isAdmin
    }});
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Login error:', error);
    }
    res.status(500).json({ error: 'Login failed' });
  }
};

app.post('/api/login', authLimiter as any, loginValidation, handleValidationErrors, loginHandler);

// Logout endpoint
app.post('/api/logout', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // For JWT tokens, logout is handled client-side by removing the token
    // Here we could implement token blacklisting if needed
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Error reporting endpoint
app.post('/api/report-error', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 error reports per windowMs
  message: { error: 'Too many error reports. Please try again later.' }
}) as any, [
  body('message').isString().isLength({ min: 1, max: 1000 }),
  body('stack').optional().isString().isLength({ max: 5000 }),
  body('userAgent').optional().isString().isLength({ max: 500 }),
  body('url').optional().isString().isLength({ max: 500 }),
  body('timestamp').optional().isISO8601(),
  body('severity').optional().isIn(['low', 'medium', 'high', 'critical'])
], handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { message, stack, userAgent, url, timestamp, severity = 'medium' } = req.body;
    
    // Log the error for immediate visibility
    logger.error('Client error reported', {
      message,
      stack: stack?.substring(0, 1000), // Truncate for logging
      userAgent,
      url,
      timestamp,
      severity,
      ip: req.ip
    } as any);

    // Store in database for analytics and tracking
    try {
      await prisma.errorReport.create({
        data: {
          message: message.substring(0, 1000), // Ensure we don't exceed DB limits
          stack: stack?.substring(0, 5000),
          userAgent: userAgent?.substring(0, 500),
          url: url?.substring(0, 500),
          timestamp: timestamp ? new Date(timestamp) : new Date(),
          severity,
          ipAddress: req.ip,
          resolved: false
        }
      });
    } catch (dbError) {
      // If database fails, still log to console
      logger.error('Failed to store error report in database', dbError as any);
    }

    res.status(201).json({ 
      message: 'Error reported successfully',
      reportId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });
  } catch (error) {
    logger.error('Error reporting endpoint failed', error as any);
    res.status(500).json({ error: 'Failed to report error' });
  }
});

// Old auth middleware removed - using new unified auth from auth.ts

// User profile endpoint for auth validation
app.get('/api/profile', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    
    const user = req.user;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        height: user.height,
        weight: user.weight,
        age: user.age,
        gender: user.gender,
        fitnessGoals: user.fitnessGoals,
        activityLevel: user.activityLevel,
        dietaryPreferences: user.dietaryPreferences,
        emailNotifications: user.emailNotifications,
        telegramEnabled: user.telegramEnabled,
        tier: user.tier,
        type: user.type,
        parqCompleted: user.parqCompleted,
        isAdmin: user.isAdmin,
        subscriptionStatus: user.subscriptionStatus,
        notificationPreferences: user.notificationPreferences,
        healthConditions: user.healthConditions,
        injuryHistory: user.injuryHistory,
        equipmentAvailability: user.equipmentAvailability,
        preferredWorkoutDuration: user.preferredWorkoutDuration,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('❌ Profile endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch profile data' });
  }
});

// Update user profile endpoint
// Profile update validation
const profileValidation = [
  body('name').optional().isLength({ min: 2, max: 50 }).trim(),
  body('height').optional().isFloat({ min: 36, max: 96 }), // Height in inches (3 feet to 8 feet)
  body('weight').optional().isFloat({ min: 30, max: 500 }),
  body('age').optional().isInt({ min: 13, max: 120 }),
  body('gender').optional().isIn(['male', 'female', 'other']),
  body('fitnessGoals').optional().isArray(),
  body('activityLevel').optional().isIn(['sedentary', 'light', 'moderate', 'active', 'very_active']),
  body('dietaryPreferences').optional().isArray(),
  body('equipmentAvailability').optional().isArray(),
  body('preferredWorkoutDuration').optional().isLength({ max: 50 })
];

app.put('/api/profile', authenticate, profileValidation, handleValidationErrors, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const {
      name,
      height,
      weight,
      age,
      gender,
      fitnessGoals,
      activityLevel,
      dietaryPreferences,
      equipmentAvailability,
      preferredWorkoutDuration,
      notifications,
      avatar
    } = req.body;
    
    // Update user profile
    const updatedUser = await prisma.userProfile.update({
      where: { id: userId },
      data: {
        name,
        height: Number(height),
        weight: Number(weight),
        age: Number(age),
        gender,
        fitnessGoals: Array.isArray(fitnessGoals) ? fitnessGoals : [],
        activityLevel,
        dietaryPreferences: Array.isArray(dietaryPreferences) ? dietaryPreferences : [],
        equipmentAvailability: Array.isArray(equipmentAvailability) ? equipmentAvailability : [],
        preferredWorkoutDuration,
        emailNotifications: notifications?.email ?? true,
        telegramEnabled: notifications?.telegram ?? false,
        avatar: avatar || null
      }
    });
    
    res.json({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      height: updatedUser.height,
      weight: updatedUser.weight,
      age: updatedUser.age,
      gender: updatedUser.gender,
      fitnessGoals: updatedUser.fitnessGoals,
      activityLevel: updatedUser.activityLevel,
      dietaryPreferences: updatedUser.dietaryPreferences,
      equipmentAvailability: updatedUser.equipmentAvailability,
      preferredWorkoutDuration: updatedUser.preferredWorkoutDuration,
      emailNotifications: updatedUser.emailNotifications,
      telegramEnabled: updatedUser.telegramEnabled,
      tier: updatedUser.tier,
      type: updatedUser.type,
      parqCompleted: updatedUser.parqCompleted,
      avatar: updatedUser.avatar
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// User dashboard endpoint
app.get('/api/dashboard', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      name: user.name,
      email: user.email,
      parqCompleted: user.parqCompleted,
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Log a completed workout
app.post('/api/workout-log', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const { planId, workoutId, exercises, notes, rating, duration, completionRate, completed } = req.body;
  try {
    const log = await prisma.workoutLog.create({
      data: { 
        userId, 
        planId, 
        workoutId, 
        exercises, 
        notes,
        completed: completed ?? true, // Default to true if not specified
        rating: rating || null,
        duration: duration || null,
        completionRate: completionRate || null
      }
    });
    res.json(log);
  } catch (error) {
    console.error('Failed to log workout:', error);
    res.status(500).json({ error: 'Failed to log workout' });
  }
});

// Get workout history for user
app.get('/api/workout-log', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const logs = await prisma.workoutLog.findMany({
      where: { userId },
      orderBy: { date: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    console.error('Failed to fetch workout history:', error);
    res.status(500).json({ error: 'Failed to fetch workout history' });
  }
});

// Generate workout names using AI
app.post('/api/generate-workout-names', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { planGoal, numberOfWorkouts, workoutTypes } = req.body;

    // Validate input
    if (!planGoal || typeof planGoal !== 'string') {
      return res.status(400).json({ error: 'planGoal is required and must be a string' });
    }

    if (!numberOfWorkouts || typeof numberOfWorkouts !== 'number' || numberOfWorkouts < 1 || numberOfWorkouts > 20) {
      return res.status(400).json({ error: 'numberOfWorkouts must be a number between 1 and 20' });
    }

    const validWorkoutTypes = Array.isArray(workoutTypes) ? workoutTypes : [];

    // Generate workout names using OpenAI service
    const workoutNames = await openaiService.generateWorkoutNames(
      planGoal,
      numberOfWorkouts,
      validWorkoutTypes
    );

    res.json({
      success: true,
      workoutNames,
      metadata: {
        planGoal,
        numberOfWorkouts,
        workoutTypes: validWorkoutTypes
      }
    });

  } catch (error) {
    console.error('Error generating workout names:', error);
    res.status(500).json({ 
      error: 'Failed to generate workout names',
      message: 'Please try again or use default names'
    });
  }
});

// NUTRITION LOG ENDPOINTS
// Get nutrition logs for user
app.get('/api/nutrition-log', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const logs = await prisma.nutritionLog.findMany({
      where: { userId },
      orderBy: { date: 'desc' }
    });
    console.log(`Successfully fetched ${logs.length} nutrition logs for user ${userId}`);
    res.json(logs);
  } catch (error) {
    console.error('Failed to fetch nutrition logs:', error);
    
    // Provide more specific error responses
    if (error instanceof Error) {
      if (error.message.includes('database')) {
        res.status(503).json({ 
          error: 'Database temporarily unavailable',
          message: 'Please try again in a few moments',
          code: 'DATABASE_ERROR'
        });
      } else {
        res.status(500).json({ 
          error: 'Failed to fetch nutrition logs',
          message: 'An internal server error occurred',
          code: 'INTERNAL_ERROR'
        });
      }
    } else {
      res.status(500).json({ 
        error: 'Failed to fetch nutrition logs',
        message: 'An unknown error occurred',
        code: 'UNKNOWN_ERROR'
      });
    }
  }
});

// Create a new nutrition log
app.post('/api/nutrition-log', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { date, foods, calories, notes } = req.body;
    
    if (!date || !foods || !Array.isArray(foods)) {
      return res.status(400).json({ error: 'Invalid input. Date and foods array required.' });
    }

    // Validate food entries structure
    for (const food of foods) {
      if (!food.name || typeof food.calories !== 'number') {
        return res.status(400).json({ 
          error: 'Invalid food entry. Each entry must have name and calories.' 
        });
      }
    }

    // Check if a log for this date already exists
    const existingLog = await prisma.nutritionLog.findFirst({
      where: {
        userId,
        date: {
          gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
          lt: new Date(new Date(date).setHours(23, 59, 59, 999))
        }
      }
    });

    let log;
    if (existingLog) {
      // Update existing log by merging foods
      const mergedFoods = [...(existingLog.foods as any[]), ...foods];
      const totalCalories = mergedFoods.reduce((sum, food) => sum + (food.calories || 0), 0);
      
      log = await prisma.nutritionLog.update({
        where: { id: existingLog.id },
        data: {
          foods: mergedFoods,
          calories: totalCalories,
          notes: notes || existingLog.notes || ''
        }
      });
    } else {
      // Create new log
      log = await prisma.nutritionLog.create({
        data: {
          userId,
          date: new Date(date),
          foods,
          calories: calories || 0,
          notes: notes || ''
        }
      });
    }
    
    res.status(201).json(log);
  } catch (error) {
    console.error('Failed to create nutrition log:', error);
    res.status(500).json({ error: 'Failed to create nutrition log' });
  }
});

// Update a nutrition log
app.put('/api/nutrition-log/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { date, foods, calories, notes } = req.body;
    
    // Check if log exists and belongs to user
    const existingLog = await prisma.nutritionLog.findFirst({
      where: { id, userId }
    });
    
    if (!existingLog) {
      return res.status(404).json({ error: 'Nutrition log not found' });
    }
    
    const updatedLog = await prisma.nutritionLog.update({
      where: { id },
      data: {
        date: date ? new Date(date) : undefined,
        foods,
        calories,
        notes
      }
    });
    
    res.json(updatedLog);
  } catch (error) {
    console.error('Failed to update nutrition log:', error);
    res.status(500).json({ error: 'Failed to update nutrition log' });
  }
});

// Delete a nutrition log
app.delete('/api/nutrition-log/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    
    // Check if log exists and belongs to user
    const existingLog = await prisma.nutritionLog.findFirst({
      where: { id, userId }
    });
    
    if (!existingLog) {
      return res.status(404).json({ error: 'Nutrition log not found' });
    }
    
    await prisma.nutritionLog.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    console.error('Failed to delete nutrition log:', error);
    res.status(500).json({ error: 'Failed to delete nutrition log' });
  }
});

// Get daily nutrition summary for a specific date
app.get('/api/nutrition-log/daily/:date', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { date } = req.params;
    
    // Validate date format
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    
    // Get nutrition log for the specific date
    const log = await prisma.nutritionLog.findFirst({
      where: {
        userId,
        date: {
          gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
          lt: new Date(new Date(date).setHours(23, 59, 59, 999))
        }
      }
    });

    if (!log) {
      return res.json({
        date,
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        foods: [],
        isEmpty: true
      });
    }

    // Calculate totals from foods
    const foods = (log.foods as any[]) || [];
    const totals = foods.reduce((acc, food) => ({
      calories: acc.calories + (Number(food.calories) || 0),
      protein: acc.protein + (Number(food.protein) || 0),
      carbs: acc.carbs + (Number(food.carbs) || 0),
      fat: acc.fat + (Number(food.fat) || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    res.json({
      date,
      totalCalories: Math.round(totals.calories),
      totalProtein: Math.round(totals.protein * 10) / 10,
      totalCarbs: Math.round(totals.carbs * 10) / 10,
      totalFat: Math.round(totals.fat * 10) / 10,
      foods,
      notes: log.notes || '',
      isEmpty: false
    });
  } catch (error) {
    console.error('Failed to fetch daily nutrition summary:', error);
    res.status(500).json({ error: 'Failed to fetch daily nutrition summary' });
  }
});

// Get weekly nutrition summary
app.get('/api/nutrition-log/weekly', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { startDate } = req.query;
    
    // Calculate week range
    const start = startDate ? new Date(startDate as string) : new Date();
    if (!startDate) {
      // Start from last Monday
      const dayOfWeek = start.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      start.setDate(start.getDate() - daysToMonday);
    }
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    end.setHours(0, 0, 0, 0);

    // Get all logs for the week
    const logs = await prisma.nutritionLog.findMany({
      where: {
        userId,
        date: {
          gte: start,
          lt: end
        }
      },
      orderBy: { date: 'asc' }
    });

    // Process daily summaries
    const dailySummaries = [];
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      const dayLog = logs.find(log => 
        log.date.toISOString().split('T')[0] === dateStr
      );

      if (dayLog) {
        const foods = (dayLog.foods as any[]) || [];
        const totals = foods.reduce((acc, food) => ({
          calories: acc.calories + (Number(food.calories) || 0),
          protein: acc.protein + (Number(food.protein) || 0),
          carbs: acc.carbs + (Number(food.carbs) || 0),
          fat: acc.fat + (Number(food.fat) || 0)
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

        dailySummaries.push({
          date: dateStr,
          dayOfWeek: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
          totalCalories: Math.round(totals.calories),
          totalProtein: Math.round(totals.protein * 10) / 10,
          totalCarbs: Math.round(totals.carbs * 10) / 10,
          totalFat: Math.round(totals.fat * 10) / 10,
          foodCount: foods.length,
          hasData: true
        });
      } else {
        dailySummaries.push({
          date: dateStr,
          dayOfWeek: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0,
          foodCount: 0,
          hasData: false
        });
      }
    }

    // Calculate weekly totals and averages
    const weeklyTotals = dailySummaries.reduce((acc, day) => ({
      calories: acc.calories + day.totalCalories,
      protein: acc.protein + day.totalProtein,
      carbs: acc.carbs + day.totalCarbs,
      fat: acc.fat + day.totalFat,
      daysWithData: acc.daysWithData + (day.hasData ? 1 : 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, daysWithData: 0 });

    const averages = {
      calories: weeklyTotals.daysWithData > 0 ? Math.round(weeklyTotals.calories / weeklyTotals.daysWithData) : 0,
      protein: weeklyTotals.daysWithData > 0 ? Math.round((weeklyTotals.protein / weeklyTotals.daysWithData) * 10) / 10 : 0,
      carbs: weeklyTotals.daysWithData > 0 ? Math.round((weeklyTotals.carbs / weeklyTotals.daysWithData) * 10) / 10 : 0,
      fat: weeklyTotals.daysWithData > 0 ? Math.round((weeklyTotals.fat / weeklyTotals.daysWithData) * 10) / 10 : 0
    };

    res.json({
      weekStart: start.toISOString().split('T')[0],
      weekEnd: new Date(end.getTime() - 86400000).toISOString().split('T')[0], // End is exclusive, so subtract 1 day for display
      dailySummaries,
      weeklyTotals: {
        calories: Math.round(weeklyTotals.calories),
        protein: Math.round(weeklyTotals.protein * 10) / 10,
        carbs: Math.round(weeklyTotals.carbs * 10) / 10,
        fat: Math.round(weeklyTotals.fat * 10) / 10
      },
      averages,
      daysWithData: weeklyTotals.daysWithData,
      completionRate: Math.round((weeklyTotals.daysWithData / 7) * 100)
    });
  } catch (error) {
    console.error('Failed to fetch weekly nutrition summary:', error);
    res.status(500).json({ error: 'Failed to fetch weekly nutrition summary' });
  }
});

// Get monthly nutrition summary
app.get('/api/nutrition-log/monthly', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { year, month } = req.query;
    
    // Calculate month range
    const currentDate = new Date();
    const targetYear = year ? parseInt(year as string) : currentDate.getFullYear();
    const targetMonth = month ? parseInt(month as string) - 1 : currentDate.getMonth(); // JS months are 0-indexed
    
    const start = new Date(targetYear, targetMonth, 1);
    const end = new Date(targetYear, targetMonth + 1, 0); // Last day of month
    end.setHours(23, 59, 59, 999);

    // Get all logs for the month
    const logs = await prisma.nutritionLog.findMany({
      where: {
        userId,
        date: {
          gte: start,
          lte: end
        }
      },
      orderBy: { date: 'asc' }
    });

    // Process daily summaries
    const dailySummaries = [];
    const daysInMonth = end.getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(targetYear, targetMonth, day);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      const dayLog = logs.find(log => 
        log.date.toISOString().split('T')[0] === dateStr
      );

      if (dayLog) {
        const foods = (dayLog.foods as any[]) || [];
        const totals = foods.reduce((acc, food) => ({
          calories: acc.calories + (Number(food.calories) || 0),
          protein: acc.protein + (Number(food.protein) || 0),
          carbs: acc.carbs + (Number(food.carbs) || 0),
          fat: acc.fat + (Number(food.fat) || 0)
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

        dailySummaries.push({
          date: dateStr,
          day: day,
          totalCalories: Math.round(totals.calories),
          totalProtein: Math.round(totals.protein * 10) / 10,
          totalCarbs: Math.round(totals.carbs * 10) / 10,
          totalFat: Math.round(totals.fat * 10) / 10,
          foodCount: foods.length,
          hasData: true
        });
      } else {
        dailySummaries.push({
          date: dateStr,
          day: day,
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0,
          foodCount: 0,
          hasData: false
        });
      }
    }

    // Calculate monthly totals and averages
    const monthlyTotals = dailySummaries.reduce((acc, day) => ({
      calories: acc.calories + day.totalCalories,
      protein: acc.protein + day.totalProtein,
      carbs: acc.carbs + day.totalCarbs,
      fat: acc.fat + day.totalFat,
      daysWithData: acc.daysWithData + (day.hasData ? 1 : 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, daysWithData: 0 });

    const averages = {
      calories: monthlyTotals.daysWithData > 0 ? Math.round(monthlyTotals.calories / monthlyTotals.daysWithData) : 0,
      protein: monthlyTotals.daysWithData > 0 ? Math.round((monthlyTotals.protein / monthlyTotals.daysWithData) * 10) / 10 : 0,
      carbs: monthlyTotals.daysWithData > 0 ? Math.round((monthlyTotals.carbs / monthlyTotals.daysWithData) * 10) / 10 : 0,
      fat: monthlyTotals.daysWithData > 0 ? Math.round((monthlyTotals.fat / monthlyTotals.daysWithData) * 10) / 10 : 0
    };

    // Calculate nutrition streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    
    for (let i = dailySummaries.length - 1; i >= 0; i--) {
      if (dailySummaries[i].hasData) {
        tempStreak++;
        if (i === dailySummaries.length - 1 || currentStreak === 0) {
          currentStreak = tempStreak;
        }
      } else {
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
        tempStreak = 0;
      }
    }
    
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }

    res.json({
      year: targetYear,
      month: targetMonth + 1, // Convert back to 1-indexed
      monthName: start.toLocaleDateString('en-US', { month: 'long' }),
      dailySummaries,
      monthlyTotals: {
        calories: Math.round(monthlyTotals.calories),
        protein: Math.round(monthlyTotals.protein * 10) / 10,
        carbs: Math.round(monthlyTotals.carbs * 10) / 10,
        fat: Math.round(monthlyTotals.fat * 10) / 10
      },
      averages,
      daysWithData: monthlyTotals.daysWithData,
      completionRate: Math.round((monthlyTotals.daysWithData / daysInMonth) * 100),
      streaks: {
        current: currentStreak,
        longest: longestStreak
      },
      daysInMonth
    });
  } catch (error) {
    console.error('Failed to fetch monthly nutrition summary:', error);
    res.status(500).json({ error: 'Failed to fetch monthly nutrition summary' });
  }
});

// Get nutrition insights and recommendations
app.get('/api/nutrition-log/insights', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = req.user!;
    
    // Get last 30 days of data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const logs = await prisma.nutritionLog.findMany({
      where: {
        userId,
        date: {
          gte: thirtyDaysAgo
        }
      },
      orderBy: { date: 'desc' }
    });

    if (logs.length === 0) {
      return res.json({
        insights: ['Start logging your meals to get personalized nutrition insights!'],
        recommendations: ['Begin by tracking your breakfast tomorrow'],
        stats: {
          loggingDays: 0,
          averageCalories: 0,
          consistencyScore: 0
        }
      });
    }

    // Calculate insights
    const insights = [];
    const recommendations = [];
    
    // Calculate averages
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let daysWithData = 0;

    logs.forEach(log => {
      const foods = (log.foods as any[]) || [];
      if (foods.length > 0) {
        daysWithData++;
        const dayTotals = foods.reduce((acc, food) => ({
          calories: acc.calories + (Number(food.calories) || 0),
          protein: acc.protein + (Number(food.protein) || 0),
          carbs: acc.carbs + (Number(food.carbs) || 0),
          fat: acc.fat + (Number(food.fat) || 0)
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

        totalCalories += dayTotals.calories;
        totalProtein += dayTotals.protein;
        totalCarbs += dayTotals.carbs;
        totalFat += dayTotals.fat;
      }
    });

    const averages = daysWithData > 0 ? {
      calories: Math.round(totalCalories / daysWithData),
      protein: Math.round((totalProtein / daysWithData) * 10) / 10,
      carbs: Math.round((totalCarbs / daysWithData) * 10) / 10,
      fat: Math.round((totalFat / daysWithData) * 10) / 10
    } : { calories: 0, protein: 0, carbs: 0, fat: 0 };

    // Generate insights based on data
    const consistencyScore = Math.round((daysWithData / 30) * 100);
    
    if (consistencyScore >= 80) {
      insights.push(`Excellent consistency! You've logged nutrition for ${daysWithData} out of the last 30 days.`);
    } else if (consistencyScore >= 50) {
      insights.push(`Good progress! You've logged nutrition for ${daysWithData} days. Try to maintain consistency.`);
      recommendations.push('Aim to log your meals every day for better insights');
    } else {
      insights.push(`You've logged nutrition for ${daysWithData} days. More consistent logging will help you reach your goals.`);
      recommendations.push('Try setting daily reminders to log your meals');
    }

    // Analyze calorie patterns
    if (averages.calories > 0) {
      if (user.gender && user.age && user.weight && user.height && user.activityLevel) {
        // Calculate estimated daily needs
        let bmr: number;
        if (user.gender === 'male') {
          bmr = (10 * user.weight) + (6.25 * user.height) - (5 * user.age) + 5;
        } else {
          bmr = (10 * user.weight) + (6.25 * user.height) - (5 * user.age) - 161;
        }

        const activityMultipliers: Record<string, number> = {
          sedentary: 1.2,
          light: 1.375,
          moderate: 1.55,
          active: 1.725,
          'very-active': 1.9
        };

        const multiplier = activityMultipliers[user.activityLevel] || 1.55;
        const estimatedNeeds = Math.round(bmr * multiplier);

        const calorieRatio = averages.calories / estimatedNeeds;
        
        if (calorieRatio < 0.8) {
          insights.push(`Your average calorie intake (${averages.calories}) is below estimated needs (${estimatedNeeds}).`);
          recommendations.push('Consider increasing your calorie intake with nutrient-dense foods');
        } else if (calorieRatio > 1.2) {
          insights.push(`Your average calorie intake (${averages.calories}) exceeds estimated needs (${estimatedNeeds}).`);
          recommendations.push('Focus on portion control and nutrient-dense, lower-calorie foods');
        } else {
          insights.push(`Your calorie intake (${averages.calories}) aligns well with your estimated needs (${estimatedNeeds}).`);
        }
      }

      // Analyze macronutrient ratios
      const totalMacros = averages.protein * 4 + averages.carbs * 4 + averages.fat * 9; // Calories from macros
      if (totalMacros > 0) {
        const proteinPercent = Math.round((averages.protein * 4 / totalMacros) * 100);
        const carbPercent = Math.round((averages.carbs * 4 / totalMacros) * 100);
        const fatPercent = Math.round((averages.fat * 9 / totalMacros) * 100);

        if (proteinPercent < 15) {
          recommendations.push('Consider increasing protein intake for better muscle maintenance');
        } else if (proteinPercent > 35) {
          recommendations.push('Your protein intake is quite high - ensure you\'re getting enough carbs and fats');
        }

        if (fatPercent < 20) {
          recommendations.push('Include more healthy fats like nuts, avocados, and olive oil');
        } else if (fatPercent > 40) {
          recommendations.push('Consider reducing fat intake and increasing complex carbohydrates');
        }

        insights.push(`Your macro split: ${proteinPercent}% protein, ${carbPercent}% carbs, ${fatPercent}% fat`);
      }
    }

    // Check for recent patterns
    const recentLogs = logs.slice(0, 7); // Last 7 days
    const recentDaysWithData = recentLogs.filter(log => (log.foods as any[])?.length > 0).length;
    
    if (recentDaysWithData < 3) {
      recommendations.push('Try to log meals more consistently this week');
    }

    res.json({
      insights,
      recommendations,
      stats: {
        loggingDays: daysWithData,
        averageCalories: averages.calories,
        consistencyScore,
        period: '30 days'
      }
    });
  } catch (error) {
    console.error('Failed to generate nutrition insights:', error);
    res.status(500).json({ error: 'Failed to generate nutrition insights' });
  }
});

// NOTIFICATION PREFERENCES ENDPOINTS
// Get user notification preferences
app.get('/api/user/notification-preferences', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.userProfile.findUnique({
      where: { id: userId },
      select: { notificationPreferences: true }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user.notificationPreferences || {});
  } catch (error) {
    console.error('Failed to fetch notification preferences:', error);
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
});

// Update user notification preferences
app.put('/api/user/notification-preferences', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const preferences = req.body;
    
    const updatedUser = await prisma.userProfile.update({
      where: { id: userId },
      data: { 
        notificationPreferences: preferences,
        telegramEnabled: preferences.telegramEnabled || false,
        telegramChatId: preferences.telegramChatId || null
      }
    });
    
    res.json(updatedUser.notificationPreferences);
  } catch (error) {
    console.error('Failed to update notification preferences:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

// Delete a nutrition log (commented out - replaced above)
// app.delete('/api/nutrition-log/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
//   const userId = req.user.userId;
//   const { id } = req.params;
//   try {
//     const log = await prisma.nutritionLog.findUnique({ where: { id } });
//     if (!log || log.userId !== userId) return res.status(404).json({ error: 'Log not found' });
//     await prisma.nutritionLog.delete({ where: { id } });
//     res.json({ success: true });
//   } catch {
//     res.status(500).json({ error: 'Failed to delete log' });
//   }
// });

// Edit a nutrition log
// app.put('/api/nutrition-log/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
//   const userId = req.user.userId;
//   const { id } = req.params;
//   const { foods, calories, macros, notes } = req.body;
//   try {
//     const log = await prisma.nutritionLog.findUnique({ where: { id } });
//     if (!log || log.userId !== userId) return res.status(404).json({ error: 'Log not found' });
//     const updated = await prisma.nutritionLog.update({
//       where: { id },
//       data: { foods, calories, macros, notes },
//     });
//     res.json(updated);
//   } catch {
//     res.status(500).json({ error: 'Failed to update log' });
//   }
// });

// Content management endpoints
app.get('/api/admin/content', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const items = await prisma.contentItem.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(items);
  } catch (error) {
    console.error('Error fetching content:', error);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

app.post('/api/admin/content', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { title, type, body } = req.body;
  
  // Validation
  if (!title || !type || !body) {
    return res.status(400).json({ error: 'Title, type, and body are required' });
  }
  
  try {
    const item = await prisma.contentItem.create({ 
      data: { title, type, body } 
    });
    res.json(item);
  } catch (error) {
    console.error('Error creating content:', error);
    res.status(500).json({ error: 'Failed to create content' });
  }
});

app.put('/api/admin/content/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { title, type, body } = req.body;
  
  // Validation
  if (!title || !type || !body) {
    return res.status(400).json({ error: 'Title, type, and body are required' });
  }
  
  try {
    const item = await prisma.contentItem.update({ 
      where: { id }, 
      data: { title, type, body } 
    });
    res.json(item);
  } catch (error: any) {
    console.error('Error updating content:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Content item not found' });
    }
    res.status(500).json({ error: 'Failed to update content' });
  }
});

app.delete('/api/admin/content/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  
  try {
    await prisma.contentItem.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting content:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Content item not found' });
    }
    res.status(500).json({ error: 'Failed to delete content' });
  }
});

// Import secure routes
import telegramRoutes from './routes/telegramRoutes';
import foodScanRoutes from './routes/foodScanRoutes';
import stripeWebhookRoutes from './routes/stripeWebhookRoutes';
import passwordResetRoutes from './routes/passwordResetRoutes';
import mealPlanRoutes from './routes/mealPlanRoutes';
import recipeRoutes from './routes/recipeRoutes';
import analyticsRoutes from './routes/analyticsRoutes';

// Use secure routes with proper authentication and premium checks
app.use('/api/stripe', stripeWebhookRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/food', foodScanRoutes);
app.use('/api/password', passwordResetRoutes);
app.use('/api/meal-plans', mealPlanRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/analytics', analyticsRoutes);

// Guest registration endpoint
app.post('/api/guest-register', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const guestEmail = `guest-${Date.now()}@fitarchitect.com`;
    const randomPassword = await bcrypt.hash(Math.random().toString(36).slice(-8), 10);
    const user = await prisma.userProfile.create({
      data: {
        email: guestEmail,
        name: 'Guest User',
        type: 'guest',
        height: 170,
        weight: 70,
        age: 30,
        gender: 'other',
        fitnessGoals: ['general_fitness'],
        activityLevel: 'moderate',
        dietaryPreferences: [],
        password: randomPassword,
        parqCompleted: true, // Allow guests to generate workouts immediately
        trialEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        equipmentAvailability: ['bodyweight'], // Default to bodyweight exercises
      },
    });
    const token = generateToken({ id: user.id, email: user.email, type: 'guest' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, type: user.type } });
  } catch (error) {
    res.status(500).json({ error: 'Guest registration failed' });
  }
});

// Upgrade guest to registered user endpoint
app.post('/api/upgrade-guest', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { email, password, name } = req.body;
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const existing = await prisma.userProfile.findUnique({ where: { email } });
    if (existing && existing.id !== userId) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.userProfile.update({
      where: { id: userId },
      data: {
        email,
        password: hashed,
        name,
        type: 'registered',
      },
    });
    const token = jwt.sign({ userId: user.id, email: user.email, type: 'registered' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, type: user.type } });
  } catch (error) {
    res.status(500).json({ error: 'Upgrade failed' });
  }
});

// Enhanced GET /api/admin/subscriptions with filtering/sorting
app.get('/api/admin/subscriptions', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // TODO: Add filtering/sorting logic
    const subs = await prisma.subscription.findMany({
      include: { user: true, planRef: true },
    });
    res.json(subs.map((sub: any) => ({
      id: sub.id,
      userEmail: sub.user?.email,
      plan: sub.plan, // string
      planName: sub.planRef?.name, // Plan relation (optional)
      status: sub.status,
      startDate: sub.startDate,
      endDate: sub.endDate,
    })));
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get subscription details
app.get('/api/admin/subscriptions/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sub = await prisma.subscription.findUnique({
      where: { id: req.params.id },
      include: { user: true, planRef: true, payments: true },
    });
    if (!sub) return res.status(404).json({ error: 'Not found' });
    res.json({
      id: sub.id,
      userEmail: sub.user?.email,
      plan: sub.plan, // string
      planName: sub.planRef?.name, // Plan relation (optional)
      status: sub.status,
      startDate: sub.startDate,
      endDate: sub.endDate,
      paymentHistory: sub.payments?.map((p: any) => ({
        id: p.id,
        amount: p.amount,
        date: p.date,
        status: p.status,
      })) || [],
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Cancel subscription
app.post('/api/admin/subscriptions/:id/cancel', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    // Optionally cancel in Stripe as well
    const sub = await prisma.subscription.update({ where: { id }, data: { status: 'cancelled', endDate: new Date() } });
    res.json(sub);
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Refund subscription - Basic implementation with database updates
app.post('/api/admin/subscriptions/:id/refund', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { refundAmount, reason } = req.body;
    
    // Find the subscription
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: { user: true, payments: true }
    });
    
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    // Update subscription status to cancelled
    const updatedSubscription = await prisma.subscription.update({
      where: { id },
      data: { 
        status: 'cancelled',
        endDate: new Date()
      }
    });
    
    // Create a refund payment record (negative amount)
    const refundPayment = await prisma.payment.create({
      data: {
        userId: subscription.userId,
        subscriptionId: id,
        amount: -(refundAmount || 0),
        currency: 'usd',
        status: 'refunded',
        // Note: In real implementation, this would integrate with Stripe
        stripePaymentIntentId: `refund_${Date.now()}_admin`
      }
    });
    
    // Log the admin action
    console.log(`Admin refund initiated:`, {
      adminUser: req.user?.email,
      subscriptionId: id,
      userEmail: subscription.user.email,
      refundAmount: refundAmount || 0,
      reason: reason || 'Admin initiated refund',
      timestamp: new Date().toISOString()
    });
    
    res.json({ 
      success: true,
      message: 'Refund processed successfully',
      refundDetails: {
        subscriptionId: id,
        refundAmount: refundAmount || 0,
        refundPaymentId: refundPayment.id,
        updatedSubscription: updatedSubscription
      }
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

// Change plan
app.post('/api/admin/subscriptions/:id/change-plan', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { planId, plan } = req.body;
    const sub = await prisma.subscription.update({ where: { id }, data: { planId, plan } });
    res.json(sub);
  } catch (error) {
    res.status(500).json({ error: 'Failed to change plan' });
  }
});

// Plans management
app.get('/api/admin/plans', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const plans = await prisma.plan.findMany();
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});
app.post('/api/admin/plans', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, price } = req.body;
    const plan = await prisma.plan.create({ data: { name, price } });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create plan' });
  }
});
app.patch('/api/admin/plans/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, price } = req.body;
    const plan = await prisma.plan.update({ where: { id }, data: { name, price } });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update plan' });
  }
});
app.delete('/api/admin/plans/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.plan.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete plan' });
  }
});

// Analytics endpoint
app.get('/api/admin/subscriptions/analytics', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [revenue, active, cancelled, total] = await Promise.all([
      prisma.payment.aggregate({ _sum: { amount: true } }),
      prisma.subscription.count({ where: { status: 'active' } }),
      prisma.subscription.count({ where: { status: 'cancelled' } }),
      prisma.subscription.count(),
    ]);
    const churn = total ? (cancelled / total) * 100 : 0;
    res.json({ revenue: revenue._sum.amount || 0, active, cancelled, churn: Math.round(churn * 100) / 100 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// GET all PAR-Q submissions (admin)
app.get('/api/admin/parq-responses', authenticate, requireAdmin, async (req, res) => {
  try {
    const responses = await prisma.parqResponse.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(responses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch PAR-Q responses' });
  }
});
// GET a specific user's PAR-Q answers (admin)
app.get('/api/admin/parq-responses/:userId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const response = await prisma.parqResponse.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch PAR-Q response' });
  }
});
// Flag a response/question for follow-up (admin)
app.post('/api/admin/parq-responses/:userId/flag', authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { flaggedQuestions } = req.body;
    const response = await prisma.parqResponse.updateMany({
      where: { userId },
      data: { flagged: true, flaggedQuestions },
    });
    // TODO: Trigger notification to admins
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to flag PAR-Q response' });
  }
});
// Add a follow-up note (admin)
app.post('/api/admin/parq-responses/:userId/note', authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { note } = req.body;
    const response = await prisma.parqResponse.updateMany({
      where: { userId },
      data: { notes: { push: note } },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add note' });
  }
});
// Generate PAR-Q report (admin)
app.get('/api/admin/parq-report', authenticate, requireAdmin, async (req, res) => {
  try {
    // Example: count flagged, total, trends
    const total = await prisma.parqResponse.count();
    const flagged = await prisma.parqResponse.count({ where: { flagged: true } });
    // TODO: Add more analytics
    res.json({ total, flagged, flaggedRate: total ? (flagged / total) * 100 : 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate report' });
  }
});
// User: update their PAR-Q answers
app.patch('/api/parq-response', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = req.user;
    const { answers } = req.body;
    
    // Create PAR-Q response
    const response = await prisma.parqResponse.create({ 
      data: { userId, answers, flagged: false, flaggedQuestions: [], notes: [] } 
    });
    
    // Prepare user profile updates
    const updateData: any = { 
      parqAnswers: answers,
      parqCompleted: true
    };
    
    // Grant 3-day premium trial for guests after PAR-Q completion
    if (user.type === 'guest') {
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 3);
      
      updateData.tier = 'premium';
      updateData.subscriptionStatus = 'active';
      updateData.trialEndDate = trialEndDate;
      
      console.log(`Granting 3-day premium trial to guest ${user.email} until ${trialEndDate}`);
    }
    
    // Update the user profile
    await prisma.userProfile.update({ where: { id: userId }, data: updateData });
    
    res.json(response);
  } catch (error) {
    console.error('PAR-Q completion error:', error);
    res.status(500).json({ error: 'Failed to update PAR-Q' });
  }
});
// User: get their PAR-Q answers
app.get('/api/parq-response', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const response = await prisma.parqResponse.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch PAR-Q' });
  }
});

// --- System Management Endpoints (Database-backed) ---

// NOTE: Main settings endpoints are implemented later in the file (lines ~5720)
// These are additional system management endpoints

app.get('/api/admin/flagged-content', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get content items that might need review (you could add a flagged field to ContentItem if needed)
    const flaggedContent = await prisma.contentItem.findMany({
      where: {
        // For now, get recently created content as potentially flagged
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    
    res.json(flaggedContent);
  } catch (error) {
    console.error('Error fetching flagged content:', error);
    res.status(500).json({ error: 'Failed to fetch flagged content' });
  }
});

app.post('/api/admin/content/:id/approve', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Update content status (you could add an approved field if needed)
    const content = await prisma.contentItem.findUnique({ where: { id } });
    
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    // Log admin action
    await prisma.auditLog.create({
      data: {
        adminUserId: req.user?.id || '',
        adminEmail: req.user?.email || '',
        action: 'approve',
        resourceType: 'content',
        resourceId: id,
        resourceName: content.title,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error approving content:', error);
    res.status(500).json({ error: 'Failed to approve content' });
  }
});

app.post('/api/admin/content/:id/reject', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const content = await prisma.contentItem.findUnique({ where: { id } });
    
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    // Log admin action
    await prisma.auditLog.create({
      data: {
        adminUserId: req.user?.id || '',
        adminEmail: req.user?.email || '',
        action: 'reject',  
        resourceType: 'content',
        resourceId: id,
        resourceName: content.title,
        details: { reason: reason || 'Admin rejection' },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error rejecting content:', error);
    res.status(500).json({ error: 'Failed to reject content' });
  }
});

app.post('/api/admin/backup', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Log admin action
    await prisma.auditLog.create({
      data: {
        adminUserId: req.user?.id || '',
        adminEmail: req.user?.email || '',
        action: 'backup',
        resourceType: 'system',
        details: { type: 'manual_backup' },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
    
    // In a real implementation, this would trigger actual backup
    res.json({ 
      success: true, 
      message: 'Backup initiated',
      backupId: `backup_${Date.now()}`
    });
  } catch (error) {
    console.error('Error initiating backup:', error);
    res.status(500).json({ error: 'Failed to initiate backup' });
  }
});

app.post('/api/admin/restore', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { backupId } = req.body;
    
    // Log admin action
    await prisma.auditLog.create({
      data: {
        adminUserId: req.user?.id || '',
        adminEmail: req.user?.email || '',
        action: 'restore',
        resourceType: 'system',
        details: { backupId: backupId || 'latest' },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
    
    // In a real implementation, this would trigger actual restore
    res.json({ 
      success: true, 
      message: 'Restore initiated',
      restoreId: `restore_${Date.now()}`
    });
  } catch (error) {
    console.error('Error initiating restore:', error);
    res.status(500).json({ error: 'Failed to initiate restore' });
  }
});

app.get('/api/admin/errors', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = 100, resolved } = req.query;
    
    const where: any = {};
    if (resolved !== undefined) {
      where.resolved = resolved === 'true';
    }
    
    const errorLogs = await prisma.errorReport.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: Number(limit)
    });
    
    res.json(errorLogs);
  } catch (error) {
    console.error('Error fetching error logs:', error);
    res.status(500).json({ error: 'Failed to fetch error logs' });
  }
});

app.get('/api/admin/notifications', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = 50, status } = req.query;
    
    const where: any = {};
    if (status) {
      where.status = status;
    }
    
    const notifications = await prisma.notificationQueue.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit)
    });
    
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

app.post('/api/admin/notifications', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, recipient, subject, body, scheduledFor } = req.body;
    
    if (!type || !recipient || !body) {
      return res.status(400).json({ error: 'Type, recipient, and body are required' });
    }
    
    // Create notification
    const notification = await prisma.notificationQueue.create({
      data: {
        type,
        recipient,
        subject,
        body,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined
      }
    });
    
    // Log admin action
    await prisma.auditLog.create({
      data: {
        adminUserId: req.user?.id || '',
        adminEmail: req.user?.email || '',
        action: 'create',
        resourceType: 'notification',
        resourceId: notification.id,
        details: { type, recipient, scheduled: !!scheduledFor },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
    
    res.json({ success: true, notificationId: notification.id });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

app.get('/api/admin/audit-logs', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = 100, action, resourceType, adminUserId } = req.query;
    
    const where: any = {};
    if (action) where.action = action;
    if (resourceType) where.resourceType = resourceType;
    if (adminUserId) where.adminUserId = adminUserId;
    
    const auditLogs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit)
    });
    
    res.json(auditLogs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// --- 2FA for Admins ---
// POST /api/admin/2fa/setup, /verify, /disable
// --- User Impersonation ---
// POST /api/admin/impersonate
// --- Stripe Webhook Event Log ---
// GET /api/admin/stripe-webhooks, POST /api/admin/stripe-webhooks/retry
// --- Advanced Notifications ---
// POST /api/admin/notify-parq-flagged, POST /api/admin/followup-reminder
// --- Analytics Enhancements ---
// GET /api/admin/analytics?range=, GET /api/admin/analytics/pdf, POST /api/admin/analytics/schedule
// --- System Management Advanced ---
// Websocket/polling for error logs, POST /api/admin/restore/upload (file upload), GET /api/admin/audit-logs/export
// ... implement logic for each ...

// === GIF REGISTRY MANAGEMENT ENDPOINTS ===
// Support for UnifiedGifRegistry admin functionality

// GET /api/gif-files - Discover available GIF files (public endpoint for UnifiedGifRegistry)
app.get('/api/gif-files', async (req: Request, res: Response) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    // Directory paths to scan (relative to project root, not backend directory)
    const gifDirectories = [
      '../public/exercise-gifs/cardio',
      '../public/exercise-gifs/warmup',
      '../public/exercise-gifs/strength',
      '../public/exercise-gifs/core',
      '../public/exercise-gifs/legs',
      '../public/exercise-gifs/arms',
      '../public/exercise-gifs/back',
      '../public/exercise-gifs/chest',
      '../public/exercise-gifs/shoulders',
      '../public/exercise-gifs/full-body',
      '../public/exercise-gifs/flexibility'
    ];
    
    const allGifs = [];
    
    for (const dir of gifDirectories) {
      const fullPath = path.join(process.cwd(), dir);
      
      try {
        await fs.access(fullPath);
        const files = await fs.readdir(fullPath);
        
        for (const file of files) {
          if (file.endsWith('.gif')) {
            const filePath = path.join(fullPath, file);
            const stats = await fs.stat(filePath);
            
            allGifs.push({
              filename: file,
              path: `/exercise-gifs/${path.basename(dir)}/${file}`,
              category: path.basename(dir),
              size: stats.size,
              lastModified: stats.mtime.toISOString()
            });
          }
        }
      } catch (error) {
        console.warn(`Directory not accessible: ${dir}`);
        // Continue with other directories
      }
    }
    
    console.log(`📊 Public API discovered ${allGifs.length} GIF files for registry`);
    res.json(allGifs);
    
  } catch (error: any) {
    console.error('Error discovering GIF files:', error);
    res.status(500).json({ error: 'Failed to discover GIF files' });
  }
});

// GET /api/admin/gif-files - Admin-only GIF discovery (for admin dashboard)
app.get('/api/admin/gif-files', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    // Directory paths to scan (relative to project root, not backend directory)
    const gifDirectories = [
      '../public/exercise-gifs/cardio',
      '../public/exercise-gifs/warmup',
      '../public/exercise-gifs/strength',
      '../public/exercise-gifs/core',
      '../public/exercise-gifs/legs',
      '../public/exercise-gifs/arms',
      '../public/exercise-gifs/back',
      '../public/exercise-gifs/chest',
      '../public/exercise-gifs/shoulders',
      '../public/exercise-gifs/full-body',
      '../public/exercise-gifs/flexibility'
    ];
    
    const allGifs = [];
    
    for (const dir of gifDirectories) {
      const fullPath = path.join(process.cwd(), dir);
      
      try {
        await fs.access(fullPath);
        const files = await fs.readdir(fullPath);
        
        for (const file of files) {
          if (file.endsWith('.gif')) {
            const filePath = path.join(fullPath, file);
            const stats = await fs.stat(filePath);
            
            allGifs.push({
              filename: file,
              path: `/exercise-gifs/${path.basename(dir)}/${file}`,
              category: path.basename(dir),
              size: stats.size,
              lastModified: stats.mtime.toISOString()
            });
          }
        }
      } catch (error) {
        console.warn(`Directory not accessible: ${dir}`);
        // Continue with other directories
      }
    }
    
    console.log(`📊 Discovered ${allGifs.length} GIF files for registry`);
    res.json(allGifs);
    
  } catch (error) {
    console.error('Error discovering GIF files:', error);
    res.status(500).json({ error: 'Failed to discover GIF files' });
  }
});

// GET /api/admin/exercise-approvals - Get all exercise approval statuses
app.get('/api/admin/exercise-approvals', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Query exercises with approval information
    const exercises = await prisma.exercise.findMany({
      select: {
        id: true,
        name: true,
        gifPath: true,
        category: true,
        approvalStatus: true,
        lastReviewedAt: true,
        reviewedBy: true,
        flaggedReason: true,
        hideGif: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    // Transform to expected format
    const approvals = exercises.map(exercise => ({
      exerciseId: `${exercise.name.toLowerCase().replace(/\s+/g, '_')}_${exercise.category || 'general'}`,
      exerciseName: exercise.name,
      approvalStatus: exercise.approvalStatus || 'pending',
      lastReviewedAt: exercise.lastReviewedAt,
      reviewedBy: exercise.reviewedBy,
      flaggedReason: exercise.flaggedReason,
      hideGif: exercise.hideGif || false,
      gifPath: exercise.gifPath
    }));
    
    console.log(`📋 Retrieved ${approvals.length} exercise approvals`);
    res.json(approvals);
    
  } catch (error) {
    console.error('Error fetching exercise approvals:', error);
    res.status(500).json({ error: 'Failed to fetch exercise approvals' });
  }
});

// PATCH /api/admin/exercise-approval/:exerciseId - Update exercise approval status
app.patch('/api/admin/exercise-approval/:exerciseId', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { exerciseId } = req.params;
    const { approvalStatus, reviewedBy, flaggedReason, lastReviewedAt } = req.body;
    
    // Validate approval status
    const validStatuses = ['approved', 'pending', 'flagged', 'hidden'];
    if (!validStatuses.includes(approvalStatus)) {
      return res.status(400).json({ error: 'Invalid approval status' });
    }
    
    // Extract exercise name from exerciseId
    const exerciseName = exerciseId.split('_').slice(0, -1).join(' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    
    // Update or create exercise record
    const exercise = await prisma.exercise.upsert({
      where: {
        id: exerciseId
      },
      update: {
        approvalStatus,
        lastReviewedAt: lastReviewedAt ? new Date(lastReviewedAt) : new Date(),
        reviewedBy: reviewedBy || req.user?.name || 'admin',
        flaggedReason: flaggedReason || null,
        hideGif: approvalStatus === 'hidden'
      },
      create: {
        id: exerciseId,
        name: exerciseName,
        description: 'Exercise pending description', // Required field
        difficulty: 'intermediate', // Required field
        approvalStatus,
        lastReviewedAt: lastReviewedAt ? new Date(lastReviewedAt) : new Date(),
        reviewedBy: reviewedBy || req.user?.name || 'admin',
        flaggedReason: flaggedReason || null,
        hideGif: approvalStatus === 'hidden',
        category: 'general', // Default category
        instructions: [],
        muscleGroups: []
      }
    });
    
    console.log(`✅ Updated approval for ${exerciseId}: ${approvalStatus}`);
    res.json(exercise);
    
  } catch (error) {
    console.error('Error updating exercise approval:', error);
    res.status(500).json({ error: 'Failed to update exercise approval' });
  }
});

// POST /api/admin/gif-registry/refresh - Force refresh of GIF registry
app.post('/api/admin/gif-registry/refresh', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // This endpoint will be called by the frontend to trigger registry refresh
    // The actual refresh logic is handled by the UnifiedGifRegistry on the frontend
    
    console.log('🔄 Admin requested GIF registry refresh');
    res.json({ 
      success: true, 
      message: 'GIF registry refresh triggered',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error triggering GIF registry refresh:', error);
    res.status(500).json({ error: 'Failed to trigger registry refresh' });
  }
});

// GET /api/admin/gif-mappings - Get current exercise-to-GIF mappings for admin review
app.get('/api/admin/gif-mappings', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { category, approvalStatus } = req.query;
    
    let whereClause: any = {};
    if (category && category !== 'all') {
      whereClause.category = category;
    }
    if (approvalStatus && approvalStatus !== 'all') {
      whereClause.approvalStatus = approvalStatus;
    }
    
    const mappings = await prisma.exercise.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        gifPath: true,
        category: true,
        approvalStatus: true,
        lastReviewedAt: true,
        reviewedBy: true,
        flaggedReason: true,
        hideGif: true,
        muscleGroups: true
      },
      orderBy: {
        lastReviewedAt: 'desc'
      }
    });
    
    console.log(`🗂️ Retrieved ${mappings.length} GIF mappings for admin review`);
    res.json(mappings);
    
  } catch (error) {
    console.error('Error fetching GIF mappings:', error);
    res.status(500).json({ error: 'Failed to fetch GIF mappings' });
  }
});

// POST /api/admin/bulk-approve-gifs - Bulk approve multiple exercise-GIF mappings
app.post('/api/admin/bulk-approve-gifs', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { exerciseIds, approvalStatus = 'approved' } = req.body;
    
    if (!Array.isArray(exerciseIds) || exerciseIds.length === 0) {
      return res.status(400).json({ error: 'exerciseIds must be a non-empty array' });
    }
    
    const reviewedBy = req.user?.name || 'admin';
    const reviewedAt = new Date();
    
    const updatePromises = exerciseIds.map(async (exerciseId: string) => {
      return prisma.exercise.upsert({
        where: { id: exerciseId },
        update: {
          approvalStatus,
          lastReviewedAt: reviewedAt,
          reviewedBy,
          flaggedReason: null,
          hideGif: approvalStatus === 'hidden'
        },
        create: {
          id: exerciseId,
          name: exerciseId.split('_').slice(0, -1).join(' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
          description: 'Exercise pending description', // Required field
          difficulty: 'intermediate', // Required field
          approvalStatus,
          lastReviewedAt: reviewedAt,
          reviewedBy,
          category: 'general',
          instructions: [],
          muscleGroups: []
        }
      });
    });
    
    const results = await Promise.all(updatePromises);
    
    console.log(`✅ Bulk approved ${results.length} exercise-GIF mappings`);
    res.json({
      success: true,
      updated: results.length,
      exercises: results
    });
    
  } catch (error) {
    console.error('Error bulk approving GIF mappings:', error);
    res.status(500).json({ error: 'Failed to bulk approve GIF mappings' });
  }
});

// 2FA Setup
app.post('/api/admin/2fa/setup', authenticate, requireAdmin, async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({ name: `FitArchitect Admin 2FA` });
    res.json({ otpauth_url: secret.otpauth_url, base32: secret.base32 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate 2FA secret' });
  }
});

// Generate a meal plan using AI
// Meal Plans CRUD Operations
app.get('/api/meal-plans', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const mealPlans = await prisma.mealPlan.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10 // Limit to 10 most recent plans
    });

    res.json({ mealPlans });
  } catch (error) {
    console.error('Failed to fetch meal plans:', error);
    res.status(500).json({ error: 'Failed to fetch meal plans' });
  }
});

app.post('/api/meal-plans/generate', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { dietType, days, preferences } = req.body;
    const user = req.user!;
    
    // Build user profile from user data with detailed logging
    const userProfile = {
      age: user.age || 30,
      height: user.height || 170, // cm
      weight: user.weight || 70, // kg
      gender: user.gender || 'other',
      activityLevel: user.activityLevel || 'moderate',
      fitnessGoals: user.fitnessGoals || ['general_fitness'],
      dietaryPreferences: user.dietaryPreferences || []
    };

    console.log('DEBUG: User profile for meal generation:', JSON.stringify(userProfile, null, 2));
    console.log('DEBUG: User activityLevel type:', typeof userProfile.activityLevel, 'value:', userProfile.activityLevel);

    // Generate the meal plan using OpenAI
    const generatedPlan = await openaiService.generateMealPlan(userProfile, {
      dietType: dietType || 'balanced',
      days: days || 7,
      ...preferences
    });
    
    // Generate shopping list from meal plan
    const shoppingList = generateShoppingList(generatedPlan);
    
    // Save the generated plan to the database
    const savedPlan = await prisma.mealPlan.create({
      data: {
        userId: user.id,
        dietType: dietType || 'balanced',
        meals: generatedPlan,
        shoppingList: shoppingList,
      },
    });

    res.status(200).json({ 
      id: savedPlan.id,
      meals: generatedPlan,
      shoppingList: shoppingList,
      createdAt: savedPlan.createdAt,
      dietType: savedPlan.dietType
    });
  } catch (error) {
    console.error('Failed to generate meal plan:', error);
    res.status(500).json({ error: 'Failed to generate meal plan. Please try again.' });
  }
});

app.delete('/api/meal-plans/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    
    // Verify ownership and delete
    const deletedPlan = await prisma.mealPlan.deleteMany({
      where: { 
        id: parseInt(id, 10),
        userId: user.id 
      }
    });

    if (deletedPlan.count === 0) {
      return res.status(404).json({ error: 'Meal plan not found or access denied' });
    }

    res.json({ message: 'Meal plan deleted successfully' });
  } catch (error) {
    console.error('Failed to delete meal plan:', error);
    res.status(500).json({ error: 'Failed to delete meal plan' });
  }
});

// Helper function to generate shopping list from meal plan
function generateShoppingList(mealPlan: any[]): any[] {
  const ingredientMap = new Map<string, { quantity: number; unit: string; category: string }>();
  
  mealPlan.forEach(day => {
    day.meals?.forEach((meal: any) => {
      meal.items?.forEach((item: any) => {
        if (item.ingredients) {
          item.ingredients.forEach((ingredient: any) => {
            let ingredientName: string;
            let quantity = 1;
            let unit = 'item';
            
            // Handle both string arrays and object arrays
            if (typeof ingredient === 'string') {
              ingredientName = ingredient;
            } else if (ingredient?.name && typeof ingredient.name === 'string') {
              ingredientName = ingredient.name;
              quantity = ingredient.quantity || 1;
              unit = ingredient.unit || 'item';
            } else {
              console.warn('Invalid ingredient in meal plan:', ingredient);
              return;
            }
            
            const key = ingredientName.toLowerCase();
            const existing = ingredientMap.get(key);
            
            if (existing) {
              // Simple quantity addition (would need unit conversion in production)
              existing.quantity += quantity;
            } else {
              ingredientMap.set(key, {
                quantity: quantity,
                unit: unit,
                category: categorizeIngredient(ingredientName)
              });
            }
          });
        }
      });
    });
  });

  // Group by category
  const categories = ['proteins', 'vegetables', 'fruits', 'grains', 'dairy', 'pantry', 'other'];
  const shoppingList = categories.map(category => ({
    category,
    items: Array.from(ingredientMap.entries())
      .filter(([_, item]) => item.category === category)
      .map(([name, item]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        quantity: item.quantity,
        unit: item.unit
      }))
  })).filter(category => category.items.length > 0);

  return shoppingList;
}

// Helper function to categorize ingredients
function categorizeIngredient(ingredient: string): string {
  if (!ingredient || typeof ingredient !== 'string') {
    return 'other';
  }
  
  const lower = ingredient.toLowerCase();
  
  if (['chicken', 'beef', 'fish', 'salmon', 'tuna', 'turkey', 'pork', 'tofu', 'eggs'].some(p => lower.includes(p))) {
    return 'proteins';
  }
  if (['lettuce', 'spinach', 'broccoli', 'carrot', 'onion', 'tomato', 'pepper', 'cucumber'].some(v => lower.includes(v))) {
    return 'vegetables';
  }
  if (['apple', 'banana', 'orange', 'berry', 'grape', 'lemon', 'lime'].some(f => lower.includes(f))) {
    return 'fruits';
  }
  if (['rice', 'bread', 'pasta', 'quinoa', 'oats', 'flour'].some(g => lower.includes(g))) {
    return 'grains';
  }
  if (['milk', 'cheese', 'yogurt', 'butter', 'cream'].some(d => lower.includes(d))) {
    return 'dairy';
  }
  if (['oil', 'salt', 'pepper', 'spice', 'sauce', 'vinegar', 'sugar'].some(p => lower.includes(p))) {
    return 'pantry';
  }
  
  return 'other';
}

// Check free workout generation eligibility (3-day trial period for all users)
app.get('/api/workout-plans/check-free-generation', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;

    // Test users get unlimited access
    if (isTestUser(user.email)) {
      return res.json({ canGenerate: true, remaining: 999, daysRemaining: 999 });
    }

    // Paid users get unlimited
    if (user.tier === 'basic' || user.tier === 'premium') {
      return res.json({ canGenerate: true, remaining: 999, daysRemaining: 999 });
    }

    // Check trial status for free users
    const trialStatus = getTrialStatus(user);
    
    // Free users must complete PAR-Q first
    if (!user.parqCompleted) {
      return res.json({ 
        canGenerate: false, 
        remaining: 0, 
        daysRemaining: 0,
        needsParq: true,
        trialStatus
      });
    }

    // Check if user has access through trial
    const hasAccess = hasValidSubscription(user, 'basic');
    
    return res.json({ 
      canGenerate: hasAccess, 
      remaining: trialStatus.isActive ? trialStatus.daysRemaining : (trialStatus.isEligible ? 3 : 0), 
      daysRemaining: trialStatus.daysRemaining,
      trialStatus
    });
  } catch (error) {
    console.error('Failed to check free workout generation:', error);
    res.status(500).json({ error: 'Failed to check free workout generation' });
  }
});

// Get trial status for free users
app.get('/api/trial-status', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const trialStatus = getTrialStatus(user);
    
    return res.json({
      ...trialStatus,
      userTier: user.tier,
      parqCompleted: user.parqCompleted
    });
  } catch (error) {
    console.error('Error getting trial status:', error);
    return res.status(500).json({ error: 'Failed to get trial status' });
  }
});

// WGER API Proxy endpoints - secure API key on backend
app.get('/api/wger/exercises', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { muscles, equipment, language = 2, category, limit = 50 } = req.query;
    
    const params = new URLSearchParams();
    if (muscles) params.append('muscles', muscles.toString());
    if (equipment) params.append('equipment', equipment.toString());
    if (language) params.append('language', language.toString());
    if (category) params.append('category', category.toString());
    params.append('limit', limit.toString());
    params.append('status', '2'); // Only accepted exercises
    
    const response = await fetch(`https://wger.de/api/v2/exercise/?${params}`, {
      headers: {
        'Authorization': `Token ${process.env.WGER_API_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`WGER API error: ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('WGER proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch exercises from WGER' });
  }
});

app.get('/api/wger/exercise/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const response = await fetch(`https://wger.de/api/v2/exerciseinfo/${id}/`, {
      headers: {
        'Authorization': `Token ${process.env.WGER_API_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`WGER API error: ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('WGER proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch exercise details from WGER' });
  }
});

app.get('/api/wger/search', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { term, language = 2 } = req.query;
    
    if (!term) {
      return res.status(400).json({ error: 'Search term is required' });
    }
    
    // Check if WGER API key is configured
    if (!process.env.WGER_API_KEY) {
      console.warn('WGER_API_KEY not configured, using fallback');
      // Return empty results instead of error to allow fallback
      return res.json({ results: [], count: 0 });
    }
    
    const response = await fetch(`https://wger.de/api/v2/exercise/search/?term=${encodeURIComponent(term.toString())}&language=${language}`, {
      headers: {
        'Authorization': `Token ${process.env.WGER_API_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`WGER API error: ${response.status} ${response.statusText}`);
      // Return empty results for fallback instead of throwing
      return res.json({ results: [], count: 0 });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('WGER search proxy error:', error);
    // Return empty results for graceful fallback
    res.json({ results: [], count: 0 });
  }
});

// Get OpenAI usage statistics (admin only)
app.get('/api/admin/openai-usage', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = openaiService.getUsageStats();
    res.json({
      ...stats,
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching OpenAI usage:', error);
    res.status(500).json({ error: 'Failed to fetch OpenAI usage statistics' });
  }
});


// Generate a workout plan using AI
app.post('/api/workout-plans/generate', authenticate, cacheWorkoutGeneration, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userProfile } = req.body;
    
    if (!userProfile) {
      return res.status(400).json({ error: 'User profile is required for workout generation' });
    }

    // Check if user has access to workout generation
    const user = req.user!;
    
    // Test users get unlimited access
    if (isTestUser(user.email)) {
      // Allow test users to proceed
    }
    // Check if user has valid subscription or trial for basic tier (required for workout generation)
    else if (hasValidSubscription(user, 'basic')) {
      // Check PAR-Q completion requirement
      if (!user.parqCompleted) {
        return res.status(403).json({ 
          error: 'PAR-Q health assessment must be completed before generating workouts' 
        });
      }
      
      // For free users, activate trial if eligible
      if (user.tier === 'free' && !user.freeWorkoutTrialUsed) {
        const trialActivated = await activateFreeWorkoutTrial(user.id);
        if (trialActivated) {
          console.log(`Activated 3-day trial for free user ${user.id}`);
        }
      }
    }
    else {
      // No valid subscription or trial - check trial eligibility
      if (user.tier === 'free') {
        if (!user.parqCompleted) {
          return res.status(403).json({ 
            error: 'Please complete the PAR-Q health assessment to start your 3-day workout generation trial',
            action: 'complete_parq'
          });
        } else if (user.freeWorkoutTrialUsed) {
          const trialStatus = getTrialStatus(user);
          return res.status(403).json({ 
            error: 'Your 3-day workout generation trial has ended. Upgrade to continue generating workouts.',
            action: 'upgrade_subscription',
            trialStatus
          });
        } else {
          // Activate trial now
          const trialActivated = await activateFreeWorkoutTrial(user.id);
          if (!trialActivated) {
            return res.status(500).json({ 
              error: 'Failed to activate trial. Please try again.' 
            });
          }
          console.log(`Activated 3-day trial for free user ${user.id}`);
        }
      } else {
        return res.status(403).json({ 
          error: 'Active subscription required for workout generation',
          action: 'upgrade_subscription'
        });
      }
    }

    // Query exercises from database instead of static file
    const availableEquipment = userProfile.equipment || ['bodyweight'];
    const userDifficulty = userProfile.experienceLevel || 'beginner';
    
    // Include exercises up to and including user's level
    const difficultyLevels = ['beginner', 'intermediate', 'advanced'];
    const maxDifficultyIndex = difficultyLevels.indexOf(userDifficulty);
    const allowedDifficulties = difficultyLevels.slice(0, maxDifficultyIndex + 1);
    
    // Query exercises that match user's equipment and difficulty
    let filteredExercises = await prisma.exercise.findMany({
      where: {
        isActive: true,
        equipment: {
          hasSome: availableEquipment // Exercises that include any of the user's available equipment
        },
        difficulty: {
          in: allowedDifficulties
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // If no exercises found, fallback to bodyweight beginner exercises
    if (filteredExercises.length === 0) {
      console.log('No exercises found for user equipment, falling back to bodyweight beginner exercises');
      filteredExercises = await prisma.exercise.findMany({
        where: {
          isActive: true,
          equipment: {
            has: 'bodyweight'
          },
          difficulty: 'beginner'
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    }
    
    // If still no exercises, import default exercises first
    if (filteredExercises.length === 0) {
      console.log('No exercises in database, importing default exercises');
      try {
        const { exerciseDatabase } = require('./data/exerciseDatabase');
        
        // Import default exercises
        const importPromises = exerciseDatabase.map(async (exercise: any) => {
          try {
            return await prisma.exercise.create({
              data: {
                name: exercise.name,
                description: exercise.description,
                category: exercise.category,
                muscleGroups: exercise.muscleGroups,
                equipment: exercise.equipment,
                difficulty: exercise.difficulty,
                instructions: exercise.instructions,
                tips: exercise.tips || [],
                imageUrl: exercise.imageUrl || null,
                videoUrl: exercise.videoUrl || null,
                isCustom: false,
                createdBy: null
              }
            });
          } catch (err) {
            console.error(`Failed to import exercise ${exercise.name}:`, err);
            return null;
          }
        });
        
        await Promise.all(importPromises);
        console.log('Default exercises imported, retrying query');
        
        // Retry the query
        filteredExercises = await prisma.exercise.findMany({
          where: {
            isActive: true,
            equipment: {
              has: 'bodyweight'
            },
            difficulty: 'beginner'
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      } catch (importError) {
        console.error('Failed to import default exercises:', importError);
      }
    }
    
    // Convert to format expected by OpenAI service
    const exercises = filteredExercises.map((ex: any) => ({
      id: ex.id,
      name: ex.name,
      description: ex.description,
      muscleGroups: ex.muscleGroups,
      equipment: ex.equipment,
      difficulty: ex.difficulty,
      instructions: ex.instructions,
      tips: ex.tips || [],
      category: ex.category
    }));
    
    console.log(`Found ${exercises.length} exercises for user profile:`, {
      equipment: availableEquipment,
      difficulty: userDifficulty,
      exerciseNames: exercises.map((ex: any) => ex.name).slice(0, 10)
    });

    // Generate the workout plan using OpenAI
    console.log('Generating workout plan for user:', user.id, 'with profile:', userProfile);
    console.log(`Using ${exercises.length} filtered exercises for workout generation`);
    const generatedPlan = await openaiService.generateWorkoutPlan(userProfile, exercises);
    console.log('Generated plan:', generatedPlan);
    
    // Save the generated plan to the database
    console.log('Saving generated plan to database...');
    console.log('Generated plan structure - has weeks:', !!generatedPlan.weeks, 'has workouts:', !!generatedPlan.workouts);
    
    // Ensure we have weeks structure (this is now the primary format)
    if (!generatedPlan.weeks || generatedPlan.weeks.length === 0) {
      console.warn('Generated plan missing weeks structure, this should not happen');
      throw new Error('Invalid workout plan: missing weeks structure');
    }

    // Add dual format support - create workouts array from weeks for frontend compatibility
    const transformedPlan = {
      ...generatedPlan,
      workouts: transformWeeksToWorkouts(generatedPlan.weeks),
      weeks: generatedPlan.weeks
    };
    
    try {
      const savedPlan = await prisma.workoutPlan.create({
        data: {
          userId: req.user!.id,
          name: transformedPlan.name || 'AI Generated Workout Plan',
          description: transformedPlan.description || 'Personalized workout plan',
          duration: transformedPlan.duration || 3,
          // @ts-ignore - weeks field exists in schema but Prisma types not updated
          weeks: transformedPlan.weeks,
          targetMuscleGroups: transformedPlan.targetMuscleGroups || [],
          difficulty: transformedPlan.difficulty || 'intermediate',
          isDefault: false,
          completed: false,
        },
      });
      console.log('Successfully saved plan to database with:');
      // @ts-ignore - weeks field exists in schema but Prisma types not updated
      console.log('- Weeks:', savedPlan.weeks ? 'YES' : 'NO');
      console.log('- Weeks count:', Array.isArray(savedPlan.weeks) ? (savedPlan.weeks as any[]).length : 0);
      console.log('- Plan ID:', savedPlan.id);
      
      // Return the plan with both formats for frontend compatibility
      res.status(201).json({
        ...savedPlan,
        workouts: transformedPlan.workouts,
        weeks: transformedPlan.weeks
      });
    } catch (dbError) {
      console.error('Database save error:', dbError);
      throw new Error(`Failed to save workout plan to database: ${dbError instanceof Error ? dbError.message : 'Unknown database error'}`);
    }
  } catch (error) {
    console.error('Failed to generate workout plan:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    res.status(500).json({ 
      error: 'Failed to generate workout plan',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// CRUD for workout plans
app.get('/api/workout-plans', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const plans = await prisma.workoutPlan.findMany({ where: { userId: req.user!.id } });
    console.log(`Successfully fetched ${plans.length} workout plans for user ${req.user!.id}`);
    res.json(plans);
  } catch (error) {
    console.error('Failed to fetch workout plans:', error);
    
    // Provide more specific error responses
    if (error instanceof Error) {
      if (error.message.includes('database')) {
        res.status(503).json({ 
          error: 'Database temporarily unavailable',
          message: 'Please try again in a few moments',
          code: 'DATABASE_ERROR'
        });
      } else {
        res.status(500).json({ 
          error: 'Failed to fetch workout plans',
          message: 'An internal server error occurred',
          code: 'INTERNAL_ERROR'
        });
      }
    } else {
      res.status(500).json({ 
        error: 'Failed to fetch workout plans',
        message: 'An unknown error occurred',
        code: 'UNKNOWN_ERROR'
      });
    }
  }
});

app.get('/api/workout-plans/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const plan = await prisma.workoutPlan.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workout plan' });
  }
});

app.post('/api/workout-plans', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description, duration, workouts, weeks, targetMuscleGroups, difficulty, isDefault, completed } = req.body;
    
    console.log('Creating workout plan with data:', {
      userId: req.user!.id,
      name,
      description,
      duration,
      workoutsLength: workouts?.length,
      weeksLength: weeks?.length,
      hasWeeks: !!weeks,
      hasWorkouts: !!workouts,
      targetMuscleGroups,
      difficulty,
      isDefault,
      completed
    });
    
    // Validate required fields - allow either workouts or weeks structure
    if (!name || !description || !duration || (!workouts && !weeks)) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['name', 'description', 'duration', 'workouts OR weeks'],
        received: { name: !!name, description: !!description, duration: !!duration, workouts: !!workouts, weeks: !!weeks }
      });
    }
    
    const plan = await prisma.workoutPlan.create({
      data: {
        userId: req.user!.id,
        name,
        description,
        duration,
        // @ts-ignore - weeks field exists in schema but Prisma types not updated
        weeks: weeks || workouts || [],
        targetMuscleGroups: targetMuscleGroups || [],
        difficulty: difficulty || 'beginner',
        isDefault: !!isDefault,
        completed: !!completed,
      },
    });
    
    console.log('Successfully created workout plan:', plan.id);
    // @ts-ignore - weeks field exists in schema but Prisma types not updated
    console.log('Saved plan structure - weeks:', plan.weeks ? 'YES' : 'NO');
    res.status(201).json(plan);
  } catch (error) {
    console.error('Failed to create workout plan:', error);
    console.error('Request body:', req.body);
    res.status(500).json({ 
      error: 'Failed to create workout plan',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.patch('/api/workout-plans/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const plan = await prisma.workoutPlan.update({
      where: { id: req.params.id, userId: req.user!.id },
      data: req.body,
    });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update workout plan' });
  }
});

app.delete('/api/workout-plans/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // First check if the workout plan exists and belongs to the user
    const existingPlan = await prisma.workoutPlan.findFirst({
      where: { id: req.params.id, userId: req.user!.id }
    });

    if (!existingPlan) {
      return res.status(404).json({ error: 'Workout plan not found or not authorized' });
    }

    await prisma.workoutPlan.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting workout plan:', error);
    res.status(500).json({ error: 'Failed to delete workout plan' });
  }
});

// Complete individual workout within a plan
app.patch('/api/workout-plans/:planId/workouts/:workoutId/complete', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { planId, workoutId } = req.params;
    const { rating, notes, duration } = req.body;
    const userId = req.user!.id;

    // Get the current workout plan
    const plan = await prisma.workoutPlan.findFirst({
      where: { id: planId, userId }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Workout plan not found' });
    }

    // Parse existing completion data
    const completedWorkouts = (plan.completedWorkouts as any) || {};
    const progressData = (plan.progressData as any) || {
      totalWorkouts: 0,
      completedCount: 0,
      weeklyProgress: {},
      streaks: { current: 0, longest: 0 }
    };

    // Mark this workout as completed
    completedWorkouts[workoutId] = {
      completed: true,
      completedAt: new Date().toISOString(),
      rating: rating || null,
      notes: notes || null,
      duration: duration || null
    };

    // Update progress data
    progressData.completedCount = Object.keys(completedWorkouts).length;
    progressData.lastCompletedWorkout = workoutId;
    
    // Calculate if plan is fully completed
    const weeks = plan.weeks as any;
    let totalWorkouts = 0;
    if (weeks && Array.isArray(weeks)) {
      weeks.forEach((week: any) => {
        if (week.days && Array.isArray(week.days)) {
          totalWorkouts += week.days.filter((day: any) => !day.isRestDay).length;
        }
      });
    }
    progressData.totalWorkouts = totalWorkouts;

    const isFullyCompleted = progressData.completedCount >= totalWorkouts;

    // Update the workout plan
    const updatedPlan = await prisma.workoutPlan.update({
      where: { id: planId },
      data: {
        completedWorkouts,
        progressData,
        lastWorkoutCompleted: new Date(),
        completed: isFullyCompleted,
        updatedAt: new Date()
      }
    });

    // Also create a WorkoutLog entry for historical tracking
    await prisma.workoutLog.create({
      data: {
        userId,
        planId,
        workoutId,
        exercises: [], // Empty for now, could be enhanced later
        notes: notes || null,
        completed: true,
        duration: duration || null,
        rating: rating || null,
        completionRate: 100,
        date: new Date()
      }
    });

    res.json({
      success: true,
      plan: updatedPlan,
      completionStatus: {
        workoutId,
        completed: true,
        completedAt: completedWorkouts[workoutId].completedAt,
        totalProgress: `${progressData.completedCount}/${progressData.totalWorkouts}`,
        isFullyCompleted
      }
    });

  } catch (error) {
    console.error('Error completing individual workout:', error);
    res.status(500).json({ error: 'Failed to complete workout' });
  }
});

// Uncomplete individual workout within a plan
app.patch('/api/workout-plans/:planId/workouts/:workoutId/uncomplete', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { planId, workoutId } = req.params;
    const userId = req.user!.id;

    // Get the current workout plan
    const plan = await prisma.workoutPlan.findFirst({
      where: { id: planId, userId }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Workout plan not found' });
    }

    // Parse existing completion data
    const completedWorkouts = (plan.completedWorkouts as any) || {};
    const progressData = (plan.progressData as any) || {
      totalWorkouts: 0,
      completedCount: 0,
      weeklyProgress: {},
      streaks: { current: 0, longest: 0 }
    };

    // Remove this workout from completed workouts
    delete completedWorkouts[workoutId];

    // Update progress data
    progressData.completedCount = Object.keys(completedWorkouts).length;

    // Update the workout plan
    const updatedPlan = await prisma.workoutPlan.update({
      where: { id: planId },
      data: {
        completedWorkouts,
        progressData,
        completed: false, // If we're uncompleting, plan is no longer fully completed
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      plan: updatedPlan,
      completionStatus: {
        workoutId,
        completed: false,
        totalProgress: `${progressData.completedCount}/${progressData.totalWorkouts}`
      }
    });

  } catch (error) {
    console.error('Error uncompleting individual workout:', error);
    res.status(500).json({ error: 'Failed to uncomplete workout' });
  }
});

// Get detailed progress for a workout plan
app.get('/api/workout-plans/:planId/progress', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { planId } = req.params;
    const userId = req.user!.id;

    const plan = await prisma.workoutPlan.findFirst({
      where: { id: planId, userId }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Workout plan not found' });
    }

    const completedWorkouts = (plan.completedWorkouts as any) || {};
    const progressData = (plan.progressData as any) || {
      totalWorkouts: 0,
      completedCount: 0,
      weeklyProgress: {},
      streaks: { current: 0, longest: 0 }
    };

    // Calculate detailed progress
    const weeks = plan.weeks as any;
    const detailedProgress: any = {
      planId,
      planName: plan.name,
      totalWorkouts: progressData.totalWorkouts || 0,
      completedCount: progressData.completedCount || 0,
      completionPercentage: progressData.totalWorkouts > 0 
        ? Math.round((progressData.completedCount / progressData.totalWorkouts) * 100)
        : 0,
      weeks: [],
      lastWorkoutCompleted: plan.lastWorkoutCompleted,
      isFullyCompleted: plan.completed
    };

    // Add detailed week and day progress
    if (weeks && Array.isArray(weeks)) {
      weeks.forEach((week: any, weekIndex: number) => {
        const weekProgress: any = {
          weekNumber: weekIndex + 1,
          days: [],
          weekCompletion: 0
        };

        if (week.days && Array.isArray(week.days)) {
          let weekCompletedCount = 0;
          let weekTotalWorkouts = 0;

          week.days.forEach((day: any, dayIndex: number) => {
            const workoutKey = `week-${weekIndex}-day-${dayIndex}`;
            const isCompleted = !!completedWorkouts[workoutKey];
            
            if (!day.isRestDay) {
              weekTotalWorkouts++;
              if (isCompleted) weekCompletedCount++;
            }

            weekProgress.days.push({
              dayNumber: day.dayNumber || dayIndex + 1,
              name: day.name || `Day ${dayIndex + 1}`,
              isRestDay: day.isRestDay || false,
              isCompleted,
              completedAt: isCompleted ? completedWorkouts[workoutKey].completedAt : null,
              rating: isCompleted ? completedWorkouts[workoutKey].rating : null,
              workoutId: workoutKey
            });
          });

          weekProgress.weekCompletion = weekTotalWorkouts > 0 
            ? Math.round((weekCompletedCount / weekTotalWorkouts) * 100)
            : 0;
        }

        detailedProgress.weeks.push(weekProgress);
      });
    }

    res.json(detailedProgress);

  } catch (error) {
    console.error('Error fetching workout plan progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});


// Batch Exercise Information endpoint
app.post('/api/exercise-info', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { exercises, userExperienceLevel } = req.body;

    if (!exercises || !Array.isArray(exercises) || exercises.length === 0) {
      return res.status(400).json({ error: 'Exercises array is required and must not be empty' });
    }

    // Validate exercise objects
    const validExercises = exercises.filter(ex => ex.name && typeof ex.name === 'string');
    if (validExercises.length === 0) {
      return res.status(400).json({ error: 'No valid exercises found with names' });
    }

    // Add user experience level to each exercise
    const exercisesWithLevel = validExercises.map(exercise => ({
      ...exercise,
      userExperienceLevel: userExperienceLevel || 'beginner'
    }));

    // Generate comprehensive exercise information using OpenAI
    const exerciseInfo = await openaiService.supplementExerciseInfo(exercisesWithLevel);

    res.json({ 
      exercises: exerciseInfo,
      count: exerciseInfo.length,
      userExperienceLevel: userExperienceLevel || 'beginner'
    });
  } catch (error) {
    console.error('Error generating exercise information:', error);
    
    // Generate fallback information for each exercise
    const fallbackInfo = req.body.exercises?.map((exercise: any) => ({
      description: `${exercise.name || 'Exercise'} is an effective movement that helps build strength and improve fitness. Focus on proper form and controlled movements throughout the exercise.`,
      formCues: [
        'Maintain proper posture throughout the movement',
        'Control the movement on both lifting and lowering phases',
        'Breathe steadily - exhale on exertion, inhale on return',
        'Keep core engaged for stability and support'
      ],
      safetyTips: [
        'Start with lighter resistance and focus on form first',
        'Stop if you feel sharp pain or discomfort',
        'Warm up properly before beginning the exercise'
      ],
      muscleActivation: 'This exercise promotes balanced muscle development and functional strength.',
      difficultyAdaptations: [
        'Beginner: Reduced range of motion or assisted variation',
        'Standard: Full range of motion with appropriate resistance',
        'Advanced: Added resistance, tempo changes, or complex variations'
      ]
    })) || [];

    res.json({ 
      exercises: fallbackInfo,
      count: fallbackInfo.length,
      userExperienceLevel: req.body.userExperienceLevel || 'beginner',
      source: 'fallback'
    });
  }
});

// AI Workout Adaptation endpoint
app.post('/api/workout-adaptation', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { feedback, currentWorkout } = req.body;

    if (!feedback || !currentWorkout) {
      return res.status(400).json({ error: 'Feedback and current workout are required' });
    }

    // Generate intelligent workout adaptations using OpenAI
    const adaptation = await openaiService.generateSmartWorkoutAdaptation(
      feedback,
      currentWorkout
    );

    res.json(adaptation);
  } catch (error) {
    console.error('Error generating workout adaptation:', error);
    res.status(500).json({ 
      error: 'Failed to generate workout adaptation',
      fallback: {
        adaptationReasons: ['Continue with current routine'],
        workoutModifications: {},
        progressionNotes: ['Focus on proper form and consistency']
      }
    });
  }
});

// Exercise Recommendations endpoint
app.post('/api/exercise-recommendations', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { preferences, targetMuscles, equipment, excludeExercises } = req.body;

    if (!preferences) {
      return res.status(400).json({ error: 'User preferences are required' });
    }

    // Generate exercise recommendations using OpenAI
    const recommendations = await openaiService.generateExerciseRecommendations(
      preferences,
      equipment || [],
      targetMuscles || [],
      excludeExercises || []
    );

    res.json(recommendations);
  } catch (error) {
    console.error('Error generating exercise recommendations:', error);
    res.status(500).json({ 
      error: 'Failed to generate exercise recommendations',
      fallback: {
        recommendedExercises: [],
        progressionPath: ['Start with basic movements', 'Progress gradually'],
        alternatives: []
      }
    });
  }
});

// Plateau Detection endpoint
app.post('/api/plateau-detection', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workoutHistory, performanceMetrics } = req.body;

    if (!workoutHistory || !performanceMetrics) {
      return res.status(400).json({ error: 'Workout history and performance metrics are required' });
    }

    // Detect plateau and suggest changes using OpenAI
    const analysis = await openaiService.detectPlateauAndSuggestChanges(
      workoutHistory,
      performanceMetrics
    );

    res.json(analysis);
  } catch (error) {
    console.error('Error detecting plateau:', error);
    res.status(500).json({ 
      error: 'Failed to analyze plateau',
      fallback: {
        recommendations: ['Vary your routine', 'Adjust intensity', 'Focus on progressive overload'],
        workoutModifications: {}
      }
    });
  }
});

// Enhanced health check with comprehensive configuration validation
app.get('/api/health', async (req, res) => {
  try {
    // Validate configuration
    const configValidation = backendConfigValidator.validateAll();
    
    // Test database connection
    const dbConnected = await checkDatabaseConnection();
    
    // Test Cloudinary connection
    let cloudinaryConnected = false;
    let cloudinaryError = null;
    try {
      if (configValidation.serviceStatus.cloudinary) {
        const cloudinary = (await import('./services/cloudinaryService')).default;
        await cloudinary.api.ping();
        cloudinaryConnected = true;
      }
    } catch (error) {
      console.warn('Cloudinary health check failed:', error);
      cloudinaryError = error instanceof Error ? error.message : 'Unknown error';
      cloudinaryConnected = false;
    }

    // Test OpenAI connection
    let openaiConnected = false;
    let openaiError = null;
    try {
      if (configValidation.serviceStatus.openai) {
        // Simple test to see if we can initialize OpenAI service
        const usageStats = openaiService.getUsageStats();
        openaiConnected = true;
      }
    } catch (error) {
      console.warn('OpenAI health check failed:', error);
      openaiError = error instanceof Error ? error.message : 'Unknown error';
      openaiConnected = false;
    }

    // Determine overall health status
    const criticalServicesHealthy = dbConnected && openaiConnected && configValidation.serviceStatus.stripe;
    const allRequiredConfigValid = configValidation.summary.criticalErrors === 0;
    const overallHealthy = criticalServicesHealthy && allRequiredConfigValid;

    const status = {
      status: overallHealthy ? 'healthy' : criticalServicesHealthy ? 'degraded' : 'unhealthy',
      timestamp: new Date(),
      version: process.env.npm_package_version || 'unknown',
      environment: process.env.NODE_ENV || 'unknown',
      
      // Service connectivity status
      services: {
        database: {
          status: dbConnected ? 'connected' : 'disconnected',
          required: true
        },
        openai: {
          status: openaiConnected ? 'connected' : 'disconnected',
          required: true,
          error: openaiError
        },
        stripe: {
          status: configValidation.serviceStatus.stripe ? 'configured' : 'not_configured',
          required: true
        },
        cloudinary: {
          status: cloudinaryConnected ? 'connected' : configValidation.serviceStatus.cloudinary ? 'configured' : 'not_configured',
          required: false,
          error: cloudinaryError
        },
        telegram: {
          status: configValidation.serviceStatus.telegram ? 'configured' : 'not_configured',
          required: false
        },
        wger: {
          status: configValidation.serviceStatus.wger ? 'configured' : 'not_configured',
          required: false
        }
      },
      
      // Configuration validation summary
      configuration: {
        isValid: configValidation.isValid,
        summary: configValidation.summary,
        criticalIssues: configValidation.results
          .filter(r => !r.isValid && r.error)
          .map(r => ({
            key: r.key,
            error: r.error
          })),
        warnings: configValidation.results
          .filter(r => !r.isPresent && r.isValid)
          .map(r => ({
            key: r.key,
            reason: 'Optional service not configured'
          }))
      },

      // Performance metrics
      metrics: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version
      }
    };
    
    // Return appropriate HTTP status
    let httpStatus = 200;
    if (!overallHealthy) {
      httpStatus = criticalServicesHealthy ? 503 : 500; // Service unavailable vs internal error
    }
    
    res.status(httpStatus).json(status);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ 
      status: 'error', 
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    });
  }
});

// Monitoring dashboard endpoint (admin only)
app.get('/api/admin/monitoring', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    logger.info('Admin accessing monitoring dashboard', {
      operation: 'admin_monitoring',
      component: 'monitoring',
      userId: (req.user as any)?.userId,
      requestId: req.requestId
    });

    // Get comprehensive metrics from logger
    const logs = logger.exportLogs(60 * 60 * 1000); // Last hour
    const performanceReport = logger.getPerformanceReport();
    const healthReport = logger.getHealthReport();
    const errorSummary = logger.getErrorSummary(60 * 60 * 1000);

    // Get OpenAI usage stats
    const openaiStats = openaiService.getUsageStats();

    // System metrics
    const systemMetrics = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      pid: process.pid,
      platform: process.platform
    };

    const monitoringData = {
      timestamp: new Date().toISOString(),
      summary: {
        overall: healthReport.overall,
        totalComponents: healthReport.summary.totalComponents,
        healthyComponents: healthReport.summary.healthyComponents,
        totalErrors: errorSummary.totalErrors,
        averageResponseTime: performanceReport.averageDuration,
        successRate: performanceReport.successRate
      },
      performance: performanceReport,
      health: healthReport,
      errors: errorSummary,
      openai: {
        requestCount: openaiStats.requestCount,
        tokenUsage: openaiStats.tokenUsage,
        estimatedCost: openaiStats.estimatedCost
      },
      system: systemMetrics,
      logs: {
        performanceMetrics: logs.performanceMetrics.slice(-100), // Last 100 operations
        healthMetrics: logs.healthMetrics.slice(-50) // Last 50 health events
      }
    };

    res.json(monitoringData);
  } catch (error) {
    logger.error('Failed to generate monitoring data', {
      operation: 'admin_monitoring_error',
      component: 'monitoring',
      userId: (req.user as any)?.userId,
      requestId: req.requestId
    }, error instanceof Error ? error : new Error(String(error)));

    res.status(500).json({
      error: 'Failed to generate monitoring data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Performance metrics endpoint (admin only)
app.get('/api/admin/performance/:operation?', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { operation } = req.params;
    const { timeRange } = req.query;

    const timeRangeMs = timeRange ? parseInt(timeRange as string) : 60 * 60 * 1000; // Default 1 hour
    const report = logger.getPerformanceReport(operation, timeRangeMs);

    logger.info('Admin accessing performance metrics', {
      operation: 'admin_performance',
      component: 'monitoring',
      userId: (req.user as any)?.userId,
      requestId: req.requestId,
      metadata: { operation, timeRangeMs }
    });

    res.json({
      operation: operation || 'all',
      timeRangeMs,
      report
    });
  } catch (error) {
    logger.error('Failed to get performance metrics', {
      operation: 'admin_performance_error',
      component: 'monitoring',
      userId: (req.user as any)?.userId,
      requestId: req.requestId
    }, error instanceof Error ? error : new Error(String(error)));

    res.status(500).json({
      error: 'Failed to get performance metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// CACHE MANAGEMENT ENDPOINTS (Admin only)
// Get cache statistics
app.get('/api/admin/cache/stats', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = cacheService.getStats();
    const debugInfo = cacheService.getDebugInfo();
    
    res.json({
      stats,
      debugInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    res.status(500).json({ error: 'Failed to get cache statistics' });
  }
});

// Clear cache entries
app.post('/api/admin/cache/clear', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tags, confirm } = req.body;
    
    if (!confirm) {
      return res.status(400).json({ error: 'Confirmation required to clear cache' });
    }
    
    const clearedCount = cacheService.clear(tags);
    
    logger.info('Cache cleared by admin', {
      operation: 'admin_cache_clear',
      component: 'cache',
      userId: req.user!.id,
      metadata: {
        clearedCount,
        tags: tags || 'all'
      }
    });
    
    res.json({
      message: 'Cache cleared successfully',
      clearedItems: clearedCount,
      tags: tags || 'all'
    });
  } catch (error) {
    console.error('Failed to clear cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// Warm up cache
app.post('/api/admin/cache/warmup', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await cacheService.warmUp();
    
    logger.info('Cache warm-up triggered by admin', {
      operation: 'admin_cache_warmup',
      component: 'cache',
      userId: req.user!.id
    });
    
    res.json({
      message: 'Cache warm-up initiated successfully'
    });
  } catch (error) {
    console.error('Failed to warm up cache:', error);
    res.status(500).json({ error: 'Failed to warm up cache' });
  }
});

// DELETE user (soft delete with data retention for GDPR compliance)
app.delete('/api/admin/users/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const admin = req.user!;
    
    // Prevent self-deletion
    if (id === admin.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    // Find user to delete
    const userToDelete = await prisma.userProfile.findUnique({
      where: { id }
    });
    
    if (!userToDelete) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prevent deletion of other admins
    if (userToDelete.isAdmin) {
      return res.status(403).json({ error: 'Cannot delete admin accounts' });
    }
    
    // Soft delete by updating email and marking as deleted
    const deletedEmail = `deleted-${Date.now()}-${userToDelete.email}`;
    
    await prisma.userProfile.update({
      where: { id },
      data: {
        email: deletedEmail,
        name: `[DELETED] ${userToDelete.name}`,
        password: '', // Clear password
        subscriptionStatus: 'cancelled'
      }
    });
    
    logger.info('User soft deleted by admin', {
      operation: 'admin_user_delete',
      component: 'admin',
      userId: admin.id
    } as any);
    
    res.json({ 
      message: 'User deleted successfully',
      userId: id 
    });
  } catch (error) {
    logger.error('Failed to delete user', error as any);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Admin impersonation endpoint
app.post('/api/admin/impersonate', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.body;
    const admin = req.user!;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Find target user
    const targetUser = await prisma.userProfile.findUnique({
      where: { id: userId }
    });
    
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prevent impersonating other admins
    if (targetUser.isAdmin) {
      return res.status(403).json({ error: 'Cannot impersonate admin accounts' });
    }
    
    // Generate impersonation token with special claims
    const impersonationToken = jwt.sign({
      userId: targetUser.id,
      email: targetUser.email,
      type: targetUser.type,
      impersonatedBy: admin.id,
      impersonation: true
    }, JWT_SECRET, { expiresIn: '1h' }); // Shorter expiry for security
    
    logger.info('Admin impersonation started', {
      operation: 'admin_impersonate',
      component: 'admin',
      userId: admin.id
    } as any);
    
    res.json({
      message: 'Impersonation token generated',
      token: impersonationToken,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        type: targetUser.type
      },
      impersonatedBy: {
        id: admin.id,
        email: admin.email
      },
      expiresIn: 3600 // 1 hour
    });
  } catch (error) {
    logger.error('Failed to generate impersonation token', error as any);
    res.status(500).json({ error: 'Failed to impersonate user' });
  }
});

// 2FA verification endpoint
app.post('/api/admin/2fa/verify', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { token } = req.body;
    const user = req.user!;
    
    const userProfile = user as any; // Cast to access all user properties
    if (!userProfile.twoFactorEnabled || !userProfile.twoFactorSecret) {
      return res.status(400).json({ error: '2FA is not enabled for this account' });
    }
    
    const isValid = speakeasy.totp.verify({
      secret: userProfile.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2 // Allow some time drift
    });
    
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid 2FA token' });
    }
    
    logger.info('2FA verification successful', {
      operation: 'admin_2fa_verify',
      userId: user.id
    } as any);
    
    res.json({ 
      message: '2FA token verified successfully',
      verified: true 
    });
  } catch (error) {
    logger.error('2FA verification failed', error as any);
    res.status(500).json({ error: '2FA verification failed' });
  }
});

// Disable 2FA endpoint
app.post('/api/admin/2fa/disable', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { confirmPassword } = req.body;
    const user = req.user!;
    
    if (!confirmPassword) {
      return res.status(400).json({ error: 'Password confirmation is required' });
    }
    
    // Verify password
    const userProfile = user as any; // Cast to access password
    const isPasswordValid = await bcrypt.compare(confirmPassword, userProfile.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid password' });
    }
    
    // Disable 2FA
    await prisma.userProfile.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null
      }
    });
    
    logger.info('2FA disabled by admin', {
      operation: 'admin_2fa_disable',
      userId: user.id
    } as any);
    
    res.json({ 
      message: '2FA disabled successfully' 
    });
  } catch (error) {
    logger.error('Failed to disable 2FA', error as any);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

// Data export endpoints for GDPR compliance and admin analytics

// Export user data
app.get('/api/admin/export', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { format = 'json', userIds, startDate, endDate } = req.query;
    
    let whereClause: any = {};
    
    // Filter by specific users if provided
    if (userIds && typeof userIds === 'string') {
      whereClause.id = { in: userIds.split(',') };
    }
    
    // Filter by date range if provided
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = new Date(startDate as string);
      if (endDate) whereClause.createdAt.lte = new Date(endDate as string);
    }
    
    const users = await prisma.userProfile.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        type: true,
        subscriptionStatus: true,
        tier: true,
        parqCompleted: true,
        activityLevel: true,
        fitnessGoals: true,
        dietaryPreferences: true,
        // Exclude sensitive data like passwords
      }
    });
    
    logger.info('User data export requested', {
      operation: 'admin_export_users',
      userCount: users.length,
      adminId: req.user!.id
    } as any);
    
    if (format === 'csv') {
      // Convert to CSV format
      const csvHeaders = 'ID,Email,Name,Created,Type,Subscription,Tier,PAR-Q Completed\n';
      const csvData = users.map(user => 
        `${user.id},${user.email},${user.name},${user.createdAt.toISOString()},${user.type},${user.subscriptionStatus},${user.tier},${user.parqCompleted}`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="users-export.csv"');
      res.send(csvHeaders + csvData);
    } else {
      res.json({
        exportedAt: new Date().toISOString(),
        userCount: users.length,
        users
      });
    }
  } catch (error) {
    logger.error('Failed to export user data', error as any);
    res.status(500).json({ error: 'Failed to export user data' });
  }
});

// Export analytics data
app.get('/api/admin/analytics/export', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;
    
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate as string);
    if (endDate) dateFilter.lte = new Date(endDate as string);
    
    // Gather analytics data
    const totalUsers = await prisma.userProfile.count();
    const activeUsers = await prisma.userProfile.count({
      where: { subscriptionStatus: 'active' }
    });
    
    const userRegistrations = await prisma.userProfile.groupBy({
      by: ['createdAt'],
      where: dateFilter.gte ? { createdAt: dateFilter } : undefined,
      _count: true
    });
    
    const subscriptions = await prisma.userProfile.groupBy({
      by: ['subscriptionStatus'],
      _count: true
    });
    
    const tiers = await prisma.userProfile.groupBy({
      by: ['tier'],
      _count: true
    });
    
    const analyticsData = {
      exportedAt: new Date().toISOString(),
      period: {
        startDate: startDate || 'all-time',
        endDate: endDate || 'now'
      },
      summary: {
        totalUsers,
        activeUsers,
        churnRate: totalUsers > 0 ? ((totalUsers - activeUsers) / totalUsers * 100).toFixed(2) + '%' : '0%'
      },
      registrations: userRegistrations,
      subscriptions: subscriptions.map(sub => ({
        status: sub.subscriptionStatus,
        count: sub._count
      })),
      tiers: tiers.map(tier => ({
        tier: tier.tier,
        count: tier._count
      }))
    };
    
    logger.info('Analytics data export requested', {
      operation: 'admin_export_analytics',
      adminId: req.user!.id
    } as any);
    
    if (format === 'csv') {
      let csvContent = 'Metric,Value\n';
      csvContent += `Total Users,${totalUsers}\n`;
      csvContent += `Active Users,${activeUsers}\n`;
      csvContent += `Churn Rate,${analyticsData.summary.churnRate}\n`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="analytics-export.csv"');
      res.send(csvContent);
    } else {
      res.json(analyticsData);
    }
  } catch (error) {
    logger.error('Failed to export analytics data', error as any);
    res.status(500).json({ error: 'Failed to export analytics data' });
  }
});

// Export audit logs
app.get('/api/admin/audit-logs/export', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { startDate, endDate, format = 'json', operation } = req.query;
    
    // For now, return logged operations from our logger
    // In a full implementation, you'd want a dedicated audit log table
    logger.info('Audit log export requested', {
      operation: 'admin_export_audit_logs',
      adminId: req.user!.id
    } as any);
    
    const auditData = {
      exportedAt: new Date().toISOString(),
      period: {
        startDate: startDate || 'last-30-days',
        endDate: endDate || 'now'
      },
      note: 'Audit logs are currently stored in application logs. This endpoint provides a summary of logged operations.',
      operations: [
        'admin_user_delete',
        'admin_impersonate',
        'admin_2fa_verify',
        'admin_2fa_disable',
        'admin_export_users',
        'admin_export_analytics',
        'admin_cache_clear',
        'admin_cache_warmup'
      ],
      message: 'For detailed audit logs, please check the application log files or implement a dedicated audit log storage system.'
    };
    
    if (format === 'csv') {
      let csvContent = 'Operation,Description\n';
      auditData.operations.forEach(op => {
        csvContent += `${op},Admin operation logged\n`;
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="audit-logs-export.csv"');
      res.send(csvContent);
    } else {
      res.json(auditData);
    }
  } catch (error) {
    logger.error('Failed to export audit logs', error as any);
    res.status(500).json({ error: 'Failed to export audit logs' });
  }
});

// ========================================
// EXERCISE MANAGEMENT ENDPOINTS (Admin)
// ========================================

// GET /api/admin/exercises - List all exercises with filtering
app.get('/api/admin/exercises', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      search, 
      category, 
      difficulty, 
      muscleGroup, 
      equipment, 
      isCustom, 
      isActive = 'true',
      page = '1', 
      limit = '50' 
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const where: any = {};
    
    // Active filter
    if (isActive !== 'all') {
      where.isActive = isActive === 'true';
    }
    
    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    
    // Category filter
    if (category && category !== 'all') {
      where.category = category;
    }
    
    // Difficulty filter
    if (difficulty && difficulty !== 'all') {
      where.difficulty = difficulty;
    }
    
    // Custom/default filter
    if (isCustom && isCustom !== 'all') {
      where.isCustom = isCustom === 'true';
    }
    
    // Muscle group filter
    if (muscleGroup && muscleGroup !== 'all') {
      where.muscleGroups = { has: muscleGroup };
    }
    
    // Equipment filter
    if (equipment && equipment !== 'all') {
      where.equipment = { has: equipment };
    }

    const [exercises, total] = await Promise.all([
      prisma.exercise.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limitNum
      }),
      prisma.exercise.count({ where })
    ]);

    res.json({
      exercises,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger.error('Failed to fetch exercises', error as any);
    res.status(500).json({ error: 'Failed to fetch exercises' });
  }
});

// GET /api/admin/exercises/categories - Get available categories and metadata
app.get('/api/admin/exercises/categories', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const categories = ['push', 'pull', 'legs', 'core', 'cardio', 'fullbody'];
    const difficulties = ['beginner', 'intermediate', 'advanced'];
    const muscleGroups = [
      'chest', 'back', 'shoulders', 'biceps', 'triceps', 'quadriceps', 
      'hamstrings', 'glutes', 'calves', 'abs', 'core', 'forearms', 
      'traps', 'lats', 'rhomboids', 'rear delts', 'upper back', 
      'lower back', 'hip flexors', 'obliques', 'full body'
    ];
    const equipment = [
      'bodyweight', 'dumbbells', 'barbell', 'kettlebell', 'resistance band',
      'pull-up bar', 'bench', 'cable machine', 'squat rack', 'leg press machine',
      'lat pulldown', 'dip bars', 'parallel bars', 'medicine ball', 'stability ball',
      'foam roller', 'plyo box', 'jump rope', 'suspension trainer', 'smith machine'
    ];

    res.json({
      categories,
      difficulties,
      muscleGroups,
      equipment
    });
  } catch (error) {
    logger.error('Failed to fetch exercise categories', error as any);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST /api/admin/exercises - Create new exercise
app.post('/api/admin/exercises', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      description,
      category,
      muscleGroups,
      equipment,
      difficulty,
      instructions,
      tips,
      imageUrl,
      videoUrl
    } = req.body;

    // Validation
    if (!name || !description || !category || !muscleGroups || !equipment || !difficulty || !instructions) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['name', 'description', 'category', 'muscleGroups', 'equipment', 'difficulty', 'instructions']
      });
    }

    // Check for duplicate name
    const existing = await prisma.exercise.findFirst({
      where: { 
        name: { equals: name, mode: 'insensitive' },
        isActive: true
      }
    });

    if (existing) {
      return res.status(409).json({ error: 'Exercise with this name already exists' });
    }

    const exercise = await prisma.exercise.create({
      data: {
        name: name.trim(),
        description: description.trim(),
        category,
        muscleGroups: Array.isArray(muscleGroups) ? muscleGroups : [muscleGroups],
        equipment: Array.isArray(equipment) ? equipment : [equipment],
        difficulty,
        instructions: Array.isArray(instructions) ? instructions : [instructions],
        tips: tips ? (Array.isArray(tips) ? tips : [tips]) : [],
        imageUrl: imageUrl || null,
        videoUrl: videoUrl || null,
        isCustom: true,
        createdBy: req.user!.id
      }
    });

    logger.info('Exercise created', {
      operation: 'admin_exercise_create',
      adminId: req.user!.id,
      exerciseId: exercise.id,
      exerciseName: exercise.name
    } as any);

    res.status(201).json(exercise);
  } catch (error) {
    logger.error('Failed to create exercise', error as any);
    res.status(500).json({ error: 'Failed to create exercise' });
  }
});

// GET /api/admin/exercises/:id - Get single exercise
app.get('/api/admin/exercises/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const exercise = await prisma.exercise.findUnique({
      where: { id }
    });

    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    res.json(exercise);
  } catch (error) {
    logger.error('Failed to fetch exercise', error as any);
    res.status(500).json({ error: 'Failed to fetch exercise' });
  }
});

// PUT /api/admin/exercises/:id - Update exercise
app.put('/api/admin/exercises/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      category,
      muscleGroups,
      equipment,
      difficulty,
      instructions,
      tips,
      imageUrl,
      videoUrl,
      isActive
    } = req.body;

    // Check if exercise exists
    const existing = await prisma.exercise.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    // Check for duplicate name (excluding current exercise)
    if (name && name !== existing.name) {
      const duplicate = await prisma.exercise.findFirst({
        where: { 
          name: { equals: name, mode: 'insensitive' },
          id: { not: id },
          isActive: true
        }
      });

      if (duplicate) {
        return res.status(409).json({ error: 'Exercise with this name already exists' });
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (category !== undefined) updateData.category = category;
    if (muscleGroups !== undefined) updateData.muscleGroups = Array.isArray(muscleGroups) ? muscleGroups : [muscleGroups];
    if (equipment !== undefined) updateData.equipment = Array.isArray(equipment) ? equipment : [equipment];
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (instructions !== undefined) updateData.instructions = Array.isArray(instructions) ? instructions : [instructions];
    if (tips !== undefined) updateData.tips = tips ? (Array.isArray(tips) ? tips : [tips]) : [];
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl || null;
    if (videoUrl !== undefined) updateData.videoUrl = videoUrl || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const exercise = await prisma.exercise.update({
      where: { id },
      data: updateData
    });

    logger.info('Exercise updated', {
      operation: 'admin_exercise_update',
      adminId: req.user!.id,
      exerciseId: exercise.id,
      exerciseName: exercise.name
    } as any);

    res.json(exercise);
  } catch (error) {
    logger.error('Failed to update exercise', error as any);
    res.status(500).json({ error: 'Failed to update exercise' });
  }
});

// DELETE /api/admin/exercises/:id - Soft delete exercise
app.delete('/api/admin/exercises/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const existing = await prisma.exercise.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    // Soft delete by setting isActive to false
    const exercise = await prisma.exercise.update({
      where: { id },
      data: { isActive: false }
    });

    logger.info('Exercise deleted', {
      operation: 'admin_exercise_delete',
      adminId: req.user!.id,
      exerciseId: exercise.id,
      exerciseName: exercise.name
    } as any);

    res.json({ message: 'Exercise deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete exercise', error as any);
    res.status(500).json({ error: 'Failed to delete exercise' });
  }
});

// POST /api/admin/exercises/import - Import static exercises from database
app.post('/api/admin/exercises/import', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { exerciseDatabase } = require('../data/exerciseDatabase');
    
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const exercise of exerciseDatabase) {
      try {
        // Check if already exists
        const existing = await prisma.exercise.findFirst({
          where: { name: { equals: exercise.name, mode: 'insensitive' } }
        });

        if (existing) {
          skipped++;
          continue;
        }

        // Import exercise
        await prisma.exercise.create({
          data: {
            name: exercise.name,
            description: exercise.description,
            category: exercise.category,
            muscleGroups: exercise.muscleGroups,
            equipment: exercise.equipment,
            difficulty: exercise.difficulty,
            instructions: exercise.instructions,
            tips: exercise.tips || [],
            imageUrl: exercise.imageUrl || null,
            videoUrl: exercise.videoUrl || null,
            isCustom: false, // Mark as default exercise
            createdBy: null
          }
        });

        imported++;
      } catch (err) {
        errors.push(`Failed to import ${exercise.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    logger.info('Exercise import completed', {
      operation: 'admin_exercise_import',
      adminId: req.user!.id,
      imported,
      skipped,
      errors: errors.length
    } as any);

    res.json({
      message: 'Import completed',
      imported,
      skipped,
      errors
    });
  } catch (error) {
    logger.error('Failed to import exercises', error as any);
    res.status(500).json({ error: 'Failed to import exercises' });
  }
});

// FOOD DATABASE ENDPOINTS
// Search foods by name (available to all authenticated users)
// Food category placeholder mappings
const foodCategoryPlaceholders = {
  'breakfast': '/placeholders/food/breakfast.svg',
  'lunch': '/placeholders/food/lunch.svg', 
  'dinner': '/placeholders/food/dinner.svg',
  'snack': '/placeholders/food/snack.svg',
  'beverages': '/placeholders/food/beverages.svg',
  'desserts': '/placeholders/food/desserts.svg',
  'dairy': '/placeholders/food/breakfast.svg',
  'fruits': '/placeholders/food/snack.svg',
  'vegetables': '/placeholders/food/lunch.svg',
  'meat': '/placeholders/food/dinner.svg',
  'seafood': '/placeholders/food/dinner.svg',
  'grains': '/placeholders/food/lunch.svg',
  'sweets': '/placeholders/food/desserts.svg',
  'drinks': '/placeholders/food/beverages.svg'
};

// Helper function to get food image with fallback
const getFoodImage = (product: any): string => {
  // Return actual image if available
  if (product.image_url) {
    return product.image_url;
  }
  
  // Try to match category from Open Food Facts categories
  const categories = product.categories?.toLowerCase() || '';
  
  // Check for specific food categories
  for (const [key, placeholder] of Object.entries(foodCategoryPlaceholders)) {
    if (categories.includes(key) || 
        categories.includes(key.slice(0, -1)) || // singular form
        product.product_name?.toLowerCase().includes(key)) {
      return placeholder;
    }
  }
  
  // Special category mappings
  if (categories.includes('breakfast') || categories.includes('cereal') || 
      categories.includes('eggs') || categories.includes('bread')) {
    return foodCategoryPlaceholders.breakfast;
  }
  
  if (categories.includes('fruit') || categories.includes('berry') || 
      categories.includes('apple') || categories.includes('banana')) {
    return foodCategoryPlaceholders.fruits;
  }
  
  if (categories.includes('vegetable') || categories.includes('salad') || 
      categories.includes('tomato') || categories.includes('carrot')) {
    return foodCategoryPlaceholders.vegetables;
  }
  
  if (categories.includes('meat') || categories.includes('chicken') || 
      categories.includes('beef') || categories.includes('pork')) {
    return foodCategoryPlaceholders.meat;
  }
  
  if (categories.includes('fish') || categories.includes('salmon') || 
      categories.includes('tuna') || categories.includes('seafood')) {
    return foodCategoryPlaceholders.seafood;
  }
  
  if (categories.includes('dairy') || categories.includes('milk') || 
      categories.includes('cheese') || categories.includes('yogurt')) {
    return foodCategoryPlaceholders.dairy;
  }
  
  if (categories.includes('beverage') || categories.includes('drink') || 
      categories.includes('juice') || categories.includes('water')) {
    return foodCategoryPlaceholders.beverages;
  }
  
  if (categories.includes('dessert') || categories.includes('cake') || 
      categories.includes('chocolate') || categories.includes('sweet')) {
    return foodCategoryPlaceholders.desserts;
  }
  
  // Default fallback
  return '/placeholders/food/default-food.svg';
};

app.get('/api/food/search', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { q: query, page = 1 } = req.query;
    
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters long' });
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limit = 20;
    const offset = (pageNum - 1) * limit;

    // Check cache first (5 minute TTL for food searches)
    const cacheKey = `food_search_${query.toLowerCase()}_${pageNum}`;
    const cached = getFromCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Search Open Food Facts API
    const searchUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&page=${pageNum}&page_size=${limit}&json=true&fields=product_name,code,nutriscore_grade,nutriments,brands,image_url,categories`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'FitArchitect/1.0 (https://fitarchitect.com)'
      }
    });

    if (!response.ok) {
      throw new Error(`Open Food Facts API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Transform products to our FoodEntry format
    const foods = (data.products || []).map((product: any) => {
      const nutriments = product.nutriments || {};
      
      return {
        name: product.product_name || 'Unknown Product',
        barcode: product.code || '',
        calories: Math.round(nutriments['energy-kcal_100g'] || nutriments['energy_100g'] / 4.184 || 0),
        protein: Math.round((nutriments['proteins_100g'] || 0) * 10) / 10,
        carbs: Math.round((nutriments['carbohydrates_100g'] || 0) * 10) / 10,
        fat: Math.round((nutriments['fat_100g'] || 0) * 10) / 10,
        fiber: Math.round((nutriments['fiber_100g'] || 0) * 10) / 10,
        sugars: Math.round((nutriments['sugars_100g'] || 0) * 10) / 10,
        sodium: Math.round((nutriments['sodium_100g'] || 0) * 1000), // Convert to mg
        servingSize: '100',
        servingUnit: 'g',
        brand: product.brands?.split(',')[0]?.trim() || '',
        image: getFoodImage(product),
        nutriscore: product.nutriscore_grade || null,
        categories: product.categories?.split(',').map((c: string) => c.trim()).slice(0, 3) || []
      };
    }).filter((food: any) => food.name !== 'Unknown Product' && food.calories > 0);

    const result = {
      foods,
      page: pageNum,
      totalPages: Math.ceil((data.count || 0) / limit),
      totalResults: data.count || 0,
      query: query.trim()
    };

    // Cache for 5 minutes
    setCache(cacheKey, result, 5);
    
    res.json(result);
  } catch (error) {
    console.error('Food search error:', error);
    res.status(500).json({ 
      error: 'Failed to search foods',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get food by barcode (Premium feature)
app.get('/api/food/barcode/:barcode', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { barcode } = req.params;
    const user = req.user!;
    
    // Validate barcode format
    if (!barcode || !/^\d{8,13}$/.test(barcode)) {
      return res.status(400).json({ error: 'Invalid barcode format' });
    }

    // Check if user has premium subscription (barcode scanning is premium feature)
    if (!hasValidSubscription(user, 'premium') && !isTestUser(user.email)) {
      return res.status(403).json({ 
        error: 'Premium subscription or 3-day trial required for barcode scanning',
        feature: 'barcode-scanning',
        userTier: user.tier,
        needsParq: user.tier === 'free' && !user.parqCompleted,
        trialUsed: user.freeWorkoutTrialUsed
      });
    }

    // Check cache first (10 minute TTL for barcode lookups)
    const cacheKey = `food_barcode_${barcode}`;
    const cached = getFromCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Query Open Food Facts API by barcode
    const apiUrl = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'FitArchitect/1.0 (https://fitarchitect.com)'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: 'Product not found' });
      }
      throw new Error(`Open Food Facts API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = data.product;
    const nutriments = product.nutriments || {};
    
    // Transform to our FoodEntry format
    const foodEntry = {
      name: product.product_name || product.product_name_en || 'Unknown Product',
      barcode: product.code || barcode,
      calories: Math.round(nutriments['energy-kcal_100g'] || nutriments['energy_100g'] / 4.184 || 0),
      protein: Math.round((nutriments['proteins_100g'] || 0) * 10) / 10,
      carbs: Math.round((nutriments['carbohydrates_100g'] || 0) * 10) / 10,
      fat: Math.round((nutriments['fat_100g'] || 0) * 10) / 10,
      fiber: Math.round((nutriments['fiber_100g'] || 0) * 10) / 10,
      sugars: Math.round((nutriments['sugars_100g'] || 0) * 10) / 10,
      sodium: Math.round((nutriments['sodium_100g'] || 0) * 1000), // Convert to mg
      servingSize: product.serving_size || '100',
      servingUnit: 'g',
      brand: product.brands?.split(',')[0]?.trim() || '',
      image: product.image_front_url || product.image_url || null,
      nutriscore: product.nutriscore_grade || null,
      categories: product.categories?.split(',').map((c: string) => c.trim()).slice(0, 5) || [],
      ingredients: product.ingredients_text || '',
      allergens: product.allergens_tags?.map((tag: string) => tag.replace('en:', '')) || [],
      additives: product.additives_tags?.map((tag: string) => tag.replace('en:', '')) || [],
      packaging: product.packaging_tags?.map((tag: string) => tag.replace('en:', '')) || [],
      stores: product.stores?.split(',').map((s: string) => s.trim()) || [],
      countries: product.countries?.split(',').map((c: string) => c.trim()) || []
    };

    // Validate that we have meaningful nutrition data
    if (foodEntry.calories === 0 && foodEntry.protein === 0 && foodEntry.carbs === 0 && foodEntry.fat === 0) {
      return res.status(404).json({ 
        error: 'Product found but nutrition data unavailable',
        product: {
          name: foodEntry.name,
          brand: foodEntry.brand,
          barcode: foodEntry.barcode
        }
      });
    }

    // Cache for 10 minutes
    setCache(cacheKey, foodEntry, 10);
    
    res.json(foodEntry);
  } catch (error) {
    console.error('Barcode lookup error:', error);
    res.status(500).json({ 
      error: 'Failed to lookup product',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware
app.use(errorLoggingMiddleware);
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // Error has already been logged by errorLoggingMiddleware
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Export app for testing
export { app };

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// ==============================================
// ADMIN WORKOUT MANAGEMENT ENDPOINTS
// ==============================================

// Get exercise-GIF mappings for admin media management
app.get('/api/admin/exercise-media/mappings', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Read the current exercise-GIF mappings from the generated file
    const fs = require('fs');
    const path = require('path');
    
    const mappingFilePath = path.join(__dirname, '../../src/data/localExerciseGifs.ts');
    const mappingContent = fs.readFileSync(mappingFilePath, 'utf8');
    
    // Parse the mappings
    const mappingMatch = mappingContent.match(/export const localExerciseGifs: Record<string, string> = \{([\s\S]*?)\}/m);
    if (!mappingMatch) {
      return res.status(500).json({ error: 'Could not parse exercise mappings' });
    }
    
    const mappingText = mappingMatch[1];
    const mappings: any[] = [];
    
    mappingText.split('\n').forEach((line: string) => {
      const match = line.match(/^\s*"([^"]+)":\s*"([^"]+)",?/);
      if (match) {
        const [, exerciseName, gifPath] = match;
        const category = gifPath.split('/')[2] || 'unknown'; // Extract category from path
        
        mappings.push({
          exerciseName,
          gifPath,
          category,
          size: 0, // Would need file system access to get actual size
          lastModified: new Date().toISOString()
        });
      }
    });
    
    res.json(mappings);
  } catch (error) {
    console.error('Error fetching exercise mappings:', error);
    res.status(500).json({ error: 'Failed to fetch exercise mappings' });
  }
});

// Get available GIFs from the public directory
app.get('/api/admin/exercise-media/available-gifs', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const gifDirectory = path.join(__dirname, '../../public/exercise-gifs');
    const availableGifs: any[] = [];
    
    // Function to recursively scan directories
    const scanDirectory = (dir: string, category = '') => {
      const items = fs.readdirSync(dir);
      
      items.forEach((item: string) => {
        const itemPath = path.join(dir, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          scanDirectory(itemPath, item);
        } else if (item.toLowerCase().endsWith('.gif')) {
          const relativePath = `/exercise-gifs/${category ? category + '/' : ''}${item}`;
          availableGifs.push({
            path: relativePath,
            name: item.replace('.gif', ''),
            category: category || 'uncategorized',
            size: stats.size,
            lastModified: stats.mtime.toISOString()
          });
        }
      });
    };
    
    scanDirectory(gifDirectory);
    
    res.json(availableGifs);
  } catch (error) {
    console.error('Error scanning GIF directory:', error);
    res.status(500).json({ error: 'Failed to scan GIF directory' });
  }
});

// Update exercise-GIF mapping
app.patch('/api/admin/exercise-media/mappings/:exerciseName', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { exerciseName } = req.params;
    const { gifPath } = req.body;
    
    if (!exerciseName || !gifPath) {
      return res.status(400).json({ error: 'Exercise name and GIF path are required' });
    }
    
    // Here you would update the mapping file or database
    // For now, we'll just return success (implementation would depend on your storage method)
    
    res.json({ message: 'Exercise GIF mapping updated successfully' });
  } catch (error) {
    console.error('Error updating exercise mapping:', error);
    res.status(500).json({ error: 'Failed to update exercise mapping' });
  }
});

// Remove exercise-GIF mapping
app.delete('/api/admin/exercise-media/mappings/:exerciseName', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { exerciseName } = req.params;
    
    // Here you would remove the mapping from file or database
    // For now, we'll just return success
    
    res.json({ message: 'Exercise GIF mapping removed successfully' });
  } catch (error) {
    console.error('Error removing exercise mapping:', error);
    res.status(500).json({ error: 'Failed to remove exercise mapping' });
  }
});

// Upload GIFs endpoint
app.post('/api/admin/exercise-media/upload', authenticate, requireAdmin, uploadGifs.array('gifs', 20), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    const category = req.body.category || 'general';

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    let uploadedCount = 0;
    const uploadedFiles: Array<{ 
      name: string; 
      path: string; 
      size: number; 
      category: string; 
    }> = [];
    const errors: string[] = [];

    files.forEach((file) => {
      try {
        // Create the public-accessible path
        const publicPath = `/exercise-gifs/${category}/${file.filename}`;
        
        uploadedFiles.push({
          name: file.originalname,
          path: publicPath,
          size: file.size,
          category: category
        });
        
        uploadedCount++;
      } catch (error) {
        errors.push(`Failed to process ${file.originalname}: ${error}`);
      }
    });

    // Log the upload for admin tracking
    console.log(`Admin ${req.user?.email} uploaded ${uploadedCount} GIFs to category: ${category}`);

    res.json({ 
      uploaded: uploadedCount,
      files: uploadedFiles,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully uploaded ${uploadedCount} GIF${uploadedCount === 1 ? '' : 's'} to ${category} category`
    });
    
  } catch (error) {
    console.error('GIF upload error:', error);
    
    // Handle multer errors
    if (error instanceof MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large (max 10MB per file)' });
      } else if (error.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ error: 'Too many files (max 20 files at once)' });
      } else {
        return res.status(400).json({ error: `Upload error: ${error.message}` });
      }
    }
    
    // Handle file filter errors
    if (error instanceof Error && error.message === 'Only GIF files are allowed') {
      return res.status(400).json({ error: 'Only GIF files are allowed' });
    }
    
    res.status(500).json({ error: 'Failed to upload GIFs' });
  }
});

// Bulk assign GIFs to exercises
app.post('/api/admin/exercise-media/bulk-assign', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { assignments } = req.body; // Array of { exerciseName, gifPath } objects
    
    if (!assignments || !Array.isArray(assignments)) {
      return res.status(400).json({ error: 'Assignments array is required' });
    }
    
    let assignedCount = 0;
    const errors: string[] = [];
    
    // Process each assignment
    for (const assignment of assignments) {
      try {
        const { exerciseName, gifPath } = assignment;
        
        if (!exerciseName || !gifPath) {
          errors.push(`Invalid assignment: missing exerciseName or gifPath`);
          continue;
        }
        
        // Try to find and update the exercise in database
        const exercise = await prisma.exercise.findFirst({
          where: {
            name: {
              contains: exerciseName,
              mode: 'insensitive'
            }
          }
        });
        
        if (exercise) {
          await prisma.exercise.update({
            where: { id: exercise.id },
            data: { 
              imageUrl: gifPath,
              videoUrl: gifPath // For GIFs, we can use the same path
            }
          });
          assignedCount++;
        } else {
          errors.push(`Exercise not found: ${exerciseName}`);
        }
      } catch (error: any) {
        errors.push(`Failed to assign ${assignment.exerciseName}: ${error.message}`);
      }
    }
    
    // Log the bulk assignment operation
    console.log(`Bulk media assignment completed:`, {
      adminUser: req.user?.email,
      totalAssignments: assignments.length,
      successful: assignedCount,
      errors: errors.length,
      timestamp: new Date().toISOString()
    });
    
    res.json({ 
      message: 'Bulk assignment completed',
      assigned: assignedCount,
      total: assignments.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error in bulk assignment:', error);
    res.status(500).json({ error: 'Failed to perform bulk assignment' });
  }
});

// ==============================================
// GIF APPROVAL SYSTEM ENDPOINTS
// ==============================================

// Update exercise approval status
app.patch('/api/admin/exercise-media/approval/:exerciseId', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { exerciseId } = req.params;
    const { approvalStatus, flaggedReason, hideGif } = req.body;
    
    if (!exerciseId) {
      return res.status(400).json({ error: 'Exercise ID is required' });
    }
    
    if (!approvalStatus || !['pending', 'approved', 'flagged', 'hidden'].includes(approvalStatus)) {
      return res.status(400).json({ error: 'Valid approval status is required (pending, approved, flagged, hidden)' });
    }
    
    const updateData: any = {
      approvalStatus,
      lastReviewedAt: new Date(),
      reviewedBy: req.user?.id
    };
    
    if (approvalStatus === 'flagged' && flaggedReason) {
      updateData.flaggedReason = flaggedReason;
    }
    
    if (hideGif !== undefined) {
      updateData.hideGif = hideGif;
    }
    
    // First, check if the exercise exists
    const existingExercise = await prisma.exercise.findUnique({
      where: { id: exerciseId }
    });
    
    if (!existingExercise) {
      // If it doesn't exist, create a new Exercise record
      const { exerciseName, gifPath, category } = req.body;
      
      if (!exerciseName) {
        return res.status(400).json({ error: 'Exercise name is required for new exercise' });
      }
      
      const newExercise = await prisma.exercise.create({
        data: {
          id: exerciseId,
          name: exerciseName,
          description: `Exercise with GIF: ${gifPath}`,
          category: category || 'strength',
          muscleGroups: [],
          equipment: [],
          difficulty: 'intermediate',
          instructions: [],
          gifPath: gifPath,
          ...updateData,
          isCustom: false,
          createdBy: req.user?.id
        }
      });
      
      res.json({ 
        message: 'Exercise created and approval status updated',
        exercise: newExercise
      });
    } else {
      // Update existing exercise
      const updatedExercise = await prisma.exercise.update({
        where: { id: exerciseId },
        data: updateData
      });
      
      res.json({ 
        message: 'Exercise approval status updated successfully',
        exercise: updatedExercise
      });
    }
    
    // Log the approval action
    console.log(`Exercise approval updated:`, {
      adminUser: req.user?.email,
      exerciseId,
      exerciseName: existingExercise?.name || req.body.exerciseName,
      approvalStatus,
      flaggedReason,
      hideGif,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error updating exercise approval:', error);
    res.status(500).json({ error: 'Failed to update exercise approval status' });
  }
});

// Bulk approve exercises
app.post('/api/admin/exercise-media/bulk-approve', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { exerciseIds, approvalStatus = 'approved' } = req.body;
    
    if (!exerciseIds || !Array.isArray(exerciseIds) || exerciseIds.length === 0) {
      return res.status(400).json({ error: 'Exercise IDs array is required' });
    }
    
    const updateData = {
      approvalStatus,
      lastReviewedAt: new Date(),
      reviewedBy: req.user?.id,
      ...(approvalStatus === 'approved' && { flaggedReason: null })
    };
    
    // Update all exercises in batch
    const result = await prisma.exercise.updateMany({
      where: {
        id: {
          in: exerciseIds
        }
      },
      data: updateData
    });
    
    // Log the bulk approval action
    console.log(`Bulk exercise approval:`, {
      adminUser: req.user?.email,
      exerciseCount: exerciseIds.length,
      updatedCount: result.count,
      approvalStatus,
      timestamp: new Date().toISOString()
    });
    
    res.json({ 
      message: `Bulk approval completed`,
      updated: result.count,
      requested: exerciseIds.length
    });
    
  } catch (error) {
    console.error('Error in bulk approval:', error);
    res.status(500).json({ error: 'Failed to perform bulk approval' });
  }
});

// Update exercise details (name, description)
app.patch('/api/admin/exercise-media/details/:exerciseId', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { exerciseId } = req.params;
    const { name, description, category } = req.body;
    
    if (!exerciseId) {
      return res.status(400).json({ error: 'Exercise ID is required' });
    }
    
    const updateData: any = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (category) updateData.category = category;
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'At least one field to update is required' });
    }
    
    const updatedExercise = await prisma.exercise.update({
      where: { id: exerciseId },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    });
    
    res.json({ 
      message: 'Exercise details updated successfully',
      exercise: updatedExercise
    });
    
  } catch (error) {
    console.error('Error updating exercise details:', error);
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      res.status(404).json({ error: 'Exercise not found' });
    } else {
      res.status(500).json({ error: 'Failed to update exercise details' });
    }
  }
});

// Get exercises with approval status for admin panel
app.get('/api/admin/exercise-media/exercises-with-approval', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, search, category, limit = '50', offset = '0' } = req.query;
    
    const whereClause: any = {};
    
    // Filter by approval status
    if (status && typeof status === 'string') {
      whereClause.approvalStatus = status;
    }
    
    // Filter by search term
    if (search && typeof search === 'string') {
      whereClause.name = {
        contains: search,
        mode: 'insensitive'
      };
    }
    
    // Filter by category
    if (category && typeof category === 'string' && category !== 'all') {
      whereClause.category = category;
    }
    
    const exercises = await prisma.exercise.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        gifPath: true,
        approvalStatus: true,
        lastReviewedAt: true,
        reviewedBy: true,
        flaggedReason: true,
        hideGif: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { updatedAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });
    
    // Get total count for pagination
    const totalCount = await prisma.exercise.count({
      where: whereClause
    });
    
    res.json({
      exercises,
      pagination: {
        total: totalCount,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: parseInt(offset as string) + parseInt(limit as string) < totalCount
      }
    });
    
  } catch (error) {
    console.error('Error fetching exercises with approval status:', error);
    res.status(500).json({ error: 'Failed to fetch exercises' });
  }
});

// Setup warmup directory structure for Railway deployment
app.post('/api/admin/exercise-media/setup-warmup-directory', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    // Create warmup directory in public/exercise-gifs/
    const warmupDir = path.join(process.cwd(), 'public', 'exercise-gifs', 'warmup');
    
    try {
      await fs.access(warmupDir);
      res.json({ message: 'Warmup directory already exists', path: warmupDir });
    } catch (error) {
      // Directory doesn't exist, create it
      await fs.mkdir(warmupDir, { recursive: true });
      
      // Create a README.md file in the warmup directory
      const readmeContent = `# Warmup Exercise GIFs

This directory contains GIF animations for warmup exercises in the FitArchitect application.

## Structure
- Place warmup exercise GIFs directly in this folder
- Use descriptive filenames like: arm-circles.gif, shoulder-rolls.gif, etc.
- GIFs should be optimized for web (under 2MB each)

## Emergency Fallbacks
If proper warmup GIFs are not available, the system will use appropriate alternatives from other exercise categories.

Created: ${new Date().toISOString()}
`;
      
      await fs.writeFile(path.join(warmupDir, 'README.md'), readmeContent);
      
      res.json({ 
        message: 'Warmup directory structure created successfully',
        path: warmupDir,
        created: true
      });
    }
    
  } catch (error) {
    console.error('Error setting up warmup directory:', error);
    res.status(500).json({ error: 'Failed to setup warmup directory structure' });
  }
});

// Emergency fix warmup GIF mappings endpoint for production
app.post('/api/admin/exercise-media/emergency-fix-warmup-gifs', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const warmupFixes = [
      { exerciseName: 'Arm Circles', newGifPath: '/exercise-gifs/shoulders/cable-one-arm-lateral-raise.gif' },
      { exerciseName: 'Shoulder Rolls', newGifPath: '/exercise-gifs/back/barbell-shrug.gif' },
      { exerciseName: 'Walking Lunge', newGifPath: '/exercise-gifs/legs/barbell-lunge.gif' },
      { exerciseName: 'Torso Twists', newGifPath: '/exercise-gifs/core/barbell-standing-twist.gif' },
      { exerciseName: 'Hip Circles', newGifPath: '/exercise-gifs/core/45-side-bend.gif' },
      { exerciseName: 'Walking High Knees', newGifPath: '/exercise-gifs/cardio/walking-high-knees-lunge.gif' },
      { exerciseName: 'Butt Kickers', newGifPath: '/exercise-gifs/cardio/mountain-climber.gif' }
    ];

    let fixedCount = 0;
    const results = [];

    // Update each exercise in the database if it exists
    for (const fix of warmupFixes) {
      try {
        // First try to find and update existing exercise
        const updatedExercise = await prisma.exercise.updateMany({
          where: { name: fix.exerciseName },
          data: { 
            gifPath: fix.newGifPath,
            approvalStatus: 'approved',
            lastReviewedAt: new Date(),
            reviewedBy: req.user?.name || 'System'
          }
        });

        if (updatedExercise.count > 0) {
          fixedCount++;
          results.push({ exercise: fix.exerciseName, status: 'updated', gifPath: fix.newGifPath });
        } else {
          // Create new exercise entry if it doesn't exist
          await prisma.exercise.create({
            data: {
              name: fix.exerciseName,
              description: `${fix.exerciseName} warmup exercise`,
              category: 'warmup',
              difficulty: 'beginner',
              gifPath: fix.newGifPath,
              approvalStatus: 'approved',
              lastReviewedAt: new Date(),
              reviewedBy: req.user?.name || 'System',
              hideGif: false
            }
          });
          fixedCount++;
          results.push({ exercise: fix.exerciseName, status: 'created', gifPath: fix.newGifPath });
        }
      } catch (error) {
        console.warn(`Failed to fix ${fix.exerciseName}:`, error);
        results.push({ exercise: fix.exerciseName, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
    
    res.json({ 
      message: `Emergency fixed ${fixedCount} warmup exercise GIFs`,
      fixed: fixedCount,
      results
    });
    
  } catch (error) {
    console.error('Error in emergency warmup GIF fix:', error);
    res.status(500).json({ error: 'Emergency fix failed' });
  }
});

// Validate GIF directory structure (Railway deployment check)
app.get('/api/admin/exercise-media/validate-gif-structure', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    const baseGifDir = path.join(process.cwd(), 'public', 'exercise-gifs');
    const expectedDirs = ['warmup', 'strength', 'cardio', 'flexibility', 'core', 'arms', 'legs', 'back', 'chest', 'shoulders'];
    
    const validation = {
      baseDirectory: { exists: false, path: baseGifDir },
      subdirectories: [] as any[],
      totalGifs: 0,
      missingDirs: [] as string[],
      summary: ''
    };
    
    // Check if base directory exists
    try {
      await fs.access(baseGifDir);
      validation.baseDirectory.exists = true;
    } catch (error) {
      validation.baseDirectory.exists = false;
      return res.json({
        ...validation,
        summary: 'Base GIF directory does not exist - critical deployment issue'
      });
    }
    
    // Check each expected subdirectory
    for (const dir of expectedDirs) {
      const dirPath = path.join(baseGifDir, dir);
      const dirInfo = { name: dir, exists: false, path: dirPath, gifCount: 0, gifs: [] as string[] };
      
      try {
        await fs.access(dirPath);
        dirInfo.exists = true;
        
        // Count GIFs in directory
        const files = await fs.readdir(dirPath);
        const gifFiles = files.filter((file: string) => file.toLowerCase().endsWith('.gif'));
        dirInfo.gifCount = gifFiles.length;
        dirInfo.gifs = gifFiles.slice(0, 5); // First 5 GIFs for reference
        validation.totalGifs += gifFiles.length;
        
      } catch (error) {
        dirInfo.exists = false;
        validation.missingDirs.push(dir);
      }
      
      validation.subdirectories.push(dirInfo);
    }
    
    // Generate summary
    if (validation.missingDirs.length === 0) {
      validation.summary = `All directories present. ${validation.totalGifs} GIFs available.`;
    } else {
      validation.summary = `Missing ${validation.missingDirs.length} directories: ${validation.missingDirs.join(', ')}. ${validation.totalGifs} GIFs available.`;
    }
    
    res.json(validation);
    
  } catch (error) {
    console.error('Error validating GIF structure:', error);
    res.status(500).json({ error: 'Failed to validate GIF directory structure' });
  }
});

// Duplicate endpoint removed - using the comprehensive one at line 4661

// Save workout template
app.post('/api/admin/workout-templates', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      description,
      difficulty,
      duration,
      targetMuscleGroups,
      equipment,
      exercises,
      isPublic
    } = req.body;
    
    if (!name || !exercises || !Array.isArray(exercises) || exercises.length === 0) {
      return res.status(400).json({ error: 'Workout name and exercises are required' });
    }
    
    // Get admin user ID
    const adminUserId = req.user?.id;
    if (!adminUserId) {
      return res.status(401).json({ error: 'Admin user not found' });
    }
    
    // Structure exercises into weeks format for WorkoutPlan
    const weeksData = [{
      weekNumber: 1,
      days: exercises.map((exercise: any, index: number) => ({
        dayNumber: index + 1,
        name: `Day ${index + 1}`,
        exercises: [exercise],
        isRestDay: false,
        type: 'strength',
        difficulty: difficulty || 'beginner',
        duration: duration || 45,
        targetMuscleGroups: exercise.muscleGroups || [],
        equipment: exercise.equipment || []
      }))
    }];
    
    // Create workout plan as template
    const workoutPlan = await prisma.workoutPlan.create({
      data: {
        userId: adminUserId,
        name,
        description: description || '',
        duration: 1, // 1 week template
        weeks: weeksData,
        targetMuscleGroups: targetMuscleGroups || [],
        difficulty: difficulty || 'beginner',
        isDefault: isPublic !== false, // Default to public/template
        estimatedDuration: duration || 45,
        equipment: equipment || [],
        source: 'admin'
      }
    });
    
    res.json({ 
      message: 'Workout template saved successfully',
      id: workoutPlan.id,
      template: {
        id: workoutPlan.id,
        name: workoutPlan.name,
        description: workoutPlan.description,
        difficulty: workoutPlan.difficulty,
        duration: workoutPlan.estimatedDuration,
        targetMuscleGroups: workoutPlan.targetMuscleGroups,
        equipment: workoutPlan.equipment,
        exercises: weeksData,
        isPublic: workoutPlan.isDefault,
        createdAt: workoutPlan.createdAt.toISOString()
      }
    });
  } catch (error) {
    console.error('Error saving workout template:', error);
    res.status(500).json({ error: 'Failed to save workout template' });
  }
});

// Get workout templates
app.get('/api/admin/workout-templates', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Fetch template workouts from database (default templates)
    const workoutPlans = await prisma.workoutPlan.findMany({
      where: {
        isDefault: true  // Only get template workouts
      },
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Transform to expected template format
    const templates = workoutPlans.map(plan => {
      const weeks = Array.isArray(plan.weeks) ? plan.weeks : [];
      const totalExercises = weeks.reduce((count, week: any) => {
        if (week.days && Array.isArray(week.days)) {
          return count + week.days.reduce((dayCount: number, day: any) => {
            return dayCount + (day.exercises ? day.exercises.length : 0);
          }, 0);
        }
        return count;
      }, 0);
      
      return {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        difficulty: plan.difficulty,
        duration: plan.estimatedDuration || 45,
        targetMuscleGroups: plan.targetMuscleGroups,
        equipment: plan.equipment,
        exercises: weeks, // Full exercise structure
        isPublic: plan.isDefault,
        createdBy: plan.user.email,
        createdAt: plan.createdAt.toISOString(),
        usageCount: 0, // TODO: Could add actual usage tracking
        exerciseCount: totalExercises
      };
    });
    
    res.json(templates);
  } catch (error) {
    console.error('Error fetching workout templates:', error);
    res.status(500).json({ error: 'Failed to fetch workout templates' });
  }
});

// Assign workout to user
app.post('/api/admin/users/:userId/assign-workout', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { workoutId, templateId } = req.body;
    
    if (!userId || (!workoutId && !templateId)) {
      return res.status(400).json({ error: 'User ID and workout/template ID are required' });
    }
    
    // Here you would create the assignment in the database
    // For now, just return success
    
    res.json({ 
      message: 'Workout assigned to user successfully',
      assignmentId: `assignment-${Date.now()}`
    });
  } catch (error) {
    console.error('Error assigning workout to user:', error);
    res.status(500).json({ error: 'Failed to assign workout to user' });
  }
});

// Get user's assigned workouts
app.get('/api/admin/users/:userId/workouts', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    
    // Fetch user's assigned workouts from database
    // For now, return placeholder data
    
    const assignments = [
      {
        id: '1',
        workoutName: 'Upper Body Strength',
        assignedAt: new Date().toISOString(),
        assignedBy: req.user?.email,
        status: 'active'
      }
    ];
    
    res.json(assignments);
  } catch (error) {
    console.error('Error fetching user workouts:', error);
    res.status(500).json({ error: 'Failed to fetch user workouts' });
  }
});

// =============================================================================
// MISSING ADMIN API ENDPOINTS
// =============================================================================

// Dashboard Stats for Overview Panel
app.get('/api/admin/dashboard/stats', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get basic user stats
    const totalUsers = await prisma.userProfile.count();
    const activeSubscriptions = await prisma.subscription.count({
      where: { status: 'active' }
    });
    
    // Get today's new users
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newUsersToday = await prisma.userProfile.count({
      where: {
        createdAt: {
          gte: today
        }
      }
    });

    // Get workout completion stats
    const completedWorkouts = await prisma.workoutLog.count({
      where: {
        completed: true
      }
    });

    // Calculate revenue (this would need actual payment data)
    const monthlyRevenue = activeSubscriptions * 29.99; // Placeholder calculation
    const totalRevenue = monthlyRevenue * 12; // Placeholder

    const stats = {
      totalUsers,
      activeSubscriptions,
      monthlyRevenue,
      totalRevenue,
      newUsersToday,
      churnRate: 5.2, // Placeholder
      averageSessionTime: 45, // Placeholder
      completedWorkouts
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Dashboard Activity Feed for Overview Panel
app.get('/api/admin/dashboard/activity', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const activities: Array<{
      id: string;
      type: string;
      message: string;
      timestamp: string;
      user?: string;
    }> = [];
    
    // Get recent user registrations
    const recentUsers = await prisma.userProfile.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { email: true, createdAt: true, name: true }
    });

    recentUsers.forEach(user => {
      activities.push({
        id: `user-${Date.now()}-${Math.random()}`,
        type: 'user_registration',
        message: `New user registered: ${user.name || user.email}`,
        timestamp: user.createdAt.toISOString(),
        user: user.email
      });
    });

    // Get recent workout completions
    const recentWorkouts = await prisma.workoutLog.findMany({
      take: 5,
      orderBy: { date: 'desc' },
      where: { completed: true },
      include: { user: { select: { email: true, name: true } } }
    });

    recentWorkouts.forEach(workout => {
      activities.push({
        id: `workout-${workout.id}`,
        type: 'workout_completion',
        message: `Workout completed: ${workout.workoutId || 'Unknown workout'}`,
        timestamp: workout.date.toISOString(),
        user: workout.user.email
      });
    });

    // Sort by timestamp
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json(activities.slice(0, 10));
  } catch (error) {
    console.error('Error fetching dashboard activity:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard activity' });
  }
});

// Enhanced Workout Templates Endpoints
app.put('/api/admin/workout-templates/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      difficulty,
      duration,
      targetMuscleGroups,
      equipment,
      exercises,
      isPublic
    } = req.body;

    // Structure exercises into weeks format
    const weeksData = exercises ? [{
      weekNumber: 1,
      days: exercises.map((exercise: any, index: number) => ({
        dayNumber: index + 1,
        name: `Day ${index + 1}`,
        exercises: [exercise],
        isRestDay: false,
        type: 'strength',
        difficulty: difficulty || 'beginner',
        duration: duration || 45,
        targetMuscleGroups: exercise.muscleGroups || [],
        equipment: exercise.equipment || []
      }))
    }] : undefined;

    // Update workout plan in database
    const updatedPlan = await prisma.workoutPlan.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(difficulty && { difficulty }),
        ...(duration && { estimatedDuration: duration }),
        ...(targetMuscleGroups && { targetMuscleGroups }),
        ...(equipment && { equipment }),
        ...(weeksData && { weeks: weeksData }),
        ...(isPublic !== undefined && { isDefault: isPublic })
      }
    });

    res.json({
      id: updatedPlan.id,
      name: updatedPlan.name,
      description: updatedPlan.description,
      difficulty: updatedPlan.difficulty,
      duration: updatedPlan.estimatedDuration,
      targetMuscleGroups: updatedPlan.targetMuscleGroups,
      equipment: updatedPlan.equipment,
      exercises: updatedPlan.weeks,
      isPublic: updatedPlan.isDefault,
      updatedAt: updatedPlan.updatedAt.toISOString()
    });
  } catch (error: any) {
    console.error('Error updating workout template:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Workout template not found' });
    }
    res.status(500).json({ error: 'Failed to update workout template' });
  }
});

app.delete('/api/admin/workout-templates/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Delete workout plan from database
    await prisma.workoutPlan.delete({
      where: { id }
    });
    
    res.json({ message: 'Template deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting workout template:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Workout template not found' });
    }
    res.status(500).json({ error: 'Failed to delete workout template' });
  }
});

app.patch('/api/admin/workout-templates/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Map frontend fields to database fields
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.description) dbUpdates.description = updates.description;
    if (updates.difficulty) dbUpdates.difficulty = updates.difficulty;
    if (updates.duration) dbUpdates.estimatedDuration = updates.duration;
    if (updates.targetMuscleGroups) dbUpdates.targetMuscleGroups = updates.targetMuscleGroups;
    if (updates.equipment) dbUpdates.equipment = updates.equipment;
    if (updates.isPublic !== undefined) dbUpdates.isDefault = updates.isPublic;
    
    // Update workout plan in database
    const updatedPlan = await prisma.workoutPlan.update({
      where: { id },
      data: dbUpdates
    });
    
    res.json({ 
      id: updatedPlan.id,
      name: updatedPlan.name,
      description: updatedPlan.description,
      difficulty: updatedPlan.difficulty,
      duration: updatedPlan.estimatedDuration,
      targetMuscleGroups: updatedPlan.targetMuscleGroups,
      equipment: updatedPlan.equipment,
      isPublic: updatedPlan.isDefault,
      updatedAt: updatedPlan.updatedAt.toISOString()
    });
  } catch (error: any) {
    console.error('Error patching workout template:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Workout template not found' });
    }
    res.status(500).json({ error: 'Failed to update workout template' });
  }
});

// Settings helper functions
function validateSettings(settings: any): string[] {
  const errors: string[] = [];
  
  // Validate basic settings
  if (settings.appName !== undefined) {
    if (typeof settings.appName !== 'string' || settings.appName.trim().length === 0) {
      errors.push('App name must be a non-empty string');
    } else if (settings.appName.length > 100) {
      errors.push('App name must be 100 characters or less');
    }
  }
  
  if (settings.appDescription !== undefined) {
    if (typeof settings.appDescription !== 'string' || settings.appDescription.length > 500) {
      errors.push('App description must be a string of 500 characters or less');
    }
  }
  
  if (settings.supportEmail !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof settings.supportEmail !== 'string' || !emailRegex.test(settings.supportEmail)) {
      errors.push('Support email must be a valid email address');
    }
  }
  
  if (settings.notificationEmail !== undefined && settings.notificationEmail !== null) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof settings.notificationEmail !== 'string' || !emailRegex.test(settings.notificationEmail)) {
      errors.push('Notification email must be a valid email address');
    }
  }
  
  // Validate boolean settings
  const booleanFields = ['maintenanceMode', 'allowRegistrations', 'requireEmailVerification'];
  booleanFields.forEach(field => {
    if (settings[field] !== undefined && typeof settings[field] !== 'boolean') {
      errors.push(`${field} must be a boolean value`);
    }
  });
  
  // Validate numeric settings
  if (settings.maxFreeUsers !== undefined) {
    if (!Number.isInteger(settings.maxFreeUsers) || settings.maxFreeUsers < 0) {
      errors.push('Max free users must be a non-negative integer');
    } else if (settings.maxFreeUsers > 10000) {
      errors.push('Max free users cannot exceed 10,000');
    }
  }
  
  if (settings.sessionTimeout !== undefined) {
    if (!Number.isInteger(settings.sessionTimeout) || settings.sessionTimeout < 5 || settings.sessionTimeout > 43200) {
      errors.push('Session timeout must be between 5 and 43,200 minutes (30 days)');
    }
  }
  
  return errors;
}

function extractDatabaseSettings(settings: any): any {
  // Only extract fields that exist in the SystemSettings model
  const dbSettings: any = {};
  
  const dbFields = [
    'maintenanceMode',
    'allowRegistrations', 
    'requireEmailVerification',
    'notificationEmail',
    'appName',
    'appDescription',
    'supportEmail',
    'maxFreeUsers',
    'sessionTimeout'
  ];
  
  dbFields.forEach(field => {
    if (settings[field] !== undefined) {
      dbSettings[field] = settings[field];
    }
  });
  
  return dbSettings;
}

// Enhanced Settings Endpoints
app.get('/api/admin/settings', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get database settings first
    const dbSettings = await prisma.systemSettings.findFirst();
    
    // Return comprehensive settings structure, prioritizing database values
    const settings = {
      // General Settings (database-stored values override defaults)
      appName: dbSettings?.appName || process.env.APP_NAME || 'FitArchitect',
      appDescription: dbSettings?.appDescription || 'Your AI-powered fitness companion',
      supportEmail: dbSettings?.supportEmail || process.env.SUPPORT_EMAIL || 'support@fitarchitect.com',
      maintenanceMode: dbSettings?.maintenanceMode ?? false,
      allowRegistrations: dbSettings?.allowRegistrations ?? true,
      requireEmailVerification: dbSettings?.requireEmailVerification ?? false,
      notificationEmail: dbSettings?.notificationEmail || process.env.ADMIN_EMAIL || null,
      defaultUserTier: 'free' as const,
      maxFreeUsers: dbSettings?.maxFreeUsers ?? 1000,
      sessionTimeout: dbSettings?.sessionTimeout ?? 1440, // 24 hours in minutes

      // Feature Toggles
      features: {
        workoutGeneration: true,
        nutritionTracking: true,
        mealPlanning: true,
        barcodeScanning: true,
        telegramIntegration: !!process.env.TELEGRAM_BOT_TOKEN,
        analytics: true,
        parqRequired: true
      },

      // Integration Settings
      openaiSettings: {
        enabled: !!process.env.OPENAI_API_KEY,
        model: 'gpt-4',
        maxTokens: 2000,
        temperature: 0.7
      },
      
      stripeSettings: {
        enabled: !!process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? '****' : ''
      },

      telegramSettings: {
        enabled: !!process.env.TELEGRAM_BOT_TOKEN,
        botToken: process.env.TELEGRAM_BOT_TOKEN ? '****' : '',
        webhookUrl: process.env.TELEGRAM_WEBHOOK_URL || ''
      },

      // Email Settings
      emailSettings: {
        provider: 'smtp' as const,
        fromAddress: process.env.FROM_EMAIL || 'noreply@fitarchitect.com',
        fromName: 'FitArchitect',
        smtpHost: process.env.SMTP_HOST,
        smtpPort: parseInt(process.env.SMTP_PORT || '587'),
        smtpUser: process.env.SMTP_USER ? '****' : '',
        smtpPass: process.env.SMTP_PASS ? '****' : ''
      },

      // Security Settings
      security: {
        passwordMinLength: 8,
        requireStrongPassword: true,
        maxLoginAttempts: 5,
        lockoutDuration: 15, // minutes
        jwtExpiration: '7d',
        twoFactorRequired: false,
        allowedOrigins: ['http://localhost:3000', 'http://localhost:5173'],
        rateLimitRequests: 100,
        rateLimitWindow: 15 // minutes
      },

      // Notification Settings
      notifications: {
        systemEmails: true,
        marketingEmails: false,
        weeklyDigest: true,
        adminNotifications: ['admin@fitarchitect.com'],
        userWelcomeEmail: true,
        subscriptionEmails: true
      }
    };

    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.put('/api/admin/settings', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const incomingSettings = req.body;
    
    // Log the settings update attempt
    console.log('Admin settings update requested by:', req.user?.email);
    console.log('Settings keys being updated:', Object.keys(incomingSettings));
    
    // Validate the incoming settings
    const validationErrors = validateSettings(incomingSettings);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid settings provided',
        details: validationErrors
      });
    }
    
    // Extract database-storable settings from the incoming data
    const dbSettings = extractDatabaseSettings(incomingSettings);
    
    // Get current settings for audit logging
    const currentSettings = await prisma.systemSettings.findFirst();
    
    let updatedSettings;
    if (currentSettings) {
      // Update existing settings
      updatedSettings = await prisma.systemSettings.update({
        where: { id: currentSettings.id },
        data: dbSettings
      });
    } else {
      // Create new settings record
      updatedSettings = await prisma.systemSettings.create({
        data: dbSettings
      });
    }
    
    // Create comprehensive audit log
    await prisma.auditLog.create({
      data: {
        adminUserId: req.user?.id || '',
        adminEmail: req.user?.email || '',
        action: 'update_settings',
        resourceType: 'system_settings',
        resourceId: updatedSettings.id,
        details: JSON.stringify({
          changedFields: Object.keys(dbSettings),
          previousValues: currentSettings ? extractDatabaseSettings(currentSettings) : null,
          newValues: dbSettings,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || ''
      }
    });
    
    console.log(`✅ Settings updated successfully by ${req.user?.email}`);
    console.log('Updated fields:', Object.keys(dbSettings));
    
    res.json({ 
      message: 'Settings updated successfully',
      updatedAt: updatedSettings.updatedAt.toISOString(),
      changedFields: Object.keys(dbSettings)
    });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    
    // Create error audit log
    try {
      await prisma.auditLog.create({
        data: {
          adminUserId: req.user?.id || '',
          adminEmail: req.user?.email || '',
          action: 'update_settings_failed',
          resourceType: 'system_settings',
          details: JSON.stringify({
            error: error.message,
            stack: error.stack,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          }),
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || ''
        }
      });
    } catch (auditError) {
      console.error('Failed to create audit log for settings update error:', auditError);
    }
    
    res.status(500).json({ 
      error: 'Failed to update settings',
      message: error.message
    });
  }
});

// =============================================================================
// END MISSING ADMIN API ENDPOINTS
// =============================================================================

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  // Check port availability before starting
  checkPortAvailability(port).then(available => {
    if (!available) {
      console.error(`❌ Port ${port} is already in use. Please kill existing processes or change PORT in .env`);
      console.error('To kill existing processes: pkill -f "ts-node.*server" or pkill -f "node.*ts-node-dev"');
      process.exit(1);
    }
    
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server running on port ${port}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Server accessible at http://0.0.0.0:${port}`);
      
      // Check database connection on startup
      checkDatabaseConnection().then(connected => {
        if (connected) {
          console.log('✅ Database connected successfully');
        } else {
          console.error('❌ Database connection failed');
        }
      });
    });
  }).catch(error => {
    console.error('❌ Failed to check port availability:', error);
    process.exit(1);
  });
}

export default app;
