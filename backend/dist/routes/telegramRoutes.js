"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../auth");
const prisma_1 = require("../db/prisma");
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
// Initialize Telegram bot if token is available
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const telegramBot = TELEGRAM_BOT_TOKEN ? new node_telegram_bot_api_1.default(TELEGRAM_BOT_TOKEN, { polling: false }) : null;
// Validate Telegram service is configured
const requireTelegramService = (req, res, next) => {
    var _a;
    if (!telegramBot) {
        logger_1.logger.error('Telegram service not configured', {
            operation: 'telegram_service_check',
            component: 'telegram',
            userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id
        });
        return res.status(503).json({
            error: 'Telegram service not configured',
            code: 'TELEGRAM_NOT_CONFIGURED'
        });
    }
    next();
};
/**
 * Connect user's Telegram account
 * Requires premium subscription
 */
router.post('/connect', auth_1.authenticate, (0, auth_1.requireSubscription)('premium'), requireTelegramService, async (req, res) => {
    try {
        const { chatId } = req.body;
        const userId = req.user.id;
        if (!chatId) {
            return res.status(400).json({
                error: 'Chat ID is required',
                code: 'MISSING_CHAT_ID'
            });
        }
        logger_1.logger.info('Connecting Telegram account', {
            operation: 'telegram_connect',
            component: 'telegram',
            userId,
            metadata: { chatId }
        });
        // Update user profile with Telegram chat ID
        const updatedUser = await prisma_1.prisma.userProfile.update({
            where: { id: userId },
            data: {
                telegramChatId: chatId,
                telegramEnabled: true
            }
        });
        // Send welcome message
        try {
            await telegramBot.sendMessage(chatId, '🎉 Welcome to FitArchitect!\n\n' +
                'Your Telegram account has been successfully connected. ' +
                'You\'ll now receive:\n' +
                '• Daily workout reminders\n' +
                '• Meal plan notifications\n' +
                '• Progress updates\n' +
                '• Achievement celebrations\n\n' +
                'Type /help to see available commands.');
        }
        catch (error) {
            logger_1.logger.warn('Failed to send welcome message', {
                operation: 'telegram_welcome_message',
                component: 'telegram',
                userId,
                metadata: { chatId }
            }, error);
        }
        logger_1.logger.info('Telegram account connected successfully', {
            operation: 'telegram_connect_success',
            component: 'telegram',
            userId
        });
        res.json({
            success: true,
            message: 'Telegram account connected successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to connect Telegram account', {
            operation: 'telegram_connect_error',
            component: 'telegram',
            userId: req.user.id
        }, error);
        res.status(500).json({
            error: 'Failed to connect Telegram account',
            code: 'TELEGRAM_CONNECT_ERROR'
        });
    }
});
/**
 * Disconnect user's Telegram account
 */
router.post('/disconnect', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        logger_1.logger.info('Disconnecting Telegram account', {
            operation: 'telegram_disconnect',
            component: 'telegram',
            userId
        });
        // Get current user data
        const user = await prisma_1.prisma.userProfile.findUnique({
            where: { id: userId }
        });
        // Send goodbye message if chat ID exists
        if ((user === null || user === void 0 ? void 0 : user.telegramChatId) && telegramBot) {
            try {
                await telegramBot.sendMessage(user.telegramChatId, '👋 Your Telegram account has been disconnected from FitArchitect.\n\n' +
                    'You can reconnect anytime from your account settings.');
            }
            catch (error) {
                // Ignore send errors during disconnect
            }
        }
        // Update user profile
        await prisma_1.prisma.userProfile.update({
            where: { id: userId },
            data: {
                telegramChatId: null,
                telegramEnabled: false
            }
        });
        logger_1.logger.info('Telegram account disconnected successfully', {
            operation: 'telegram_disconnect_success',
            component: 'telegram',
            userId
        });
        res.json({
            success: true,
            message: 'Telegram account disconnected successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to disconnect Telegram account', {
            operation: 'telegram_disconnect_error',
            component: 'telegram',
            userId: req.user.id
        }, error);
        res.status(500).json({
            error: 'Failed to disconnect Telegram account',
            code: 'TELEGRAM_DISCONNECT_ERROR'
        });
    }
});
/**
 * Get Telegram connection status
 */
router.get('/status', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await prisma_1.prisma.userProfile.findUnique({
            where: { id: userId },
            select: {
                telegramChatId: true,
                telegramEnabled: true,
                subscriptionTier: true
            }
        });
        const hasPremium = (user === null || user === void 0 ? void 0 : user.subscriptionTier) === 'premium';
        const isConnected = !!((user === null || user === void 0 ? void 0 : user.telegramChatId) && (user === null || user === void 0 ? void 0 : user.telegramEnabled));
        res.json({
            connected: isConnected,
            chatId: isConnected ? user.telegramChatId : undefined,
            enabled: (user === null || user === void 0 ? void 0 : user.telegramEnabled) || false,
            hasPremium,
            serviceAvailable: !!telegramBot
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get Telegram status', {
            operation: 'telegram_status_error',
            component: 'telegram',
            userId: req.user.id
        }, error);
        res.status(500).json({
            error: 'Failed to get Telegram status',
            code: 'TELEGRAM_STATUS_ERROR'
        });
    }
});
/**
 * Send notification to authenticated user
 * Requires premium subscription
 */
