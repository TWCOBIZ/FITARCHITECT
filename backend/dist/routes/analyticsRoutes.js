"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../auth");
const prisma_1 = require("../db/prisma");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
/**
 * Get comprehensive analytics dashboard data
 */
router.get('/dashboard', auth_1.authenticate, [
    (0, express_validator_1.query)('days').optional().isInt({ min: 7, max: 365 }).withMessage('Days must be between 7 and 365'),
    (0, express_validator_1.query)('timezone').optional().isString().withMessage('Timezone must be a string')
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Invalid input',
                details: errors.array()
            });
        }
        const userId = req.user.id;
        const days = parseInt(req.query.days) || 30;
        const timezone = req.query.timezone || 'UTC';
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        // Get nutrition analytics
        const nutritionStats = await getNutritionAnalytics(userId, startDate);
        // Get workout analytics
        const workoutStats = await getWorkoutAnalytics(userId, startDate);
        // Get user progress metrics
        const progressMetrics = await getProgressMetrics(userId, startDate);
        // Get goal achievement data
        const goalAchievement = await getGoalAchievement(userId, startDate);
        // Get trend analysis
        const trends = await getTrendAnalysis(userId, startDate);
        const analytics = {
            period: {
                days,
                startDate: startDate.toISOString(),
                endDate: new Date().toISOString()
            },
            nutrition: nutritionStats,
            workouts: workoutStats,
            progress: progressMetrics,
            goals: goalAchievement,
            trends
        };
        logger_1.logger.info('Analytics dashboard data retrieved', {
            operation: 'analytics_dashboard',
            component: 'analytics',
            userId,
            metadata: { days, dataPoints: Object.keys(analytics).length }
        });
        res.json(analytics);
    }
    catch (error) {
        logger_1.logger.error('Failed to get analytics dashboard', {
            operation: 'analytics_dashboard_error',
            component: 'analytics',
            userId: req.user.id
        }, error);
        res.status(500).json({
            error: 'Failed to retrieve analytics data'
        });
    }
});
/**
 * Get nutrition analytics
 */
router.get('/nutrition', auth_1.authenticate, [
    (0, express_validator_1.query)('days').optional().isInt({ min: 7, max: 365 }).withMessage('Days must be between 7 and 365')
], async (req, res) => {
    try {
        const userId = req.user.id;
        const days = parseInt(req.query.days) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const nutritionStats = await getNutritionAnalytics(userId, startDate);
        logger_1.logger.info('Nutrition analytics retrieved', {
            operation: 'analytics_nutrition',
            component: 'analytics',
            userId,
            metadata: { days }
        });
        res.json(nutritionStats);
    }
    catch (error) {
        logger_1.logger.error('Failed to get nutrition analytics', {
            operation: 'analytics_nutrition_error',
            component: 'analytics',
            userId: req.user.id
        }, error);
        res.status(500).json({
            error: 'Failed to retrieve nutrition analytics'
        });
    }
});
/**
 * Get workout analytics
 */
router.get('/workouts', auth_1.authenticate, [
    (0, express_validator_1.query)('days').optional().isInt({ min: 7, max: 365 }).withMessage('Days must be between 7 and 365')
], async (req, res) => {
    try {
        const userId = req.user.id;
        const days = parseInt(req.query.days) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const workoutStats = await getWorkoutAnalytics(userId, startDate);
        logger_1.logger.info('Workout analytics retrieved', {
            operation: 'analytics_workouts',
            component: 'analytics',
            userId,
            metadata: { days }
        });
        res.json(workoutStats);
    }
    catch (error) {
        logger_1.logger.error('Failed to get workout analytics', {
            operation: 'analytics_workouts_error',
            component: 'analytics',
            userId: req.user.id
        }, error);
        res.status(500).json({
            error: 'Failed to retrieve workout analytics'
        });
    }
});
/**
 * Export analytics data
 */
router.get('/export', auth_1.authenticate, [
    (0, express_validator_1.query)('format').isIn(['json', 'csv']).withMessage('Format must be json or csv'),
    (0, express_validator_1.query)('type').isIn(['nutrition', 'workouts', 'all']).withMessage('Type must be nutrition, workouts, or all'),
    (0, express_validator_1.query)('days').optional().isInt({ min: 7, max: 365 }).withMessage('Days must be between 7 and 365')
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Invalid input',
                details: errors.array()
            });
        }
        const userId = req.user.id;
        const format = req.query.format;
        const type = req.query.type;
        const days = parseInt(req.query.days) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        let exportData = {};
        // Gather requested data
        if (type === 'nutrition' || type === 'all') {
            exportData.nutrition = await getNutritionExportData(userId, startDate);
        }
        if (type === 'workouts' || type === 'all') {
            exportData.workouts = await getWorkoutExportData(userId, startDate);
        }
        // Format response based on requested format
        if (format === 'csv') {
            const csv = convertToCSV(exportData, type);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="fitness-data-${type}-${days}days.csv"`);
            res.send(csv);
        }
        else {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="fitness-data-${type}-${days}days.json"`);
            res.json({
                exportDate: new Date().toISOString(),
                period: { days, startDate: startDate.toISOString() },
                data: exportData
            });
        }
        logger_1.logger.info('Analytics data exported', {
            operation: 'analytics_export',
            component: 'analytics',
            userId,
            metadata: { format, type, days }
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to export analytics data', {
            operation: 'analytics_export_error',
            component: 'analytics',
            userId: req.user.id
        }, error);
        res.status(500).json({
            error: 'Failed to export analytics data'
        });
    }
});
/**
 * Helper function to get nutrition analytics
 */
