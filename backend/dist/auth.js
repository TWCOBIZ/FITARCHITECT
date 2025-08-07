"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireParqCompleted = exports.requireFeatureAccess = exports.canAccessFeature = exports.generateToken = exports.requireWorkoutAccess = exports.requireParqCompletion = exports.requireSubscription = exports.getTrialStatus = exports.activateFreeWorkoutTrial = exports.hasValidSubscription = exports.authenticateOptional = exports.requireAdmin = exports.authenticate = void 0;
const prisma_1 = require("./db/prisma");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = require("./utils/logger");
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters long');
}
// Helper function to normalize equipment availability data
const normalizeEquipmentAvailability = (equipment) => {
    if (!equipment)
        return [];
    if (Array.isArray(equipment))
        return equipment;
    if (typeof equipment === 'string') {
        // Convert comma-separated string to array
        const result = equipment.split(',').map(item => item.trim()).filter(item => item.length > 0);
        return result.length > 0 ? result : [];
    }
    return [];
};
// Unified authentication middleware that handles both user and admin tokens
const authenticate = async (req, res, next) => {
    if (process.env.NODE_ENV === 'development' && process.env.DEBUG_AUTH === 'true') {
        console.log('🔐 Authentication middleware called for:', req.method, req.url);
    }
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        if (process.env.NODE_ENV === 'development' && process.env.DEBUG_AUTH === 'true') {
            console.log('❌ No valid authorization header:', auth ? 'Invalid format' : 'Missing header');
        }
        return res.status(401).json({ error: 'No token provided' });
    }
    const token = auth.split(' ')[1];
    if (process.env.NODE_ENV === 'development' && process.env.DEBUG_AUTH === 'true') {
        console.log('🔐 Token received:', token ? `${token.substring(0, 10)}...` : 'None');
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Find user in database
        const user = await prisma_1.prisma.userProfile.findUnique({
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
                equipmentAvailability: true,
                preferredWorkoutDuration: true,
                dietaryPreferences: true,
                telegramEnabled: true,
                telegramChatId: true,
                twoFactorEnabled: true,
                avatar: true,
                trialEndDate: true,
                freeWorkoutTrialStartDate: true,
                freeWorkoutTrialUsed: true,
                createdAt: true,
                updatedAt: true
            }
        });
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        // Normalize equipment availability data and add user to request object
        const normalizedUser = {
            ...user,
            equipmentAvailability: normalizeEquipmentAvailability(user.equipmentAvailability)
        };
        req.user = normalizedUser;
        // Also add admin flag for backward compatibility
        if (user.isAdmin) {
            req.admin = normalizedUser;
        }
        next();
    }
    catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Auth middleware error:', error);
            console.error('Auth error details:', {
                message: error instanceof Error ? error.message : 'Unknown error',
                token: token ? `${token.substring(0, 10)}...` : 'No token'
            });
        }
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
        const user = await prisma_1.prisma.userProfile.findUnique({
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
                equipmentAvailability: true,
                preferredWorkoutDuration: true,
                dietaryPreferences: true,
                telegramEnabled: true,
                telegramChatId: true,
                twoFactorEnabled: true,
                avatar: true,
                trialEndDate: true,
                freeWorkoutTrialStartDate: true,
                freeWorkoutTrialUsed: true,
                createdAt: true,
                updatedAt: true
            }
        });
        if (user) {
            // Normalize equipment availability data
            const normalizedUser = {
                ...user,
                equipmentAvailability: normalizeEquipmentAvailability(user.equipmentAvailability)
            };
            req.user = normalizedUser;
            if (user.isAdmin) {
                req.admin = normalizedUser;
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
    // Check if user meets tier requirement
    if (userLevel >= requiredLevel) {
        // For paid subscriptions, check subscription status
        if (user.subscriptionStatus === 'active')
            return true;
    }
    // For guests with trials, check if trial is still valid
    if (user.type === 'guest' && user.trialEndDate) {
        const now = new Date();
        const trialEnd = new Date(user.trialEndDate);
        return trialEnd > now;
    }
    // For free users requesting basic or premium tier, check 3-day trial eligibility
    if ((requiredTier === 'basic' || requiredTier === 'premium') && userTier === 'free') {
        // Check if user has completed PAR-Q (required for trial)
        if (!user.parqCompleted)
            return false;
        // Check if trial is active
        if (user.trialEndDate) {
            const now = new Date();
            const trialEnd = new Date(user.trialEndDate);
            return trialEnd > now;
        }
        // Check if trial hasn't been used yet
        if (!user.freeWorkoutTrialUsed) {
            return true; // Eligible for trial activation
        }
    }
    return false;
};
exports.hasValidSubscription = hasValidSubscription;
// Activate 3-day premium trial for free users after PAR-Q completion
const activateFreeWorkoutTrial = async (userId) => {
    try {
        const user = await prisma_1.prisma.userProfile.findUnique({
            where: { id: userId },
            select: {
                tier: true,
                parqCompleted: true,
                freeWorkoutTrialUsed: true,
                trialEndDate: true
            }
        });
        if (!user)
            return false;
        // Only activate for free users who completed PAR-Q and haven't used trial
        if (user.tier !== 'free' || !user.parqCompleted || user.freeWorkoutTrialUsed) {
            return false;
        }
        // Check if trial is already active
        if (user.trialEndDate) {
            const now = new Date();
            const trialEnd = new Date(user.trialEndDate);
            if (trialEnd > now) {
                return true; // Trial already active
            }
        }
        // Activate 3-day trial
        const trialStartDate = new Date();
        const trialEndDate = new Date(trialStartDate.getTime() + (3 * 24 * 60 * 60 * 1000)); // 3 days
        await prisma_1.prisma.userProfile.update({
            where: { id: userId },
            data: {
                freeWorkoutTrialStartDate: trialStartDate,
                trialEndDate: trialEndDate,
                freeWorkoutTrialUsed: true
            }
        });
        console.log(`Activated 3-day trial for user ${userId} until ${trialEndDate.toISOString()}`);
        return true;
    }
    catch (error) {
        console.error('Error activating trial:', error);
        return false;
    }
};
exports.activateFreeWorkoutTrial = activateFreeWorkoutTrial;
// Check trial status for free users
const getTrialStatus = (user) => {
    const defaultStatus = { isEligible: false, isActive: false, daysRemaining: 0, hasUsed: false };
    if (!user || user.tier !== 'free')
        return defaultStatus;
    const hasUsed = !!user.freeWorkoutTrialUsed;
    const isEligible = user.parqCompleted && !hasUsed;
    if (!user.trialEndDate) {
        return { isEligible, isActive: false, daysRemaining: isEligible ? 3 : 0, hasUsed };
    }
    const now = new Date();
    const trialEnd = new Date(user.trialEndDate);
    const isActive = trialEnd > now;
    const daysRemaining = isActive ? Math.ceil((trialEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)) : 0;
    return { isEligible, isActive, daysRemaining, hasUsed };
};
exports.getTrialStatus = getTrialStatus;
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
// Feature access middleware
const requireFeatureAccess = (feature) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!(0, exports.canAccessFeature)(req.user, feature)) {
            const featureRules = {
                'workout-generation': { tier: 'basic', parq: true },
                'nutrition-tracking': { tier: 'free', parq: false },
                'meal-planning': { tier: 'free', parq: false },
                'barcode-scanning': { tier: 'premium', parq: false },
                'telegram-notifications': { tier: 'premium', parq: false },
                'analytics': { tier: 'free', parq: false }
            };
            const rule = featureRules[feature];
            let errorMessage = 'Access denied to this feature';
            let action = 'upgrade_subscription';
            if ((rule === null || rule === void 0 ? void 0 : rule.parq) && !req.user.parqCompleted) {
                errorMessage = 'Please complete the PAR-Q health assessment to access this feature';
                action = 'complete_parq';
            }
            else if ((rule === null || rule === void 0 ? void 0 : rule.tier) !== 'free') {
                errorMessage = `${rule.tier} subscription required for this feature`;
                action = 'upgrade_subscription';
            }
            return res.status(403).json({
                error: errorMessage,
                action,
                requiredTier: rule === null || rule === void 0 ? void 0 : rule.tier,
                requiresParq: rule === null || rule === void 0 ? void 0 : rule.parq,
                userTier: req.user.tier,
                parqCompleted: req.user.parqCompleted
            });
        }
        next();
    };
};
exports.requireFeatureAccess = requireFeatureAccess;
// Dedicated middleware for PAR-Q validation with detailed error messages
const requireParqCompleted = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    if (!req.user.parqCompleted) {
        logger_1.logger.warn(`PAR-Q not completed for user ${req.user.id} (${req.user.email})`);
        return res.status(403).json({
            error: 'PAR-Q health assessment must be completed before accessing this feature',
            action: 'complete_parq',
            requiredField: 'parqCompleted', // Explicitly note this is the field name, not 'isCleared'
            currentValue: req.user.parqCompleted,
            message: 'Please complete the Physical Activity Readiness Questionnaire to ensure safe exercise participation'
        });
    }
    next();
};
exports.requireParqCompleted = requireParqCompleted;
exports.default = {
    authenticate: exports.authenticate,
    requireAdmin: exports.requireAdmin,
    authenticateOptional: exports.authenticateOptional,
    requireSubscription: exports.requireSubscription,
    requireParqCompletion: exports.requireParqCompletion,
    requireWorkoutAccess: exports.requireWorkoutAccess,
    requireParqCompleted: exports.requireParqCompleted,
    generateToken: exports.generateToken,
    hasValidSubscription: exports.hasValidSubscription,
    canAccessFeature: exports.canAccessFeature,
    activateFreeWorkoutTrial: exports.activateFreeWorkoutTrial,
    getTrialStatus: exports.getTrialStatus
};
