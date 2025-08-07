import { Router, Response } from 'express';
import { authenticate, requireSubscription, AuthenticatedRequest } from '../auth';
import { logger } from '../utils/logger';
import axios from 'axios';

const router = Router();

const OPENFOODFACTS_API_URL = 'https://world.openfoodfacts.org';

interface OpenFoodFactsProduct {
  product_name: string;
  nutriments: {
    'energy-kcal_100g': number;
    proteins_100g: number;
    carbohydrates_100g: number;
    fat_100g: number;
    fiber_100g?: number;
    sugars_100g?: number;
    sodium_100g?: number;
  };
  serving_size?: string;
  serving_quantity?: number;
  ingredients_tags?: string[];
  allergens_tags?: string[];
  labels_tags?: string[];
}

/**
 * Get food information by barcode
 * Requires premium subscription
 */
router.get('/barcode/:barcode',
  authenticate,
  requireSubscription('premium'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { barcode } = req.params;
      const userId = req.user!.id;

      if (!barcode || !/^\d+$/.test(barcode)) {
        return res.status(400).json({
          error: 'Invalid barcode format',
          code: 'INVALID_BARCODE'
        });
      }

      logger.info('Food barcode scan requested', {
        operation: 'food_barcode_scan',
        component: 'food_scan',
        userId,
        metadata: { barcode }
      });

      // Call Open Food Facts API
      const response = await axios.get(`${OPENFOODFACTS_API_URL}/api/v0/product/${barcode}.json`);
      
      if (response.data.status !== 1 || !response.data.product) {
        logger.warn('Food not found for barcode', {
          operation: 'food_barcode_not_found',
          component: 'food_scan',
          userId,
          metadata: { barcode }
        });
        
        return res.status(404).json({
          error: 'Food not found',
          code: 'FOOD_NOT_FOUND'
        });
      }

      const product: OpenFoodFactsProduct = response.data.product;
      
      // Transform to our food entry format
      const foodEntry = {
        name: product.product_name || 'Unknown Product',
        barcode,
        calories: Math.round(product.nutriments['energy-kcal_100g'] || 0),
        protein: Math.round(product.nutriments.proteins_100g || 0),
        carbs: Math.round(product.nutriments.carbohydrates_100g || 0),
        fat: Math.round(product.nutriments.fat_100g || 0),
        fiber: Math.round(product.nutriments.fiber_100g || 0),
        sugars: Math.round(product.nutriments.sugars_100g || 0),
        sodium: Math.round(product.nutriments.sodium_100g || 0),
        servingSize: 100,
        servingUnit: 'g',
        brand: response.data.product.brands || '',
        ingredients: product.ingredients_tags || [],
        allergens: product.allergens_tags || [],
        labels: product.labels_tags || []
      };

      logger.info('Food barcode scan successful', {
        operation: 'food_barcode_success',
        component: 'food_scan',
        userId,
        metadata: { 
          barcode,
          productName: foodEntry.name,
          calories: foodEntry.calories
        }
      });

      res.json(foodEntry);
    } catch (error) {
      logger.error('Food barcode scan failed', {
        operation: 'food_barcode_error',
        component: 'food_scan',
        userId: req.user!.id
      }, error as Error);

      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return res.status(404).json({
          error: 'Food not found',
          code: 'FOOD_NOT_FOUND'
        });
      }

      res.status(500).json({
        error: 'Failed to fetch food information',
        code: 'FOOD_SCAN_ERROR'
      });
    }
  }
);

