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
 * Get all recipes for authenticated user
 * Guest users get sample recipes
 */
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const isGuest = req.user.type === 'guest';
        const { page = 1, limit = 20, category, difficulty } = req.query;
        // For guests, return empty array for now (or you could return sample recipes)
        if (isGuest) {
            return res.json({
                recipes: [],
                total: 0,
                page: Number(page),
                limit: Number(limit)
            });
        }
        const where = { userId };
        if (category && typeof category === 'string') {
            where.category = category;
        }
        if (difficulty && typeof difficulty === 'string') {
            where.difficulty = difficulty;
        }
        const recipes = await prisma_1.prisma.recipe.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
            select: {
                id: true,
                name: true,
                description: true,
                category: true,
                difficulty: true,
                prepTime: true,
                cookTime: true,
                servings: true,
                imageUrl: true,
                createdAt: true,
                updatedAt: true,
                nutrition: true
            }
        });
        const total = await prisma_1.prisma.recipe.count({ where });
        logger_1.logger.info('Recipes retrieved', {
            operation: 'recipes_get',
            component: 'recipe_management',
            userId,
            metadata: { count: recipes.length, total }
        });
        res.json({
            recipes,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get recipes', {
            operation: 'recipes_get_error',
            component: 'recipe_management',
            userId: req.user.id
        }, error);
        res.status(500).json({
            error: 'Failed to retrieve recipes'
        });
    }
});
/**
 * Get specific recipe by ID with full details
 */
router.get('/:id', auth_1.authenticate, [(0, express_validator_1.param)('id').isInt().withMessage('Invalid recipe ID')], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Invalid input',
                details: errors.array()
            });
        }
        const userId = req.user.id;
        const recipeId = parseInt(req.params.id);
        const recipe = await prisma_1.prisma.recipe.findFirst({
            where: { id: recipeId, userId }
        });
        if (!recipe) {
            return res.status(404).json({
                error: 'Recipe not found'
            });
        }
        logger_1.logger.info('Recipe retrieved', {
            operation: 'recipe_get',
            component: 'recipe_management',
            userId,
            metadata: { recipeId }
        });
        res.json(recipe);
    }
    catch (error) {
        logger_1.logger.error('Failed to get recipe', {
            operation: 'recipe_get_error',
            component: 'recipe_management',
            userId: req.user.id
        }, error);
        res.status(500).json({
            error: 'Failed to retrieve recipe'
        });
    }
});
/**
 * Generate new AI recipe
 */
