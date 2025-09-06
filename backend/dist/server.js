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
const path_1 = __importDefault(require("path"));
dotenv.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const multer_1 = __importStar(require("multer"));
// Database
const prisma_1 = require("./db/prisma");
// Middleware
const errorHandler_1 = require("./middleware/errorHandler");
const loggingMiddleware_1 = require("./middleware/loggingMiddleware");
// Routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const workout_routes_1 = __importDefault(require("./routes/workout.routes"));
const workout_log_routes_1 = __importDefault(require("./routes/workout-log.routes"));
const nutrition_routes_1 = __importDefault(require("./routes/nutrition.routes"));
const profile_routes_1 = __importDefault(require("./routes/profile.routes"));
const subscription_routes_1 = __importDefault(require("./routes/subscription.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
// Auth middleware
const auth_1 = require("./auth");
// Utils
const logger_1 = require("./utils/logger");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Configure multer for GIF uploads
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        const fs = require('fs');
        const path = require('path');
        // Get category from form data, default to 'general'
        const category = req.body.category || 'general';
        const uploadPath = path.join(__dirname, '../../public/exercise-gifs', category);
        // Ensure directory exists
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Keep original filename but sanitize it
        const sanitizedName = file.originalname
            .toLowerCase()
            .replace(/[^a-z0-9.-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        cb(null, sanitizedName);
    }
});
const uploadGifs = (0, multer_1.default)({
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Only allow GIF files
        if (file.mimetype === 'image/gif') {
            cb(null, true);
        }
        else {
            cb(new Error('Only GIF files are allowed'));
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 20 // Max 20 files at once
    }
});
// Basic environment validation
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);
if (missingEnvVars.length > 0) {
    logger_1.logger.error('Missing required environment variables:', missingEnvVars);
    console.error('Please check your .env file and ensure these variables are set:', missingEnvVars.join(', '));
    process.exit(1);
}
// Security middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false, // Disable for development
    crossOriginEmbedderPolicy: false
}));
// CORS configuration
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'production'
        ? [process.env.FRONTEND_URL || 'https://fitarchitect.vercel.app']
        : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id']
}));
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Global rate limiting
const globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: { error: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use(globalLimiter);
// Request tracking middleware
app.use(loggingMiddleware_1.requestIdMiddleware);
app.use(loggingMiddleware_1.requestLoggingMiddleware);
app.use(loggingMiddleware_1.responseLoggingMiddleware);
app.use(loggingMiddleware_1.performanceMonitoringMiddleware);
app.use(loggingMiddleware_1.rateLimitMonitoringMiddleware);
app.use(loggingMiddleware_1.userActivityMiddleware);
app.use(loggingMiddleware_1.apiAnalyticsMiddleware);
app.use(loggingMiddleware_1.securityMonitoringMiddleware);
// Health check endpoints
app.get('/health', loggingMiddleware_1.healthCheckMiddleware, async (req, res) => {
    try {
        // Test database connection
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
            uptime: Math.floor(process.uptime()),
            services: {
                database: 'connected',
                redis: 'not_configured' // Future: add Redis health check
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Database connection failed'
        });
    }
});
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'fitarchitect-backend',
        version: '2.0.0'
    });
});
// Simple static endpoints
app.get('/api/gif-files', (_req, res) => {
    try {
        // Static list of available GIF files (served from frontend)
        const gifFiles = [
            // Core exercises
            'exercise-gifs/core/alternate-heel-touchers.gif',
            'exercise-gifs/core/34-sit-up.gif',
            'exercise-gifs/core/45-side-bend.gif',
            'exercise-gifs/core/air-bike.gif',
            'exercise-gifs/core/assisted-hanging-knee-raise.gif',
            'exercise-gifs/core/assisted-lying-leg-raise-with-throw-down.gif',
            'exercise-gifs/core/barbell-rollerout.gif',
            'exercise-gifs/core/cable-kneeling-crunch.gif',
            'exercise-gifs/core/front-plank-with-twist.gif',
            // Arms exercises  
            'exercise-gifs/arms/barbell-curl.gif',
            'exercise-gifs/arms/barbell-close-grip-bench-press.gif',
            'exercise-gifs/arms/assisted-triceps-dip-kneeling.gif',
            'exercise-gifs/arms/weighted-tricep-dips.gif',
            'exercise-gifs/arms/lever-bicep-curl.gif',
            // Back exercises
            'exercise-gifs/back/barbell-bent-over-row.gif',
            'exercise-gifs/back/pull-up-neutral-grip.gif',
            'exercise-gifs/back/reverse-grip-machine-lat-pulldown.gif',
            'exercise-gifs/back/assisted-pull-up.gif',
            // Chest exercises
            'exercise-gifs/chest/barbell-bench-press.gif',
            'exercise-gifs/chest/incline-push-up-depth-jump.gif',
            'exercise-gifs/chest/assisted-chest-dip-kneeling.gif',
            'exercise-gifs/chest/cable-one-arm-decline-chest-fly.gif',
            // Legs exercises
            'exercise-gifs/legs/barbell-deadlift.gif',
            'exercise-gifs/legs/barbell-lunge.gif',
            'exercise-gifs/legs/barbell-bench-front-squat.gif',
            'exercise-gifs/legs/sled-45-leg-press.gif',
            'exercise-gifs/legs/barbell-seated-calf-raise.gif',
            // Shoulders exercises
            'exercise-gifs/shoulders/barbell-seated-overhead-press.gif',
            'exercise-gifs/shoulders/cable-alternate-shoulder-press.gif',
            // Cardio exercises
            'exercise-gifs/cardio/jack-burpee.gif',
            'exercise-gifs/cardio/mountain-climber.gif',
            'exercise-gifs/cardio/walking-high-knees-lunge.gif'
        ];
        // Convert to proper format matching the expected response
        const allGifs = gifFiles.map(filePath => {
            const pathParts = filePath.split('/');
            const category = pathParts[1]; // arms, back, chest, etc.
            const fileName = pathParts[2];
            return {
                filename: fileName,
                path: `/${filePath}`, // Relative path for frontend serving
                category: category,
                size: 1024 * 50, // Approximate size
                lastModified: new Date('2024-01-01').toISOString() // Placeholder date
            };
        });
        logger_1.logger.info(`Serving ${allGifs.length} GIF files`);
        res.json(allGifs);
    }
    catch (error) {
        logger_1.logger.error('Error serving GIF files:', error);
        res.status(500).json({ error: 'Failed to serve GIF files' });
    }
});
// API Routes
app.use('/api', auth_routes_1.default);
app.use('/api/workout-plans', workout_routes_1.default);
app.use('/api/workout-log', workout_log_routes_1.default);
app.use('/api/nutrition-log', nutrition_routes_1.default);
app.use('/api', profile_routes_1.default); // /profile, /dashboard, /parq-response
app.use('/api', subscription_routes_1.default); // /plans, /subscription
app.use('/api/admin', admin_routes_1.default);
// Upload GIFs endpoint for admin
app.post('/api/admin/exercise-media/upload', auth_1.authenticate, auth_1.requireAdmin, uploadGifs.array('gifs', 20), async (req, res) => {
    var _a;
    try {
        const files = req.files;
        const category = req.body.category || 'general';
        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }
        let uploadedCount = 0;
        const uploadedFiles = [];
        const errors = [];
        files.forEach((file) => {
            try {
                // Create the public-accessible path
                const publicPath = `/exercise-gifs/${category}/${file.filename}`;
                uploadedFiles.push({
                    name: file.originalname,
                    path: publicPath,
                    size: file.size,
                    category: category
                });
                uploadedCount++;
            }
            catch (error) {
                errors.push(`Failed to process ${file.originalname}: ${error}`);
            }
        });
        // Log the upload for admin tracking
        logger_1.logger.info(`Admin ${(_a = req.user) === null || _a === void 0 ? void 0 : _a.email} uploaded ${uploadedCount} GIFs to category: ${category}`);
        res.json({
            uploaded: uploadedCount,
            files: uploadedFiles,
            errors: errors.length > 0 ? errors : undefined,
            message: `Successfully uploaded ${uploadedCount} GIF${uploadedCount === 1 ? '' : 's'} to ${category} category`
        });
    }
    catch (error) {
        logger_1.logger.error('GIF upload error:', error);
        // Handle multer errors
        if (error instanceof multer_1.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File too large (max 10MB per file)' });
            }
            else if (error.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({ error: 'Too many files (max 20 files at once)' });
            }
            else {
                return res.status(400).json({ error: `Upload error: ${error.message}` });
            }
        }
        // Handle file filter errors
        if (error instanceof Error && error.message === 'Only GIF files are allowed') {
            return res.status(400).json({ error: 'Only GIF files are allowed' });
        }
        res.status(500).json({ error: 'Failed to upload GIFs' });
    }
});
// Get exercise-GIF mappings for admin media management
app.get('/api/admin/exercise-media/mappings', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        // Read the current exercise-GIF mappings from the generated file
        const fs = require('fs');
        const path = require('path');
        const mappingFilePath = path.join(__dirname, '../../src/data/localExerciseGifs.ts');
        const mappingContent = fs.readFileSync(mappingFilePath, 'utf8');
        // Parse the mappings
        const mappingMatch = mappingContent.match(/export const localExerciseGifs: Record<string, string> = \{([\s\S]*?)\}/m);
        if (!mappingMatch) {
            return res.status(500).json({ error: 'Could not parse exercise mappings' });
        }
        const mappingText = mappingMatch[1];
        const mappings = [];
        mappingText.split('\n').forEach((line) => {
            const match = line.match(/^\s*"([^"]+)":\s*"([^"]+)",?/);
            if (match) {
                const [, exerciseName, gifPath] = match;
                const category = gifPath.split('/')[2] || 'unknown'; // Extract category from path
                mappings.push({
                    exerciseName,
                    gifPath,
                    category,
                    size: 0, // Would need file system access to get actual size
                    lastModified: new Date().toISOString()
                });
            }
        });
        res.json(mappings);
    }
    catch (error) {
        logger_1.logger.error('Error fetching exercise mappings:', error);
        res.status(500).json({ error: 'Failed to fetch exercise mappings' });
    }
});
// Get available GIFs from the public directory
app.get('/api/admin/exercise-media/available-gifs', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const gifDirectory = path.join(__dirname, '../../public/exercise-gifs');
        const availableGifs = [];
        // Function to recursively scan directories
        const scanDirectory = (dir, category = '') => {
            const items = fs.readdirSync(dir);
            items.forEach((item) => {
                const itemPath = path.join(dir, item);
                const stats = fs.statSync(itemPath);
                if (stats.isDirectory()) {
                    scanDirectory(itemPath, item);
                }
                else if (item.toLowerCase().endsWith('.gif')) {
                    const relativePath = `/exercise-gifs/${category ? category + '/' : ''}${item}`;
                    availableGifs.push({
                        path: relativePath,
                        name: item.replace('.gif', ''),
                        category: category || 'uncategorized',
                        size: stats.size,
                        lastModified: stats.mtime.toISOString()
                    });
                }
            });
        };
        scanDirectory(gifDirectory);
        res.json(availableGifs);
    }
    catch (error) {
        logger_1.logger.error('Error scanning GIF directory:', error);
        res.status(500).json({ error: 'Failed to scan GIF directory' });
    }
});
// Update exercise-GIF mapping
app.patch('/api/admin/exercise-media/mappings/:exerciseName', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { exerciseName } = req.params;
        const { gifPath } = req.body;
        if (!exerciseName || !gifPath) {
            return res.status(400).json({ error: 'Exercise name and GIF path are required' });
        }
        // Here you would update the mapping file or database
        // For now, we'll just return success (implementation would depend on your storage method)
        res.json({ message: 'Exercise GIF mapping updated successfully' });
    }
    catch (error) {
        logger_1.logger.error('Error updating exercise mapping:', error);
        res.status(500).json({ error: 'Failed to update exercise mapping' });
    }
});
// Remove exercise-GIF mapping
app.delete('/api/admin/exercise-media/mappings/:exerciseName', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { exerciseName } = req.params;
        // Here you would remove the mapping from file or database
        // For now, we'll just return success
        res.json({ message: 'Exercise GIF mapping removed successfully' });
    }
    catch (error) {
        logger_1.logger.error('Error removing exercise mapping:', error);
        res.status(500).json({ error: 'Failed to remove exercise mapping' });
    }
});
// Bulk assign GIFs to exercises
app.post('/api/admin/exercise-media/bulk-assign', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    var _a;
    try {
        const { assignments } = req.body; // Array of { exerciseName, gifPath } objects
        if (!assignments || !Array.isArray(assignments)) {
            return res.status(400).json({ error: 'Assignments array is required' });
        }
        let assignedCount = 0;
        const errors = [];
        // Process each assignment
        for (const assignment of assignments) {
            try {
                const { exerciseName, gifPath } = assignment;
                if (!exerciseName || !gifPath) {
                    errors.push(`Invalid assignment: missing exerciseName or gifPath`);
                    continue;
                }
                // Try to find and update the exercise in database
                const exercise = await prisma_1.prisma.exercise.findFirst({
                    where: {
                        name: {
                            contains: exerciseName,
                            mode: 'insensitive'
                        }
                    }
                });
                if (exercise) {
                    await prisma_1.prisma.exercise.update({
                        where: { id: exercise.id },
                        data: {
                            imageUrl: gifPath,
                            videoUrl: gifPath // For GIFs, we can use the same path
                        }
                    });
                    assignedCount++;
                }
                else {
                    errors.push(`Exercise not found: ${exerciseName}`);
                }
            }
            catch (error) {
                errors.push(`Failed to assign ${assignment.exerciseName}: ${error.message}`);
            }
        }
        // Log the bulk assignment operation
        logger_1.logger.info(`Bulk media assignment completed`, {
            metadata: {
                user: (_a = req.user) === null || _a === void 0 ? void 0 : _a.email,
                totalAssignments: assignments.length,
                successful: assignedCount,
                errors: errors.length
            }
        });
        res.json({
            message: 'Bulk assignment completed',
            assigned: assignedCount,
            total: assignments.length,
            errors: errors.length > 0 ? errors : undefined
        });
    }
    catch (error) {
        logger_1.logger.error('Error in bulk assignment:', error);
        res.status(500).json({ error: 'Failed to perform bulk assignment' });
    }
});
// Update exercise approval status
app.patch('/api/admin/exercise-media/approval/:exerciseId', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    var _a, _b, _c;
    try {
        const { exerciseId } = req.params;
        const { approvalStatus, flaggedReason, hideGif } = req.body;
        if (!exerciseId) {
            return res.status(400).json({ error: 'Exercise ID is required' });
        }
        if (!approvalStatus || !['pending', 'approved', 'flagged', 'hidden'].includes(approvalStatus)) {
            return res.status(400).json({ error: 'Valid approval status is required (pending, approved, flagged, hidden)' });
        }
        const updateData = {
            approvalStatus,
            lastReviewedAt: new Date(),
            reviewedBy: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id
        };
        if (approvalStatus === 'flagged' && flaggedReason) {
            updateData.flaggedReason = flaggedReason;
        }
        if (hideGif !== undefined) {
            updateData.hideGif = hideGif;
        }
        // First, check if the exercise exists
        const existingExercise = await prisma_1.prisma.exercise.findUnique({
            where: { id: exerciseId }
        });
        if (!existingExercise) {
            // If it doesn't exist, create a new Exercise record
            const { exerciseName, gifPath, category } = req.body;
            if (!exerciseName) {
                return res.status(400).json({ error: 'Exercise name is required for new exercise' });
            }
            const newExercise = await prisma_1.prisma.exercise.create({
                data: {
                    id: exerciseId,
                    name: exerciseName,
                    description: `Exercise with GIF: ${gifPath}`,
                    category: category || 'strength',
                    muscleGroups: [],
                    equipment: [],
                    difficulty: 'intermediate',
                    instructions: [],
                    gifPath: gifPath,
                    ...updateData,
                    isCustom: false,
                    createdBy: (_b = req.user) === null || _b === void 0 ? void 0 : _b.id
                }
            });
            res.json({
                message: 'Exercise created and approval status updated',
                exercise: newExercise
            });
        }
        else {
            // Update existing exercise
            const updatedExercise = await prisma_1.prisma.exercise.update({
                where: { id: exerciseId },
                data: updateData
            });
            res.json({
                message: 'Exercise approval status updated successfully',
                exercise: updatedExercise
            });
        }
        // Log the approval action
        logger_1.logger.info(`Exercise approval updated:`, {
            metadata: {
                user: (_c = req.user) === null || _c === void 0 ? void 0 : _c.email,
                exerciseId,
                exerciseName: (existingExercise === null || existingExercise === void 0 ? void 0 : existingExercise.name) || req.body.exerciseName,
                approvalStatus,
                flaggedReason,
                hideGif,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error updating exercise approval:', error);
        res.status(500).json({ error: 'Failed to update exercise approval status' });
    }
});
// Bulk approve exercises
app.post('/api/admin/exercise-media/bulk-approve', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    var _a, _b;
    try {
        const { exerciseIds, approvalStatus = 'approved' } = req.body;
        if (!exerciseIds || !Array.isArray(exerciseIds) || exerciseIds.length === 0) {
            return res.status(400).json({ error: 'Exercise IDs array is required' });
        }
        const updateData = {
            approvalStatus,
            lastReviewedAt: new Date(),
            reviewedBy: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
            ...(approvalStatus === 'approved' && { flaggedReason: null })
        };
        // Update all exercises in batch
        const result = await prisma_1.prisma.exercise.updateMany({
            where: {
                id: {
                    in: exerciseIds
                }
            },
            data: updateData
        });
        // Log the bulk approval action
        logger_1.logger.info(`Bulk exercise approval:`, {
            metadata: {
                user: (_b = req.user) === null || _b === void 0 ? void 0 : _b.email,
                exerciseCount: exerciseIds.length,
                updatedCount: result.count,
                approvalStatus,
                timestamp: new Date().toISOString()
            }
        });
        res.json({
            message: `Bulk approval completed`,
            updated: result.count,
            requested: exerciseIds.length
        });
    }
    catch (error) {
        logger_1.logger.error('Error in bulk approval:', error);
        res.status(500).json({ error: 'Failed to perform bulk approval' });
    }
});
// Update exercise details (name, description)
app.patch('/api/admin/exercise-media/details/:exerciseId', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { exerciseId } = req.params;
        const { name, description, category } = req.body;
        if (!exerciseId) {
            return res.status(400).json({ error: 'Exercise ID is required' });
        }
        const updateData = {};
        if (name)
            updateData.name = name;
        if (description)
            updateData.description = description;
        if (category)
            updateData.category = category;
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'At least one field to update is required' });
        }
        const updatedExercise = await prisma_1.prisma.exercise.update({
            where: { id: exerciseId },
            data: {
                ...updateData,
                updatedAt: new Date()
            }
        });
        res.json({
            message: 'Exercise details updated successfully',
            exercise: updatedExercise
        });
    }
    catch (error) {
        logger_1.logger.error('Error updating exercise details:', error);
        if (error instanceof Error && error.message.includes('Record to update not found')) {
            res.status(404).json({ error: 'Exercise not found' });
        }
        else {
            res.status(500).json({ error: 'Failed to update exercise details' });
        }
    }
});
// Get exercises with approval status for admin panel
app.get('/api/admin/exercise-media/exercises-with-approval', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { status, search, category, limit = '50', offset = '0' } = req.query;
        const whereClause = {};
        // Filter by approval status
        if (status && typeof status === 'string') {
            whereClause.approvalStatus = status;
        }
        // Filter by search term
        if (search && typeof search === 'string') {
            whereClause.name = {
                contains: search,
                mode: 'insensitive'
            };
        }
        // Filter by category
        if (category && typeof category === 'string' && category !== 'all') {
            whereClause.category = category;
        }
        const exercises = await prisma_1.prisma.exercise.findMany({
            where: whereClause,
            select: {
                id: true,
                name: true,
                description: true,
                category: true,
                gifPath: true,
                approvalStatus: true,
                lastReviewedAt: true,
                reviewedBy: true,
                flaggedReason: true,
                hideGif: true,
                createdAt: true,
                updatedAt: true
            },
            orderBy: { updatedAt: 'desc' },
            take: parseInt(limit),
            skip: parseInt(offset)
        });
        // Get total count for pagination
        const totalCount = await prisma_1.prisma.exercise.count({
            where: whereClause
        });
        res.json({
            exercises,
            pagination: {
                total: totalCount,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: parseInt(offset) + parseInt(limit) < totalCount
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching exercises with approval status:', error);
        res.status(500).json({ error: 'Failed to fetch exercises' });
    }
});
// Setup warmup directory structure for Railway deployment
app.post('/api/admin/exercise-media/setup-warmup-directory', auth_1.authenticate, auth_1.requireAdmin, async (_req, res) => {
    try {
        const fs = require('fs').promises;
        const path = require('path');
        // Create warmup directory in public/exercise-gifs/
        const warmupDir = path.join(process.cwd(), 'public', 'exercise-gifs', 'warmup');
        try {
            await fs.access(warmupDir);
            res.json({ message: 'Warmup directory already exists', path: warmupDir });
        }
        catch (error) {
            // Directory doesn't exist, create it
            await fs.mkdir(warmupDir, { recursive: true });
            // Create a README.md file in the warmup directory
            const readmeContent = `# Warmup Exercise GIFs

This directory contains GIF animations for warmup exercises in the FitArchitect application.

## Structure
- Place warmup exercise GIFs directly in this folder
- Use descriptive filenames like: arm-circles.gif, shoulder-rolls.gif, etc.
- GIFs should be optimized for web (under 2MB each)

## Emergency Fallbacks
If proper warmup GIFs are not available, the system will use appropriate alternatives from other exercise categories.

Created: ${new Date().toISOString()}
`;
            await fs.writeFile(path.join(warmupDir, 'README.md'), readmeContent);
            res.json({
                message: 'Warmup directory structure created successfully',
                path: warmupDir,
                created: true
            });
        }
    }
    catch (error) {
        logger_1.logger.error('Error setting up warmup directory:', error);
        res.status(500).json({ error: 'Failed to setup warmup directory structure' });
    }
});
// Emergency fix warmup GIF mappings endpoint for production
app.post('/api/admin/exercise-media/emergency-fix-warmup-gifs', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    var _a, _b;
    try {
        const warmupFixes = [
            { exerciseName: 'Arm Circles', newGifPath: '/exercise-gifs/shoulders/cable-one-arm-lateral-raise.gif' },
            { exerciseName: 'Shoulder Rolls', newGifPath: '/exercise-gifs/back/barbell-shrug.gif' },
            { exerciseName: 'Walking Lunge', newGifPath: '/exercise-gifs/legs/barbell-lunge.gif' },
            { exerciseName: 'Torso Twists', newGifPath: '/exercise-gifs/core/barbell-standing-twist.gif' },
            { exerciseName: 'Hip Circles', newGifPath: '/exercise-gifs/core/45-side-bend.gif' },
            { exerciseName: 'Walking High Knees', newGifPath: '/exercise-gifs/cardio/walking-high-knees-lunge.gif' },
            { exerciseName: 'Butt Kickers', newGifPath: '/exercise-gifs/cardio/mountain-climber.gif' }
        ];
        let fixedCount = 0;
        const results = [];
        // Update each exercise in the database if it exists
        for (const fix of warmupFixes) {
            try {
                // First try to find and update existing exercise
                const updatedExercise = await prisma_1.prisma.exercise.updateMany({
                    where: { name: fix.exerciseName },
                    data: {
                        gifPath: fix.newGifPath,
                        approvalStatus: 'approved',
                        lastReviewedAt: new Date(),
                        reviewedBy: ((_a = req.user) === null || _a === void 0 ? void 0 : _a.name) || 'System'
                    }
                });
                if (updatedExercise.count > 0) {
                    fixedCount++;
                    results.push({ exercise: fix.exerciseName, status: 'updated', gifPath: fix.newGifPath });
                }
                else {
                    // Create new exercise entry if it doesn't exist
                    await prisma_1.prisma.exercise.create({
                        data: {
                            name: fix.exerciseName,
                            description: `${fix.exerciseName} warmup exercise`,
                            category: 'warmup',
                            difficulty: 'beginner',
                            gifPath: fix.newGifPath,
                            approvalStatus: 'approved',
                            lastReviewedAt: new Date(),
                            reviewedBy: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.name) || 'System',
                            hideGif: false
                        }
                    });
                    fixedCount++;
                    results.push({ exercise: fix.exerciseName, status: 'created', gifPath: fix.newGifPath });
                }
            }
            catch (error) {
                logger_1.logger.warn(`Failed to fix ${fix.exerciseName}:`, error);
                results.push({ exercise: fix.exerciseName, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' });
            }
        }
        res.json({
            message: `Emergency fixed ${fixedCount} warmup exercise GIFs`,
            fixed: fixedCount,
            results
        });
    }
    catch (error) {
        logger_1.logger.error('Error in emergency warmup GIF fix:', error);
        res.status(500).json({ error: 'Emergency fix failed' });
    }
});
// Validate GIF directory structure (Railway deployment check)
app.get('/api/admin/exercise-media/validate-gif-structure', auth_1.authenticate, auth_1.requireAdmin, async (_req, res) => {
    try {
        const fs = require('fs').promises;
        const path = require('path');
        const baseGifDir = path.join(process.cwd(), 'public', 'exercise-gifs');
        const expectedDirs = ['warmup', 'strength', 'cardio', 'flexibility', 'core', 'arms', 'legs', 'back', 'chest', 'shoulders'];
        const validation = {
            baseDirectory: { exists: false, path: baseGifDir },
            subdirectories: [],
            totalGifs: 0,
            missingDirs: [],
            summary: ''
        };
        // Check if base directory exists
        try {
            await fs.access(baseGifDir);
            validation.baseDirectory.exists = true;
        }
        catch (error) {
            validation.baseDirectory.exists = false;
            return res.json({
                ...validation,
                summary: 'Base GIF directory does not exist - critical deployment issue'
            });
        }
        // Check each expected subdirectory
        for (const dir of expectedDirs) {
            const dirPath = path.join(baseGifDir, dir);
            const dirInfo = { name: dir, exists: false, path: dirPath, gifCount: 0, gifs: [] };
            try {
                await fs.access(dirPath);
                dirInfo.exists = true;
                // Count GIFs in directory
                const files = await fs.readdir(dirPath);
                const gifFiles = files.filter((file) => file.toLowerCase().endsWith('.gif'));
                dirInfo.gifCount = gifFiles.length;
                dirInfo.gifs = gifFiles.slice(0, 5); // First 5 GIFs for reference
                validation.totalGifs += gifFiles.length;
            }
            catch (error) {
                dirInfo.exists = false;
                validation.missingDirs.push(dir);
            }
            validation.subdirectories.push(dirInfo);
        }
        // Generate summary
        if (validation.missingDirs.length === 0) {
            validation.summary = `All directories present. ${validation.totalGifs} GIFs available.`;
        }
        else {
            validation.summary = `Missing ${validation.missingDirs.length} directories: ${validation.missingDirs.join(', ')}. ${validation.totalGifs} GIFs available.`;
        }
        res.json(validation);
    }
    catch (error) {
        logger_1.logger.error('Error validating GIF structure:', error);
        res.status(500).json({ error: 'Failed to validate GIF directory structure' });
    }
});
// =============================================================================
// MISSING ADMIN DASHBOARD ENDPOINTS
// =============================================================================
// GET /api/admin/exercise-approvals - Get all exercise approval statuses
app.get('/api/admin/exercise-approvals', auth_1.authenticate, auth_1.requireAdmin, async (_req, res) => {
    try {
        // Query exercises with approval information
        const exercises = await prisma_1.prisma.exercise.findMany({
            select: {
                id: true,
                name: true,
                gifPath: true,
                category: true,
                approvalStatus: true,
                lastReviewedAt: true,
                reviewedBy: true,
                flaggedReason: true,
                hideGif: true,
                createdAt: true,
                updatedAt: true
            }
        });
        // Transform to expected format
        const approvals = exercises.map(exercise => ({
            exerciseId: `${exercise.name.toLowerCase().replace(/\s+/g, '_')}_${exercise.category || 'general'}`,
            exerciseName: exercise.name,
            approvalStatus: exercise.approvalStatus || 'pending',
            lastReviewedAt: exercise.lastReviewedAt,
            reviewedBy: exercise.reviewedBy,
            flaggedReason: exercise.flaggedReason,
            hideGif: exercise.hideGif || false,
            gifPath: exercise.gifPath
        }));
        logger_1.logger.info(`Retrieved ${approvals.length} exercise approvals`);
        res.json(approvals);
    }
    catch (error) {
        logger_1.logger.error('Error fetching exercise approvals:', error);
        res.status(500).json({ error: 'Failed to fetch exercise approvals' });
    }
});
// Dashboard Stats for Overview Panel
app.get('/api/admin/dashboard/stats', auth_1.authenticate, auth_1.requireAdmin, async (_req, res) => {
    try {
        // Get basic user stats
        const totalUsers = await prisma_1.prisma.userProfile.count();
        const activeSubscriptions = await prisma_1.prisma.subscription.count({
            where: { status: 'active' }
        });
        // Get today's new users
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayUsers = await prisma_1.prisma.userProfile.count({
            where: {
                createdAt: { gte: today }
            }
        });
        // Get subscription breakdown
        const subscriptionCounts = await prisma_1.prisma.subscription.groupBy({
            by: ['plan'],
            _count: { plan: true },
            where: { status: 'active' }
        });
        // Get revenue (monthly)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentRevenue = await prisma_1.prisma.payment.aggregate({
            _sum: { amount: true },
            where: {
                status: 'completed',
                createdAt: { gte: thirtyDaysAgo }
            }
        });
        const stats = {
            totalUsers,
            activeSubscriptions,
            todayUsers,
            monthlyRevenue: (recentRevenue._sum.amount || 0) / 100, // Convert from cents
            subscriptionBreakdown: subscriptionCounts.reduce((acc, sub) => {
                acc[sub.plan] = sub._count.plan;
                return acc;
            }, {})
        };
        res.json(stats);
    }
    catch (error) {
        logger_1.logger.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});
