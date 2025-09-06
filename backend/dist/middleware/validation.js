"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionValidation = exports.workoutValidation = exports.profileValidation = exports.authValidation = exports.requireCompleteProfile = exports.handleValidationErrors = exports.AppError = void 0;
const express_validator_1 = require("express-validator");
const errorHandler_1 = require("./errorHandler");
Object.defineProperty(exports, "AppError", { enumerable: true, get: function () { return errorHandler_1.AppError; } });
const prisma_1 = require("../db/prisma");
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg);
        throw new errorHandler_1.AppError(400, errorMessages.join(', '));
    }
    next();
};
exports.handleValidationErrors = handleValidationErrors;
const requireCompleteProfile = async (req, res, next) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            throw new errorHandler_1.AppError(401, 'Authentication required');
        }
        const user = await prisma_1.prisma.userProfile.findUnique({
            where: { id: userId }
        });
        if (!user) {
            throw new errorHandler_1.AppError(404, 'User not found');
        }
        // Check required profile fields  
        const requiredFields = [
            'age', 'weight', 'height', 'activityLevel',
            'fitnessGoals', 'equipmentAvailability'
        ];
        const missingFields = requiredFields.filter(field => {
            const value = user[field];
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
    }
    catch (error) {
        next(error);
    }
};
exports.requireCompleteProfile = requireCompleteProfile;
// Common validation schemas
exports.authValidation = {
    register: [
        (0, express_validator_1.body)('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Please provide a valid email address'),
        (0, express_validator_1.body)('password')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters long')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
        (0, express_validator_1.body)('name')
            .trim()
            .isLength({ min: 2 })
            .withMessage('Name must be at least 2 characters long')
    ],
    login: [
        (0, express_validator_1.body)('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Please provide a valid email address'),
        (0, express_validator_1.body)('password')
            .notEmpty()
            .withMessage('Password is required')
    ]
};
exports.profileValidation = [
    (0, express_validator_1.body)('age')
        .optional()
        .isInt({ min: 13, max: 120 })
        .withMessage('Age must be between 13 and 120'),
    (0, express_validator_1.body)('weight')
        .optional()
        .isNumeric()
        .withMessage('Weight must be a number'),
    (0, express_validator_1.body)('height')
        .optional()
        .isNumeric()
        .withMessage('Height must be a number'),
    (0, express_validator_1.body)('fitnessLevel')
        .optional()
        .isIn(['beginner', 'intermediate', 'advanced'])
        .withMessage('Fitness level must be beginner, intermediate, or advanced')
];
exports.workoutValidation = [
    (0, express_validator_1.body)('preferences')
        .optional()
        .isObject()
        .withMessage('Preferences must be an object'),
    (0, express_validator_1.body)('preferences.duration')
        .optional()
        .isInt({ min: 15, max: 180 })
        .withMessage('Duration must be between 15 and 180 minutes'),
    (0, express_validator_1.body)('preferences.fitnessLevel')
        .optional()
        .isIn(['beginner', 'intermediate', 'advanced'])
        .withMessage('Invalid fitness level')
];
exports.subscriptionValidation = [
    (0, express_validator_1.body)('planType')
        .isIn(['free', 'basic', 'premium'])
        .withMessage('Invalid plan type'),
    (0, express_validator_1.body)('paymentMethodId')
        .optional()
        .isString()
        .withMessage('Payment method ID must be a string')
];
