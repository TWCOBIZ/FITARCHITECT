import { Router, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticate, AuthenticatedRequest } from '../auth';
import { prisma } from '../db/prisma';
import { openaiService } from '../services/openaiService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Get all recipes for authenticated user
 * Guest users get sample recipes
 */
router.get('/',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const isGuest = req.user!.type === 'guest';
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
      
      const where: any = { userId };
      if (category && typeof category === 'string') {
        where.category = category;
      }
      if (difficulty && typeof difficulty === 'string') {
        where.difficulty = difficulty;
      }

      const recipes = await prisma.recipe.findMany({
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

      const total = await prisma.recipe.count({ where });

      logger.info('Recipes retrieved', {
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
    } catch (error) {
      logger.error('Failed to get recipes', {
        operation: 'recipes_get_error',
        component: 'recipe_management',
        userId: req.user!.id
      }, error as Error);

      res.status(500).json({
        error: 'Failed to retrieve recipes'
      });
    }
  }
);

/**
 * Get specific recipe by ID with full details
 */
router.get('/:id',
  authenticate,
  [param('id').isInt().withMessage('Invalid recipe ID')],
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
      const recipeId = parseInt(req.params.id);

      const recipe = await prisma.recipe.findFirst({
        where: { id: recipeId, userId }
      });

      if (!recipe) {
        return res.status(404).json({
          error: 'Recipe not found'
        });
      }

      logger.info('Recipe retrieved', {
        operation: 'recipe_get',
        component: 'recipe_management',
        userId,
        metadata: { recipeId }
      });

      res.json(recipe);
    } catch (error) {
      logger.error('Failed to get recipe', {
        operation: 'recipe_get_error',
        component: 'recipe_management',
        userId: req.user!.id
      }, error as Error);

      res.status(500).json({
        error: 'Failed to retrieve recipe'
      });
    }
  }
);

/**
 * Generate new AI recipe
 */
