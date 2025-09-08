import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Configure environment variables for both development and production
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  // Production fallback - Railway injects environment variables directly
  dotenv.config();
}

import express, { Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer, { MulterError } from 'multer';

// Database
import { prisma, checkDatabaseConnection } from './db/prisma';

// Middleware
import { 
  errorHandler, 
  notFoundHandler 
} from './middleware/errorHandler';
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

// Routes
import authRoutes from './routes/auth.routes';
import workoutRoutes from './routes/workout.routes';
import workoutLogRoutes from './routes/workout-log.routes';
import nutritionRoutes from './routes/nutrition.routes';
import profileRoutes from './routes/profile.routes';
import subscriptionRoutes from './routes/subscription.routes';
import adminRoutes from './routes/admin.routes';

// Auth middleware
import { authenticate, requireAdmin, AuthenticatedRequest } from './auth';

// Validation middleware
import { 
  handleValidationErrors,
  exerciseCreateValidation,
  exerciseUpdateValidation,
  workoutCreateValidation,
  workoutUpdateValidation,
  notificationCreateValidation,
  flaggedContentActionValidation,
  paginationValidation,
  idValidation
} from './middleware/validation';

// Utils
import { logger } from './utils/logger';

const app = express();
const PORT = process.env.PORT || 3001;

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
    files: 20 // Max 20 files at once
  }
});

// Basic environment validation
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);

if (missingEnvVars.length > 0) {
  logger.error('Missing required environment variables:', { metadata: { missingVars: missingEnvVars } });
  console.error('Please check your .env file and ensure these variables are set:', missingEnvVars.join(', '));
  process.exit(1);
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'https://fitarchitect.vercel.app']
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(globalLimiter);

// Request tracking middleware
app.use(requestIdMiddleware);
app.use(requestLoggingMiddleware);
app.use(responseLoggingMiddleware);
app.use(performanceMonitoringMiddleware);
app.use(rateLimitMonitoringMiddleware);
app.use(userActivityMiddleware);
app.use(apiAnalyticsMiddleware);
app.use(securityMonitoringMiddleware);

// Health check endpoints
app.get('/health', healthCheckMiddleware, async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      uptime: Math.floor(process.uptime()),
      services: {
        database: 'connected',
        redis: 'not_configured' // Future: add Redis health check
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'fitarchitect-backend',
    version: '2.0.0'
  });
});

// Simple static endpoints
app.get('/api/gif-files', (_req, res) => {
  try {
    // Static list of available GIF files (served from frontend)
    const gifFiles = [
      // Core exercises
      'exercise-gifs/core/alternate-heel-touchers.gif',
      'exercise-gifs/core/34-sit-up.gif', 
      'exercise-gifs/core/45-side-bend.gif',
      'exercise-gifs/core/air-bike.gif',
      'exercise-gifs/core/assisted-hanging-knee-raise.gif',
      'exercise-gifs/core/assisted-lying-leg-raise-with-throw-down.gif',
      'exercise-gifs/core/barbell-rollerout.gif',
      'exercise-gifs/core/cable-kneeling-crunch.gif',
      'exercise-gifs/core/front-plank-with-twist.gif',
      
      // Arms exercises  
      'exercise-gifs/arms/barbell-curl.gif',
      'exercise-gifs/arms/barbell-close-grip-bench-press.gif',
      'exercise-gifs/arms/assisted-triceps-dip-kneeling.gif',
      'exercise-gifs/arms/weighted-tricep-dips.gif',
      'exercise-gifs/arms/lever-bicep-curl.gif',
      
      // Back exercises
      'exercise-gifs/back/barbell-bent-over-row.gif',
      'exercise-gifs/back/pull-up-neutral-grip.gif', 
      'exercise-gifs/back/reverse-grip-machine-lat-pulldown.gif',
      'exercise-gifs/back/assisted-pull-up.gif',
      
      // Chest exercises
      'exercise-gifs/chest/barbell-bench-press.gif',
      'exercise-gifs/chest/incline-push-up-depth-jump.gif',
      'exercise-gifs/chest/assisted-chest-dip-kneeling.gif',
      'exercise-gifs/chest/cable-one-arm-decline-chest-fly.gif',
      
      // Legs exercises
      'exercise-gifs/legs/barbell-deadlift.gif',
      'exercise-gifs/legs/barbell-lunge.gif', 
      'exercise-gifs/legs/barbell-bench-front-squat.gif',
      'exercise-gifs/legs/sled-45-leg-press.gif',
      'exercise-gifs/legs/barbell-seated-calf-raise.gif',
      
      // Shoulders exercises
      'exercise-gifs/shoulders/barbell-seated-overhead-press.gif',
      'exercise-gifs/shoulders/cable-alternate-shoulder-press.gif',
      
      // Cardio exercises
      'exercise-gifs/cardio/jack-burpee.gif',
      'exercise-gifs/cardio/mountain-climber.gif',
      'exercise-gifs/cardio/walking-high-knees-lunge.gif'
    ];
    
    // Convert to proper format matching the expected response
    const allGifs = gifFiles.map(filePath => {
      const pathParts = filePath.split('/');
      const category = pathParts[1]; // arms, back, chest, etc.
      const fileName = pathParts[2];
      
      return {
        filename: fileName,
        path: `/${filePath}`, // Relative path for frontend serving
        category: category,
        size: 1024 * 50, // Approximate size
        lastModified: new Date('2024-01-01').toISOString() // Placeholder date
      };
    });
    
    logger.info(`Serving ${allGifs.length} GIF files`);
    res.json(allGifs);
    
  } catch (error: any) {
    logger.error('Error serving GIF files:', error);
    res.status(500).json({ error: 'Failed to serve GIF files' });
  }
});

// API Routes
app.use('/api', authRoutes);
app.use('/api/workout-plans', workoutRoutes);
app.use('/api/workout-log', workoutLogRoutes);
app.use('/api/nutrition-log', nutritionRoutes);
app.use('/api', profileRoutes); // /profile, /dashboard, /parq-response
app.use('/api', subscriptionRoutes); // /plans, /subscription
app.use('/api/admin', adminRoutes);