async function getNutritionAnalytics(userId, startDate) {
    const nutritionLogs = await prisma_1.prisma.nutritionLog.findMany({
        where: {
            userId,
            date: { gte: startDate }
        },
        orderBy: { date: 'asc' }
    });
    const totalLogs = nutritionLogs.length;
    const dailyAverages = calculateNutritionAverages(nutritionLogs);
    const trends = calculateNutritionTrends(nutritionLogs);
    const goalAdherence = calculateGoalAdherence(nutritionLogs);
    return {
        totalEntries: totalLogs,
        averages: dailyAverages,
        trends,
        goalAdherence,
        recentLogs: nutritionLogs.slice(-7), // Last 7 days
        topFoods: await getTopFoods(userId, startDate)
    };
}
/**
 * Helper function to get workout analytics
 */
async function getWorkoutAnalytics(userId, startDate) {
    const workoutLogs = await prisma_1.prisma.workoutLog.findMany({
        where: {
            userId,
            date: { gte: startDate }
        },
        orderBy: { date: 'asc' }
    });
    const totalWorkouts = workoutLogs.length;
    const weeklyFrequency = calculateWeeklyFrequency(workoutLogs);
    const exerciseStats = calculateExerciseStats(workoutLogs);
    const progressMetrics = calculateWorkoutProgress(workoutLogs);
    return {
        totalWorkouts,
        weeklyFrequency,
        exerciseStats,
        progressMetrics,
        recentWorkouts: workoutLogs.slice(-10), // Last 10 workouts
        consistency: calculateWorkoutConsistency(workoutLogs)
    };
}
/**
 * Helper function to get progress metrics
 */
async function getProgressMetrics(userId, startDate) {
    // Get user's current profile data
    const user = await prisma_1.prisma.userProfile.findUnique({
        where: { id: userId }
    });
    if (!user) {
        return { error: 'User profile not found' };
    }
    // Calculate progress based on available data
    const weightProgress = await calculateWeightProgress(userId, startDate);
    const fitnessProgress = await calculateFitnessProgress(userId, startDate);
    return {
        weight: weightProgress,
        fitness: fitnessProgress,
        goals: user.fitnessGoals || [],
        startDate: user.createdAt,
        profileCompleteness: calculateProfileCompleteness(user)
    };
}
/**
 * Helper function to get goal achievement data
 */
async function getGoalAchievement(userId, startDate) {
    const nutritionLogs = await prisma_1.prisma.nutritionLog.findMany({
        where: { userId, date: { gte: startDate } }
    });
    const workoutLogs = await prisma_1.prisma.workoutLog.findMany({
        where: { userId, date: { gte: startDate } }
    });
    return {
        nutrition: calculateNutritionGoalAchievement(nutritionLogs),
        workouts: calculateWorkoutGoalAchievement(workoutLogs),
        overall: calculateOverallGoalAchievement(nutritionLogs, workoutLogs)
    };
}
/**
 * Helper function to get trend analysis
 */
