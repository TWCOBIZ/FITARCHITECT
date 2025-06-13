"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const stripe_1 = __importDefault(require("stripe"));
const client_1 = require("@prisma/client");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const speakeasy = require('speakeasy');
const auth_1 = require("./auth");
const openaiService_1 = require("./services/openaiService");
const cloudinaryService_1 = require("./services/cloudinaryService");
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
// Initialize Stripe
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2022-11-15'
});
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
let telegramBot = null;
if (TELEGRAM_BOT_TOKEN) {
    telegramBot = new node_telegram_bot_api_1.default(TELEGRAM_BOT_TOKEN, { polling: false });
}
else {
    console.warn('TELEGRAM_BOT_TOKEN not set. Telegram notifications disabled.');
}
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Avatar upload endpoint using Cloudinary
app.post('/api/upload-avatar', auth_1.authenticate, cloudinaryService_1.upload.single('avatar'), async (req, res) => {
    var _a;
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Get current user to check for existing avatar
        const currentUser = await prisma.userProfile.findUnique({
            where: { id: userId },
            select: { avatar: true }
        });
        // Delete old avatar if exists
        if (currentUser === null || currentUser === void 0 ? void 0 : currentUser.avatar) {
            try {
                const publicId = (0, cloudinaryService_1.extractPublicId)(currentUser.avatar);
                if (publicId) {
                    await (0, cloudinaryService_1.deleteImage)(publicId);
                }
            }
            catch (error) {
                console.warn('Could not delete old avatar:', error);
            }
        }
        // Upload new avatar to Cloudinary
        const imageUrl = await (0, cloudinaryService_1.uploadImageBuffer)(req.file.buffer, req.file.originalname);
        // Update user profile with new avatar URL
        await prisma.userProfile.update({
            where: { id: userId },
            data: { avatar: imageUrl }
        });
        res.json({
            url: imageUrl,
            message: 'Avatar uploaded successfully'
        });
    }
    catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({ error: 'Failed to upload avatar' });
    }
});
// Remove hardcoded test user function - use proper admin flag instead
// Create a subscription
app.post('/api/create-subscription', async (req, res) => {
    try {
        const { paymentMethodId, planId, planName, userId } = req.body;
        // Create or get customer
        const customer = await stripe.customers.create({
            payment_method: paymentMethodId,
            invoice_settings: {
                default_payment_method: paymentMethodId,
            },
        });
        // Create subscription in Stripe
        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: planId }],
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            expand: ['latest_invoice.payment_intent'],
        });
        // Store subscription in DB
        if (userId && planName) {
            await prisma.subscription.create({
                data: {
                    userId,
                    planId,
                    plan: planName,
                    status: 'active',
                    startDate: new Date(),
                },
            });
        }
        res.json({
            subscriptionId: subscription.id,
            clientSecret: subscription.latest_invoice.payment_intent.client_secret,
        });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// Get subscription status
