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
// Create workout log entry
router.post('/', auth_1.authenticate, [
    (0, express_validator_1.body)('workoutId').isString().withMessage('Workout ID required'),
    (0, express_validator_1.body)('exercises').isArray().withMessage('Exercises array required'),
    (0, express_validator_1.body)('duration').optional().isInt({ min: 1 }).withMessage('Duration must be positive integer'),
    (0, express_validator_1.body)('caloriesBurned').optional().isInt({ min: 0 }).withMessage('Calories must be non-negative')
], validation_1.handleValidationErrors, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const { workoutId, exercises, duration, caloriesBurned, notes, date } = req.body;
    if (!userId) {
        throw new validation_1.AppError(401, 'Authentication required');
    }
    const workoutLog = await prisma_1.prisma.workoutLog.create({
        data: {
            userId,
            workoutId,
            exercises,
            duration: duration || 0,
            notes,
            date: date ? new Date(date) : new Date()
        }
    });
    logger_1.logger.info('Workout logged', { userId, workoutId, logId: workoutLog.id });
    res.json(workoutLog);
}));
// Get all workout logs for user
router.get('/', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        throw new validation_1.AppError(401, 'Authentication required');
    }
    const workoutLogs = await prisma_1.prisma.workoutLog.findMany({
        where: { userId },
        orderBy: { date: 'desc' }
    });
    res.json(workoutLogs);
}));
// Get workout log by ID
router.get('/:id', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const { id } = req.params;
    if (!userId) {
        throw new validation_1.AppError(401, 'Authentication required');
    }
    const workoutLog = await prisma_1.prisma.workoutLog.findFirst({
        where: {
            id,
            userId
        }
    });
    if (!workoutLog) {
        throw new validation_1.AppError(404, 'Workout log not found');
    }
    res.json(workoutLog);
}));
// Update workout log
router.put('/:id', auth_1.authenticate, validation_1.handleValidationErrors, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const { id } = req.params;
    const { exercises, duration, notes } = req.body;
    if (!userId) {
        throw new validation_1.AppError(401, 'Authentication required');
    }
    // Check if log exists and belongs to user
    const existingLog = await prisma_1.prisma.workoutLog.findFirst({
        where: { id, userId }
    });
    if (!existingLog) {
        throw new validation_1.AppError(404, 'Workout log not found');
    }
    const updatedLog = await prisma_1.prisma.workoutLog.update({
        where: { id },
        data: {
            exercises,
            duration,
            notes
        }
    });
    res.json(updatedLog);
}));
// Delete workout log
router.delete('/:id', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const { id } = req.params;
    if (!userId) {
        throw new validation_1.AppError(401, 'Authentication required');
    }
    // Check if log exists and belongs to user
    const existingLog = await prisma_1.prisma.workoutLog.findFirst({
        where: { id, userId }
    });
    if (!existingLog) {
        throw new validation_1.AppError(404, 'Workout log not found');
    }
    await prisma_1.prisma.workoutLog.delete({ where: { id } });
    res.status(204).end();
}));
exports.default = router;