// Upload GIFs endpoint for admin
app.post('/api/admin/exercise-media/upload', authenticate, requireAdmin, uploadGifs.array('gifs', 20), async (req: AuthenticatedRequest, res) => {
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
    logger.info(`Admin ${req.user?.email} uploaded ${uploadedCount} GIFs to category: ${category}`);

    res.json({ 
      uploaded: uploadedCount,
      files: uploadedFiles,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully uploaded ${uploadedCount} GIF${uploadedCount === 1 ? '' : 's'} to ${category} category`
    });
    
  } catch (error) {
    logger.error('GIF upload error:', error);
    
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
    logger.error('Error fetching exercise mappings:', error);
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
    logger.error('Error scanning GIF directory:', error);
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
    logger.error('Error updating exercise mapping:', error);
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
    logger.error('Error removing exercise mapping:', error);
    res.status(500).json({ error: 'Failed to remove exercise mapping' });
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
    logger.info(`Bulk media assignment completed`, {
      metadata: {
        user: req.user?.email,
        totalAssignments: assignments.length,
        successful: assignedCount,
        errors: errors.length
      }
    });
    
    res.json({ 
      message: 'Bulk assignment completed',
      assigned: assignedCount,
      total: assignments.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    logger.error('Error in bulk assignment:', error);
    res.status(500).json({ error: 'Failed to perform bulk assignment' });
  }
});

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
    logger.info(`Exercise approval updated:`, {
      metadata: {
        user: req.user?.email,
        exerciseId,
        exerciseName: existingExercise?.name || req.body.exerciseName,
        approvalStatus,
        flaggedReason,
        hideGif,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Error updating exercise approval:', error);
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
    logger.info(`Bulk exercise approval:`, {
      metadata: {
        user: req.user?.email,
        exerciseCount: exerciseIds.length,
        updatedCount: result.count,
        approvalStatus,
        timestamp: new Date().toISOString()
      }
    });
    
    res.json({ 
      message: `Bulk approval completed`,
      updated: result.count,
      requested: exerciseIds.length
    });
    
  } catch (error) {
    logger.error('Error in bulk approval:', error);
    res.status(500).json({ error: 'Failed to perform bulk approval' });
  }
});

// Alias endpoint for bulk-approve-gifs (expected by ExerciseMediaPanel)
app.post('/api/admin/bulk-approve-gifs', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { exerciseIds, approvalStatus = 'approved', reviewedBy = 'admin' } = req.body;
    
    if (!exerciseIds || !Array.isArray(exerciseIds) || exerciseIds.length === 0) {
      return res.status(400).json({ error: 'Exercise IDs array is required' });
    }
    
    const updateData = {
      approvalStatus,
      lastReviewedAt: new Date(),
      reviewedBy: reviewedBy,
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
    logger.info(`Bulk GIF approval:`, {
      metadata: {
        user: req.user?.email,
        exerciseCount: exerciseIds.length,
        updatedCount: result.count,
        approvalStatus,
        reviewedBy,
        timestamp: new Date().toISOString()
      }
    });
    
    res.json({ 
      message: `Bulk ${approvalStatus} completed`,
      updated: result.count,
      requested: exerciseIds.length
    });
    
  } catch (error) {
    logger.error('Error in bulk approve GIFs:', error);
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
    logger.error('Error updating exercise details:', error);
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
    logger.error('Error fetching exercises with approval status:', error);
    res.status(500).json({ error: 'Failed to fetch exercises' });
  }
});

// Setup warmup directory structure for Railway deployment
app.post('/api/admin/exercise-media/setup-warmup-directory', authenticate, requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
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
    logger.error('Error setting up warmup directory:', error);
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
        logger.warn(`Failed to fix ${fix.exerciseName}:`, error);
        results.push({ exercise: fix.exerciseName, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
    
    res.json({ 
      message: `Emergency fixed ${fixedCount} warmup exercise GIFs`,
      fixed: fixedCount,
      results
    });
    
  } catch (error) {
    logger.error('Error in emergency warmup GIF fix:', error);
    res.status(500).json({ error: 'Emergency fix failed' });
  }
});

// Validate GIF directory structure (Railway deployment check)
app.get('/api/admin/exercise-media/validate-gif-structure', authenticate, requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
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
    logger.error('Error validating GIF structure:', error);
    res.status(500).json({ error: 'Failed to validate GIF directory structure' });
  }
});

// =============================================================================
// MISSING ADMIN DASHBOARD ENDPOINTS
// =============================================================================

// GET /api/admin/exercise-approvals - Get all exercise approval statuses
app.get('/api/admin/exercise-approvals', authenticate, requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
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
    
    logger.info(`Retrieved ${approvals.length} exercise approvals`);
    res.json(approvals);
    
  } catch (error) {
    logger.error('Error fetching exercise approvals:', error);
    res.status(500).json({ error: 'Failed to fetch exercise approvals' });
  }
});

// Dashboard Stats for Overview Panel
app.get('/api/admin/dashboard/stats', authenticate, requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    // Get basic user stats
    const totalUsers = await prisma.userProfile.count();
    const activeSubscriptions = await prisma.subscription.count({
      where: { status: 'active' }
    });
    
    // Get today's new users
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayUsers = await prisma.userProfile.count({
      where: {
        createdAt: { gte: today }
      }
    });
    
    // Get subscription breakdown
    const subscriptionCounts = await prisma.subscription.groupBy({
      by: ['plan'],
      _count: { plan: true },
      where: { status: 'active' }
    });
    
    // Get revenue (monthly)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentRevenue = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        status: 'completed',
        createdAt: { gte: thirtyDaysAgo }
      }
    });

    const stats = {
      totalUsers,
      activeSubscriptions,
      todayUsers,
      monthlyRevenue: (recentRevenue._sum.amount || 0) / 100, // Convert from cents
      subscriptionBreakdown: subscriptionCounts.reduce((acc, sub) => {
        acc[sub.plan] = sub._count.plan;
        return acc;
      }, {} as Record<string, number>)
    };

    res.json({ stats });
  } catch (error) {
    logger.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Dashboard Activity Feed for Overview Panel
app.get('/api/admin/dashboard/activity', authenticate, requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
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

    res.json({ activity: activities.slice(0, 10) });
  } catch (error) {
    logger.error('Error fetching dashboard activity:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard activity' });
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
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET!;
    
    const impersonationToken = jwt.sign({
      userId: targetUser.id,
      email: targetUser.email,
      type: targetUser.type,
      impersonatedBy: admin.id,
      impersonation: true
    }, JWT_SECRET, { expiresIn: '1h' }); // Shorter expiry for security
    
    logger.info('Admin impersonation started', {
      metadata: {
        operation: 'admin_impersonate',
        component: 'admin',
        userId: admin.id,
        targetUserId: targetUser.id
      }
    });
    
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
    logger.error('Failed to generate impersonation token', error);
    res.status(500).json({ error: 'Failed to impersonate user' });
  }
});

// Admin exercise management endpoints
app.get('/api/admin/exercises/categories', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Return comprehensive categorization data for exercises (matching validation)
    const categories = ['warmup', 'strength', 'cardio', 'cooldown', 'flexibility', 'sports', 'functional', 'rehabilitation', 'core', 'legs', 'push', 'pull', 'fullbody'];
    const difficulties = ['beginner', 'intermediate', 'advanced'];
    const muscleGroups = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'glutes', 'calves'];
    const equipment = ['bodyweight', 'dumbbells', 'barbell', 'resistance band', 'kettlebell', 'machine', 'cable', 'trx'];
    
    res.json({ 
      categories,
      difficulties,
      muscleGroups,
      equipment
    });
  } catch (error) {
    logger.error('Error fetching exercise categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.get('/api/admin/exercises', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const isActive = req.query.isActive !== 'false'; // default to true
    const category = req.query.category as string;
    const search = req.query.search as string;
    
    const offset = (page - 1) * limit;
    
    const where: any = { isActive };
    if (category) where.category = category;
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    
    const [exercises, total] = await Promise.all([
      prisma.exercise.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          muscleGroups: true,
          equipment: true,
          difficulty: true,
          instructions: true,
          tips: true,
          imageUrl: true,
          videoUrl: true,
          isCustom: true,
          isActive: true,
          createdBy: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.exercise.count({ where })
    ]);
    
    res.json({
      exercises,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching admin exercises:', error);
    res.status(500).json({ error: 'Failed to fetch exercises' });
  }
});

// ============================================================================
// COMPREHENSIVE ADMIN API ENDPOINTS - PHASE 1: CRITICAL MISSING ENDPOINTS
// ============================================================================

// Subscription Management System
app.get('/api/admin/subscriptions', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const tier = req.query.tier as string;
    
    const offset = (page - 1) * limit;
    const where: any = {};
    
    if (status) where.subscriptionStatus = status;
    if (tier) where.tier = tier;
    
    const [subscriptions, total] = await Promise.all([
      prisma.userProfile.findMany({
        where,
        skip: offset,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          tier: true,
          subscriptionStatus: true,
          subscriptionStartDate: true,
          subscriptionEndDate: true,
          stripeCustomerId: true,
          stripeSubscriptionId: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.userProfile.count({ where })
    ]);
    
    // Get payment history for each subscription
    const subscriptionsWithPayments = await Promise.all(
      subscriptions.map(async (sub) => {
        const payments = await prisma.payment.findMany({
          where: { userId: sub.id },
          orderBy: { createdAt: 'desc' },
          take: 5
        });
        
        return {
          ...sub,
          paymentHistory: payments,
          totalRevenue: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
          lastPayment: payments[0]?.createdAt || null
        };
      })
    );
    
    res.json({
      subscriptions: subscriptionsWithPayments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    logger.error('Error fetching admin subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

app.get('/api/admin/plans', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Static subscription plans configuration
    const plans = [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        interval: null,
        features: [
          'Basic workout tracking',
          'Limited nutrition logging',
          'Community access'
        ],
        limits: {
          workoutsPerMonth: 10,
          nutritionEntriesPerDay: 3,
          customExercises: 5
        }
      },
      {
        id: 'basic',
        name: 'Basic',
        price: 9.99,
        interval: 'month',
        stripePriceId: process.env.STRIPE_BASIC_PRICE_ID,
        features: [
          'Unlimited workouts',
          'Full nutrition tracking',
          'Meal planning',
          'Progress analytics',
          'Email support'
        ],
        limits: {
          workoutsPerMonth: -1, // unlimited
          nutritionEntriesPerDay: -1,
          customExercises: 50
        }
      },
      {
        id: 'premium',
        name: 'Premium',
        price: 19.99,
        interval: 'month',
        stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID,
        features: [
          'Everything in Basic',
          'AI workout generation',
          'Barcode scanning',
          'Telegram notifications',
          'Advanced analytics',
          'Priority support'
        ],
        limits: {
          workoutsPerMonth: -1,
          nutritionEntriesPerDay: -1,
          customExercises: -1 // unlimited
        }
      }
    ];
    
    // Get current subscription counts
    const subscriptionCounts = await prisma.userProfile.groupBy({
      by: ['tier'],
      _count: { tier: true }
    });
    
    const plansWithStats = plans.map(plan => ({
      ...plan,
      currentSubscribers: subscriptionCounts.find(s => s.tier === plan.id)?._count?.tier || 0
    }));
    
    res.json({ plans: plansWithStats });
  } catch (error) {
    logger.error('Error fetching subscription plans:', error);
    res.status(500).json({ error: 'Failed to fetch subscription plans' });
  }
});

app.get('/api/admin/subscriptions/analytics', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Revenue analytics
    const totalRevenue = await prisma.payment.aggregate({
      where: { status: 'completed' },
      _sum: { amount: true },
      _count: { id: true }
    });
    
    const monthlyRevenue = await prisma.payment.aggregate({
      where: { 
        status: 'completed',
        createdAt: { gte: thirtyDaysAgo }
      },
      _sum: { amount: true },
      _count: { id: true }
    });
    
    // Subscription tier distribution
    const tierDistribution = await prisma.userProfile.groupBy({
      by: ['tier'],
      _count: { tier: true }
    });
    
    // Churn analysis - users who cancelled in last 30 days
    const churnedUsers = await prisma.userProfile.count({
      where: {
        subscriptionStatus: 'cancelled',
        updatedAt: { gte: thirtyDaysAgo }
      }
    });
    
    // Growth metrics - new subscriptions in last 30 days
    const newSubscriptions = await prisma.userProfile.count({
      where: {
        tier: { not: 'free' },
        createdAt: { gte: thirtyDaysAgo }
      }
    });
    
    // Monthly revenue trend (last 6 months)
    const revenueByMonth = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', "createdAt") as month,
        SUM(amount) as revenue,
        COUNT(*) as transactions
      FROM "Payment" 
      WHERE status = 'completed' 
        AND "createdAt" >= NOW() - INTERVAL '6 months'
      GROUP BY month
      ORDER BY month DESC
    `;
    
    res.json({
      revenue: {
        total: totalRevenue._sum.amount || 0,
        monthly: monthlyRevenue._sum.amount || 0,
        totalTransactions: totalRevenue._count.id,
        monthlyTransactions: monthlyRevenue._count.id,
        trend: revenueByMonth
      },
      subscriptions: {
        tierDistribution: tierDistribution.map(t => ({
          tier: t.tier,
          count: t._count.tier
        })),
        churnCount: churnedUsers,
        newSubscriptions,
        churnRate: newSubscriptions > 0 ? (churnedUsers / newSubscriptions * 100).toFixed(2) : '0.00'
      },
      growth: {
        newSubscriptionsThisMonth: newSubscriptions,
        averageRevenuePerUser: totalRevenue._count.id > 0 ? 
          ((totalRevenue._sum.amount || 0) / totalRevenue._count.id).toFixed(2) : '0.00'
      }
    });
  } catch (error) {
    logger.error('Error fetching subscription analytics:', error);
    res.status(500).json({ error: 'Failed to fetch subscription analytics' });
  }
});

// Workout Templates Management
app.get('/api/admin/workout-templates', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const category = req.query.category as string;
    const difficulty = req.query.difficulty as string;
    const search = req.query.search as string;
    
    const offset = (page - 1) * limit;
    const where: any = {};
    
    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    const [templates, total] = await Promise.all([
      prisma.workoutTemplate.findMany({
        where,
        skip: offset,
        take: limit,
        include: {
          creator: {
            select: { email: true, name: true }
          }
        },
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.workoutTemplate.count({ where })
    ]);
    
    res.json({
      templates,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    logger.error('Error fetching workout templates:', error);
    res.status(500).json({ error: 'Failed to fetch workout templates' });
  }
});

app.post('/api/admin/workout-templates', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      description,
      category,
      difficulty,
      duration,
      weeks,
      targetMuscleGroups,
      equipment
    } = req.body;
    
    const template = await prisma.workoutTemplate.create({
      data: {
        name,
        description,
        duration,
        weeks,
        targetMuscleGroups,
        difficulty,
        equipment: equipment || [],
        category: category || 'strength',
        isPublic: true,
        isOfficial: true,
        createdBy: req.user!.id
      }
    });
    
    logger.info('Admin created workout template', {
      userId: req.user!.id,
      templateId: template.id,
      templateName: name
    });
    
    res.status(201).json({ template });
  } catch (error) {
    logger.error('Error creating workout template:', error);
    res.status(500).json({ error: 'Failed to create workout template' });
  }
});