router.post('/generate', auth_1.authenticate, [
    (0, express_validator_1.body)('category')
        .optional()
        .isIn(['breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'side-dish'])
        .withMessage('Invalid category'),
    (0, express_validator_1.body)('difficulty')
        .optional()
        .isIn(['easy', 'medium', 'hard'])
        .withMessage('Invalid difficulty'),
    (0, express_validator_1.body)('prepTime')
        .optional()
        .isInt({ min: 5, max: 300 })
        .withMessage('Prep time must be between 5 and 300 minutes'),
    (0, express_validator_1.body)('ingredients')
        .optional()
        .isArray()
        .withMessage('Ingredients must be an array'),
    (0, express_validator_1.body)('dietaryRestrictions')
        .optional()
        .isArray()
        .withMessage('Dietary restrictions must be an array')
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
        const { category = 'dinner', difficulty = 'medium', prepTime = 30, ingredients = [], dietaryRestrictions = [], cuisineType = 'any' } = req.body;
        logger_1.logger.info('Generating new recipe', {
            operation: 'recipe_generate_start',
            component: 'recipe_management',
            userId,
            metadata: { category, difficulty, prepTime }
        });
        // Get user profile for personalized recipe generation
        const user = await prisma_1.prisma.userProfile.findUnique({
            where: { id: userId }
        });
        if (!user) {
            return res.status(404).json({
                error: 'User profile not found'
            });
        }
        // Generate recipe using OpenAI
        const generatedRecipe = await openaiService_1.openaiService.generateRecipe({
            category,
            difficulty,
            prepTime,
            ingredients,
            dietaryRestrictions: [...dietaryRestrictions, ...(user.dietaryPreferences || [])],
            cuisineType,
            servings: 4
        });
        // Calculate nutrition for the recipe
        const nutrition = calculateRecipeNutrition(generatedRecipe);
        // Save recipe to database
        const recipe = await prisma_1.prisma.recipe.create({
            data: {
                userId,
                name: generatedRecipe.name,
                description: generatedRecipe.description,
                category,
                difficulty,
                prepTime: generatedRecipe.prepTime || prepTime,
                cookTime: generatedRecipe.cookTime || 0,
                servings: generatedRecipe.servings || 4,
                ingredients: generatedRecipe.ingredients,
                instructions: generatedRecipe.instructions,
                nutrition: nutrition,
                imageUrl: generatedRecipe.imageUrl,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
        logger_1.logger.info('Recipe generated successfully', {
            operation: 'recipe_generate_success',
            component: 'recipe_management',
            userId,
            metadata: {
                recipeId: recipe.id,
                category,
                difficulty
            }
        });
        res.status(201).json(recipe);
    }
    catch (error) {
        logger_1.logger.error('Failed to generate recipe', {
            operation: 'recipe_generate_error',
            component: 'recipe_management',
            userId: req.user.id
        }, error);
        res.status(500).json({
            error: 'Failed to generate recipe',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Create/Save custom recipe
 */
router.post('/', auth_1.authenticate, [
    (0, express_validator_1.body)('name').isLength({ min: 1, max: 200 }).withMessage('Name is required and must be under 200 characters'),
    (0, express_validator_1.body)('description').optional().isLength({ max: 1000 }).withMessage('Description must be under 1000 characters'),
    (0, express_validator_1.body)('category')
        .isIn(['breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'side-dish'])
        .withMessage('Invalid category'),
    (0, express_validator_1.body)('difficulty')
        .isIn(['easy', 'medium', 'hard'])
        .withMessage('Invalid difficulty'),
    (0, express_validator_1.body)('prepTime').isInt({ min: 1, max: 300 }).withMessage('Prep time must be between 1 and 300 minutes'),
    (0, express_validator_1.body)('cookTime').optional().isInt({ min: 0, max: 600 }).withMessage('Cook time must be between 0 and 600 minutes'),
    (0, express_validator_1.body)('servings').isInt({ min: 1, max: 20 }).withMessage('Servings must be between 1 and 20'),
    (0, express_validator_1.body)('ingredients').isArray({ min: 1 }).withMessage('At least one ingredient is required'),
    (0, express_validator_1.body)('instructions').isArray({ min: 1 }).withMessage('At least one instruction is required')
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
        const { name, description, category, difficulty, prepTime, cookTime = 0, servings, ingredients, instructions, imageUrl } = req.body;
        // Calculate nutrition for the recipe
        const nutrition = calculateRecipeNutrition({ ingredients });
        const recipe = await prisma_1.prisma.recipe.create({
            data: {
                userId,
                name,
                description,
                category,
                difficulty,
                prepTime,
                cookTime,
                servings,
                ingredients,
                instructions,
                nutrition,
                imageUrl,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
        logger_1.logger.info('Recipe created', {
            operation: 'recipe_create',
            component: 'recipe_management',
            userId,
            metadata: { recipeId: recipe.id, category }
        });
        res.status(201).json(recipe);
    }
    catch (error) {
        logger_1.logger.error('Failed to create recipe', {
            operation: 'recipe_create_error',
            component: 'recipe_management',
            userId: req.user.id
        }, error);
        res.status(500).json({
            error: 'Failed to create recipe'
        });
    }
});
/**
 * Update existing recipe
 */
router.put('/:id', auth_1.authenticate, [
    (0, express_validator_1.param)('id').isInt().withMessage('Invalid recipe ID'),
    (0, express_validator_1.body)('name').optional().isLength({ min: 1, max: 200 }).withMessage('Name must be under 200 characters'),
    (0, express_validator_1.body)('description').optional().isLength({ max: 1000 }).withMessage('Description must be under 1000 characters'),
    (0, express_validator_1.body)('category')
        .optional()
        .isIn(['breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'side-dish'])
        .withMessage('Invalid category'),
    (0, express_validator_1.body)('difficulty')
        .optional()
        .isIn(['easy', 'medium', 'hard'])
        .withMessage('Invalid difficulty'),
    (0, express_validator_1.body)('prepTime').optional().isInt({ min: 1, max: 300 }).withMessage('Prep time must be between 1 and 300 minutes'),
    (0, express_validator_1.body)('cookTime').optional().isInt({ min: 0, max: 600 }).withMessage('Cook time must be between 0 and 600 minutes'),
    (0, express_validator_1.body)('servings').optional().isInt({ min: 1, max: 20 }).withMessage('Servings must be between 1 and 20'),
    (0, express_validator_1.body)('ingredients').optional().isArray().withMessage('Ingredients must be an array'),
    (0, express_validator_1.body)('instructions').optional().isArray().withMessage('Instructions must be an array')
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
        const recipeId = parseInt(req.params.id);
        const updateData = req.body;
        // Check if recipe exists and belongs to user
        const existingRecipe = await prisma_1.prisma.recipe.findFirst({
            where: { id: recipeId, userId }
        });
        if (!existingRecipe) {
            return res.status(404).json({
                error: 'Recipe not found'
            });
        }
        // Recalculate nutrition if ingredients changed
        if (updateData.ingredients) {
            updateData.nutrition = calculateRecipeNutrition({ ingredients: updateData.ingredients });
        }
        updateData.updatedAt = new Date();
        const updatedRecipe = await prisma_1.prisma.recipe.update({
            where: { id: recipeId },
            data: updateData
        });
        logger_1.logger.info('Recipe updated', {
            operation: 'recipe_update',
            component: 'recipe_management',
            userId,
            metadata: { recipeId }
        });
        res.json(updatedRecipe);
    }
    catch (error) {
        logger_1.logger.error('Failed to update recipe', {
            operation: 'recipe_update_error',
            component: 'recipe_management',
            userId: req.user.id
        }, error);
        res.status(500).json({
            error: 'Failed to update recipe'
        });
    }
});
/**
 * Delete recipe
 */
router.delete('/:id', auth_1.authenticate, [(0, express_validator_1.param)('id').isInt().withMessage('Invalid recipe ID')], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Invalid input',
                details: errors.array()
            });
        }
        const userId = req.user.id;
        const recipeId = parseInt(req.params.id);
        // Check if recipe exists and belongs to user
        const existingRecipe = await prisma_1.prisma.recipe.findFirst({
            where: { id: recipeId, userId }
        });
        if (!existingRecipe) {
            return res.status(404).json({
                error: 'Recipe not found'
            });
        }
        await prisma_1.prisma.recipe.delete({
            where: { id: recipeId }
        });
        logger_1.logger.info('Recipe deleted', {
            operation: 'recipe_delete',
            component: 'recipe_management',
            userId,
            metadata: { recipeId }
        });
        res.status(204).send();
    }
    catch (error) {
        logger_1.logger.error('Failed to delete recipe', {
            operation: 'recipe_delete_error',
            component: 'recipe_management',
            userId: req.user.id
        }, error);
        res.status(500).json({
            error: 'Failed to delete recipe'
        });
    }
});
/**
 * Duplicate recipe
 */
router.post('/:id/duplicate', auth_1.authenticate, [(0, express_validator_1.param)('id').isInt().withMessage('Invalid recipe ID')], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Invalid input',
                details: errors.array()
            });
        }
        const userId = req.user.id;
        const recipeId = parseInt(req.params.id);
        // Get original recipe
        const originalRecipe = await prisma_1.prisma.recipe.findFirst({
            where: { id: recipeId, userId }
        });
        if (!originalRecipe) {
            return res.status(404).json({
                error: 'Recipe not found'
            });
        }
        // Create duplicate with modified name
        const duplicatedRecipe = await prisma_1.prisma.recipe.create({
            data: {
                userId,
                name: `${originalRecipe.name} (Copy)`,
                description: originalRecipe.description,
                category: originalRecipe.category,
                difficulty: originalRecipe.difficulty,
                prepTime: originalRecipe.prepTime,
                cookTime: originalRecipe.cookTime,
                servings: originalRecipe.servings,
                ingredients: originalRecipe.ingredients,
                instructions: originalRecipe.instructions,
                nutrition: originalRecipe.nutrition,
                imageUrl: originalRecipe.imageUrl,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
        logger_1.logger.info('Recipe duplicated', {
            operation: 'recipe_duplicate',
            component: 'recipe_management',
            userId,
            metadata: {
                originalId: recipeId,
                duplicateId: duplicatedRecipe.id
            }
        });
        res.status(201).json(duplicatedRecipe);
    }
    catch (error) {
        logger_1.logger.error('Failed to duplicate recipe', {
            operation: 'recipe_duplicate_error',
            component: 'recipe_management',
            userId: req.user.id
        }, error);
        res.status(500).json({
            error: 'Failed to duplicate recipe'
        });
    }
});
/**
 * Search recipes by ingredients
 */
router.post('/search', auth_1.authenticate, [
    (0, express_validator_1.body)('ingredients').isArray({ min: 1 }).withMessage('At least one ingredient is required'),
    (0, express_validator_1.body)('maxPrepTime').optional().isInt({ min: 5, max: 300 }).withMessage('Max prep time must be between 5 and 300 minutes'),
    (0, express_validator_1.body)('difficulty').optional().isIn(['easy', 'medium', 'hard']).withMessage('Invalid difficulty')
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
        const { ingredients, maxPrepTime, difficulty, category } = req.body;
        // Build search query
        const where = { userId };
        if (maxPrepTime) {
            where.prepTime = { lte: maxPrepTime };
        }
        if (difficulty) {
            where.difficulty = difficulty;
        }
        if (category) {
            where.category = category;
        }
        // Find recipes that contain any of the specified ingredients
        const recipes = await prisma_1.prisma.recipe.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
        // Filter recipes that contain the specified ingredients
        const matchingRecipes = recipes.filter(recipe => {
            const recipeIngredients = recipe.ingredients;
            return ingredients.some((searchIngredient) => recipeIngredients.some((recipeIngredient) => { var _a; return (_a = recipeIngredient.name) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(searchIngredient.toLowerCase()); }));
        });
        logger_1.logger.info('Recipe search completed', {
            operation: 'recipe_search',
            component: 'recipe_management',
            userId,
            metadata: {
                searchedIngredients: ingredients.length,
                foundRecipes: matchingRecipes.length
            }
        });
        res.json({
            recipes: matchingRecipes,
            searchCriteria: { ingredients, maxPrepTime, difficulty, category }
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to search recipes', {
            operation: 'recipe_search_error',
            component: 'recipe_management',
            userId: req.user.id
        }, error);
        res.status(500).json({
            error: 'Failed to search recipes'
        });
    }
});
/**
 * Calculate nutrition information for a recipe
 */
function calculateRecipeNutrition(recipe) {
    if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) {
        return {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sugar: 0,
            sodium: 0
        };
    }
    const nutrition = recipe.ingredients.reduce((total, ingredient) => {
        const quantity = ingredient.quantity || 1;
        const multiplier = quantity / (ingredient.servingSize || 1);
        return {
            calories: total.calories + ((ingredient.calories || 0) * multiplier),
            protein: total.protein + ((ingredient.protein || 0) * multiplier),
            carbs: total.carbs + ((ingredient.carbs || 0) * multiplier),
            fat: total.fat + ((ingredient.fat || 0) * multiplier),
            fiber: total.fiber + ((ingredient.fiber || 0) * multiplier),
            sugar: total.sugar + ((ingredient.sugar || 0) * multiplier),
            sodium: total.sodium + ((ingredient.sodium || 0) * multiplier)
        };
    }, {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0
    });
    // Round to 2 decimal places
    Object.keys(nutrition).forEach(key => {
        nutrition[key] = Math.round(nutrition[key] * 100) / 100;
    });
    return nutrition;
}
exports.default = router;