app.get('/api/subscription/:subscriptionId', async (req, res) => {
    try {
        const subscription = await stripe.subscriptions.retrieve(req.params.subscriptionId);
        res.json(subscription);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// Cancel subscription
app.post('/api/cancel-subscription/:subscriptionId', async (req, res) => {
    try {
        const subscription = await stripe.subscriptions.cancel(req.params.subscriptionId);
        res.json(subscription);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// Get available plans
app.get('/api/plans', async (req, res) => {
    try {
        const plans = await stripe.prices.list({
            active: true,
            expand: ['data.product'],
        });
        res.json(plans.data);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// Admin login route
app.post('/api/admin/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.userProfile.findUnique({ where: { email } });
        if (!user || !user.isAdmin) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Use bcrypt for password comparison
        const valid = await bcryptjs_1.default.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = (0, auth_1.generateToken)({ id: user.id, email: user.email, isAdmin: true });
        res.json({ token });
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
// Legacy authenticate, requireAdmin function - should be replaced with new auth middleware
// Get current admin info
app.get('/api/admin/me', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const user = req.user;
        if (!user || !user.isAdmin)
            return res.status(404).json({ error: 'Not found' });
        res.json({ id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin });
    }
    catch (_a) {
        res.status(500).json({ error: 'Server error' });
    }
});
// Enhanced GET /api/admin/users with filtering/sorting
app.get('/api/admin/users', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { search = '', status = 'all', role = 'all', sort = 'createdAt-desc' } = req.query;
        let where = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (status !== 'all') {
            where.active = status === 'active';
        }
        if (role !== 'all') {
            where.isAdmin = role === 'admin';
        }
        let orderBy = {};
        if (sort === 'name-asc')
            orderBy = { name: 'asc' };
        else if (sort === 'name-desc')
            orderBy = { name: 'desc' };
        else if (sort === 'createdAt-asc')
            orderBy = { createdAt: 'asc' };
        else
            orderBy = { createdAt: 'desc' };
        const users = await prisma.userProfile.findMany({ where, orderBy });
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});
// PATCH /api/admin/users/:id for profile updates
app.patch('/api/admin/users/:id', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email } = req.body;
        const user = await prisma.userProfile.update({ where: { id }, data: { name, email } });
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update user' });
    }
});
// POST /api/admin/users/:id/activate
app.post('/api/admin/users/:id/activate', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    // The 'active' field does not exist in the UserProfile model. Endpoint not implemented.
    return res.status(501).json({ error: 'Not implemented: UserProfile has no active field.' });
});
// POST /api/admin/users/:id/deactivate
app.post('/api/admin/users/:id/deactivate', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    // The 'active' field does not exist in the UserProfile model. Endpoint not implemented.
    return res.status(501).json({ error: 'Not implemented: UserProfile has no active field.' });
});
// POST /api/admin/users/:id/reset-password
app.post('/api/admin/users/:id/reset-password', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        const hashed = await bcryptjs_1.default.hash(newPassword, 10);
        const user = await prisma.userProfile.update({ where: { id }, data: { password: hashed } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to reset password' });
    }
});
// POST /api/admin/users/:id/role (promote/demote)
app.post('/api/admin/users/:id/role', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { isAdmin } = req.body;
        const user = await prisma.userProfile.update({ where: { id }, data: { isAdmin } });
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update user role' });
    }
});
// Get all subscriptions (mock)
app.get('/api/admin/subscriptions', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        // TODO: Replace with real subscription data
        res.json([]);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }
});
// Get analytics (mock)
app.get('/api/admin/analytics', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const totalUsers = await prisma.userProfile.count();
        const data = {
            totalUsers,
            activeUsers: 0, // TODO: Implement real active user logic
            newSignups: 0, // TODO: Implement real signup logic
            churnRate: 0, // TODO: Implement real churn logic
            subscriptionBreakdown: { free: totalUsers, basic: 0, premium: 0 },
        };
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});
// Get PAR-Q flagged users (parqCompleted === false)
app.get('/api/admin/parq', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const flagged = await prisma.userProfile.findMany({ where: { parqCompleted: false } });
        res.json(flagged);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch PAR-Q users' });
    }
});
// User registration endpoint
app.post('/api/register', async (req, res) => {
    const { email, password, name, height, weight, age, gender, fitnessGoals, activityLevel, dietaryPreferences } = req.body;
    if (!email || !password || !name || height == null || weight == null || age == null || !gender || !fitnessGoals || !activityLevel || !dietaryPreferences) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        const existing = await prisma.userProfile.findUnique({ where: { email } });
        if (existing) {
            return res.status(409).json({ error: 'Email already registered' });
        }
        const hashed = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma.userProfile.create({
            data: {
                email,
                password: hashed,
                name,
                height: parseFloat(height),
                weight: parseFloat(weight),
                age: parseInt(age),
                gender,
                fitnessGoals,
                activityLevel,
                dietaryPreferences,
                parqCompleted: false,
            },
        });
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    }
    catch (error) {
        res.status(500).json({ error: 'Registration failed' });
    }
});
// User login endpoint
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        const user = await prisma.userProfile.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const valid = await bcryptjs_1.default.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = (0, auth_1.generateToken)({ id: user.id, email: user.email, type: user.type });
        res.json({ token, user: {
                id: user.id,
                email: user.email,
                name: user.name,
                tier: user.tier,
                type: user.type,
                parqCompleted: user.parqCompleted,
                isAdmin: user.isAdmin
            } });
    }
    catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});