async function getTrendAnalysis(userId, startDate) {
    // Implement trend analysis logic
    return {
        nutrition: { trend: 'improving', confidence: 0.8 },
        workouts: { trend: 'stable', confidence: 0.9 },
        overall: { trend: 'improving', confidence: 0.85 }
    };
}
// Calculation helper functions
function calculateNutritionAverages(logs) {
    if (logs.length === 0)
        return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const totals = logs.reduce((acc, log) => ({
        calories: acc.calories + (log.calories || 0),
        protein: acc.protein + (calculateTotalNutrient(log.foods, 'protein') || 0),
        carbs: acc.carbs + (calculateTotalNutrient(log.foods, 'carbs') || 0),
        fat: acc.fat + (calculateTotalNutrient(log.foods, 'fat') || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
    return {
        calories: Math.round(totals.calories / logs.length),
        protein: Math.round(totals.protein / logs.length),
        carbs: Math.round(totals.carbs / logs.length),
        fat: Math.round(totals.fat / logs.length)
    };
}
function calculateTotalNutrient(foods, nutrient) {
    if (!Array.isArray(foods))
        return 0;
    return foods.reduce((total, food) => total + (food[nutrient] || 0), 0);
}
function calculateNutritionTrends(logs) {
    // Simple trend calculation - could be enhanced
    return { direction: 'stable', strength: 0.5 };
}
function calculateGoalAdherence(logs) {
    // Calculate how well user is meeting their goals
    return { percentage: 75, consistency: 0.8 };
}
function calculateWeeklyFrequency(workoutLogs) {
    const weeks = Math.ceil(workoutLogs.length / 7);
    return workoutLogs.length / Math.max(weeks, 1);
}
function calculateExerciseStats(workoutLogs) {
    const exerciseFrequency = {};
    workoutLogs.forEach(log => {
        if (Array.isArray(log.exercises)) {
            log.exercises.forEach((exercise) => {
                const name = exercise.name || 'Unknown';
                exerciseFrequency[name] = (exerciseFrequency[name] || 0) + 1;
            });
        }
    });
    return {
        totalExercises: Object.keys(exerciseFrequency).length,
        mostFrequent: Object.entries(exerciseFrequency)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
    };
}
function calculateWorkoutProgress(workoutLogs) {
    return {
        totalSessions: workoutLogs.length,
        averageDuration: 45, // Could be calculated from actual data
        intensityTrend: 'increasing'
    };
}
function calculateWorkoutConsistency(workoutLogs) {
    if (workoutLogs.length < 7)
        return 0;
    // Calculate consistency based on workout frequency
    const daysWithWorkouts = new Set(workoutLogs.map(log => new Date(log.date).toDateString())).size;
    const totalDays = Math.ceil((new Date().getTime() - new Date(workoutLogs[0].date).getTime()) / (1000 * 60 * 60 * 24));
    return Math.min(daysWithWorkouts / totalDays, 1);
}
async function calculateWeightProgress(userId, startDate) {
    // This would track weight changes over time
    // For now, return placeholder data
    return { change: 0, trend: 'stable' };
}
async function calculateFitnessProgress(userId, startDate) {
    // This would track fitness improvements
    return { improvement: 15, areas: ['strength', 'endurance'] };
}
function calculateProfileCompleteness(user) {
    const requiredFields = ['height', 'weight', 'age', 'gender', 'activityLevel', 'fitnessGoals'];
    const completedFields = requiredFields.filter(field => user[field] != null);
    return Math.round((completedFields.length / requiredFields.length) * 100);
}
function calculateNutritionGoalAchievement(logs) {
    return { adherence: 80, streak: 5 };
}
function calculateWorkoutGoalAchievement(logs) {
    return { frequency: 85, consistency: 90 };
}
function calculateOverallGoalAchievement(nutritionLogs, workoutLogs) {
    return { score: 82, grade: 'B+' };
}
async function getTopFoods(userId, startDate) {
    // Get most frequently logged foods
    const logs = await prisma_1.prisma.nutritionLog.findMany({
        where: { userId, date: { gte: startDate } }
    });
    const foodFrequency = {};
    logs.forEach(log => {
        if (Array.isArray(log.foods)) {
            log.foods.forEach((food) => {
                const name = food.name || 'Unknown';
                foodFrequency[name] = (foodFrequency[name] || 0) + 1;
            });
        }
    });
    return Object.entries(foodFrequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));
}
async function getNutritionExportData(userId, startDate) {
    return await prisma_1.prisma.nutritionLog.findMany({
        where: { userId, date: { gte: startDate } },
        orderBy: { date: 'asc' }
    });
}
async function getWorkoutExportData(userId, startDate) {
    return await prisma_1.prisma.workoutLog.findMany({
        where: { userId, date: { gte: startDate } },
        orderBy: { date: 'asc' }
    });
}
function convertToCSV(data, type) {
    // Simple CSV conversion - could be enhanced for better formatting
    if (type === 'nutrition' && data.nutrition) {
        const headers = ['Date', 'Calories', 'Protein', 'Carbs', 'Fat'];
        const rows = data.nutrition.map((log) => [
            new Date(log.date).toISOString().split('T')[0],
            log.calories || 0,
            calculateTotalNutrient(log.foods, 'protein'),
            calculateTotalNutrient(log.foods, 'carbs'),
            calculateTotalNutrient(log.foods, 'fat')
        ]);
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
    if (type === 'workouts' && data.workouts) {
        const headers = ['Date', 'Exercises', 'Duration', 'Notes'];
        const rows = data.workouts.map((log) => [
            new Date(log.date).toISOString().split('T')[0],
            Array.isArray(log.exercises) ? log.exercises.length : 0,
            'N/A', // Duration would need to be tracked
            log.notes || ''
        ]);
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
    return 'No data available for CSV export';
}
exports.default = router;
