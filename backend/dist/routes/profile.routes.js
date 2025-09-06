"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const prisma_1 = require("../db/prisma");
const auth_1 = require("../auth");
const validation_1 = require("../middleware/validation");
const errorHandler_1 = require("../middleware/errorHandler");
const cloudinaryService_1 = require("../services/cloudinaryService");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
// Get user profile
router.get('/profile', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        throw new validation_1.AppError(401, 'Authentication required');
    }
    const userProfile = await prisma_1.prisma.userProfile.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            name: true,
            age: true,
            weight: true,
            height: true,
            gender: true,
            activityLevel: true,
            fitnessGoals: true,
            equipmentAvailability: true,
            dietaryPreferences: true,
            tier: true,
            type: true,
            parqCompleted: true,
            isAdmin: true,
            active: true,
            avatar: true,
            createdAt: true,
            updatedAt: true
        }
    });
    if (!userProfile) {
        throw new validation_1.AppError(404, 'User profile not found');
    }
    res.json({
        success: true,
        user: userProfile
    });
}));
// Update user profile
router.put('/profile', auth_1.authenticate, validation_1.profileValidation, [
    (0, express_validator_1.body)('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    (0, express_validator_1.body)('age').optional().isInt({ min: 13, max: 120 }).withMessage('Age must be between 13 and 120'),
    (0, express_validator_1.body)('weight').optional().isFloat({ min: 20, max: 500 }).withMessage('Weight must be between 20 and 500'),
    (0, express_validator_1.body)('height').optional().isFloat({ min: 50, max: 250 }).withMessage('Height must be between 50 and 250'),
    (0, express_validator_1.body)('goals').optional().isArray().withMessage('Goals must be an array'),
    (0, express_validator_1.body)('equipment').optional().isArray().withMessage('Equipment must be an array'),
    (0, express_validator_1.body)('dietaryRestrictions').optional().isArray().withMessage('Dietary restrictions must be an array'),
    (0, express_validator_1.body)('medicalConditions').optional().isArray().withMessage('Medical conditions must be an array'),
    (0, express_validator_1.body)('phoneNumber').optional().isMobilePhone('any').withMessage('Valid phone number required'),
    (0, express_validator_1.body)('emergencyContact').optional().isObject().withMessage('Emergency contact must be an object')
], validation_1.handleValidationErrors, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        throw new validation_1.AppError(401, 'Authentication required');
    }
    const updateData = {};
    // Field mapping from request body to database schema
    const fieldMappings = {
        'name': 'name',
        'age': 'age',
        'weight': 'weight',
        'height': 'height',
        'activityLevel': 'activityLevel',
        'goals': 'fitnessGoals',
        'equipment': 'equipmentAvailability',
        'dietaryRestrictions': 'dietaryPreferences',
        'phoneNumber': 'phoneNumber',
        'emergencyContact': 'emergencyContact'
    };
    // Map request body fields to database fields
    for (const [reqField, dbField] of Object.entries(fieldMappings)) {
        if (req.body[reqField] !== undefined) {
            updateData[dbField] = req.body[reqField];
        }
    }
    if (Object.keys(updateData).length === 0) {
        throw new validation_1.AppError(400, 'No valid fields provided for update');
    }
    const updatedProfile = await prisma_1.prisma.userProfile.update({
        where: { id: userId },
        data: updateData,
        select: {
            id: true,
            email: true,
            name: true,
            age: true,
            weight: true,
            height: true,
            activityLevel: true,
            fitnessGoals: true,
            equipmentAvailability: true,
            dietaryPreferences: true,
            tier: true,
            type: true,
            parqCompleted: true,
            isAdmin: true,
            avatar: true,
            updatedAt: true
        }
    });
    logger_1.logger.info('Profile updated', { userId, updatedFields: Object.keys(updateData) });
    res.json({
        success: true,
        user: updatedProfile
    });
}));
// Upload avatar
router.post('/profile/avatar', auth_1.authenticate, cloudinaryService_1.upload.single('avatar'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        throw new validation_1.AppError(401, 'Authentication required');
    }
    if (!req.file) {
        throw new validation_1.AppError(400, 'No image file provided');
    }
    // The upload middleware handles the Cloudinary upload
    const profilePictureUrl = req.file.path; // Cloudinary URL
    await prisma_1.prisma.userProfile.update({
        where: { id: userId },
        data: { profilePicture: profilePictureUrl }
    });
    logger_1.logger.info('Profile picture updated', { userId });
    res.json({
        success: true,
        profilePicture: profilePictureUrl,
        message: 'Profile picture updated successfully'
    });
}));
// Get dashboard data
router.get('/dashboard', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        throw new validation_1.AppError(401, 'Authentication required');
    }
    // Get user basic info
    const user = await prisma_1.prisma.userProfile.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            tier: true,
            type: true,
            parqCompleted: true
        }
    });
    if (!user) {
        throw new validation_1.AppError(404, 'User not found');
    }
    // Get workout stats
    const workoutStats = await prisma_1.prisma.workoutPlan.aggregate({
        where: { userId },
        _count: { id: true }
    });
    // Get recent workout logs
    const recentWorkouts = await prisma_1.prisma.workoutLog.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 5,
        select: {
            id: true,
            workoutId: true,
            duration: true,
            rating: true,
            date: true,
            completed: true
        }
    });
    // Get nutrition stats if available
    const nutritionStats = await prisma_1.prisma.nutritionLog.aggregate({
        where: {
            userId,
            date: {
                gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
        },
        _count: { id: true },
        _avg: { calories: true }
    });
    const dashboardData = {
        user,
        stats: {
            totalWorkouts: workoutStats._count.id,
            recentWorkouts,
            weeklyNutritionLogs: nutritionStats._count.id,
            averageCalories: Math.round(nutritionStats._avg.calories || 0)
        }
    };
    res.json({
        success: true,
        dashboard: dashboardData
    });
}));
// PARQ Response endpoints
router.post('/parq-response', auth_1.authenticate, [
    (0, express_validator_1.body)('responses').isObject().withMessage('Responses object required'),
    (0, express_validator_1.body)('completedAt').optional().isISO8601().withMessage('Valid date required')
], validation_1.handleValidationErrors, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const { responses, completedAt } = req.body;
    if (!userId) {
        throw new validation_1.AppError(401, 'Authentication required');
    }
    // Save PARQ response
    const parqResponse = await prisma_1.prisma.parqResponse.create({
        data: {
            userId,
            responses,
            completedAt: completedAt ? new Date(completedAt) : new Date()
        }
    });
    // Update user profile to mark PARQ as completed
    await prisma_1.prisma.userProfile.update({
        where: { id: userId },
        data: { parqCompleted: true }
    });
    logger_1.logger.info('PARQ response submitted', { userId, responseId: parqResponse.id });
    res.json({
        success: true,
        parqResponse,
        message: 'Health assessment completed successfully'
    });
}));
router.get('/parq-response', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        throw new validation_1.AppError(401, 'Authentication required');
    }
    const parqResponse = await prisma_1.prisma.parqResponse.findFirst({
        where: { userId },
        orderBy: { completedAt: 'desc' }
    });
    res.json({
        success: true,
        parqResponse
    });
}));
// Upgrade guest to full user
router.post('/upgrade-guest', auth_1.authenticate, [
    (0, express_validator_1.body)('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    (0, express_validator_1.body)('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters')
], validation_1.handleValidationErrors, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const { password, name } = req.body;
    if (!userId) {
        throw new validation_1.AppError(401, 'Authentication required');
    }
    const user = await prisma_1.prisma.userProfile.findUnique({
        where: { id: userId }
    });
    if (!user) {
        throw new validation_1.AppError(404, 'User not found');
    }
    if (user.type !== 'guest') {
        throw new validation_1.AppError(400, 'Only guest users can be upgraded');
    }
    // Hash new password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);
    // Update user to full user status
    const updatedUser = await prisma_1.prisma.userProfile.update({
        where: { id: userId },
        data: {
            password: hashedPassword,
            name: name || user.name,
            type: 'user',
            tier: 'free' // Upgrade from guest to free tier
        },
        select: {
            id: true,
            email: true,
            name: true,
            tier: true,
            type: true,
            parqCompleted: true,
            isAdmin: true
        }
    });
    logger_1.logger.info('Guest user upgraded', { userId });
    res.json({
        success: true,
        user: updatedUser,
        message: 'Account upgraded successfully'
    });
}));
exports.default = router;