// Old auth middleware removed - using new unified auth from auth.ts
// User profile endpoint for auth validation
app.get('/api/profile', auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                height: user.height,
                weight: user.weight,
                age: user.age,
                gender: user.gender,
                fitnessGoals: user.fitnessGoals,
                activityLevel: user.activityLevel,
                dietaryPreferences: user.dietaryPreferences,
                emailNotifications: user.emailNotifications,
                telegramEnabled: user.telegramEnabled,
                tier: user.tier,
                type: user.type,
                parqCompleted: user.parqCompleted,
                isAdmin: user.isAdmin,
                subscriptionStatus: user.subscriptionStatus,
                notificationPreferences: user.notificationPreferences,
                healthConditions: user.healthConditions,
                injuryHistory: user.injuryHistory,
                equipmentAvailability: user.equipmentAvailability,
                preferredWorkoutDuration: user.preferredWorkoutDuration,
                avatar: user.avatar
            }
        });
    }
    catch (_a) {
        res.status(500).json({ error: 'Failed to fetch profile data' });
    }
});
// Update user profile endpoint
app.put('/api/profile', auth_1.authenticate, async (req, res) => {
    var _a, _b, _c;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId)
            return res.status(401).json({ error: 'Unauthorized' });
        const { name, height, weight, age, gender, fitnessGoals, activityLevel, dietaryPreferences, notifications, avatar } = req.body;
        // Update user profile
        const updatedUser = await prisma.userProfile.update({
            where: { id: userId },
            data: {
                name,
                height: Number(height),
                weight: Number(weight),
                age: Number(age),
                gender,
                fitnessGoals: Array.isArray(fitnessGoals) ? fitnessGoals : [],
                activityLevel,
                dietaryPreferences: Array.isArray(dietaryPreferences) ? dietaryPreferences : [],
                emailNotifications: (_b = notifications === null || notifications === void 0 ? void 0 : notifications.email) !== null && _b !== void 0 ? _b : true,
                telegramEnabled: (_c = notifications === null || notifications === void 0 ? void 0 : notifications.telegram) !== null && _c !== void 0 ? _c : false,
                avatar: avatar || null
            }
        });
        res.json({
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            height: updatedUser.height,
            weight: updatedUser.weight,
            age: updatedUser.age,
            gender: updatedUser.gender,
            fitnessGoals: updatedUser.fitnessGoals,
            activityLevel: updatedUser.activityLevel,
            dietaryPreferences: updatedUser.dietaryPreferences,
            emailNotifications: updatedUser.emailNotifications,
            telegramEnabled: updatedUser.telegramEnabled,
            tier: updatedUser.tier,
            type: updatedUser.type,
            parqCompleted: updatedUser.parqCompleted,
            avatar: updatedUser.avatar
        });
    }
    catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});