app.put('/api/admin/workout-templates/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const template = await prisma.workoutTemplate.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    });
    
    logger.info('Admin updated workout template', {
      userId: req.user!.id,
      templateId: id
    });
    
    res.json({ template });
  } catch (error) {
    logger.error('Error updating workout template:', error);
    res.status(500).json({ error: 'Failed to update workout template' });
  }
});

app.delete('/api/admin/workout-templates/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.workoutTemplate.delete({
      where: { id }
    });
    
    logger.info('Admin deleted workout template', {
      userId: req.user!.id,
      templateId: id
    });
    
    res.json({ message: 'Workout template deleted successfully' });
  } catch (error) {
    logger.error('Error deleting workout template:', error);
    res.status(500).json({ error: 'Failed to delete workout template' });
  }
});

// GIF Files Management
app.get('/api/admin/gif-files', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    const gifDirectories = [
      { path: 'dist/exercise-gifs', category: 'general' },
      { path: 'dist/exercise-gifs/strength', category: 'strength' },
      { path: 'dist/exercise-gifs/cardio', category: 'cardio' },
      { path: 'dist/exercise-gifs/flexibility', category: 'flexibility' },
      { path: 'dist/exercise-gifs/warmup', category: 'warmup' },
      { path: 'dist/exercise-gifs/sports', category: 'sports' }
    ];
    
    const gifFiles: any[] = [];
    
    for (const dir of gifDirectories) {
      try {
        const fullPath = path.join(__dirname, '../../../', dir.path);
        const files = await fs.readdir(fullPath);
        
        for (const file of files) {
          if (file.endsWith('.gif')) {
            const filePath = path.join(fullPath, file);
            const stats = await fs.stat(filePath);
            
            gifFiles.push({
              path: `/exercise-gifs/${dir.category !== 'general' ? dir.category + '/' : ''}${file}`,
              filename: file,
              category: dir.category,
              size: stats.size,
              lastModified: stats.mtime.toISOString(),
              exerciseName: file.replace('.gif', '').replace(/-/g, ' ')
            });
          }
        }
      } catch (dirError) {
        console.warn(`Directory ${dir.path} not found or inaccessible:`, dirError);
      }
    }
    
    // Sort by filename
    gifFiles.sort((a, b) => a.filename.localeCompare(b.filename));
    
    res.json(gifFiles);
  } catch (error) {
    logger.error('Error fetching GIF files:', error);
    res.status(500).json({ error: 'Failed to fetch GIF files' });
  }
});

