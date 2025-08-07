import { FoodEntry } from '../types/nutrition'
import { api } from './api'
import { foodSearchCache, barcodeCache } from './frontendCacheService'

interface FoodSearchResult {
  foods: FoodEntry[];
  page: number;
  totalPages: number;
  totalResults: number;
}

class OpenFoodFactsService {
  /**
   * Get food information by barcode (Premium feature)
   * Goes through backend for subscription validation
   */
  async getFoodByBarcode(barcode: string): Promise<FoodEntry | null> {
    try {
      // Check frontend cache first
      const cached = barcodeCache.get(barcode);
      if (cached) {
        console.log(`🎯 Frontend cache hit for barcode: ${barcode}`);
        return cached;
      }

      const response = await api.get(`/api/food/barcode/${barcode}`)
      
      const data = response.data
      
      // Transform to FoodEntry format
      const foodEntry: FoodEntry = {
        name: data.name,
        barcode: data.barcode,
        calories: data.calories,
        protein: data.protein,
        carbs: data.carbs,
        fat: data.fat,
        fiber: data.fiber || 0,
        sugars: data.sugars || 0,
        sodium: data.sodium || 0,
        servingSize: data.servingSize,
        servingUnit: data.servingUnit,
        brand: data.brand,
        date: new Date().toISOString(),
        mealType: 'snack', // Default, can be changed by user
        quantity: 1
      }
      
      // Cache the result
      barcodeCache.set(barcode, foodEntry);
      console.log(`💾 Cached barcode result: ${barcode}`);
      
      return foodEntry
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null
      }
      if (error.response?.status === 403) {
        throw new Error('Premium subscription required for barcode scanning')
      }
      throw error
    }
  }
  
  /**
   * Search foods by name (Available to all users)
   * Goes through backend for authentication
   */
  async searchFoods(query: string, page: number = 1): Promise<FoodSearchResult> {
    try {
      // Check frontend cache first
      const cached = foodSearchCache.get(query, page);
      if (cached) {
        console.log(`🎯 Frontend cache hit for search: ${query} (page ${page})`);
        return cached;
      }

      const response = await api.get('/api/food/search', {
        params: { q: query, page }
      })
      
      const data = response.data
      
      // Transform foods to FoodEntry format
      const foods: FoodEntry[] = data.foods.map((food: any) => ({
        name: food.name,
        barcode: food.barcode,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        fiber: food.fiber || 0,
        sugars: food.sugars || 0,
        sodium: food.sodium || 0,
        servingSize: food.servingSize,
        servingUnit: food.servingUnit,
        brand: food.brand,
        image: food.image,
        date: new Date().toISOString(),
        mealType: 'snack',
        quantity: 1
      }))
      
      const result = {
        foods,
        page: data.page,
        totalPages: data.totalPages,
        totalResults: data.totalResults
      }
      
      // Cache the result
      foodSearchCache.set(query, page, result);
      console.log(`💾 Cached search result: ${query} (page ${page})`);
      
      return result
    } catch (error) {
      console.error('Failed to search foods:', error)
      throw new Error('Failed to search foods. Please try again.')
    }
  }
  
  /**
   * Get dietary information from food data
   */
  getDietaryInfo(food: FoodEntry): {
    restrictions: string[];
    allergens: string[];
    healthScore: number;
  } {
    // Basic implementation - would be enhanced with actual data
    const restrictions: string[] = []
    const allergens: string[] = []
    
    // Calculate basic health score
    const healthScore = this.calculateHealthScore(food)
    
    return {
      restrictions,
      allergens,
      healthScore
    }
  }
  
  private calculateHealthScore(food: FoodEntry): number {
    let score = 5 // Base score
    
    // Positive factors
    if (food.fiber && food.fiber > 3) score += 1
    if (food.protein && food.protein > 10) score += 1
    
    // Negative factors
    if (food.sugars && food.sugars > 10) score -= 1
    if (food.sodium && food.sodium > 500) score -= 1
    if (food.fat && food.fat > 20) score -= 1
    
    // Keep score between 1-10
    return Math.max(1, Math.min(10, score))
  }
}

export const openFoodFactsService = new OpenFoodFactsService()