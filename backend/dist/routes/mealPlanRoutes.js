"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../auth");
const prisma_1 = require("../db/prisma");
const openaiService_1 = require("../services/openaiService");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
/**
 * Get all meal plans for authenticated user
 */
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const isGuest = req.user.type === 'guest';
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
        const where = { userId };
        if (dietType && typeof dietType === 'string') {
            where.dietType = dietType;
        }
        const mealPlans = await prisma_1.prisma.mealPlan.findMany({
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
        const total = await prisma_1.prisma.mealPlan.count({ where });
        logger_1.logger.info('Meal plans retrieved', {
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
    }
    catch (error) {
        logger_1.logger.error('Failed to get meal plans', {
            operation: 'meal_plans_get_error',
            component: 'meal_planning',
            userId: req.user.id
        }, error);
        res.status(500).json({
            error: 'Failed to retrieve meal plans'
        });
    }
});
/**
 * Get specific meal plan by ID
 */
router.get('/:id', auth_1.authenticate, [(0, express_validator_1.param)('id').isInt().withMessage('Invalid meal plan ID')], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Invalid input',
                details: errors.array()
            });
        }
        const userId = req.user.id;
        const mealPlanId = parseInt(req.params.id);
        const mealPlan = await prisma_1.prisma.mealPlan.findFirst({
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
        logger_1.logger.info('Meal plan retrieved', {
            operation: 'meal_plan_get',
            component: 'meal_planning',
            userId,
            metadata: { mealPlanId }
        });
        res.json(mealPlan);
    }
    catch (error) {
        logger_1.logger.error('Failed to get meal plan', {
            operation: 'meal_plan_get_error',
            component: 'meal_planning',
            userId: req.user.id
        }, error);
        res.status(500).json({
            error: 'Failed to retrieve meal plan'
        });
    }
});
/**
 * Generate new AI meal plan
 */
router.post('/generate', auth_1.authenticate, [
    (0, express_validator_1.body)('dietType')
        .optional()
        .isIn(['balanced', 'weight-loss', 'muscle-gain', 'keto', 'vegan', 'vegetarian'])
        .withMessage('Invalid diet type'),
    (0, express_validator_1.body)('days')
        .optional()
        .isInt({ min: 1, max: 14 })
        .withMessage('Days must be between 1 and 14'),
    (0, express_validator_1.body)('preferences')
        .optional()
        .isObject()
        .withMessage('Preferences must be an object')
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Invalid input',
                details: errors.array()
            });
        }
        const userId = req.user.id;
        const { dietType = 'balanced', days = 7, preferences = {} } = req.body;
        logger_1.logger.info('Generating new meal plan', {
            operation: 'meal_plan_generate_start',
            component: 'meal_planning',
            userId,
            metadata: { dietType, days }
        });
        // Get user profile for personalized meal planning
        const user = await prisma_1.prisma.userProfile.findUnique({
            where: { id: userId }
        });
        if (!user) {
            return res.status(404).json({
                error: 'User profile not found'
            });
        }
        // Generate meal plan using OpenAI
        const generatedPlan = await openaiService_1.openaiService.generateMealPlan(user, {
            dietType,
            days,
            ...preferences,
            dietaryRestrictions: user.dietaryPreferences || []
        });
        // Generate shopping list from meal plan
        const shoppingList = generateShoppingList(generatedPlan);
        // Save meal plan to database
        const mealPlan = await prisma_1.prisma.mealPlan.create({
            data: {
                userId,
                dietType,
                meals: generatedPlan,
                shoppingList,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
        logger_1.logger.info('Meal plan generated successfully', {
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
    }
    catch (error) {
        logger_1.logger.error('Failed to generate meal plan', {
            operation: 'meal_plan_generate_error',
            component: 'meal_planning',
            userId: req.user.id
        }, error);
        res.status(500).json({
            error: 'Failed to generate meal plan',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Save/Update existing meal plan
 */
router.put('/:id', auth_1.authenticate, [
    (0, express_validator_1.param)('id').isInt().withMessage('Invalid meal plan ID'),
    (0, express_validator_1.body)('dietType')
        .optional()
        .isIn(['balanced', 'weight-loss', 'muscle-gain', 'keto', 'vegan', 'vegetarian'])
        .withMessage('Invalid diet type'),
    (0, express_validator_1.body)('meals')
        .optional()
        .isArray()
        .withMessage('Meals must be an array'),
    (0, express_validator_1.body)('shoppingList')
        .optional()
        .isArray()
        .withMessage('Shopping list must be an array')
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Invalid input',
                details: errors.array()
            });
        }
        const userId = req.user.id;
        const mealPlanId = parseInt(req.params.id);
        const { dietType, meals, shoppingList } = req.body;
        // Check if meal plan exists and belongs to user
        const existingPlan = await prisma_1.prisma.mealPlan.findFirst({
            where: { id: mealPlanId, userId }
        });
        if (!existingPlan) {
            return res.status(404).json({
                error: 'Meal plan not found'
            });
        }
        // Update meal plan
        const updateData = { updatedAt: new Date() };
        if (dietType)
            updateData.dietType = dietType;
        if (meals)
            updateData.meals = meals;
        if (shoppingList)
            updateData.shoppingList = shoppingList;
        const updatedPlan = await prisma_1.prisma.mealPlan.update({
            where: { id: mealPlanId },
            data: updateData
        });
        logger_1.logger.info('Meal plan updated', {
            operation: 'meal_plan_update',
            component: 'meal_planning',
            userId,
            metadata: { mealPlanId }
        });
        res.json(updatedPlan);
    }
    catch (error) {
        logger_1.logger.error('Failed to update meal plan', {
            operation: 'meal_plan_update_error',
            component: 'meal_planning',
            userId: req.user.id
        }, error);
        res.status(500).json({
            error: 'Failed to update meal plan'
        });
    }
});
/**
 * Delete meal plan
 */
router.delete('/:id', auth_1.authenticate, [(0, express_validator_1.param)('id').isInt().withMessage('Invalid meal plan ID')], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Invalid input',
                details: errors.array()
            });
        }
        const userId = req.user.id;
        const mealPlanId = parseInt(req.params.id);
        // Check if meal plan exists and belongs to user
        const existingPlan = await prisma_1.prisma.mealPlan.findFirst({
            where: { id: mealPlanId, userId }
        });
        if (!existingPlan) {
            return res.status(404).json({
                error: 'Meal plan not found'
            });
        }
        await prisma_1.prisma.mealPlan.delete({
            where: { id: mealPlanId }
        });
        logger_1.logger.info('Meal plan deleted', {
            operation: 'meal_plan_delete',
            component: 'meal_planning',
            userId,
            metadata: { mealPlanId }
        });
        res.status(204).send();
    }
    catch (error) {
        logger_1.logger.error('Failed to delete meal plan', {
            operation: 'meal_plan_delete_error',
            component: 'meal_planning',
            userId: req.user.id
        }, error);
        res.status(500).json({
            error: 'Failed to delete meal plan'
        });
    }
});
/**
 * Duplicate meal plan
 */