router.post('/notify', auth_1.authenticate, (0, auth_1.requireSubscription)('premium'), requireTelegramService, async (req, res) => {
    try {
        const { message } = req.body;
        const userId = req.user.id;
        if (!message) {
            return res.status(400).json({
                error: 'Message is required',
                code: 'MISSING_MESSAGE'
            });
        }
        const user = await prisma_1.prisma.userProfile.findUnique({
            where: { id: userId }
        });
        if (!(user === null || user === void 0 ? void 0 : user.telegramChatId)) {
            return res.status(400).json({
                error: 'Telegram not connected',
                code: 'TELEGRAM_NOT_CONNECTED'
            });
        }
        if (!user.telegramEnabled) {
            return res.status(400).json({
                error: 'Telegram notifications disabled',
                code: 'TELEGRAM_DISABLED'
            });
        }
        logger_1.logger.info('Sending Telegram notification', {
            operation: 'telegram_notify',
            component: 'telegram',
            userId,
            metadata: { messageLength: message.length }
        });
        await telegramBot.sendMessage(user.telegramChatId, message);
        logger_1.logger.info('Telegram notification sent successfully', {
            operation: 'telegram_notify_success',
            component: 'telegram',
            userId
        });
        res.json({
            success: true,
            message: 'Notification sent successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to send Telegram notification', {
            operation: 'telegram_notify_error',
            component: 'telegram',
            userId: req.user.id
        }, error);
        res.status(500).json({
            error: 'Failed to send notification',
            code: 'TELEGRAM_SEND_ERROR'
        });
    }
});
/**
 * Send reminder notification
 * Requires premium subscription
 */
router.post('/reminder', auth_1.authenticate, (0, auth_1.requireSubscription)('premium'), requireTelegramService, async (req, res) => {
    try {
        const { type } = req.body;
        const userId = req.user.id;
        if (!['workout', 'meal', 'water'].includes(type)) {
            return res.status(400).json({
                error: 'Invalid reminder type',
                code: 'INVALID_REMINDER_TYPE'
            });
        }
        const user = await prisma_1.prisma.userProfile.findUnique({
            where: { id: userId }
        });
        if (!(user === null || user === void 0 ? void 0 : user.telegramChatId) || !user.telegramEnabled) {
            return res.status(400).json({
                error: 'Telegram not properly configured',
                code: 'TELEGRAM_NOT_CONFIGURED'
            });
        }
        const messages = {
            workout: '💪 Time for your workout! Remember to warm up properly and stay hydrated.',
            meal: '🍽️ Meal time! Check your meal plan and enjoy nutritious food.',
            water: '💧 Stay hydrated! Time to drink some water.'
        };
        logger_1.logger.info('Sending reminder notification', {
            operation: 'telegram_reminder',
            component: 'telegram',
            userId,
            metadata: { type }
        });
        await telegramBot.sendMessage(user.telegramChatId, messages[type]);
        res.json({
            success: true,
            message: 'Reminder sent successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to send reminder', {
            operation: 'telegram_reminder_error',
            component: 'telegram',
            userId: req.user.id
        }, error);
        res.status(500).json({
            error: 'Failed to send reminder',
            code: 'TELEGRAM_REMINDER_ERROR'
        });
    }
});
/**
 * Report error to development channel (internal use only)
 */
router.post('/error', auth_1.authenticate, async (req, res) => {
    try {
        const { type, message, metadata } = req.body;
        const devChannelId = process.env.TELEGRAM_DEV_CHANNEL_ID;
        if (!devChannelId || !telegramBot) {
            return res.status(503).json({
                error: 'Error reporting not configured',
                code: 'ERROR_REPORTING_DISABLED'
            });
        }
        const errorMessage = `🚨 Error Report\n\n` +
            `Type: ${type}\n` +
            `Message: ${message}\n` +
            `User: ${req.user.id}\n` +
            `Time: ${new Date().toISOString()}\n` +
            `${metadata ? `\nMetadata:\n${JSON.stringify(metadata, null, 2)}` : ''}`;
        await telegramBot.sendMessage(devChannelId, errorMessage);
        res.json({ success: true });
    }
    catch (error) {
        // Don't log errors about error reporting to avoid loops
        res.status(500).json({
            error: 'Failed to report error',
            code: 'ERROR_REPORTING_FAILED'
        });
    }
});
exports.default = router;
