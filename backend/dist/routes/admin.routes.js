"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const prisma_1 = require("../db/prisma");
const auth_1 = require("../auth");
const validation_1 = require("../middleware/validation");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
// All admin routes require authentication and admin privileges
router.use(auth_1.authenticate, auth_1.requireAdmin);
// Get admin profile
router.get('/me', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        throw new validation_1.AppError(401, 'Authentication required');
    }
    const admin = await prisma_1.prisma.userProfile.findUnique({
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
        throw new validation_1.AppError(403, 'Admin access required');
    }
    res.json({
        success: true,
        admin
    });
}));
// Get all users with pagination
router.get('/users', [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('search').optional().isString().withMessage('Search must be string'),
    (0, express_validator_1.query)('tier').optional().isIn(['free', 'basic', 'premium', 'guest']).withMessage('Invalid tier')
], validation_1.handleValidationErrors, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search;
    const tier = req.query.tier;
    const skip = (page - 1) * limit;
    // Build where clause
    const where = {};
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
        prisma_1.prisma.userProfile.findMany({
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
        prisma_1.prisma.userProfile.count({ where })
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
}));
// Update user
router.patch('/users/:id', [
    (0, express_validator_1.param)('id').isString().withMessage('User ID required'),
    (0, express_validator_1.body)('tier').optional().isIn(['free', 'basic', 'premium', 'guest']).withMessage('Invalid tier'),
    (0, express_validator_1.body)('active').optional().isBoolean().withMessage('active must be boolean'),
    (0, express_validator_1.body)('isAdmin').optional().isBoolean().withMessage('isAdmin must be boolean')
], validation_1.handleValidationErrors, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const userId = req.params.id;
    const { tier, active, isAdmin } = req.body;
    const updateData = {};
    if (tier !== undefined)
        updateData.tier = tier;
    if (active !== undefined)
        updateData.active = active;
    if (isAdmin !== undefined)
        updateData.isAdmin = isAdmin;
    if (Object.keys(updateData).length === 0) {
        throw new validation_1.AppError(400, 'No valid fields provided for update');
    }
    const user = await prisma_1.prisma.userProfile.update({
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
    logger_1.logger.info('User updated by admin', {
        adminId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
        userId,
        updates: updateData
    });
    res.json({
        success: true,
        user
    });
}));
// Activate user
router.post('/users/:id/activate', (0, express_validator_1.param)('id').isString().withMessage('User ID required'), validation_1.handleValidationErrors, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const userId = req.params.id;
    await prisma_1.prisma.userProfile.update({
        where: { id: userId },
        data: { active: true }
    });
    logger_1.logger.info('User activated by admin', {
        adminId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
        userId
    });
    res.json({
        success: true,
        message: 'User activated successfully'
    });
}));
// Deactivate user
router.post('/users/:id/deactivate', (0, express_validator_1.param)('id').isString().withMessage('User ID required'), validation_1.handleValidationErrors, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const userId = req.params.id;
    await prisma_1.prisma.userProfile.update({
        where: { id: userId },
        data: { active: false }
    });
    logger_1.logger.info('User deactivated by admin', {
        adminId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
        userId
    });
    res.json({
        success: true,
        message: 'User deactivated successfully'
    });
}));
// Get analytics
router.get('/analytics', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const [totalUsers, activeUsers, workoutPlans, subscriptions] = await Promise.all([
        prisma_1.prisma.userProfile.count(),
        prisma_1.prisma.userProfile.count({ where: { active: true } }),
        prisma_1.prisma.workoutPlan.count(),
        prisma_1.prisma.subscription.count({ where: { status: 'active' } })
    ]);
    // User tier distribution
    const tierDistribution = await prisma_1.prisma.userProfile.groupBy({
        by: ['tier'],
        _count: { tier: true }
    });
    // Recent signups (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSignups = await prisma_1.prisma.userProfile.count({
        where: {
            createdAt: { gte: thirtyDaysAgo }
        }
    });
    // Workout generation stats
    const workoutStats = await prisma_1.prisma.workoutPlan.groupBy({
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
        }, {}),
        workoutGeneration: workoutStats.reduce((acc, item) => {
            acc[item.source || 'unknown'] = item._count.source;
            return acc;
        }, {})
    };
    res.json({
        success: true,
        analytics
    });
}));
// Get workout metrics
router.get('/workout-metrics', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const metrics = {
        totalGenerations: await prisma_1.prisma.workoutPlan.count(),
        aiGenerations: await prisma_1.prisma.workoutPlan.count({
            where: { source: 'ai' }
        }),
        templateGenerations: await prisma_1.prisma.workoutPlan.count({
            where: { source: 'template' }
        }),
        averageWorkoutsPerUser: await prisma_1.prisma.workoutPlan.count() / Math.max(await prisma_1.prisma.userProfile.count(), 1)
    };
    res.json({
        success: true,
        metrics
    });
}));
// Get user's workout history
router.get('/users/:userId/workouts', (0, express_validator_1.param)('userId').isString().withMessage('User ID required'), validation_1.handleValidationErrors, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.params.userId;
    const workouts = await prisma_1.prisma.workoutPlan.findMany({
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
}));
// Health endpoint for admin services
router.get('/health', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    // Basic health check
    const dbStatus = await prisma_1.prisma.$queryRaw `SELECT 1`;
    res.json({
        success: true,
        status: 'healthy',
        database: dbStatus ? 'connected' : 'error',
        timestamp: new Date().toISOString()
    });
}));
exports.default = router;
