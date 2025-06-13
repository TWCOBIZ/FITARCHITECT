"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.canAccessFeature = exports.generateToken = exports.requireWorkoutAccess = exports.requireParqCompletion = exports.requireSubscription = exports.hasValidSubscription = exports.authenticateOptional = exports.requireAdmin = exports.authenticate = void 0;
const client_1 = require("@prisma/client");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
// Unified authentication middleware that handles both user and admin tokens
const authenticate = async (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    const token = auth.split(' ')[1];
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Find user in database
        const user = await prisma.userProfile.findUnique({
            where: { id: payload.userId },
            select: {
                id: true,
                email: true,
                name: true,
                isAdmin: true,
                type: true,
                tier: true,
                subscriptionStatus: true,
                parqCompleted: true,
                parqAnswers: true,
                height: true,
                weight: true,
                age: true,
                gender: true,
                fitnessGoals: true,
                activityLevel: true,
                dietaryPreferences: true,
                telegramEnabled: true,
                telegramChatId: true,
                twoFactorEnabled: true,
                avatar: true,
                createdAt: true,
                updatedAt: true
            }
        });
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        // Add user to request object
        req.user = user;
        // Also add admin flag for backward compatibility
        if (user.isAdmin) {
            req.admin = user;
        }
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};
exports.authenticate = authenticate;
// Admin-only middleware that requires admin privileges
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    if (!req.user.isAdmin) {
        return res.status(403).json({ error: 'Admin privileges required' });
    }
    next();
};
exports.requireAdmin = requireAdmin;
// Guest-compatible middleware that allows guest users
const authenticateOptional = async (req, res, next) => {
    const auth = req.headers.authorization;
    // No token is fine for guest access
    if (!auth || !auth.startsWith('Bearer ')) {
        return next();
    }
    const token = auth.split(' ')[1];
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const user = await prisma.userProfile.findUnique({
            where: { id: payload.userId },
            select: {
                id: true,
                email: true,
                name: true,
                isAdmin: true,
                type: true,
                tier: true,
                subscriptionStatus: true,
                parqCompleted: true,
                parqAnswers: true,
                height: true,
                weight: true,
                age: true,
                gender: true,
                fitnessGoals: true,
                activityLevel: true,
                dietaryPreferences: true,
                telegramEnabled: true,
                telegramChatId: true,
                twoFactorEnabled: true,
                avatar: true,
                createdAt: true,
                updatedAt: true
            }
        });
        if (user) {
            req.user = user;
            if (user.isAdmin) {
                req.admin = user;
            }
        }
    }
    catch (error) {
        // Invalid token but we allow guest access
    }
    next();
};
exports.authenticateOptional = authenticateOptional;
// Validate subscription status helper
const hasValidSubscription = (user, requiredTier) => {
    if (!user)
        return false;
    const userTier = user.tier || 'free';
    const tierHierarchy = { free: 0, basic: 1, premium: 2 };
    const requiredLevel = tierHierarchy[requiredTier];
    const userLevel = tierHierarchy[userTier] || 0;
    return userLevel >= requiredLevel && user.subscriptionStatus === 'active';
};
exports.hasValidSubscription = hasValidSubscription;
// Subscription tier validation middleware
const requireSubscription = (requiredTier) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        // Use the hasValidSubscription helper for consistent logic
        if (!(0, exports.hasValidSubscription)(req.user, requiredTier)) {
            const userTier = req.user.tier || 'free';
            return res.status(403).json({
                error: 'Valid subscription required',
                requiredTier,
                currentTier: userTier,
                subscriptionStatus: req.user.subscriptionStatus
            });
        }
        next();
    };
};
exports.requireSubscription = requireSubscription;
// PAR-Q completion validation middleware
const requireParqCompletion = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    if (!req.user.parqCompleted) {
        return res.status(403).json({
            error: 'PAR-Q health assessment must be completed before accessing this feature'
        });
    }
    next();
};
exports.requireParqCompletion = requireParqCompletion;
// Combined middleware for features requiring both subscription and PAR-Q
exports.requireWorkoutAccess = [
    exports.authenticate,
    (0, exports.requireSubscription)('basic'),
    exports.requireParqCompletion
];
// Generate JWT token helper
const generateToken = (user) => {
    return jsonwebtoken_1.default.sign({
        userId: user.id,
        email: user.email,
        type: user.type || 'registered',
        isAdmin: user.isAdmin || false
    }, JWT_SECRET, { expiresIn: '7d' });
};
exports.generateToken = generateToken;
// Check if user can access feature helper
const canAccessFeature = (user, feature) => {
    if (!user)
        return false;
    // Feature access rules
    const featureRules = {
        'workout-generation': { tier: 'basic', parq: true },
        'nutrition-tracking': { tier: 'free', parq: false },
        'meal-planning': { tier: 'free', parq: false },
        'barcode-scanning': { tier: 'premium', parq: false },
        'telegram-notifications': { tier: 'premium', parq: false },
        'analytics': { tier: 'free', parq: false }
    };
    const rule = featureRules[feature];
    if (!rule)
        return false;
    // Check subscription tier
    if (!(0, exports.hasValidSubscription)(user, rule.tier) && rule.tier !== 'free') {
        return false;
    }
    // Check PAR-Q completion if required
    if (rule.parq && !user.parqCompleted) {
        return false;
    }
    return true;
};
exports.canAccessFeature = canAccessFeature;
exports.default = {
    authenticate: exports.authenticate,
    requireAdmin: exports.requireAdmin,
    authenticateOptional: exports.authenticateOptional,
    requireSubscription: exports.requireSubscription,
    requireParqCompletion: exports.requireParqCompletion,
    requireWorkoutAccess: exports.requireWorkoutAccess,
    generateToken: exports.generateToken,
    hasValidSubscription: exports.hasValidSubscription,
    canAccessFeature: exports.canAccessFeature
};
