import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { prisma } from '../db/prisma';
import { 
  authenticate, 
  requireAdmin, 
  AuthenticatedRequest 
} from '../auth';
import { 
  handleValidationErrors, 
  AppError
} from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

// All admin routes require authentication and admin privileges
router.use(authenticate, requireAdmin);

// Get admin profile
router.get('/me', 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'Authentication required');
    }

    const admin = await prisma.userProfile.findUnique({
      where: { 
        id: userId,
        isAdmin: true 
      },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        createdAt: true
      }
    });

    if (!admin) {
      throw new AppError(403, 'Admin access required');
    }

    res.json({
      success: true,
      admin
    });
  })
);

// Get all users with pagination
router.get('/users', 
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('search').optional().isString().withMessage('Search must be string'),
    query('tier').optional().isIn(['free', 'basic', 'premium', 'guest']).withMessage('Invalid tier')
  ],
  handleValidationErrors,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const tier = req.query.tier as string;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (tier) {
      where.tier = tier;
    }

    const [users, total] = await Promise.all([
      prisma.userProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          tier: true,
          type: true,
          active: true,
          isAdmin: true,
          parqCompleted: true,
          createdAt: true,
          _count: {
            select: {
              workoutPlans: true
            }
          }
        }
      }),
      prisma.userProfile.count({ where })
    ]);

    res.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

// Update user
router.patch('/users/:id', 
  [
    param('id').isString().withMessage('User ID required'),
    body('tier').optional().isIn(['free', 'basic', 'premium', 'guest']).withMessage('Invalid tier'),
    body('active').optional().isBoolean().withMessage('active must be boolean'),
    body('isAdmin').optional().isBoolean().withMessage('isAdmin must be boolean')
  ],
  handleValidationErrors,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.params.id;
    const { tier, active, isAdmin } = req.body;

    const updateData: any = {};
    if (tier !== undefined) updateData.tier = tier;
    if (active !== undefined) updateData.active = active;
    if (isAdmin !== undefined) updateData.isAdmin = isAdmin;

    if (Object.keys(updateData).length === 0) {
      throw new AppError(400, 'No valid fields provided for update');
    }

    const user = await prisma.userProfile.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        tier: true,
        type: true,
        active: true,
        isAdmin: true
      }
    });

    logger.info('User updated by admin', { 
      adminId: req.user?.id, 
      userId, 
      updates: updateData 
    });

    res.json({
      success: true,
      user
    });
  })
);

// Activate user
router.post('/users/:id/activate', 
  param('id').isString().withMessage('User ID required'),
  handleValidationErrors,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.params.id;

    await prisma.userProfile.update({
      where: { id: userId },
      data: { active: true }
    });

    logger.info('User activated by admin', { 
      adminId: req.user?.id, 
      userId 
    });

    res.json({
      success: true,
      message: 'User activated successfully'
    });
  })
);

// Deactivate user
router.post('/users/:id/deactivate', 
  param('id').isString().withMessage('User ID required'),
  handleValidationErrors,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.params.id;

    await prisma.userProfile.update({
      where: { id: userId },
      data: { active: false }
    });

    logger.info('User deactivated by admin', { 
      adminId: req.user?.id, 
      userId 
    });

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  })
);

// Get analytics
router.get('/analytics', 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const [
      totalUsers,
      activeUsers,
      workoutPlans,
      subscriptions
    ] = await Promise.all([
      prisma.userProfile.count(),
      prisma.userProfile.count({ where: { active: true } }),
      prisma.workoutPlan.count(),
      prisma.subscription.count({ where: { status: 'active' } })
    ]);

    // User tier distribution
    const tierDistribution = await prisma.userProfile.groupBy({
      by: ['tier'],
      _count: { tier: true }
    });

    // Recent signups (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentSignups = await prisma.userProfile.count({
      where: {
        createdAt: { gte: thirtyDaysAgo }
      }
    });

    // Workout generation stats
    const workoutStats = await prisma.workoutPlan.groupBy({
      by: ['source'],
      _count: { source: true }
    });

    const analytics = {
      overview: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        totalWorkoutPlans: workoutPlans,
        activeSubscriptions: subscriptions,
        recentSignups
      },
      tierDistribution: tierDistribution.reduce((acc, item) => {
        acc[item.tier] = item._count.tier;
        return acc;
      }, {} as Record<string, number>),
      workoutGeneration: workoutStats.reduce((acc, item) => {
        acc[item.source || 'unknown'] = item._count.source;
        return acc;
      }, {} as Record<string, number>)
    };

    res.json({
      success: true,
      analytics
    });
  })
);

// Get workout metrics
router.get('/workout-metrics', 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const metrics = {
      totalGenerations: await prisma.workoutPlan.count(),
      aiGenerations: await prisma.workoutPlan.count({ 
        where: { source: 'ai' } 
      }),
      templateGenerations: await prisma.workoutPlan.count({ 
        where: { source: 'template' } 
      }),
      averageWorkoutsPerUser: await prisma.workoutPlan.count() / Math.max(await prisma.userProfile.count(), 1)
    };

    res.json({
      success: true,
      metrics
    });
  })
);

// Get user's workout history
router.get('/users/:userId/workouts', 
  param('userId').isString().withMessage('User ID required'),
  handleValidationErrors,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.params.userId;

    const workouts = await prisma.workoutPlan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        duration: true,
        difficulty: true,
        source: true,
        createdAt: true
      }
    });

    res.json({
      success: true,
      workouts
    });
  })
);

// Health endpoint for admin services
router.get('/health', 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Basic health check
    const dbStatus = await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      success: true,
      status: 'healthy',
      database: dbStatus ? 'connected' : 'error',
      timestamp: new Date().toISOString()
    });
  })
);

export default router;