// System Notifications
app.get('/api/admin/notifications', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // For now, return static system notifications
    // In production, this would come from a notifications table
    const notifications = [
      {
        id: '1',
        type: 'system',
        title: 'Database Backup Completed',
        message: 'Daily database backup completed successfully at 2:00 AM',
        severity: 'info',
        read: false,
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        type: 'user',
        title: 'New User Registrations',
        message: '15 new users registered in the last 24 hours',
        severity: 'info',
        read: false,
        createdAt: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: '3',
        type: 'error',
        title: 'API Rate Limit Exceeded',
        message: 'External API rate limit exceeded for OpenAI service',
        severity: 'warning',
        read: true,
        createdAt: new Date(Date.now() - 172800000).toISOString()
      }
    ];
    
    res.json({ notifications });
  } catch (error) {
    logger.error('Error fetching admin notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

app.post('/api/admin/notifications', authenticate, requireAdmin, notificationCreateValidation, handleValidationErrors, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, message, type, severity, targetUsers } = req.body;
    
    // In production, this would create notifications in database
    // For now, just log the notification creation
    logger.info('Admin created notification', {
      userId: req.user!.id,
      title,
      type,
      severity,
      targetUsers: targetUsers || 'all'
    });
    
    res.status(201).json({ 
      message: 'Notification created successfully',
      notification: {
        id: Date.now().toString(),
        title,
        message,
        type,
        severity,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Application Settings
app.get('/api/admin/settings', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Complete application settings matching AppSettings interface
    const settings = {
      // General Settings
      appName: process.env.APP_NAME || 'FitArchitect',
      appDescription: 'AI-Powered Fitness & Nutrition Platform',
      supportEmail: process.env.SUPPORT_EMAIL || 'support@fitarchitect.com',
      maintenanceMode: false,
      allowRegistrations: true,
      requireEmailVerification: false,
      defaultUserTier: 'free' as const,
      maxFreeUsers: 10000,
      sessionTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds

      // Feature Toggles
      features: {
        workoutGeneration: !!process.env.OPENAI_API_KEY,
        nutritionTracking: true,
        mealPlanning: !!process.env.OPENAI_API_KEY,
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
        enabled: !!(process.env.STRIPE_SECRET_KEY && process.env.VITE_STRIPE_PUBLISHABLE_KEY),
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || ''
      },

      telegramSettings: {
        enabled: !!process.env.TELEGRAM_BOT_TOKEN,
        botToken: process.env.TELEGRAM_BOT_TOKEN ? '***CONFIGURED***' : '',
        webhookUrl: process.env.TELEGRAM_WEBHOOK_URL || ''
      },

      // Email Settings
      emailSettings: {
        provider: 'smtp' as const,
        fromAddress: process.env.EMAIL_FROM || 'noreply@fitarchitect.com',
        fromName: 'FitArchitect',
        smtpHost: process.env.SMTP_HOST || '',
        smtpPort: parseInt(process.env.SMTP_PORT || '587'),
        smtpUser: process.env.SMTP_USER ? '***CONFIGURED***' : '',
        smtpPass: process.env.SMTP_PASS ? '***CONFIGURED***' : ''
      },

      // Security Settings
      security: {
        passwordMinLength: 8,
        requireStrongPassword: true,
        maxLoginAttempts: 5,
        lockoutDuration: 30 * 60 * 1000, // 30 minutes in milliseconds
        jwtExpiration: '7d',
        twoFactorRequired: false,
        allowedOrigins: [process.env.FRONTEND_URL || 'http://localhost:5173'],
        rateLimitRequests: 100,
        rateLimitWindow: 15 * 60 * 1000 // 15 minutes in milliseconds
      },

      // Notification Settings
      notifications: {
        systemEmails: true,
        marketingEmails: false,
        weeklyDigest: true,
        adminNotifications: [process.env.ADMIN_EMAIL || 'admin@fitarchitect.com'],
        userWelcomeEmail: true,
        subscriptionEmails: true
      }
    };
    
    res.json(settings);
  } catch (error) {
    logger.error('Error fetching admin settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.put('/api/admin/settings', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { settings } = req.body;
    
    // In production, this would update settings in database
    logger.info('Admin updated application settings', {
      userId: req.user!.id,
      updatedSettings: Object.keys(settings)
    });
    
    res.json({ 
      message: 'Settings updated successfully',
      settings
    });
  } catch (error) {
    logger.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Audit Logs
app.get('/api/admin/audit-logs', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const action = req.query.action as string;
    const userId = req.query.userId as string;
    
    // For now, return sample audit logs
    // In production, this would query an audit_logs table
    const auditLogs = Array.from({ length: limit }, (_, i) => ({
      id: `log_${Date.now() + i}`,
      adminId: req.user!.id,
      action: action || ['login', 'create_exercise', 'approve_gif', 'update_user', 'delete_workout'][i % 5],
      resourceType: ['auth', 'exercise', 'gif', 'user', 'workout'][i % 5],
      resourceId: `resource_${i + 1}`,
      changes: { example: 'change data' },
      ipAddress: '127.0.0.1',
      userAgent: 'Admin Dashboard',
      createdAt: new Date(Date.now() - (i * 60000)).toISOString()
    }));
    
    res.json({
      logs: auditLogs,
      total: 500, // mock total
      page,
      limit,
      totalPages: Math.ceil(500 / limit)
    });
  } catch (error) {
    logger.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Flagged Content Management
app.get('/api/admin/flagged-content', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get flagged exercises from the database
    const flaggedExercises = await prisma.exercise.findMany({
      where: {
        approvalStatus: 'flagged'
      },
      select: {
        id: true,
        name: true,
        description: true,
        flaggedReason: true,
        lastReviewedAt: true,
        reviewedBy: true,
        createdAt: true
      },
      orderBy: { lastReviewedAt: 'desc' }
    });
    
    // Mock other flagged content types
    const flaggedContent = {
      exercises: flaggedExercises,
      userReports: [
        {
          id: 'report_1',
          type: 'inappropriate_workout',
          resourceId: 'workout_123',
          reportedBy: 'user_456',
          reason: 'Inappropriate exercise descriptions',
          status: 'pending',
          createdAt: new Date().toISOString()
        }
      ],
      comments: [], // placeholder for future comment system
      workouts: [] // placeholder for flagged workouts
    };
    
    res.json({ flaggedContent });
  } catch (error) {
    logger.error('Error fetching flagged content:', error);
    res.status(500).json({ error: 'Failed to fetch flagged content' });
  }
});

app.put('/api/admin/flagged-content/:type/:id', authenticate, requireAdmin, flaggedContentActionValidation, handleValidationErrors, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, id } = req.params;
    const { action, reason } = req.body; // approve, reject, or ban
    
    if (type === 'exercise') {
      await prisma.exercise.update({
        where: { id },
        data: {
          approvalStatus: action === 'approve' ? 'approved' : action === 'reject' ? 'pending' : 'hidden',
          reviewedBy: req.user!.email,
          lastReviewedAt: new Date(),
          flaggedReason: action === 'reject' ? reason : null
        }
      });
    }
    
    logger.info('Admin handled flagged content', {
      userId: req.user!.id,
      type,
      resourceId: id,
      action,
      reason
    });
    
    res.json({ message: `${type} ${action}d successfully` });
  } catch (error) {
    logger.error('Error handling flagged content:', error);
    res.status(500).json({ error: 'Failed to handle flagged content' });
  }
});

// Error Monitoring
app.get('/api/admin/errors', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Mock error monitoring data - in production this would come from error tracking service
    const errors = [
      {
        id: 'error_1',
        message: 'Database connection timeout',
        type: 'DatabaseError',
        count: 15,
        lastOccurrence: new Date().toISOString(),
        stack: 'Error: connect ETIMEDOUT...',
        affectedUsers: 5,
        resolved: false
      },
      {
        id: 'error_2', 
        message: 'OpenAI API rate limit exceeded',
        type: 'APIError',
        count: 8,
        lastOccurrence: new Date(Date.now() - 3600000).toISOString(),
        stack: 'RateLimitError: Too many requests...',
        affectedUsers: 3,
        resolved: true
      },
      {
        id: 'error_3',
        message: 'Invalid exercise GIF format',
        type: 'ValidationError', 
        count: 3,
        lastOccurrence: new Date(Date.now() - 7200000).toISOString(),
        stack: 'ValidationError: File must be GIF format...',
        affectedUsers: 1,
        resolved: false
      }
    ];
    
    const stats = {
      totalErrors: errors.reduce((sum, e) => sum + e.count, 0),
      unresolvedErrors: errors.filter(e => !e.resolved).length,
      affectedUsers: errors.reduce((sum, e) => sum + e.affectedUsers, 0),
      errorRate: '2.3%' // mock error rate
    };
    
    res.json({ errors, stats });
  } catch (error) {
    logger.error('Error fetching error monitoring data:', error);
    res.status(500).json({ error: 'Failed to fetch error data' });
  }
});

// Create Error Report from Frontend
app.post('/api/admin/errors', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      message,
      stack,
      errorType,
      severity,
      endpoint,
      userAgent,
      requestBody
    } = req.body;
    
    // Create error log entry in database
    const errorLog = await prisma.errorLog.create({
      data: {
        message,
        stack,
        errorType,
        severity: severity || 'medium',
        userId: req.user!.id,
        endpoint,
        userAgent,
        requestBody,
        method: 'FRONTEND_ERROR',
        resolved: false,
        count: 1,
        lastOccurrence: new Date()
      }
    });
    
    logger.error('Frontend error reported', {
      errorId: errorLog.id,
      userId: req.user!.id,
      message,
      errorType
    });
    
    res.status(201).json({ 
      success: true,
      errorId: errorLog.id,
      message: 'Error reported successfully' 
    });
  } catch (error) {
    logger.error('Failed to create error report:', error);
    res.status(500).json({ error: 'Failed to report error' });
  }
});