router.post('/:id/duplicate', auth_1.authenticate, [(0, express_validator_1.param)('id').isInt().withMessage('Invalid meal plan ID')], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Invalid input',
                details: errors.array()
            });
        }
        const userId = req.user.id;
        const mealPlanId = parseInt(req.params.id);
        // Get original meal plan
        const originalPlan = await prisma_1.prisma.mealPlan.findFirst({
            where: { id: mealPlanId, userId }
        });
        if (!originalPlan) {
            return res.status(404).json({
                error: 'Meal plan not found'
            });
        }
        // Create duplicate
        const duplicatedPlan = await prisma_1.prisma.mealPlan.create({
            data: {
                userId,
                dietType: originalPlan.dietType,
                meals: originalPlan.meals,
                shoppingList: originalPlan.shoppingList,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
        logger_1.logger.info('Meal plan duplicated', {
            operation: 'meal_plan_duplicate',
            component: 'meal_planning',
            userId,
            metadata: {
                originalId: mealPlanId,
                duplicateId: duplicatedPlan.id
            }
        });
        res.status(201).json(duplicatedPlan);
    }
    catch (error) {
        logger_1.logger.error('Failed to duplicate meal plan', {
            operation: 'meal_plan_duplicate_error',
            component: 'meal_planning',
            userId: req.user.id
        }, error);
        res.status(500).json({
            error: 'Failed to duplicate meal plan'
        });
    }
});
/**
 * Generate shopping list from meal plan
 */
function generateShoppingList(mealPlan) {
    const ingredientMap = new Map();
    // Process each day's meals
    mealPlan.forEach((day, dayIndex) => {
        if (day.meals) {
            day.meals.forEach((meal) => {
                if (meal.items) {
                    meal.items.forEach((item) => {
                        if (item.ingredients) {
                            item.ingredients.forEach((ingredient) => {
                                let ingredientName;
                                let quantity = 1;
                                let unit = 'piece';
                                let category = 'Other';
                                // Handle both string arrays and object arrays
                                if (typeof ingredient === 'string') {
                                    ingredientName = ingredient;
                                }
                                else if ((ingredient === null || ingredient === void 0 ? void 0 : ingredient.name) && typeof ingredient.name === 'string') {
                                    ingredientName = ingredient.name;
                                    quantity = ingredient.quantity || 1;
                                    unit = ingredient.unit || 'piece';
                                    category = ingredient.category || 'Other';
                                }
                                else {
                                    console.warn('Invalid ingredient in meal plan:', ingredient);
                                    return;
                                }
                                const key = ingredientName.toLowerCase();
                                if (ingredientMap.has(key)) {
                                    const existing = ingredientMap.get(key);
                                    existing.quantity += quantity;
                                    existing.recipes.push(`Day ${dayIndex + 1}: ${meal.type}`);
                                }
                                else {
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
    const categories = ingredients.reduce((acc, ingredient) => {
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
exports.default = router;
