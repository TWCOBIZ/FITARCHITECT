"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const prisma_1 = require("../db/prisma");
const auth_1 = require("../auth");
const validation_1 = require("../middleware/validation");
const errorHandler_1 = require("../middleware/errorHandler");
const cache_1 = require("../middleware/cache");
const openaiService_1 = require("../services/openaiService");
const workoutTemplateService_1 = require("../services/workoutTemplateService");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
// Helper function to transform weeks structure to workouts for frontend compatibility
function transformWeeksToWorkouts(weeks) {
    if (!weeks || !Array.isArray(weeks))
        return [];
    const workouts = [];
    weeks.forEach((week, weekIndex) => {
        if (!week || !week.days || !Array.isArray(week.days))
            return;
        week.days.forEach((day, dayIndex) => {
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
// Fallback workout templates
const getFallbackWorkout = (preferences) => {
    const { fitnessLevel = 'beginner', duration = 45, goals = [], equipment = ['bodyweight'] } = preferences;
    const fallbackWorkouts = {
        beginner: {
            name: 'Beginner Full Body Workout',
            description: 'A simple full-body workout perfect for beginners',
            exercises: [
                {
                    name: 'Bodyweight Squats',
                    reps: '10-15',
                    sets: 3,
                    restTime: '60s',
                    description: 'Stand with feet shoulder-width apart, lower into squat position'
                },
                {
                    name: 'Push-ups (or Modified)',
                    reps: '5-10',
                    sets: 3,
                    restTime: '60s',
                    description: 'Standard push-ups or knee push-ups for beginners'
                },
                {
                    name: 'Plank',
                    reps: '30-60s',
                    sets: 3,
                    restTime: '60s',
                    description: 'Hold plank position, keep core engaged'
                }
            ],
            duration,
            difficulty: 'beginner'
        },
        intermediate: {
            name: 'Intermediate Strength Training',
            description: 'Challenging workout for intermediate fitness levels',
            exercises: [
                {
                    name: 'Jump Squats',
                    reps: '12-15',
                    sets: 4,
                    restTime: '45s',
                    description: 'Explosive squat jumps for power and strength'
                },
                {
                    name: 'Burpees',
                    reps: '8-12',
                    sets: 3,
                    restTime: '60s',
                    description: 'Full body explosive movement'
                },
                {
                    name: 'Mountain Climbers',
                    reps: '20-30',
                    sets: 3,
                    restTime: '45s',
                    description: 'High-intensity core and cardio exercise'
                }
            ],
            duration,
            difficulty: 'intermediate'
        },
        advanced: {
            name: 'Advanced HIIT Workout',
            description: 'High-intensity workout for advanced athletes',
            exercises: [
                {
                    name: 'Single Leg Squats',
                    reps: '8-12 each leg',
                    sets: 4,
                    restTime: '60s',
                    description: 'Challenging unilateral strength exercise'
                },
                {
                    name: 'Handstand Push-ups',
                    reps: '5-8',
                    sets: 3,
                    restTime: '90s',
                    description: 'Advanced upper body strength exercise'
                },
                {
                    name: 'Plyometric Burpees',
                    reps: '10-15',
                    sets: 4,
                    restTime: '45s',
                    description: 'Explosive burpees with jump variations'
                }
            ],
            duration,
            difficulty: 'advanced'
        }
    };
    return fallbackWorkouts[fitnessLevel] || fallbackWorkouts.beginner;
};
// Check free generation availability
router.get('/check-free-generation', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        throw new validation_1.AppError(401, 'Authentication required');
    }
    const user = await prisma_1.prisma.userProfile.findUnique({
        where: { id: userId }
    });
    if (!user) {
        throw new validation_1.AppError(404, 'User not found');
    }
    // Check if user has premium access
    if (user.tier === 'premium') {
        return res.json({
            success: true,
            canGenerate: true,
            message: 'Premium user - unlimited generations',
            remainingGenerations: -1 // -1 indicates unlimited
        });
    }
    // For free/basic users, check generation count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const generationsToday = await prisma_1.prisma.workoutPlan.count({
        where: {
            userId,
            createdAt: {
                gte: today
            }
        }
    });
    const maxFreeGenerations = user.tier === 'basic' ? 3 : 1;
    const remaining = Math.max(0, maxFreeGenerations - generationsToday);
    res.json({
        success: true,
        canGenerate: remaining > 0,
        remainingGenerations: remaining,
        maxGenerations: maxFreeGenerations,
        message: remaining > 0
            ? `You have ${remaining} workout generations remaining today`
            : 'Daily workout generation limit reached. Upgrade to premium for unlimited generations.'
    });
}));
// Generate workout plan
router.post('/generate', auth_1.authenticate, validation_1.requireCompleteProfile, auth_1.requireParqCompletion, auth_1.requireWorkoutAccess, cache_1.cacheWorkoutGeneration, validation_1.workoutValidation, validation_1.handleValidationErrors, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const { preferences } = req.body;
    if (!userId) {
        throw new validation_1.AppError(401, 'Authentication required');
    }
    logger_1.logger.info('Workout generation request', { userId });
    try {
        // Add timeout for the entire generation process (30 seconds for OpenAI)
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Workout generation timeout')), 30000));
        // Try to generate workout with OpenAI
        const generationPromise = openaiService_1.openaiService.generateWorkoutPlan(req.user);
        const result = await Promise.race([generationPromise, timeout]);
        if (result && result.weeks && Array.isArray(result.weeks)) {
            // Transform the weeks structure to workouts for frontend compatibility
            const workouts = transformWeeksToWorkouts(result.weeks);
            // Save to database
            const workoutPlan = await prisma_1.prisma.workoutPlan.create({
                data: {
                    userId,
                    name: result.name || 'Custom Workout Plan',
                    description: result.description || 'AI-generated workout plan',
                    duration: (preferences === null || preferences === void 0 ? void 0 : preferences.duration) || 4, // duration is in weeks for the schema
                    difficulty: (preferences === null || preferences === void 0 ? void 0 : preferences.fitnessLevel) || 'beginner',
                    targetMuscleGroups: (preferences === null || preferences === void 0 ? void 0 : preferences.focusAreas) || [],
                    equipment: (preferences === null || preferences === void 0 ? void 0 : preferences.equipment) || ['bodyweight'],
                    weeks: result.weeks, // Store original structure
                    estimatedDuration: (preferences === null || preferences === void 0 ? void 0 : preferences.duration) || 45, // estimated workout duration in minutes
                    source: 'openai'
                }
            });
            logger_1.logger.info('Workout generation successful', {
                userId,
                planId: workoutPlan.id,
                workoutsCount: workouts.length
            });
            res.json({
                success: true,
                workoutPlan: {
                    ...workoutPlan,
                    workouts // Include transformed workouts for frontend compatibility
                }
            });
        }
        else {
            throw new Error('Invalid workout structure from OpenAI');
        }
    }
    catch (error) {
        logger_1.logger.warn('OpenAI workout generation failed, using smart template fallback', {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Use smart template matching system
        const userProfile = req.user;
        const selectedTemplate = workoutTemplateService_1.WorkoutTemplateService.findBestTemplate(userProfile);
        // Convert template to plan format
        // Transform template weeks to workouts for frontend compatibility
        const workouts = transformWeeksToWorkouts(selectedTemplate.weeks);
        // Save template-based workout to database
        const workoutPlan = await prisma_1.prisma.workoutPlan.create({
            data: {
                userId,
                name: selectedTemplate.name,
                description: selectedTemplate.description,
                duration: selectedTemplate.duration,
                difficulty: selectedTemplate.difficulty,
                targetMuscleGroups: selectedTemplate.targetMuscleGroups,
                equipment: selectedTemplate.equipment,
                weeks: selectedTemplate.weeks, // Store full weeks structure
                estimatedDuration: selectedTemplate.estimatedDuration,
                source: 'template' // Smart template system
            }
        });
        logger_1.logger.info('Smart template workout generated', {
            userId,
            planId: workoutPlan.id,
            templateId: selectedTemplate.id,
            workoutsCount: workouts.length
        });
        res.json({
            success: true,
            workoutPlan: {
                ...workoutPlan,
                workouts // Include transformed workouts for frontend compatibility
            },
            usedTemplate: true,
            templateId: selectedTemplate.id,
            message: `Generated using smart template: ${selectedTemplate.name}`
        });
    }
}));
// Generate instant workout using templates only (fast response)
router.post('/generate-instant', auth_1.authenticate, validation_1.requireCompleteProfile, auth_1.requireParqCompletion, auth_1.requireWorkoutAccess, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        throw new validation_1.AppError(401, 'Authentication required');
    }
    logger_1.logger.info('Instant workout generation request', { userId });
    try {
        // Use smart template matching system directly (no OpenAI)
        const userProfile = req.user;
        const selectedTemplate = workoutTemplateService_1.WorkoutTemplateService.findBestTemplate(userProfile);
        // Transform template weeks to workouts for frontend compatibility
        const workouts = transformWeeksToWorkouts(selectedTemplate.weeks);
        // Save template-based workout to database
        const workoutPlan = await prisma_1.prisma.workoutPlan.create({
            data: {
                userId,
                name: selectedTemplate.name,
                description: selectedTemplate.description,
                duration: selectedTemplate.duration,
                difficulty: selectedTemplate.difficulty,
                targetMuscleGroups: selectedTemplate.targetMuscleGroups,
                equipment: selectedTemplate.equipment,
                weeks: selectedTemplate.weeks, // Store full weeks structure
                estimatedDuration: selectedTemplate.estimatedDuration,
                source: 'template' // Template-based generation
            }
        });
        logger_1.logger.info('Instant template workout generated', {
            userId,
            planId: workoutPlan.id,
            templateId: selectedTemplate.id,
            workoutsCount: workouts.length
        });
        res.json({
            success: true,
            workoutPlan: {
                ...workoutPlan,
                workouts // Include transformed workouts for frontend compatibility
            },
            templateId: selectedTemplate.id,
            generationType: 'instant_template',
            message: `Instantly generated: ${selectedTemplate.name}`
        });
    }
    catch (error) {
        logger_1.logger.error('Instant workout generation failed', {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw new validation_1.AppError(500, 'Failed to generate instant workout');
    }
}));
// Get all workout plans for user
router.get('/', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        throw new validation_1.AppError(401, 'Authentication required');
    }
    const workoutPlans = await prisma_1.prisma.workoutPlan.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            name: true,
            description: true,
            duration: true,
            difficulty: true,
            targetMuscleGroups: true,
            equipment: true,
            source: true,
            createdAt: true,
            weeks: true,
            estimatedDuration: true,
            completed: true
        }
    });
    res.json(workoutPlans);
}));
// Get specific workout plan
router.get('/:id', auth_1.authenticate, (0, express_validator_1.param)('id').isString().withMessage('Valid workout plan ID required'), validation_1.handleValidationErrors, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const planId = req.params.id;
    if (!userId) {
        throw new validation_1.AppError(401, 'Authentication required');
    }
    const workoutPlan = await prisma_1.prisma.workoutPlan.findFirst({
        where: {
            id: planId,
            userId
        }
    });
    if (!workoutPlan) {
        throw new validation_1.AppError(404, 'Workout plan not found');
    }
    res.json({
        success: true,
        workoutPlan
    });
}));
// Delete workout plan
router.delete('/:id', auth_1.authenticate, (0, express_validator_1.param)('id').isString().withMessage('Valid workout plan ID required'), validation_1.handleValidationErrors, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const planId = req.params.id;
    if (!userId) {
        throw new validation_1.AppError(401, 'Authentication required');
    }
    const workoutPlan = await prisma_1.prisma.workoutPlan.findFirst({
        where: {
            id: planId,
            userId
        }
    });
    if (!workoutPlan) {
        throw new validation_1.AppError(404, 'Workout plan not found');
    }
    await prisma_1.prisma.workoutPlan.delete({
        where: { id: planId }
    });
    logger_1.logger.info('Workout plan deleted', { userId, planId });
    res.json({
        success: true,
        message: 'Workout plan deleted successfully'
    });
}));
// Note: Workout logging endpoints have been moved to workout-log.routes.ts
// and are now accessible at /api/workout-log
exports.default = router;