// Helper function for USDA Food Data Central fallback
async function searchUSDAFoods(query: string) {
  try {
    // USDA Food Data Central API (free, no API key required for basic search)
    const usdaUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=10&dataType=Foundation,SR%20Legacy`;
    
    const response = await axios.get(usdaUrl);
    const data = response.data;

    if (!data.foods || data.foods.length === 0) {
      return [];
    }

    return data.foods.map((food: any) => {
      const nutrients = food.foodNutrients || [];
      
      // Extract key nutrients by nutrient ID
      const getNutrient = (id: number) => {
        const nutrient = nutrients.find((n: any) => n.nutrientId === id);
        return nutrient ? parseFloat((nutrient.value || 0).toFixed(1)) : 0;
      };

      return {
        name: food.description || 'Unknown Food',
        barcode: null,
        brand: food.brandOwner || null,
        image: null,
        calories: Math.round(getNutrient(1008)), // Energy (kcal)
        protein: getNutrient(1003), // Protein
        carbs: getNutrient(1005), // Carbohydrates
        fat: getNutrient(1004), // Total fat
        fiber: getNutrient(1079), // Fiber
        sugars: getNutrient(2000), // Total sugars
        sodium: getNutrient(1093) / 1000, // Sodium (convert mg to g)
        servingSize: '100',
        servingUnit: 'g',
        dataSource: 'USDA'
      };
    }).filter((food: any) => food.calories > 0 || food.protein > 0 || food.carbs > 0 || food.fat > 0);

  } catch (error) {
    logger.error('USDA search error', {
      operation: 'usda_search_error',
      component: 'food_scan'
    }, error as Error);
    return [];
  }
}

/**
 * Search foods by name with fallback system
 * Available to all authenticated users
 */
router.get('/search',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { q, page = 1 } = req.query;
      const userId = req.user!.id;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({
          error: 'Search query is required',
          code: 'MISSING_QUERY'
        });
      }

      logger.info('Food search requested', {
        operation: 'food_search',
        component: 'food_scan',
        userId,
        metadata: { query: q, page }
      });

      let foods: any[] = [];
      let totalResults = 0;
      let dataSource = 'Open Food Facts';

      try {
        // Primary: Open Food Facts API with correct endpoint
        const searchUrl = `${OPENFOODFACTS_API_URL}/cgi/search.pl`;
        const response = await axios.get(searchUrl, {
          params: {
            search_terms: q,
            search_simple: 1,
            action: 'process',
            json: 1,
            page_size: 20,
            page: page,
            fields: 'product_name,code,nutriscore_grade,nutriments,brands,image_url,categories'
          },
          headers: {
            'User-Agent': 'FitArchitect/1.0 (https://fitarchitect.com)'
          }
        });

        if (response.data.products && response.data.products.length > 0) {
          // Transform Open Food Facts data and filter out empty nutrition
          foods = response.data.products
            .filter((product: any) => product.product_name && product.nutriments)
            .map((product: any) => {
              const nutriments = product.nutriments || {};
              
              return {
                name: product.product_name || 'Unknown Food',
                barcode: product.code || null,
                brand: product.brands || null,
                image: product.image_url || null,
                calories: Math.round(nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0),
                protein: parseFloat((nutriments['proteins_100g'] || nutriments['proteins'] || 0).toFixed(1)),
                carbs: parseFloat((nutriments['carbohydrates_100g'] || nutriments['carbohydrates'] || 0).toFixed(1)),
                fat: parseFloat((nutriments['fat_100g'] || nutriments['fat'] || 0).toFixed(1)),
                fiber: parseFloat((nutriments['fiber_100g'] || nutriments['fiber'] || 0).toFixed(1)),
                sugars: parseFloat((nutriments['sugars_100g'] || nutriments['sugars'] || 0).toFixed(1)),
                sodium: parseFloat((nutriments['sodium_100g'] || nutriments['sodium'] || 0).toFixed(1)),
                servingSize: '100',
                servingUnit: 'g',
                dataSource: 'Open Food Facts'
              };
            })
            .filter((food: any) => food.calories > 0 || food.protein > 0 || food.carbs > 0 || food.fat > 0);

          totalResults = response.data.count || 0;
          logger.info(`Open Food Facts: Found ${foods.length} foods`);
        }
      } catch (error) {
        logger.warn(`Open Food Facts failed, trying USDA fallback:`, {
          operation: 'openfoodfacts_fallback',
          component: 'food_scan'
        });
      }

      // Fallback: If we have less than 5 results, try USDA
      if (foods.length < 5) {
        try {
          const usdaFoods = await searchUSDAFoods(q);
          if (usdaFoods.length > 0) {
            foods = [...foods, ...usdaFoods.slice(0, 20 - foods.length)];
            dataSource = foods.length === usdaFoods.length ? 'USDA' : 'Mixed Sources';
            logger.info(`USDA Fallback: Added ${usdaFoods.length} foods`);
          }
        } catch (error) {
          logger.warn(`USDA fallback also failed:`, {
            operation: 'usda_fallback_failed',
            component: 'food_scan'
          });
        }
      }

      // Final fallback: Common foods with accurate data
      if (foods.length === 0) {
        const commonFoods = [
          { name: 'Banana, raw', calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3, fiber: 2.6, sugars: 12.2, sodium: 0.001 },
          { name: 'Apple, raw', calories: 52, protein: 0.3, carbs: 13.8, fat: 0.2, fiber: 2.4, sugars: 10.4, sodium: 0.001 },
          { name: 'Chicken breast, cooked', calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugars: 0, sodium: 0.074 },
          { name: 'Greek yogurt, plain', calories: 59, protein: 10, carbs: 3.6, fat: 0.4, fiber: 0, sugars: 3.6, sodium: 0.036 },
          { name: 'Rice, brown, cooked', calories: 111, protein: 2.6, carbs: 22, fat: 0.9, fiber: 1.8, sugars: 0.4, sodium: 0.005 }
        ].filter(food => food.name.toLowerCase().includes(q.toLowerCase()));

        if (commonFoods.length > 0) {
          foods = commonFoods.map(food => ({
            ...food,
            barcode: null,
            brand: null,
            image: null,
            servingSize: '100',
            servingUnit: 'g',
            dataSource: 'Built-in Database'
          }));
          dataSource = 'Built-in Database';
          logger.info(`Built-in Database: Found ${foods.length} common foods`);
        }
      }

      logger.info('Food search successful', {
        operation: 'food_search_success',
        component: 'food_scan',
        userId,
        metadata: { 
          query: q,
          resultsCount: foods.length,
          dataSource
        }
      });

      res.json({
        foods,
        page: parseInt(page as string),
        totalPages: Math.ceil(totalResults / 20) || 1,
        totalResults: totalResults || foods.length,
        dataSource
      });
    } catch (error) {
      logger.error('Food search failed', {
        operation: 'food_search_error',
        component: 'food_scan',
        userId: req.user!.id
      }, error as Error);

      res.status(500).json({
        error: 'Failed to search foods',
        code: 'FOOD_SEARCH_ERROR',
        foods: [],
        page: 1,
        totalPages: 0,
        totalResults: 0
      });
    }
  }
);

export default router;