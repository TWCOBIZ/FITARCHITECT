import { Router, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticate, AuthenticatedRequest } from '../auth';
import { prisma } from '../db/prisma';
import { openaiService } from '../services/openaiService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Get all meal plans for authenticated user
 */
router.get('/',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const isGuest = req.user!.type === 'guest';
      const { page = 1, limit = 10, dietType } = req.query;
      
      // For guests, return empty array
      if (isGuest) {
        return res.json({
          mealPlans: [],
          total: 0,
          page: Number(page),
          limit: Number(limit)
        });
      }

      const where: any = { userId };
      if (dietType && typeof dietType === 'string') {
        where.dietType = dietType;
      }

      const mealPlans = await prisma.mealPlan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        select: {
          id: true,
          dietType: true,
          createdAt: true,
          updatedAt: true,
          meals: true,
          shoppingList: true
        }
      });

      const total = await prisma.mealPlan.count({ where });

      logger.info('Meal plans retrieved', {
        operation: 'meal_plans_get',
        component: 'meal_planning',
        userId,
        metadata: { count: mealPlans.length, total }
      });

      res.json({
        mealPlans,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      logger.error('Failed to get meal plans', {
        operation: 'meal_plans_get_error',
        component: 'meal_planning',
        userId: req.user!.id
      }, error as Error);

      res.status(500).json({
        error: 'Failed to retrieve meal plans'
      });
    }
  }
);

/**
 * Get specific meal plan by ID
 */
router.get('/:id',
  authenticate,
  [param('id').isInt().withMessage('Invalid meal plan ID')],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Invalid input',
          details: errors.array()
        });
      }

      const userId = req.user!.id;
      const mealPlanId = parseInt(req.params.id);

      const mealPlan = await prisma.mealPlan.findFirst({
        where: { id: mealPlanId, userId },
        include: {
          user: {
            select: {
              name: true,
              dietaryPreferences: true
            }
          }
        }
      });

      if (!mealPlan) {
        return res.status(404).json({
          error: 'Meal plan not found'
        });
      }

      logger.info('Meal plan retrieved', {
        operation: 'meal_plan_get',
        component: 'meal_planning',
        userId,
        metadata: { mealPlanId }
      });

      res.json(mealPlan);
    } catch (error) {
      logger.error('Failed to get meal plan', {
        operation: 'meal_plan_get_error',
        component: 'meal_planning',
        userId: req.user!.id
      }, error as Error);

      res.status(500).json({
        error: 'Failed to retrieve meal plan'
      });
    }
  }
);

/**
 * Generate new AI meal plan
 */
router.post('/generate',
  authenticate,
  [
    body('dietType')
      .optional()
      .isIn(['balanced', 'weight-loss', 'muscle-gain', 'keto', 'vegan', 'vegetarian'])
      .withMessage('Invalid diet type'),
    body('days')
      .optional()
      .isInt({ min: 1, max: 14 })
      .withMessage('Days must be between 1 and 14'),
    body('preferences')
      .optional()
      .isObject()
      .withMessage('Preferences must be an object')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Invalid input',
          details: errors.array()
        });
      }

      const userId = req.user!.id;
      const { dietType = 'balanced', days = 7, preferences = {} } = req.body;

      logger.info('Generating new meal plan', {
        operation: 'meal_plan_generate_start',
        component: 'meal_planning',
        userId,
        metadata: { dietType, days }
      });

      // Get user profile for personalized meal planning
      const user = await prisma.userProfile.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({
          error: 'User profile not found'
        });
      }

      // Generate meal plan using OpenAI
      const generatedPlan = await openaiService.generateMealPlan(user, {
        dietType,
        days,
        ...preferences,
        dietaryRestrictions: user.dietaryPreferences || []
      });

      // Generate shopping list from meal plan
      const shoppingList = generateShoppingList(generatedPlan);

      // Save meal plan to database
      const mealPlan = await prisma.mealPlan.create({
        data: {
          userId,
          dietType,
          meals: generatedPlan,
          shoppingList,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      logger.info('Meal plan generated successfully', {
        operation: 'meal_plan_generate_success',
        component: 'meal_planning',
        userId,
        metadata: { 
          mealPlanId: mealPlan.id,
          dietType,
          mealsCount: Array.isArray(generatedPlan) ? generatedPlan.length : 0
        }
      });

      res.status(201).json(mealPlan);
    } catch (error) {
      logger.error('Failed to generate meal plan', {
        operation: 'meal_plan_generate_error',
        component: 'meal_planning',
        userId: req.user!.id
      }, error as Error);

      res.status(500).json({
        error: 'Failed to generate meal plan',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Save/Update existing meal plan
 */
router.put('/:id',
  authenticate,
  [
    param('id').isInt().withMessage('Invalid meal plan ID'),
    body('dietType')
      .optional()
      .isIn(['balanced', 'weight-loss', 'muscle-gain', 'keto', 'vegan', 'vegetarian'])
      .withMessage('Invalid diet type'),
    body('meals')
      .optional()
      .isArray()
      .withMessage('Meals must be an array'),
    body('shoppingList')
      .optional()
      .isArray()
      .withMessage('Shopping list must be an array')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Invalid input',
          details: errors.array()
        });
      }

      const userId = req.user!.id;
      const mealPlanId = parseInt(req.params.id);
      const { dietType, meals, shoppingList } = req.body;

      // Check if meal plan exists and belongs to user
      const existingPlan = await prisma.mealPlan.findFirst({
        where: { id: mealPlanId, userId }
      });

      if (!existingPlan) {
        return res.status(404).json({
          error: 'Meal plan not found'
        });
      }

      // Update meal plan
      const updateData: any = { updatedAt: new Date() };
      if (dietType) updateData.dietType = dietType;
      if (meals) updateData.meals = meals;
      if (shoppingList) updateData.shoppingList = shoppingList;

      const updatedPlan = await prisma.mealPlan.update({
        where: { id: mealPlanId },
        data: updateData
      });

      logger.info('Meal plan updated', {
        operation: 'meal_plan_update',
        component: 'meal_planning',
        userId,
        metadata: { mealPlanId }
      });

      res.json(updatedPlan);
    } catch (error) {
      logger.error('Failed to update meal plan', {
        operation: 'meal_plan_update_error',
        component: 'meal_planning',
        userId: req.user!.id
      }, error as Error);

      res.status(500).json({
        error: 'Failed to update meal plan'
      });
    }
  }
);

/**
 * Delete meal plan
 */
router.delete('/:id',
  authenticate,
  [param('id').isInt().withMessage('Invalid meal plan ID')],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Invalid input',
          details: errors.array()
        });
      }

      const userId = req.user!.id;
      const mealPlanId = parseInt(req.params.id);

      // Check if meal plan exists and belongs to user
      const existingPlan = await prisma.mealPlan.findFirst({
        where: { id: mealPlanId, userId }
      });

      if (!existingPlan) {
        return res.status(404).json({
          error: 'Meal plan not found'
        });
      }

      await prisma.mealPlan.delete({
        where: { id: mealPlanId }
      });

      logger.info('Meal plan deleted', {
        operation: 'meal_plan_delete',
        component: 'meal_planning',
        userId,
        metadata: { mealPlanId }
      });

      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete meal plan', {
        operation: 'meal_plan_delete_error',
        component: 'meal_planning',
        userId: req.user!.id
      }, error as Error);

      res.status(500).json({
        error: 'Failed to delete meal plan'
      });
    }
  }
);

