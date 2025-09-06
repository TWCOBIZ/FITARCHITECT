"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const express_validator_1 = require("express-validator");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const prisma_1 = require("../db/prisma");
const auth_1 = require("../auth");
const validation_1 = require("../middleware/validation");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
// Rate limiters
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs
    message: { error: 'Too many authentication attempts. Please try again later.' }
});
const errorReportLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 error reports per windowMs
    message: { error: 'Too many error reports. Please try again later.' }
});
// Registration validation
const registrationValidation = [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    (0, express_validator_1.body)('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    (0, express_validator_1.body)('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    (0, express_validator_1.body)('type').optional().isIn(['user', 'guest']).withMessage('Invalid user type')
];
// Registration handler
const registrationHandler = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email, password, name, type = 'user' } = req.body;
    logger_1.logger.info('Registration attempt', { email, type });
    // Check if user already exists
    const existingUser = await prisma_1.prisma.userProfile.findUnique({
        where: { email }
    });
    if (existingUser) {
        throw new validation_1.AppError(409, 'Account with this email already exists');
    }
    // Hash password
    const hashedPassword = await bcryptjs_1.default.hash(password, 12);
    // Create user
    const user = await prisma_1.prisma.userProfile.create({
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
    const token = (0, auth_1.generateToken)({
        id: user.id,
        email: user.email,
        type: user.type
    });
    logger_1.logger.info('Registration successful', { userId: user.id, email });
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
    (0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    (0, express_validator_1.body)('password').isLength({ min: 1 }).withMessage('Password required')
];
// Login handler
const loginHandler = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    logger_1.logger.info('Login attempt', { email });
    // Find user
    const user = await prisma_1.prisma.userProfile.findUnique({
        where: { email }
    });
    if (!user) {
        throw new validation_1.AppError(401, 'Invalid email or password');
    }
    // Check password
    const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
    if (!isPasswordValid) {
        throw new validation_1.AppError(401, 'Invalid email or password');
    }
    // Check if user is active
    if (!user.active) {
        throw new validation_1.AppError(403, 'Your account has been deactivated. Please contact support.');
    }
    // Generate token
    const token = (0, auth_1.generateToken)({
        id: user.id,
        email: user.email,
        type: user.type
    });
    logger_1.logger.info('Login successful', { userId: user.id, email });
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
const adminLoginHandler = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    logger_1.logger.info('Admin login attempt', { email });
    // Find admin user
    const user = await prisma_1.prisma.userProfile.findUnique({
        where: {
            email,
            isAdmin: true,
            active: true
        }
    });
    if (!user) {
        throw new validation_1.AppError(401, 'Invalid admin credentials');
    }
    // Check password
    const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
    if (!isPasswordValid) {
        throw new validation_1.AppError(401, 'Invalid admin credentials');
    }
    // Generate token
    const token = (0, auth_1.generateToken)({
        id: user.id,
        email: user.email,
        type: user.type
    });
    logger_1.logger.info('Admin login successful', { userId: user.id, email });
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
const guestRegistrationHandler = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email, name } = req.body;
    logger_1.logger.info('Guest registration attempt', { email });
    // Check if user already exists
    const existingUser = await prisma_1.prisma.userProfile.findUnique({
        where: { email }
    });
    if (existingUser) {
        throw new validation_1.AppError(409, 'Account with this email already exists');
    }
    // Create temporary password for guest
    const tempPassword = Math.random().toString(36).substring(2, 15);
    const hashedPassword = await bcryptjs_1.default.hash(tempPassword, 12);
    // Create guest user
    const user = await prisma_1.prisma.userProfile.create({
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
    const token = (0, auth_1.generateToken)({
        id: user.id,
        email: user.email,
        type: 'guest'
    });
    logger_1.logger.info('Guest registration successful', { userId: user.id, email });
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
router.post('/register', authLimiter, registrationValidation, validation_1.handleValidationErrors, registrationHandler);
router.post('/login', authLimiter, loginValidation, validation_1.handleValidationErrors, loginHandler);
router.post('/admin/login', authLimiter, [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').isLength({ min: 6 })
], validation_1.handleValidationErrors, adminLoginHandler);
router.post('/logout', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    // For JWT tokens, logout is handled client-side by removing the token
    // Here we could implement token blacklisting if needed
    logger_1.logger.info('User logged out', { userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id });
    res.json({ success: true, message: 'Logged out successfully' });
}));
router.post('/guest-register', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    (0, express_validator_1.body)('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters')
], validation_1.handleValidationErrors, guestRegistrationHandler);
// Error reporting endpoint
router.post('/report-error', errorReportLimiter, [
    (0, express_validator_1.body)('message').isString().isLength({ min: 1, max: 1000 }),
    (0, express_validator_1.body)('stack').optional().isString().isLength({ max: 5000 }),
    (0, express_validator_1.body)('userAgent').optional().isString().isLength({ max: 500 }),
    (0, express_validator_1.body)('url').optional().isString().isLength({ max: 500 }),
], validation_1.handleValidationErrors, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { message, stack, userAgent, url } = req.body;
    logger_1.logger.error('Client error report', {
        message,
        stack,
        userAgent,
        url,
        ip: req.ip,
        timestamp: new Date().toISOString()
    });
    // Could also save to database or send to monitoring service
    res.json({ success: true, message: 'Error report received' });
}));
exports.default = router;