// Dashboard Activity Feed for Overview Panel
app.get('/api/admin/dashboard/activity', auth_1.authenticate, auth_1.requireAdmin, async (_req, res) => {
    try {
        const activities = [];
        // Get recent user registrations
        const recentUsers = await prisma_1.prisma.userProfile.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: { email: true, createdAt: true, name: true }
        });
        recentUsers.forEach(user => {
            activities.push({
                id: `user-${Date.now()}-${Math.random()}`,
                type: 'user_registration',
                message: `New user registered: ${user.name || user.email}`,
                timestamp: user.createdAt.toISOString(),
                user: user.email
            });
        });
        // Get recent workout completions
        const recentWorkouts = await prisma_1.prisma.workoutLog.findMany({
            take: 5,
            orderBy: { date: 'desc' },
            where: { completed: true },
            include: { user: { select: { email: true, name: true } } }
        });
        recentWorkouts.forEach(workout => {
            activities.push({
                id: `workout-${workout.id}`,
                type: 'workout_completion',
                message: `Workout completed: ${workout.workoutId || 'Unknown workout'}`,
                timestamp: workout.date.toISOString(),
                user: workout.user.email
            });
        });
        // Sort by timestamp
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        res.json(activities.slice(0, 10));
    }
    catch (error) {
        logger_1.logger.error('Error fetching dashboard activity:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard activity' });
    }
});
// Admin impersonation endpoint
app.post('/api/admin/impersonate', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { userId } = req.body;
        const admin = req.user;
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        // Find target user
        const targetUser = await prisma_1.prisma.userProfile.findUnique({
            where: { id: userId }
        });
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Prevent impersonating other admins
        if (targetUser.isAdmin) {
            return res.status(403).json({ error: 'Cannot impersonate admin accounts' });
        }
        // Generate impersonation token with special claims
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET;
        const impersonationToken = jwt.sign({
            userId: targetUser.id,
            email: targetUser.email,
            type: targetUser.type,
            impersonatedBy: admin.id,
            impersonation: true
        }, JWT_SECRET, { expiresIn: '1h' }); // Shorter expiry for security
        logger_1.logger.info('Admin impersonation started', {
            metadata: {
                operation: 'admin_impersonate',
                component: 'admin',
                userId: admin.id,
                targetUserId: targetUser.id
            }
        });
        res.json({
            message: 'Impersonation token generated',
            token: impersonationToken,
            user: {
                id: targetUser.id,
                email: targetUser.email,
                name: targetUser.name,
                type: targetUser.type
            },
            impersonatedBy: {
                id: admin.id,
                email: admin.email
            },
            expiresIn: 3600 // 1 hour
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to generate impersonation token', error);
        res.status(500).json({ error: 'Failed to impersonate user' });
    }
});
// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    app.use(express_1.default.static(path_1.default.join(__dirname, '../../../dist')));
    // Serve frontend for all non-API routes
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path_1.default.join(__dirname, '../../../dist/index.html'));
        }
    });
}
// Error handling middleware (must be last)
app.use(errorHandler_1.notFoundHandler);
app.use(loggingMiddleware_1.errorLoggingMiddleware);
app.use(errorHandler_1.errorHandler);
// Start server
async function startServer() {
    try {
        // Check database connection
        await (0, prisma_1.checkDatabaseConnection)();
        logger_1.logger.info('Database connection verified');
        // Start server
        const server = app.listen(PORT, () => {
            logger_1.logger.info(`🚀 Server running on port ${PORT}`);
            logger_1.logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
            logger_1.logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
        });
        // Graceful shutdown
        process.on('SIGTERM', () => {
            logger_1.logger.info('SIGTERM received, shutting down gracefully');
            server.close(() => {
                prisma_1.prisma.$disconnect();
                process.exit(0);
            });
        });
        process.on('SIGINT', () => {
            logger_1.logger.info('SIGINT received, shutting down gracefully');
            server.close(() => {
                prisma_1.prisma.$disconnect();
                process.exit(0);
            });
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
exports.default = app;