router.post('/generate',
  authenticate,
  [
    body('category')
      .optional()
      .isIn(['breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'side-dish'])
      .withMessage('Invalid category'),
    body('difficulty')
      .optional()
      .isIn(['easy', 'medium', 'hard'])
      .withMessage('Invalid difficulty'),
    body('prepTime')
      .optional()
      .isInt({ min: 5, max: 300 })
      .withMessage('Prep time must be between 5 and 300 minutes'),
    body('ingredients')
      .optional()
      .isArray()
      .withMessage('Ingredients must be an array'),
    body('dietaryRestrictions')
      .optional()
      .isArray()
      .withMessage('Dietary restrictions must be an array')
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
      const { 
        category = 'dinner', 
        difficulty = 'medium',
        prepTime = 30,
        ingredients = [],
        dietaryRestrictions = [],
        cuisineType = 'any'
      } = req.body;

      logger.info('Generating new recipe', {
        operation: 'recipe_generate_start',
        component: 'recipe_management',
        userId,
        metadata: { category, difficulty, prepTime }
      });

      // Get user profile for personalized recipe generation
      const user = await prisma.userProfile.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({
          error: 'User profile not found'
        });
      }

      // Generate recipe using OpenAI
      const generatedRecipe = await openaiService.generateRecipe({
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
      const recipe = await prisma.recipe.create({
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

      logger.info('Recipe generated successfully', {
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
    } catch (error) {
      logger.error('Failed to generate recipe', {
        operation: 'recipe_generate_error',
        component: 'recipe_management',
        userId: req.user!.id
      }, error as Error);

      res.status(500).json({
        error: 'Failed to generate recipe',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Create/Save custom recipe
 */
router.post('/',
  authenticate,
  [
    body('name').isLength({ min: 1, max: 200 }).withMessage('Name is required and must be under 200 characters'),
    body('description').optional().isLength({ max: 1000 }).withMessage('Description must be under 1000 characters'),
    body('category')
      .isIn(['breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'side-dish'])
      .withMessage('Invalid category'),
    body('difficulty')
      .isIn(['easy', 'medium', 'hard'])
      .withMessage('Invalid difficulty'),
    body('prepTime').isInt({ min: 1, max: 300 }).withMessage('Prep time must be between 1 and 300 minutes'),
    body('cookTime').optional().isInt({ min: 0, max: 600 }).withMessage('Cook time must be between 0 and 600 minutes'),
    body('servings').isInt({ min: 1, max: 20 }).withMessage('Servings must be between 1 and 20'),
    body('ingredients').isArray({ min: 1 }).withMessage('At least one ingredient is required'),
    body('instructions').isArray({ min: 1 }).withMessage('At least one instruction is required')
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
      const {
        name,
        description,
        category,
        difficulty,
        prepTime,
        cookTime = 0,
        servings,
        ingredients,
        instructions,
        imageUrl
      } = req.body;

      // Calculate nutrition for the recipe
      const nutrition = calculateRecipeNutrition({ ingredients });

      const recipe = await prisma.recipe.create({
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

      logger.info('Recipe created', {
        operation: 'recipe_create',
        component: 'recipe_management',
        userId,
        metadata: { recipeId: recipe.id, category }
      });

      res.status(201).json(recipe);
    } catch (error) {
      logger.error('Failed to create recipe', {
        operation: 'recipe_create_error',
        component: 'recipe_management',
        userId: req.user!.id
      }, error as Error);

      res.status(500).json({
        error: 'Failed to create recipe'
      });
    }
  }
);

/**
 * Update existing recipe
 */
router.put('/:id',
  authenticate,
  [
    param('id').isInt().withMessage('Invalid recipe ID'),
    body('name').optional().isLength({ min: 1, max: 200 }).withMessage('Name must be under 200 characters'),
    body('description').optional().isLength({ max: 1000 }).withMessage('Description must be under 1000 characters'),
    body('category')
      .optional()
      .isIn(['breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'side-dish'])
      .withMessage('Invalid category'),
    body('difficulty')
      .optional()
      .isIn(['easy', 'medium', 'hard'])
      .withMessage('Invalid difficulty'),
    body('prepTime').optional().isInt({ min: 1, max: 300 }).withMessage('Prep time must be between 1 and 300 minutes'),
    body('cookTime').optional().isInt({ min: 0, max: 600 }).withMessage('Cook time must be between 0 and 600 minutes'),
    body('servings').optional().isInt({ min: 1, max: 20 }).withMessage('Servings must be between 1 and 20'),
    body('ingredients').optional().isArray().withMessage('Ingredients must be an array'),
    body('instructions').optional().isArray().withMessage('Instructions must be an array')
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
      const recipeId = parseInt(req.params.id);
      const updateData = req.body;

      // Check if recipe exists and belongs to user
      const existingRecipe = await prisma.recipe.findFirst({
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

      const updatedRecipe = await prisma.recipe.update({
        where: { id: recipeId },
        data: updateData
      });

      logger.info('Recipe updated', {
        operation: 'recipe_update',
        component: 'recipe_management',
        userId,
        metadata: { recipeId }
      });

      res.json(updatedRecipe);
    } catch (error) {
      logger.error('Failed to update recipe', {
        operation: 'recipe_update_error',
        component: 'recipe_management',
        userId: req.user!.id
      }, error as Error);

      res.status(500).json({
        error: 'Failed to update recipe'
      });
    }
  }
);

/**
 * Delete recipe
 */
router.delete('/:id',
  authenticate,
  [param('id').isInt().withMessage('Invalid recipe ID')],
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
      const recipeId = parseInt(req.params.id);

      // Check if recipe exists and belongs to user
      const existingRecipe = await prisma.recipe.findFirst({
        where: { id: recipeId, userId }
      });

      if (!existingRecipe) {
        return res.status(404).json({
          error: 'Recipe not found'
        });
      }

      await prisma.recipe.delete({
        where: { id: recipeId }
      });

      logger.info('Recipe deleted', {
        operation: 'recipe_delete',
        component: 'recipe_management',
        userId,
        metadata: { recipeId }
      });

      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete recipe', {
        operation: 'recipe_delete_error',
        component: 'recipe_management',
        userId: req.user!.id
      }, error as Error);

      res.status(500).json({
        error: 'Failed to delete recipe'
      });
    }
  }
);

/**
 * Duplicate recipe
 */
router.post('/:id/duplicate',
  authenticate,
  [param('id').isInt().withMessage('Invalid recipe ID')],
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
      const recipeId = parseInt(req.params.id);

      // Get original recipe
      const originalRecipe = await prisma.recipe.findFirst({
        where: { id: recipeId, userId }
      });

      if (!originalRecipe) {
        return res.status(404).json({
          error: 'Recipe not found'
        });
      }

      // Create duplicate with modified name
      const duplicatedRecipe = await prisma.recipe.create({
        data: {
          userId,
          name: `${originalRecipe.name} (Copy)`,
          description: originalRecipe.description,
          category: originalRecipe.category,
          difficulty: originalRecipe.difficulty,
          prepTime: originalRecipe.prepTime,
          cookTime: originalRecipe.cookTime,
          servings: originalRecipe.servings,
          ingredients: originalRecipe.ingredients as any,
          instructions: originalRecipe.instructions as any,
          nutrition: originalRecipe.nutrition as any,
          imageUrl: originalRecipe.imageUrl,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      logger.info('Recipe duplicated', {
        operation: 'recipe_duplicate',
        component: 'recipe_management',
        userId,
        metadata: { 
          originalId: recipeId,
          duplicateId: duplicatedRecipe.id
        }
      });

      res.status(201).json(duplicatedRecipe);
    } catch (error) {
      logger.error('Failed to duplicate recipe', {
        operation: 'recipe_duplicate_error',
        component: 'recipe_management',
        userId: req.user!.id
      }, error as Error);

      res.status(500).json({
        error: 'Failed to duplicate recipe'
      });
    }
  }
);

/**
 * Search recipes by ingredients
 */
router.post('/search',
  authenticate,
  [
    body('ingredients').isArray({ min: 1 }).withMessage('At least one ingredient is required'),
    body('maxPrepTime').optional().isInt({ min: 5, max: 300 }).withMessage('Max prep time must be between 5 and 300 minutes'),
    body('difficulty').optional().isIn(['easy', 'medium', 'hard']).withMessage('Invalid difficulty')
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
      const { ingredients, maxPrepTime, difficulty, category } = req.body;

      // Build search query
      const where: any = { userId };
      
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
      const recipes = await prisma.recipe.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });

      // Filter recipes that contain the specified ingredients
      const matchingRecipes = recipes.filter(recipe => {
        const recipeIngredients = recipe.ingredients as any[];
        return ingredients.some((searchIngredient: string) =>
          recipeIngredients.some((recipeIngredient: any) =>
            recipeIngredient.name?.toLowerCase().includes(searchIngredient.toLowerCase())
          )
        );
      });

      logger.info('Recipe search completed', {
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
    } catch (error) {
      logger.error('Failed to search recipes', {
        operation: 'recipe_search_error',
        component: 'recipe_management',
        userId: req.user!.id
      }, error as Error);

      res.status(500).json({
        error: 'Failed to search recipes'
      });
    }
  }
);

/**
 * Calculate nutrition information for a recipe
 */
function calculateRecipeNutrition(recipe: any): any {
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

  const nutrition = recipe.ingredients.reduce((total: any, ingredient: any) => {
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

export default router;