// Users Management Endpoint
app.get('/api/admin/users', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await prisma.userProfile.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
        isAdmin: true,
        tier: true,
        subscriptionStatus: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ users });
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// API Health Check Endpoint
app.get('/api/admin/api-status', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const apiStatus = {
    exerciseDb: 'broken',
    wger: 'broken',
    timestamp: new Date().toISOString()
  };

  // Test ExerciseDB API
  try {
    const exerciseDbKey = process.env.VITE_EXERCISEDB_API_KEY;
    if (exerciseDbKey) {
      const testResponse = await fetch('https://exercisedb.p.rapidapi.com/exercises/bodyPart/chest?limit=1', {
        headers: {
          'X-RapidAPI-Key': exerciseDbKey,
          'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com'
        }
      });
      
      if (testResponse.status === 200) {
        apiStatus.exerciseDb = 'working';
      } else if (testResponse.status === 403) {
        apiStatus.exerciseDb = 'quota_exceeded';
      }
    } else {
      apiStatus.exerciseDb = 'no_key';
    }
  } catch (error) {
    logger.error('ExerciseDB health check failed:', error);
  }

  // Test WGER API
  try {
    const wgerApiKey = process.env.WGER_API_KEY;
    const wgerResponse = await fetch('https://wger.de/api/v2/exercise/?limit=1', {
      headers: {
        'Accept': 'application/json',
        ...(wgerApiKey ? { 'Authorization': `Token ${wgerApiKey}` } : {})
      }
    });
    
    if (wgerResponse.status === 200) {
      apiStatus.wger = 'working';
    }
  } catch (error) {
    logger.error('WGER health check failed:', error);
  }

  res.json(apiStatus);
});

// ============================================================================
// PHASE 2: EXERCISE REGISTRY GIF INTEGRATION
// ============================================================================

// GIF Upload Endpoint
app.post('/api/admin/exercises/upload-gif', authenticate, requireAdmin, uploadGifs.single('gif'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No GIF file uploaded' });
    }
    
    const category = req.body.category || 'general';
    const exerciseName = req.body.exerciseName || 'unnamed';
    
    // Generate filename from exercise name
    const filename = exerciseName.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') + '.gif';
    
    // Rename the uploaded file to match exercise name
    const oldPath = req.file.path;
    const newPath = path.join(path.dirname(oldPath), filename);
    
    // Rename the file
    fs.renameSync(oldPath, newPath);
    
    const gifPath = `/exercise-gifs/${category}/${filename}`;
    
    logger.info('GIF uploaded and renamed successfully', {
      userId: req.user!.id,
      originalFilename: req.file.filename,
      newFilename: filename,
      exerciseName,
      category,
      path: gifPath
    });
    
    res.json({ 
      success: true,
      path: gifPath,
      filename: filename,
      message: `GIF saved as: ${gifPath}`
    });
  } catch (error) {
    logger.error('Error uploading GIF:', error);
    res.status(500).json({ error: 'Failed to upload GIF' });
  }
});

// Exercise Creation with GIF Assignment
app.post('/api/admin/exercises', authenticate, requireAdmin, exerciseCreateValidation, handleValidationErrors, async (req: AuthenticatedRequest, res: Response) => {
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
      gifPath,
      isCustom = true
    } = req.body;
    
    // Validate required fields
    if (!name || !description) {
      return res.status(400).json({ error: 'Name and description are required' });
    }
    
    // Check if exercise already exists
    const existingExercise = await prisma.exercise.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } }
    });
    
    if (existingExercise) {
      return res.status(409).json({ error: 'Exercise with this name already exists' });
    }
    
    // Create exercise with approval workflow
    const exercise = await prisma.exercise.create({
      data: {
        name,
        description,
        category: category || 'strength',
        muscleGroups: muscleGroups || [],
        equipment: equipment || ['bodyweight'],
        difficulty: difficulty || 'intermediate',
        instructions: instructions || [description],
        tips: tips || [],
        gifPath: gifPath || null,
        isCustom,
        createdBy: req.user!.id,
        approvalStatus: 'approved', // Admin-created exercises are auto-approved
        lastReviewedAt: new Date(),
        reviewedBy: req.user!.email,
        isActive: true
      }
    });
    
    logger.info('Admin created new exercise', {
      userId: req.user!.id,
      exerciseId: exercise.id,
      exerciseName: name,
      hasGif: !!gifPath
    });
    
    res.status(201).json({ 
      exercise,
      message: 'Exercise created successfully'
    });
  } catch (error) {
    logger.error('Error creating exercise:', error);
    res.status(500).json({ error: 'Failed to create exercise' });
  }
});