/**
 * Duplicate meal plan
 */
router.post('/:id/duplicate',
  authenticate,
  [param('id').isInt().withMessage('Invalid meal plan ID')],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Invalid input',
          details: errors.array()
        });
      }

      const userId = req.user!.id;
      const mealPlanId = parseInt(req.params.id);

      // Get original meal plan
      const originalPlan = await prisma.mealPlan.findFirst({
        where: { id: mealPlanId, userId }
      });

      if (!originalPlan) {
        return res.status(404).json({
          error: 'Meal plan not found'
        });
      }

      // Create duplicate
      const duplicatedPlan = await prisma.mealPlan.create({
        data: {
          userId,
          dietType: originalPlan.dietType,
          meals: originalPlan.meals as any,
          shoppingList: originalPlan.shoppingList as any,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      logger.info('Meal plan duplicated', {
        operation: 'meal_plan_duplicate',
        component: 'meal_planning',
        userId,
        metadata: { 
          originalId: mealPlanId,
          duplicateId: duplicatedPlan.id
        }
      });

      res.status(201).json(duplicatedPlan);
    } catch (error) {
      logger.error('Failed to duplicate meal plan', {
        operation: 'meal_plan_duplicate_error',
        component: 'meal_planning',
        userId: req.user!.id
      }, error as Error);

      res.status(500).json({
        error: 'Failed to duplicate meal plan'
      });
    }
  }
);

/**
 * Generate shopping list from meal plan
 */
function generateShoppingList(mealPlan: any[]): any[] {
  const ingredientMap = new Map<string, { 
    name: string; 
    category: string; 
    quantity: number; 
    unit: string;
    recipes: string[];
  }>();

  // Process each day's meals
  mealPlan.forEach((day, dayIndex) => {
    if (day.meals) {
      day.meals.forEach((meal: any) => {
        if (meal.items) {
          meal.items.forEach((item: any) => {
            if (item.ingredients) {
              item.ingredients.forEach((ingredient: any) => {
                let ingredientName: string;
                let quantity = 1;
                let unit = 'piece';
                let category = 'Other';
                
                // Handle both string arrays and object arrays
                if (typeof ingredient === 'string') {
                  ingredientName = ingredient;
                } else if (ingredient?.name && typeof ingredient.name === 'string') {
                  ingredientName = ingredient.name;
                  quantity = ingredient.quantity || 1;
                  unit = ingredient.unit || 'piece';
                  category = ingredient.category || 'Other';
                } else {
                  console.warn('Invalid ingredient in meal plan:', ingredient);
                  return;
                }
                
                const key = ingredientName.toLowerCase();
                if (ingredientMap.has(key)) {
                  const existing = ingredientMap.get(key)!;
                  existing.quantity += quantity;
                  existing.recipes.push(`Day ${dayIndex + 1}: ${meal.type}`);
                } else {
                  ingredientMap.set(key, {
                    name: ingredientName,
                    category: category,
                    quantity: quantity,
                    unit: unit,
                    recipes: [`Day ${dayIndex + 1}: ${meal.type}`]
                  });
                }
              });
            }
          });
        }
      });
    }
  });

  // Convert to array and group by category
  const ingredients = Array.from(ingredientMap.values());
  const categories = ingredients.reduce((acc: any, ingredient) => {
    if (!acc[ingredient.category]) {
      acc[ingredient.category] = [];
    }
    acc[ingredient.category].push(ingredient);
    return acc;
  }, {});

  // Convert to final format
  return Object.entries(categories).map(([category, items]) => ({
    category,
    items
  }));
}

export default router;