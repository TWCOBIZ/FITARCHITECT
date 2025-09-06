"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const stripe_1 = __importDefault(require("stripe"));
const prisma_1 = require("../db/prisma");
const auth_1 = require("../auth");
const validation_1 = require("../middleware/validation");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
// Initialize Stripe
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20'
});
// Get available subscription plans
router.get('/subscription/plans', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const plans = [
        {
            id: 'free',
            name: 'Free',
            description: 'Basic features to get you started',
            price: 0,
            currency: 'usd',
            interval: null,
            features: [
                '1 workout generation per day',
                'Basic nutrition tracking',
                'Community access'
            ],
            stripeProductId: null,
            stripePriceId: null
        },
        {
            id: 'basic',
            name: 'Basic',
            description: 'Enhanced features for regular users',
            price: 9.99,
            currency: 'usd',
            interval: 'month',
            features: [
                '3 workout generations per day',
                'Advanced nutrition tracking',
                'Progress analytics',
                'Email support'
            ],
            stripeProductId: process.env.STRIPE_BASIC_PRODUCT_ID,
            stripePriceId: process.env.STRIPE_BASIC_PRICE_ID
        },
        {
            id: 'premium',
            name: 'Premium',
            description: 'Full access to all features',
            price: 19.99,
            currency: 'usd',
            interval: 'month',
            features: [
                'Unlimited workout generations',
                'Advanced meal planning',
                'Barcode scanning',
                'Telegram notifications',
                'Priority support',
                'Advanced analytics'
            ],
            stripeProductId: process.env.STRIPE_PREMIUM_PRODUCT_ID,
            stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID
        }
    ];
    res.json({
        success: true,
        plans
    });
}));
// Get user's current subscription
router.get('/current', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        throw new validation_1.AppError(401, 'Authentication required');
    }
    const user = await prisma_1.prisma.userProfile.findUnique({
        where: { id: userId },
        select: {
            tier: true,
            type: true
        }
    });
    if (!user) {
        throw new validation_1.AppError(404, 'User not found');
    }
    // Get active subscription from database
    const subscription = await prisma_1.prisma.subscription.findFirst({
        where: {
            userId,
            status: 'active'
        },
        include: {
            plan: true
        }
    });
    res.json({
        success: true,
        currentTier: user.tier,
        userType: user.type,
        subscription: subscription || null
    });
}));
// Create subscription
router.post('/create', auth_1.authenticate, validation_1.subscriptionValidation, validation_1.handleValidationErrors, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const { planType, paymentMethodId } = req.body;
    if (!userId) {
        throw new validation_1.AppError(401, 'Authentication required');
    }
    if (planType === 'free') {
        throw new validation_1.AppError(400, 'Free plan does not require subscription creation');
    }
    const user = await prisma_1.prisma.userProfile.findUnique({
        where: { id: userId }
    });
    if (!user) {
        throw new validation_1.AppError(404, 'User not found');
    }
    // Get plan details
    const planConfig = {
        basic: {
            priceId: process.env.STRIPE_BASIC_PRICE_ID,
            price: 999, // $9.99 in cents
        },
        premium: {
            priceId: process.env.STRIPE_PREMIUM_PRICE_ID,
            price: 1999, // $19.99 in cents
        }
    };
    const plan = planConfig[planType];
    if (!plan) {
        throw new validation_1.AppError(400, 'Invalid plan type');
    }
    try {
        // Create or get Stripe customer
        let stripeCustomerId = user.stripeCustomerId;
        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.name,
                metadata: { userId }
            });
            stripeCustomerId = customer.id;
            await prisma_1.prisma.userProfile.update({
                where: { id: userId },
                data: { stripeCustomerId }
            });
        }
        // Attach payment method to customer
        if (paymentMethodId) {
            await stripe.paymentMethods.attach(paymentMethodId, {
                customer: stripeCustomerId,
            });
            // Set as default payment method
            await stripe.customers.update(stripeCustomerId, {
                invoice_settings: {
                    default_payment_method: paymentMethodId,
                },
            });
        }
        // Create subscription
        const stripeSubscription = await stripe.subscriptions.create({
            customer: stripeCustomerId,
            items: [{ price: plan.priceId }],
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            expand: ['latest_invoice.payment_intent'],
        });
        // Save subscription to database
        const dbSubscription = await prisma_1.prisma.subscription.create({
            data: {
                userId,
                stripeSubscriptionId: stripeSubscription.id,
                stripeCustomerId,
                status: stripeSubscription.status,
                currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
                currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
                plan: {
                    create: {
                        name: planType,
                        stripePriceId: plan.priceId,
                        amount: plan.price,
                        currency: 'usd',
                        interval: 'month'
                    }
                }
            },
            include: {
                plan: true
            }
        });
        // Update user tier if subscription is active
        if (stripeSubscription.status === 'active') {
            await prisma_1.prisma.userProfile.update({
                where: { id: userId },
                data: { tier: planType }
            });
        }
        logger_1.logger.info('Subscription created', {
            userId,
            planType,
            subscriptionId: stripeSubscription.id,
            status: stripeSubscription.status
        });
        const invoice = stripeSubscription.latest_invoice;
        const paymentIntent = invoice.payment_intent;
        res.json({
            success: true,
            subscription: dbSubscription,
            clientSecret: paymentIntent.client_secret,
            status: stripeSubscription.status
        });
    }
    catch (error) {
        logger_1.logger.error('Subscription creation failed', { userId, planType, error });
        if (error instanceof stripe_1.default.errors.StripeError) {
            throw new validation_1.AppError(400, error.message);
        }
        throw new validation_1.AppError(500, 'Failed to create subscription');
    }
}));
// Get subscription details
router.get('/:subscriptionId', auth_1.authenticate, (0, express_validator_1.param)('subscriptionId').isString().withMessage('Subscription ID required'), validation_1.handleValidationErrors, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const subscriptionId = req.params.subscriptionId;
    if (!userId) {
        throw new validation_1.AppError(401, 'Authentication required');
    }
    const subscription = await prisma_1.prisma.subscription.findFirst({
        where: {
            id: subscriptionId,
            userId
        },
        include: {
            plan: true
        }
    });
    if (!subscription) {
        throw new validation_1.AppError(404, 'Subscription not found');
    }
    res.json({
        success: true,
        subscription
    });
}));
// Cancel subscription
router.post('/cancel/:subscriptionId', auth_1.authenticate, (0, express_validator_1.param)('subscriptionId').isString().withMessage('Subscription ID required'), validation_1.handleValidationErrors, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const subscriptionId = req.params.subscriptionId;
    if (!userId) {
        throw new validation_1.AppError(401, 'Authentication required');
    }
    const subscription = await prisma_1.prisma.subscription.findFirst({
        where: {
            id: subscriptionId,
            userId
        }
    });
    if (!subscription) {
        throw new validation_1.AppError(404, 'Subscription not found');
    }
    try {
        // Cancel in Stripe
        const stripeSubscription = await stripe.subscriptions.update(subscription.stripeSubscriptionId, { cancel_at_period_end: true });
        // Update in database
        await prisma_1.prisma.subscription.update({
            where: { id: subscriptionId },
            data: {
                status: 'cancel_at_period_end',
                cancelAt: new Date(stripeSubscription.cancel_at * 1000)
            }
        });
        logger_1.logger.info('Subscription cancelled', { userId, subscriptionId });
        res.json({
            success: true,
            message: 'Subscription will be cancelled at the end of the current period',
            cancelAt: new Date(stripeSubscription.cancel_at * 1000)
        });
    }
    catch (error) {
        logger_1.logger.error('Subscription cancellation failed', { userId, subscriptionId, error });
        if (error instanceof stripe_1.default.errors.StripeError) {
            throw new validation_1.AppError(400, error.message);
        }
        throw new validation_1.AppError(500, 'Failed to cancel subscription');
    }
}));
// Trial status
router.get('/trial/status', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        throw new validation_1.AppError(401, 'Authentication required');
    }
    const user = await prisma_1.prisma.userProfile.findUnique({
        where: { id: userId },
        select: {
            createdAt: true,
            tier: true,
            type: true
        }
    });
    if (!user) {
        throw new validation_1.AppError(404, 'User not found');
    }
    // Calculate trial status (7 days for guest users)
    const trialDays = 7;
    const trialEndDate = new Date(user.createdAt);
    trialEndDate.setDate(trialEndDate.getDate() + trialDays);
    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const trialStatus = {
        isTrialUser: user.type === 'guest',
        trialActive: user.type === 'guest' && now < trialEndDate,
        trialEndDate,
        daysRemaining,
        currentTier: user.tier
    };
    res.json({
        success: true,
        trial: trialStatus
    });
}));
exports.default = router;