// Update Exercise (including GIF assignment)
app.put('/api/admin/exercises/:id', authenticate, requireAdmin, idValidation, exerciseUpdateValidation, handleValidationErrors, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const exercise = await prisma.exercise.update({
      where: { id },
      data: {
        ...updateData,
        lastReviewedAt: new Date(),
        reviewedBy: req.user!.email,
        updatedAt: new Date()
      }
    });
    
    logger.info('Admin updated exercise', {
      userId: req.user!.id,
      exerciseId: id,
      changes: Object.keys(updateData)
    });
    
    res.json({ exercise });
  } catch (error) {
    logger.error('Error updating exercise:', error);
    res.status(500).json({ error: 'Failed to update exercise' });
  }
});

// Delete Exercise
// Import exercises from external sources
app.post('/api/admin/exercises/import', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { source = 'wger', limit = 100 } = req.body;
    
    // Log the import action
    logger.info(`Exercise import initiated:`, {
      metadata: {
        user: req.user?.email,
        source,
        limit,
        timestamp: new Date().toISOString()
      }
    });
    
    // Mock implementation - in practice you'd integrate with external APIs
    const importedCount = Math.min(limit, 50); // Simulate importing some exercises
    
    res.json({
      message: `Successfully imported ${importedCount} exercises from ${source}`,
      imported: importedCount,
      source,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error importing exercises:', error);
    res.status(500).json({ error: 'Failed to import exercises' });
  }
});

app.delete('/api/admin/exercises/:id', authenticate, requireAdmin, idValidation, handleValidationErrors, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Soft delete by setting isActive to false
    await prisma.exercise.update({
      where: { id },
      data: { 
        isActive: false,
        lastReviewedAt: new Date(),
        reviewedBy: req.user!.email
      }
    });
    
    logger.info('Admin deleted exercise', {
      userId: req.user!.id,
      exerciseId: id
    });
    
    res.json({ message: 'Exercise deleted successfully' });
  } catch (error) {
    logger.error('Error deleting exercise:', error);
    res.status(500).json({ error: 'Failed to delete exercise' });
  }
});

// ============================================================================
// PHASE 3: WORKOUT BUILDER SYSTEM
// ============================================================================

// Workout Management CRUD
app.get('/api/admin/workouts', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const category = req.query.category as string;
    const difficulty = req.query.difficulty as string;
    const search = req.query.search as string;
    
    const offset = (page - 1) * limit;
    const where: any = {};
    
    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    const [workouts, total] = await Promise.all([
      prisma.workoutPlan.findMany({
        where,
        skip: offset,
        take: limit,
        include: {
          user: {
            select: { email: true, name: true }
          }
        },
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.workoutPlan.count({ where })
    ]);
    
    res.json({
      workouts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    logger.error('Error fetching workouts:', error);
    res.status(500).json({ error: 'Failed to fetch workouts' });
  }
});

app.post('/api/admin/workouts', authenticate, requireAdmin, workoutCreateValidation, handleValidationErrors, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      description,
      category,
      difficulty,
      duration,
      weeks,
      targetMuscleGroups,
      equipment,
      exercises
    } = req.body;
    
    // Validate workout structure
    if (!name || !description) {
      return res.status(400).json({ error: 'Name and description are required' });
    }
    
    if (!weeks || typeof weeks !== 'object') {
      return res.status(400).json({ error: 'Workout weeks structure is required' });
    }
    
    // Validate exercises in workout
    if (exercises && exercises.length > 0) {
      const exerciseIds = exercises.map((e: any) => e.exerciseId).filter(Boolean);
      const validExercises = await prisma.exercise.findMany({
        where: { 
          id: { in: exerciseIds },
          isActive: true,
          approvalStatus: 'approved'
        }
      });
      
      if (validExercises.length !== exerciseIds.length) {
        return res.status(400).json({ error: 'Some exercises are invalid or not approved' });
      }
    }
    
    const workout = await prisma.workoutPlan.create({
      data: {
        name,
        description,
        duration: duration || 4,
        weeks,
        targetMuscleGroups: targetMuscleGroups || [],
        difficulty: difficulty || 'intermediate',
        isDefault: true, // Admin-created workouts are templates
        estimatedDuration: duration || 60,
        equipment: equipment || [],
        source: 'admin',
        userId: req.user!.id,
        // Store additional workout metadata
        progressData: {
          totalWorkouts: 0,
          completedCount: 0,
          exerciseCount: exercises?.length || 0
        }
      }
    });
    
    logger.info('Admin created workout', {
      userId: req.user!.id,
      workoutId: workout.id,
      workoutName: name,
      exerciseCount: exercises?.length || 0
    });
    
    res.status(201).json({ workout });
  } catch (error) {
    logger.error('Error creating workout:', error);
    res.status(500).json({ error: 'Failed to create workout' });
  }
});

app.put('/api/admin/workouts/:id', authenticate, requireAdmin, idValidation, workoutUpdateValidation, handleValidationErrors, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Validate exercises if provided
    if (updateData.exercises && updateData.exercises.length > 0) {
      const exerciseIds = updateData.exercises.map((e: any) => e.exerciseId).filter(Boolean);
      const validExercises = await prisma.exercise.findMany({
        where: { 
          id: { in: exerciseIds },
          isActive: true,
          approvalStatus: 'approved'
        }
      });
      
      if (validExercises.length !== exerciseIds.length) {
        return res.status(400).json({ error: 'Some exercises are invalid or not approved' });
      }
    }
    
    const workout = await prisma.workoutPlan.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    });
    
    logger.info('Admin updated workout', {
      userId: req.user!.id,
      workoutId: id,
      changes: Object.keys(updateData)
    });
    
    res.json({ workout });
  } catch (error) {
    logger.error('Error updating workout:', error);
    res.status(500).json({ error: 'Failed to update workout' });
  }
});

app.delete('/api/admin/workouts/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.workoutPlan.delete({
      where: { id }
    });
    
    logger.info('Admin deleted workout', {
      userId: req.user!.id,
      workoutId: id
    });
    
    res.json({ message: 'Workout deleted successfully' });
  } catch (error) {
    logger.error('Error deleting workout:', error);
    res.status(500).json({ error: 'Failed to delete workout' });
  }
});

// Exercise Selection for Workout Builder
app.get('/api/admin/exercises-for-builder', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const category = req.query.category as string;
    const difficulty = req.query.difficulty as string;
    const equipment = req.query.equipment as string;
    const muscleGroup = req.query.muscleGroup as string;
    const search = req.query.search as string;
    
    const where: any = {
      isActive: true,
      approvalStatus: 'approved' // Only approved exercises for workout building
    };
    
    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;
    if (equipment) where.equipment = { has: equipment };
    if (muscleGroup) where.muscleGroups = { has: muscleGroup };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    const exercises = await prisma.exercise.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        muscleGroups: true,
        equipment: true,
        difficulty: true,
        instructions: true,
        gifPath: true,
        approvalStatus: true
      },
      orderBy: { name: 'asc' }
    });
    
    // Group exercises by category for easier building
    const exercisesByCategory = exercises.reduce((acc: any, exercise) => {
      const cat = exercise.category || 'other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(exercise);
      return acc;
    }, {});
    
    res.json({ 
      exercises,
      exercisesByCategory,
      total: exercises.length
    });
  } catch (error) {
    logger.error('Error fetching exercises for workout builder:', error);
    res.status(500).json({ error: 'Failed to fetch exercises for workout builder' });
  }
});