// User dashboard endpoint
app.get('/api/dashboard', auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        res.json({
            name: user.name,
            email: user.email,
            parqCompleted: user.parqCompleted,
        });
    }
    catch (_a) {
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});
// Log a completed workout
app.post('/api/workout-log', auth_1.authenticate, async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    const { planId, workoutId, exercises, notes } = req.body;
    try {
        const log = await prisma.workoutLog.create({
            data: { userId, planId, workoutId, exercises, notes }
        });
        res.json(log);
    }
    catch (error) {
        console.error('Failed to log workout:', error);
        res.status(500).json({ error: 'Failed to log workout' });
    }
});
// Get workout history for user
app.get('/api/workout-log', auth_1.authenticate, async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        const logs = await prisma.workoutLog.findMany({
            where: { userId },
            orderBy: { date: 'desc' }
        });
        res.json(logs);
    }
    catch (error) {
        console.error('Failed to fetch workout history:', error);
        res.status(500).json({ error: 'Failed to fetch workout history' });
    }
});
// NUTRITION LOG ENDPOINTS
// Get nutrition logs for user
app.get('/api/nutrition-log', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const logs = await prisma.nutritionLog.findMany({
            where: { userId },
            orderBy: { date: 'desc' }
        });
        res.json(logs);
    }
    catch (error) {
        console.error('Failed to fetch nutrition logs:', error);
        res.status(500).json({ error: 'Failed to fetch nutrition logs' });
    }
});
// Create a new nutrition log
app.post('/api/nutrition-log', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { date, foods, calories, notes } = req.body;
        if (!date || !foods || !Array.isArray(foods)) {
            return res.status(400).json({ error: 'Invalid input. Date and foods array required.' });
        }
        const log = await prisma.nutritionLog.create({
            data: {
                userId,
                date: new Date(date),
                foods,
                calories: calories || 0,
                notes: notes || ''
            }
        });
        res.status(201).json(log);
    }
    catch (error) {
        console.error('Failed to create nutrition log:', error);
        res.status(500).json({ error: 'Failed to create nutrition log' });
    }
});
// Update a nutrition log
app.put('/api/nutrition-log/:id', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { date, foods, calories, notes } = req.body;
        // Check if log exists and belongs to user
        const existingLog = await prisma.nutritionLog.findFirst({
            where: { id, userId }
        });
        if (!existingLog) {
            return res.status(404).json({ error: 'Nutrition log not found' });
        }
        const updatedLog = await prisma.nutritionLog.update({
            where: { id },
            data: {
                date: date ? new Date(date) : undefined,
                foods,
                calories,
                notes
            }
        });
        res.json(updatedLog);
    }
    catch (error) {
        console.error('Failed to update nutrition log:', error);
        res.status(500).json({ error: 'Failed to update nutrition log' });
    }
});
// Delete a nutrition log
app.delete('/api/nutrition-log/:id', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        // Check if log exists and belongs to user
        const existingLog = await prisma.nutritionLog.findFirst({
            where: { id, userId }
        });
        if (!existingLog) {
            return res.status(404).json({ error: 'Nutrition log not found' });
        }
        await prisma.nutritionLog.delete({ where: { id } });
        res.status(204).end();
    }
    catch (error) {
        console.error('Failed to delete nutrition log:', error);
        res.status(500).json({ error: 'Failed to delete nutrition log' });
    }
});
// NOTIFICATION PREFERENCES ENDPOINTS
// Get user notification preferences
app.get('/api/user/notification-preferences', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await prisma.userProfile.findUnique({
            where: { id: userId },
            select: { notificationPreferences: true }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user.notificationPreferences || {});
    }
    catch (error) {
        console.error('Failed to fetch notification preferences:', error);
        res.status(500).json({ error: 'Failed to fetch notification preferences' });
    }
});
// Update user notification preferences
app.put('/api/user/notification-preferences', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const preferences = req.body;
        const updatedUser = await prisma.userProfile.update({
            where: { id: userId },
            data: {
                notificationPreferences: preferences,
                telegramEnabled: preferences.telegramEnabled || false,
                telegramChatId: preferences.telegramChatId || null
            }
        });
        res.json(updatedUser.notificationPreferences);
    }
    catch (error) {
        console.error('Failed to update notification preferences:', error);
        res.status(500).json({ error: 'Failed to update notification preferences' });
    }
});
// Delete a nutrition log (commented out - replaced above)
// app.delete('/api/nutrition-log/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
//   const userId = req.user.userId;
//   const { id } = req.params;
//   try {
//     const log = await prisma.nutritionLog.findUnique({ where: { id } });
//     if (!log || log.userId !== userId) return res.status(404).json({ error: 'Log not found' });
//     await prisma.nutritionLog.delete({ where: { id } });
//     res.json({ success: true });
//   } catch {
//     res.status(500).json({ error: 'Failed to delete log' });
//   }
// });
// Edit a nutrition log
// app.put('/api/nutrition-log/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
//   const userId = req.user.userId;
//   const { id } = req.params;
//   const { foods, calories, macros, notes } = req.body;
//   try {
//     const log = await prisma.nutritionLog.findUnique({ where: { id } });
//     if (!log || log.userId !== userId) return res.status(404).json({ error: 'Log not found' });
//     const updated = await prisma.nutritionLog.update({
//       where: { id },
//       data: { foods, calories, macros, notes },
//     });
//     res.json(updated);
//   } catch {
//     res.status(500).json({ error: 'Failed to update log' });
//   }
// });
// Content management endpoints
// app.get('/api/admin/content', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
//   try {
//     const items = await prisma.contentItem.findMany();
//     res.json(items);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to fetch content' });
//   }
// });
// app.post('/api/admin/content', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
//   const { title, type, body } = req.body;
//   try {
//     const item = await prisma.contentItem.create({ data: { title, type, body } });
//     res.json(item);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to create content' });
//   }
// });
// app.put('/api/admin/content/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
//   const { id } = req.params;
//   const { title, type, body } = req.body;
//   try {
//     const item = await prisma.contentItem.update({ where: { id: Number(id) }, data: { title, type, body } });
//     res.json(item);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to update content' });
//   }
// });
// app.delete('/api/admin/content/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
//   const { id } = req.params;
//   try {
//     await prisma.contentItem.delete({ where: { id: Number(id) } });
//     res.json({ success: true });
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to delete content' });
//   }
// });
// Telegram notification endpoint
app.post('/api/telegram/notify', async (req, res) => {
    if (!telegramBot)
        return res.status(500).json({ error: 'Telegram bot not configured' });
    const { userId, message } = req.body;
    if (!userId || !message)
        return res.status(400).json({ error: 'Missing userId or message' });
    try {
        const user = await prisma.userProfile.findUnique({ where: { id: userId } });
        if (!user || !user.telegramChatId)
            return res.status(404).json({ error: 'User or Telegram chat ID not found' });
        await telegramBot.sendMessage(user.telegramChatId, message);
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to send Telegram message' });
    }
});
// Error reporting endpoint for Telegram (dev channel)
app.post('/api/telegram/error', async (req, res) => {
    if (!telegramBot)
        return res.status(500).json({ error: 'Telegram bot not configured' });
    const { message } = req.body;
    const chatId = process.env.NEXT_PUBLIC_TELEGRAM_DEV_CHANNEL_ID;
    if (!chatId || !message)
        return res.status(400).json({ error: 'Missing chatId or message' });
    try {
        await telegramBot.sendMessage(chatId, message);
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to send Telegram error message' });
    }
});
// Guest registration endpoint
app.post('/api/guest-register', async (req, res) => {
    try {
        const guestEmail = `guest-${Date.now()}@fitarchitect.com`;
        const randomPassword = await bcryptjs_1.default.hash(Math.random().toString(36).slice(-8), 10);
        const user = await prisma.userProfile.create({
            data: {
                email: guestEmail,
                name: 'Guest User',
                type: 'guest',
                height: 170,
                weight: 70,
                age: 30,
                gender: 'other',
                fitnessGoals: [],
                activityLevel: 'moderate',
                dietaryPreferences: [],
                password: randomPassword,
                parqCompleted: false,
            },
        });
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, type: 'guest' }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, email: user.email, name: user.name, type: user.type } });
    }
    catch (error) {
        res.status(500).json({ error: 'Guest registration failed' });
    }
});
// Upgrade guest to registered user endpoint
app.post('/api/upgrade-guest', auth_1.authenticate, async (req, res) => {
    var _a;
    const { email, password, name } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    if (!email || !password || !name) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        const existing = await prisma.userProfile.findUnique({ where: { email } });
        if (existing && existing.id !== userId) {
            return res.status(409).json({ error: 'Email already registered' });
        }
        const hashed = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma.userProfile.update({
            where: { id: userId },
            data: {
                email,
                password: hashed,
                name,
                type: 'registered',
            },
        });
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, type: 'registered' }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, email: user.email, name: user.name, type: user.type } });
    }
    catch (error) {
        res.status(500).json({ error: 'Upgrade failed' });
    }
});
// Enhanced GET /api/admin/subscriptions with filtering/sorting
app.get('/api/admin/subscriptions', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        // TODO: Add filtering/sorting logic
        const subs = await prisma.subscription.findMany({
            include: { user: true, planRef: true },
        });
        res.json(subs.map((sub) => {
            var _a, _b;
            return ({
                id: sub.id,
                userEmail: (_a = sub.user) === null || _a === void 0 ? void 0 : _a.email,
                plan: sub.plan, // string
                planName: (_b = sub.planRef) === null || _b === void 0 ? void 0 : _b.name, // Plan relation (optional)
                status: sub.status,
                startDate: sub.startDate,
                endDate: sub.endDate,
            });
        }));
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
// Get subscription details
app.get('/api/admin/subscriptions/:id', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    var _a, _b, _c;
    try {
        const sub = await prisma.subscription.findUnique({
            where: { id: req.params.id },
            include: { user: true, planRef: true, payments: true },
        });
        if (!sub)
            return res.status(404).json({ error: 'Not found' });
        res.json({
            id: sub.id,
            userEmail: (_a = sub.user) === null || _a === void 0 ? void 0 : _a.email,
            plan: sub.plan, // string
            planName: (_b = sub.planRef) === null || _b === void 0 ? void 0 : _b.name, // Plan relation (optional)
            status: sub.status,
            startDate: sub.startDate,
            endDate: sub.endDate,
            paymentHistory: ((_c = sub.payments) === null || _c === void 0 ? void 0 : _c.map((p) => ({
                id: p.id,
                amount: p.amount,
                date: p.date,
                status: p.status,
            }))) || [],
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
// Cancel subscription
app.post('/api/admin/subscriptions/:id/cancel', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        // Optionally cancel in Stripe as well
        const sub = await prisma.subscription.update({ where: { id }, data: { status: 'cancelled', endDate: new Date() } });
        res.json(sub);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to cancel subscription' });
    }
});
// Refund subscription (stub, real logic would depend on Stripe integration)
app.post('/api/admin/subscriptions/:id/refund', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        // TODO: Integrate with Stripe for real refunds
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to refund subscription' });
    }
});
// Change plan
app.post('/api/admin/subscriptions/:id/change-plan', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { planId, plan } = req.body;
        const sub = await prisma.subscription.update({ where: { id }, data: { planId, plan } });
        res.json(sub);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to change plan' });
    }
});
// Plans management
app.get('/api/admin/plans', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const plans = await prisma.plan.findMany();
        res.json(plans);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch plans' });
    }
});
app.post('/api/admin/plans', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { name, price } = req.body;
        const plan = await prisma.plan.create({ data: { name, price } });
        res.json(plan);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create plan' });
    }
});
app.patch('/api/admin/plans/:id', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price } = req.body;
        const plan = await prisma.plan.update({ where: { id }, data: { name, price } });
        res.json(plan);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update plan' });
    }
});
app.delete('/api/admin/plans/:id', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.plan.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete plan' });
    }
});
// Analytics endpoint
app.get('/api/admin/subscriptions/analytics', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const [revenue, active, cancelled, total] = await Promise.all([
            prisma.payment.aggregate({ _sum: { amount: true } }),
            prisma.subscription.count({ where: { status: 'active' } }),
            prisma.subscription.count({ where: { status: 'cancelled' } }),
            prisma.subscription.count(),
        ]);
        const churn = total ? (cancelled / total) * 100 : 0;
        res.json({ revenue: revenue._sum.amount || 0, active, cancelled, churn: Math.round(churn * 100) / 100 });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});
