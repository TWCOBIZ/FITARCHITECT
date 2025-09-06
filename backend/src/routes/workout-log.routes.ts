import { Router, Response } from 'express';
import { body } from 'express-validator';
import { prisma } from '../db/prisma';
import { 
  authenticate, 
  AuthenticatedRequest 
} from '../auth';
import { 
  handleValidationErrors,
  AppError
} from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

// Create workout log entry
router.post('/', 
  authenticate,
  [
    body('workoutId').isString().withMessage('Workout ID required'),
    body('exercises').isArray().withMessage('Exercises array required'),
    body('duration').optional().isInt({ min: 1 }).withMessage('Duration must be positive integer'),
    body('caloriesBurned').optional().isInt({ min: 0 }).withMessage('Calories must be non-negative')
  ],
  handleValidationErrors,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const { workoutId, exercises, duration, caloriesBurned, notes, date } = req.body;

    if (!userId) {
      throw new AppError(401, 'Authentication required');
    }

    const workoutLog = await prisma.workoutLog.create({
      data: {
        userId,
        workoutId,
        exercises,
        duration: duration || 0,
        notes,
        date: date ? new Date(date) : new Date()
      }
    });

    logger.info('Workout logged', { userId, workoutId, logId: workoutLog.id });

    res.json(workoutLog);
  })
);

// Get all workout logs for user
router.get('/', 
  authenticate, 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'Authentication required');
    }

    const workoutLogs = await prisma.workoutLog.findMany({
      where: { userId },
      orderBy: { date: 'desc' }
    });

    res.json(workoutLogs);
  })
);

// Get workout log by ID
router.get('/:id', 
  authenticate, 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      throw new AppError(401, 'Authentication required');
    }

    const workoutLog = await prisma.workoutLog.findFirst({
      where: { 
        id,
        userId 
      }
    });

    if (!workoutLog) {
      throw new AppError(404, 'Workout log not found');
    }

    res.json(workoutLog);
  })
);

// Update workout log
router.put('/:id', 
  authenticate,
  handleValidationErrors,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const { id } = req.params;
    const { exercises, duration, notes } = req.body;

    if (!userId) {
      throw new AppError(401, 'Authentication required');
    }

    // Check if log exists and belongs to user
    const existingLog = await prisma.workoutLog.findFirst({
      where: { id, userId }
    });

    if (!existingLog) {
      throw new AppError(404, 'Workout log not found');
    }

    const updatedLog = await prisma.workoutLog.update({
      where: { id },
      data: {
        exercises,
        duration,
        notes
      }
    });

    res.json(updatedLog);
  })
);

// Delete workout log
router.delete('/:id', 
  authenticate, 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      throw new AppError(401, 'Authentication required');
    }

    // Check if log exists and belongs to user
    const existingLog = await prisma.workoutLog.findFirst({
      where: { id, userId }
    });

    if (!existingLog) {
      throw new AppError(404, 'Workout log not found');
    }

    await prisma.workoutLog.delete({ where: { id } });
    
    res.status(204).end();
  })
);

export default router;