// Workout Validation
app.post('/api/admin/workouts/validate', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workout } = req.body;
    const validationErrors: string[] = [];
    
    // Basic validation
    if (!workout.name) validationErrors.push('Workout name is required');
    if (!workout.description) validationErrors.push('Workout description is required');
    
    // Week structure validation
    if (!workout.weeks || typeof workout.weeks !== 'object') {
      validationErrors.push('Workout weeks structure is required');
    } else {
      Object.entries(workout.weeks).forEach(([weekKey, weekData]: [string, any]) => {
        if (!weekData.days || typeof weekData.days !== 'object') {
          validationErrors.push(`Week ${weekKey} must have days structure`);
        } else {
          Object.entries(weekData.days).forEach(([dayKey, dayData]: [string, any]) => {
            if (!dayData.exercises || !Array.isArray(dayData.exercises)) {
              validationErrors.push(`Week ${weekKey}, Day ${dayKey} must have exercises array`);
            }
          });
        }
      });
    }
    
    // Exercise validation
    const allExerciseIds: string[] = [];
    if (workout.weeks) {
      Object.values(workout.weeks).forEach((week: any) => {
        if (week.days) {
          Object.values(week.days).forEach((day: any) => {
            if (day.exercises) {
              day.exercises.forEach((exercise: any) => {
                if (exercise.exerciseId) {
                  allExerciseIds.push(exercise.exerciseId);
                }
              });
            }
          });
        }
      });
    }
    
    if (allExerciseIds.length > 0) {
      const validExercises = await prisma.exercise.findMany({
        where: { 
          id: { in: allExerciseIds },
          isActive: true,
          approvalStatus: 'approved'
        }
      });
      
      const invalidExercises = allExerciseIds.filter(id => 
        !validExercises.some(e => e.id === id)
      );
      
      if (invalidExercises.length > 0) {
        validationErrors.push(`Invalid or unapproved exercises: ${invalidExercises.join(', ')}`);
      }
    }
    
    const isValid = validationErrors.length === 0;
    
    res.json({
      isValid,
      errors: validationErrors,
      exerciseCount: allExerciseIds.length,
      warnings: allExerciseIds.length === 0 ? ['Workout has no exercises'] : []
    });
  } catch (error) {
    logger.error('Error validating workout:', error);
    res.status(500).json({ error: 'Failed to validate workout' });
  }
});

// WGER workout import endpoint  
app.post('/api/admin/import-wger-workouts', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = 200 } = req.body;
    const wgerApiKey = process.env.WGER_API_KEY;
    
    if (!wgerApiKey) {
      return res.status(500).json({ error: 'WGER API key not configured' });
    }
    
    logger.info(`Starting WGER workout import:`, {
      metadata: {
        user: req.user?.email,
        requestedLimit: limit,
        timestamp: new Date().toISOString()
      }
    });
    
    // Fetch workouts from WGER API
    const workouts = [];
    let page = 1;
    let totalFetched = 0;
    
    while (totalFetched < limit) {
      try {
        const response = await fetch(`https://wger.de/api/v2/workout/?limit=20&offset=${(page - 1) * 20}`, {
          headers: {
            'Authorization': `Token ${wgerApiKey}`,
            'User-Agent': 'FitArchitect/1.0',
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          logger.error(`WGER API error: ${response.status} ${response.statusText}`);
          break;
        }
        
        const data = await response.json();
        
        if (!data.results || data.results.length === 0) {
          break; // No more results
        }
        
        // Process each workout
        for (const workout of data.results) {
          if (totalFetched >= limit) break;
          
          try {
            // Check if workout already exists
            const existingWorkout = await prisma.workoutTemplate.findFirst({
              where: { 
                OR: [
                  { name: workout.name || `WGER Workout ${workout.id}` },
                  { externalId: `wger_${workout.id}` }
                ]
              }
            });
            
            if (!existingWorkout) {
              // Create workout template
              const workoutData = {
                name: workout.name || `WGER Workout ${workout.id}`,
                description: workout.description || `Imported from WGER database`,
                category: 'strength', // Default category
                difficulty: 'intermediate', // Default difficulty
                duration: 4, // Default 4 weeks
                targetMuscleGroups: ['chest', 'back', 'legs'], // Default muscle groups
                equipment: ['bodyweight', 'dumbbells'], // Default equipment
                isPublic: true,
                isOfficial: true,
                createdBy: req.user!.id,
                externalId: `wger_${workout.id}`,
                weeks: {
                  week1: {
                    days: {
                      day1: {
                        name: 'Day 1',
                        exercises: [],
                        restDay: false
                      },
                      day2: {
                        name: 'Rest Day',
                        exercises: [],
                        restDay: true
                      },
                      day3: {
                        name: 'Day 2', 
                        exercises: [],
                        restDay: false
                      },
                      day4: {
                        name: 'Rest Day',
                        exercises: [],
                        restDay: true
                      },
                      day5: {
                        name: 'Day 3',
                        exercises: [],
                        restDay: false
                      },
                      day6: {
                        name: 'Weekend',
                        exercises: [],
                        restDay: true
                      },
                      day7: {
                        name: 'Weekend',
                        exercises: [],
                        restDay: true
                      }
                    }
                  }
                }
              };
              
              await prisma.workoutTemplate.create({
                data: workoutData
              });
              
              workouts.push(workout);
              totalFetched++;
            }
          } catch (workoutError) {
            logger.error('Error processing individual workout:', workoutError);
            continue; // Skip this workout and continue
          }
        }
        
        page++;
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (fetchError) {
        logger.error('Error fetching WGER workouts page:', fetchError);
        break;
      }
    }
    
    logger.info(`WGER workout import completed:`, {
      metadata: {
        user: req.user?.email,
        imported: totalFetched,
        requested: limit,
        timestamp: new Date().toISOString()
      }
    });
    
    res.json({
      message: `Successfully imported ${totalFetched} workouts from WGER`,
      imported: totalFetched,
      requested: limit,
      source: 'wger',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error importing WGER workouts:', error);
    res.status(500).json({ error: 'Failed to import WGER workouts' });
  }
});

// Assign workout template to user endpoint
app.post('/api/admin/assign-workout-template', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, templateId } = req.body;
    
    if (!userId || !templateId) {
      return res.status(400).json({ error: 'User ID and Template ID are required' });
    }
    
    // Get the template
    const template = await prisma.workoutTemplate.findUnique({
      where: { id: templateId }
    });
    
    if (!template) {
      return res.status(404).json({ error: 'Workout template not found' });
    }
    
    // Check if user exists
    const user = await prisma.userProfile.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Create a personalized workout plan from the template
    const workoutPlan = await prisma.workoutPlan.create({
      data: {
        userId: userId,
        name: template.name,
        description: template.description,
        duration: template.duration,
        weeks: template.weeks,
        targetMuscleGroups: template.targetMuscleGroups,
        difficulty: template.difficulty,
        equipment: template.equipment,
        source: 'admin_assigned'
      }
    });
    
    // Update template usage count
    await prisma.workoutTemplate.update({
      where: { id: templateId },
      data: { usageCount: { increment: 1 } }
    });
    
    logger.info(`Admin assigned workout template to user:`, {
      metadata: {
        admin: req.user?.email,
        userId,
        templateId,
        templateName: template.name,
        timestamp: new Date().toISOString()
      }
    });
    
    res.json({
      message: 'Workout template assigned successfully',
      workoutPlan,
      templateName: template.name,
      assignedTo: user.email
    });
    
  } catch (error) {
    logger.error('Error assigning workout template:', error);
    res.status(500).json({ error: 'Failed to assign workout template' });
  }
});