// GET all PAR-Q submissions (admin)
app.get('/api/admin/parq-responses', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const responses = await prisma.parqResponse.findMany({
            include: { user: true },
            orderBy: { createdAt: 'desc' },
        });
        res.json(responses);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch PAR-Q responses' });
    }
});
// GET a specific user's PAR-Q answers (admin)
app.get('/api/admin/parq-responses/:userId', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const response = await prisma.parqResponse.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
        res.json(response);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch PAR-Q response' });
    }
});
// Flag a response/question for follow-up (admin)
app.post('/api/admin/parq-responses/:userId/flag', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { flaggedQuestions } = req.body;
        const response = await prisma.parqResponse.updateMany({
            where: { userId },
            data: { flagged: true, flaggedQuestions },
        });
        // TODO: Trigger notification to admins
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to flag PAR-Q response' });
    }
});
// Add a follow-up note (admin)
app.post('/api/admin/parq-responses/:userId/note', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { note } = req.body;
        const response = await prisma.parqResponse.updateMany({
            where: { userId },
            data: { notes: { push: note } },
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to add note' });
    }
});
// Generate PAR-Q report (admin)
app.get('/api/admin/parq-report', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        // Example: count flagged, total, trends
        const total = await prisma.parqResponse.count();
        const flagged = await prisma.parqResponse.count({ where: { flagged: true } });
        // TODO: Add more analytics
        res.json({ total, flagged, flaggedRate: total ? (flagged / total) * 100 : 0 });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to generate report' });
    }
});
// User: update their PAR-Q answers
app.patch('/api/parq-response', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { answers } = req.body;
        const response = await prisma.parqResponse.create({ data: { userId, answers, flagged: false, flaggedQuestions: [], notes: [] } });
        // Update the user profile with the latest answers
        await prisma.userProfile.update({ where: { id: userId }, data: { parqAnswers: answers } });
        res.json(response);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update PAR-Q' });
    }
});
// User: get their PAR-Q answers
app.get('/api/parq-response', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const response = await prisma.parqResponse.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
        res.json(response);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch PAR-Q' });
    }
});
// --- System Management Endpoints ---
let systemSettings = { maintenance: false, notifEmail: '' };
let flaggedContent = [];
let errorLogs = [];
let notifications = [];
let auditLogs = [];
app.get('/api/admin/settings', auth_1.authenticate, auth_1.requireAdmin, (req, res) => {
    res.json(systemSettings);
});
app.patch('/api/admin/settings', auth_1.authenticate, auth_1.requireAdmin, (req, res) => {
    const { maintenance, notifEmail } = req.body;
    if (typeof maintenance === 'boolean')
        systemSettings.maintenance = maintenance;
    if (typeof notifEmail === 'string')
        systemSettings.notifEmail = notifEmail;
    auditLogs.push({ time: new Date().toISOString(), admin: req.admin.email, action: 'Updated settings' });
    res.json(systemSettings);
});
app.get('/api/admin/flagged-content', auth_1.authenticate, auth_1.requireAdmin, (req, res) => {
    res.json(flaggedContent);
});
app.post('/api/admin/content/:id/approve', auth_1.authenticate, auth_1.requireAdmin, (req, res) => {
    auditLogs.push({ time: new Date().toISOString(), admin: req.admin.email, action: `Approved content ${req.params.id}` });
    res.json({ success: true });
});
app.post('/api/admin/content/:id/reject', auth_1.authenticate, auth_1.requireAdmin, (req, res) => {
    auditLogs.push({ time: new Date().toISOString(), admin: req.admin.email, action: `Rejected content ${req.params.id}` });
    res.json({ success: true });
});
app.post('/api/admin/backup', auth_1.authenticate, auth_1.requireAdmin, (req, res) => {
    auditLogs.push({ time: new Date().toISOString(), admin: req.admin.email, action: 'Triggered backup' });
    res.json({ success: true });
});
app.post('/api/admin/restore', auth_1.authenticate, auth_1.requireAdmin, (req, res) => {
    auditLogs.push({ time: new Date().toISOString(), admin: req.admin.email, action: 'Triggered restore' });
    res.json({ success: true });
});
app.get('/api/admin/errors', auth_1.authenticate, auth_1.requireAdmin, (req, res) => {
    res.json(errorLogs);
});
app.get('/api/admin/notifications', auth_1.authenticate, auth_1.requireAdmin, (req, res) => {
    res.json(notifications);
});
app.post('/api/admin/notifications', auth_1.authenticate, auth_1.requireAdmin, (req, res) => {
    const { message } = req.body;
    notifications.push({ time: new Date().toISOString(), admin: req.admin.email, message });
    auditLogs.push({ time: new Date().toISOString(), admin: req.admin.email, action: 'Sent notification' });
    res.json({ success: true });
});
app.get('/api/admin/audit-logs', auth_1.authenticate, auth_1.requireAdmin, (req, res) => {
    res.json(auditLogs);
});
// --- 2FA for Admins ---
// POST /api/admin/2fa/setup, /verify, /disable
// --- User Impersonation ---
// POST /api/admin/impersonate
// --- Stripe Webhook Event Log ---
// GET /api/admin/stripe-webhooks, POST /api/admin/stripe-webhooks/retry
// --- Advanced Notifications ---
// POST /api/admin/notify-parq-flagged, POST /api/admin/followup-reminder
// --- Analytics Enhancements ---
// GET /api/admin/analytics?range=, GET /api/admin/analytics/pdf, POST /api/admin/analytics/schedule
// --- System Management Advanced ---
// Websocket/polling for error logs, POST /api/admin/restore/upload (file upload), GET /api/admin/audit-logs/export
// ... implement logic for each ...
// 2FA Setup
app.post('/api/admin/2fa/setup', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const secret = speakeasy.generateSecret({ name: `FitArchitect Admin 2FA` });
        res.json({ otpauth_url: secret.otpauth_url, base32: secret.base32 });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to generate 2FA secret' });
    }
});
// Generate a meal plan using AI
app.post('/api/generate-meal-plan', auth_1.authenticate, async (req, res) => {
    var _a;
    try {
        const { type, fitnessProfile, preferences } = req.body;
        if (!fitnessProfile) {
            return res.status(400).json({ error: 'Fitness profile is required for meal plan generation' });
        }
        // Generate the meal plan using OpenAI
        const generatedPlan = await openaiService_1.openaiService.generateMealPlan(fitnessProfile, preferences || {});
        // Save the generated plan to the database (optional - could be stored in MealPlan table)
        try {
            await prisma.mealPlan.create({
                data: {
                    userId: req.user.id,
                    dietType: ((_a = preferences === null || preferences === void 0 ? void 0 : preferences.dietaryRestrictions) === null || _a === void 0 ? void 0 : _a.join(', ')) || 'general',
                    meals: generatedPlan,
                    shoppingList: [], // TODO: Generate shopping list from meal plan
                },
            });
        }
        catch (dbError) {
            console.warn('Could not save meal plan to database:', dbError);
            // Continue even if DB save fails
        }
        res.status(200).json({ mealPlan: generatedPlan });
    }
    catch (error) {
        console.error('Failed to generate meal plan:', error);
        res.status(500).json({ error: 'Failed to generate meal plan' });
    }
});
// Generate a workout plan using AI
app.post('/api/workout-plans/generate', auth_1.requireWorkoutAccess, async (req, res) => {
    try {
        const { userProfile } = req.body;
        if (!userProfile) {
            return res.status(400).json({ error: 'User profile is required for workout generation' });
        }
        // Mock exercises for now - in a real implementation, you'd fetch from WGER API
        const mockExercises = [
            {
                id: '1',
                name: 'Squats',
                description: 'A fundamental lower body exercise',
                muscleGroups: ['legs'],
                equipment: ['bodyweight'],
                difficulty: 'beginner',
                instructions: ['Stand with feet shoulder-width apart', 'Lower hips back and down', 'Return to standing position']
            },
            {
                id: '2',
                name: 'Push-ups',
                description: 'Upper body pushing exercise',
                muscleGroups: ['chest', 'triceps'],
                equipment: ['bodyweight'],
                difficulty: 'beginner',
                instructions: ['Start in plank position', 'Lower body to ground', 'Push back up to starting position']
            },
            {
                id: '3',
                name: 'Dumbbell Rows',
                description: 'Back strengthening exercise',
                muscleGroups: ['back', 'biceps'],
                equipment: ['dumbbell'],
                difficulty: 'intermediate',
                instructions: ['Bend over with dumbbell in hand', 'Pull elbow back and up', 'Lower with control']
            }
        ];
        // Generate the workout plan using OpenAI
        const generatedPlan = await openaiService_1.openaiService.generateWorkoutPlan(userProfile, mockExercises);
        // Save the generated plan to the database
        const savedPlan = await prisma.workoutPlan.create({
            data: {
                userId: req.user.id,
                name: generatedPlan.name,
                description: generatedPlan.description,
                duration: generatedPlan.duration,
                workouts: generatedPlan.workouts,
                targetMuscleGroups: generatedPlan.targetMuscleGroups,
                difficulty: generatedPlan.difficulty,
                isDefault: false,
                completed: false,
            },
        });
        res.status(201).json(savedPlan);
    }
    catch (error) {
        console.error('Failed to generate workout plan:', error);
        res.status(500).json({ error: 'Failed to generate workout plan' });
    }
});
// CRUD for workout plans
app.get('/api/workout-plans', auth_1.requireWorkoutAccess, async (req, res) => {
    try {
        const plans = await prisma.workoutPlan.findMany({ where: { userId: req.user.id } });
        res.json(plans);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch workout plans' });
    }
});
app.get('/api/workout-plans/:id', auth_1.authenticate, async (req, res) => {
    try {
        const plan = await prisma.workoutPlan.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!plan)
            return res.status(404).json({ error: 'Plan not found' });
        res.json(plan);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch workout plan' });
    }
});
app.post('/api/workout-plans', auth_1.authenticate, async (req, res) => {
    try {
        const { name, description, duration, workouts, targetMuscleGroups, difficulty, isDefault, completed } = req.body;
        const plan = await prisma.workoutPlan.create({
            data: {
                userId: req.user.id,
                name,
                description,
                duration,
                workouts,
                targetMuscleGroups,
                difficulty,
                isDefault: !!isDefault,
                completed: !!completed,
            },
        });
        res.status(201).json(plan);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create workout plan' });
    }
});
app.patch('/api/workout-plans/:id', auth_1.authenticate, async (req, res) => {
    try {
        const plan = await prisma.workoutPlan.update({
            where: { id: req.params.id, userId: req.user.id },
            data: req.body,
        });
        res.json(plan);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update workout plan' });
    }
});
app.delete('/api/workout-plans/:id', auth_1.authenticate, async (req, res) => {
    try {
        await prisma.workoutPlan.delete({ where: { id: req.params.id, userId: req.user.id } });
        res.status(204).end();
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete workout plan' });
    }
});
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
exports.default = app;