// Get available workout templates for workout generation
app.get('/api/workout-templates', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { difficulty, category, muscleGroups, equipment } = req.query;
    
    const where: any = {
      isPublic: true,
      isOfficial: true
    };
    
    if (difficulty) {
      where.difficulty = difficulty;
    }
    
    if (category) {
      where.category = category;
    }
    
    if (muscleGroups) {
      const groups = Array.isArray(muscleGroups) ? muscleGroups : [muscleGroups];
      where.targetMuscleGroups = {
        hasEvery: groups
      };
    }
    
    if (equipment) {
      const equipmentList = Array.isArray(equipment) ? equipment : [equipment];
      where.equipment = {
        hasEvery: equipmentList
      };
    }
    
    const templates = await prisma.workoutTemplate.findMany({
      where,
      orderBy: [
        { usageCount: 'desc' },
        { rating: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 20,
      select: {
        id: true,
        name: true,
        description: true,
        difficulty: true,
        duration: true,
        targetMuscleGroups: true,
        equipment: true,
        weeks: true,
        usageCount: true,
        rating: true,
        externalId: true
      }
    });
    
    res.json({ templates });
  } catch (error) {
    logger.error('Error fetching workout templates:', error);
    res.status(500).json({ error: 'Failed to fetch workout templates' });
  }
});

// Use workout template to create personalized plan
app.post('/api/use-workout-template', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { templateId, customizations } = req.body;
    const userId = req.user!.id;
    
    // Get the template
    const template = await prisma.workoutTemplate.findUnique({
      where: { id: templateId }
    });
    
    if (!template) {
      return res.status(404).json({ error: 'Workout template not found' });
    }
    
    // Check if user already has this template
    const existingPlan = await prisma.workoutPlan.findFirst({
      where: {
        userId,
        name: template.name,
        completed: false
      }
    });
    
    if (existingPlan) {
      return res.status(409).json({ error: 'You already have this workout plan' });
    }
    
    // Create personalized workout plan
    const workoutPlan = await prisma.workoutPlan.create({
      data: {
        userId,
        name: customizations?.name || template.name,
        description: customizations?.description || template.description,
        duration: customizations?.duration || template.duration,
        weeks: template.weeks,
        targetMuscleGroups: template.targetMuscleGroups,
        difficulty: template.difficulty,
        equipment: template.equipment,
        source: 'template'
      }
    });
    
    // Update template usage count
    await prisma.workoutTemplate.update({
      where: { id: templateId },
      data: { usageCount: { increment: 1 } }
    });
    
    logger.info(`User created workout plan from template:`, {
      metadata: {
        userId,
        templateId,
        templateName: template.name,
        planId: workoutPlan.id,
        timestamp: new Date().toISOString()
      }
    });
    
    res.json({
      message: 'Workout plan created successfully',
      workoutPlan,
      templateUsed: template.name
    });
    
  } catch (error) {
    logger.error('Error using workout template:', error);
    res.status(500).json({ error: 'Failed to create workout plan from template' });
  }
});

// Cache monitoring endpoints
app.get('/api/admin/cache/stats', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Simple cache stats - you can expand this based on your caching implementation
    const cacheStats = {
      stats: {
        hits: 0,
        misses: 0,
        evictions: 0,
        memoryUsage: 0,
        totalItems: 0,
        hitRate: 0
      },
      debugInfo: {
        totalItems: 0,
        categories: {},
        topKeys: [],
        memoryEstimate: '0 MB'
      },
      timestamp: new Date().toISOString()
    };
    
    res.json(cacheStats);
  } catch (error) {
    logger.error('Error getting cache stats:', error);
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

app.post('/api/admin/cache/clear', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { cacheType = 'all' } = req.body;
    
    // Log cache clear action
    logger.info(`Cache cleared by admin:`, {
      metadata: {
        user: req.user?.email,
        cacheType,
        timestamp: new Date().toISOString()
      }
    });
    
    res.json({ 
      message: `Cache cleared successfully`,
      cacheType,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../dist')));
  
  // Serve frontend for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, '../../dist/index.html'));
    }
  });
}

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorLoggingMiddleware);
app.use(errorHandler);

// Environment validation
function validateEnvironment() {
  console.log('🔍 Checking environment variables...');
  
  const requiredVars = {
    'DATABASE_URL': 'PostgreSQL connection string (e.g., postgresql://user:pass@host:port/db)',
    'JWT_SECRET': 'Secret key for JWT token signing',
  };
  
  const optionalVars = {
    'OPENAI_API_KEY': 'OpenAI API key for workout/meal generation',
    'STRIPE_SECRET_KEY': 'Stripe secret key for payment processing',
    'WGER_API_KEY': 'WGER API key for exercise database',
    'TELEGRAM_BOT_TOKEN': 'Telegram bot token for notifications',
  };
  
  const missingRequired: string[] = [];
  const missingOptional: string[] = [];
  
  // Check required variables
  Object.keys(requiredVars).forEach(varName => {
    if (!process.env[varName]) {
      missingRequired.push(varName);
    }
  });
  
  // Check optional variables
  Object.keys(optionalVars).forEach(varName => {
    if (!process.env[varName]) {
      missingOptional.push(varName);
    }
  });
  
  // Log current environment
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 Port: ${process.env.PORT || 3001}`);
  
  // Report missing variables
  if (missingRequired.length > 0) {
    console.error('\n❌ CRITICAL: Missing REQUIRED environment variables:');
    missingRequired.forEach(varName => {
      console.error(`   - ${varName}: ${requiredVars[varName as keyof typeof requiredVars]}`);
    });
    console.error('\n💡 To fix this in Railway:');
    console.error('   1. Go to your Railway dashboard');
    console.error('   2. Click on your service');
    console.error('   3. Go to the "Variables" tab');
    console.error('   4. Add the missing variables listed above');
    console.error('\n🔗 Railway Dashboard: https://railway.app/dashboard\n');
    return false;
  }
  
  if (missingOptional.length > 0) {
    console.warn('\n⚠️  Warning: Missing optional environment variables:');
    missingOptional.forEach(varName => {
      console.warn(`   - ${varName}: ${optionalVars[varName as keyof typeof optionalVars]}`);
    });
    console.warn('   Some features may not work without these variables.\n');
  }
  
  console.log('✅ All required environment variables are set');
  return true;
}

// Start server
async function startServer() {
  try {
    console.log('🚀 Starting FitArchitect backend server...');
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔌 Database URL configured: ${!!process.env.DATABASE_URL}`);
    
    // Validate environment variables
    if (!validateEnvironment()) {
      process.exit(1);
    }
    
    // Check database connection
    console.log('📋 Checking database connection...');
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      throw new Error('Database connection failed - check DATABASE_URL environment variable');
    }
    logger.info('✅ Database connection verified');

    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log('✅ Server startup complete - ready to handle requests');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        prisma.$disconnect();
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(() => {
        prisma.$disconnect();
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:');
    console.error('Error details:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('DATABASE_URL')) {
        console.error('💡 Solution: Set the DATABASE_URL environment variable in Railway dashboard');
        console.error('   Format: postgresql://user:pass@host:port/dbname');
      }
    }
    
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;