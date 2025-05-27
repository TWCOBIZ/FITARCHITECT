import { FoodEntry } from '../types/nutrition'

const OPENFOODFACTS_API_URL = 'https://world.openfoodfacts.org/api/v2'

interface OpenFoodFactsProduct {
  product_name: string
  nutriments: {
    'energy-kcal_100g': number
    proteins_100g: number
    carbohydrates_100g: number
    fat_100g: number
    fiber_100g?: number
    sugars_100g?: number
    sodium_100g?: number
    cholesterol_100g?: number
  }
  serving_size?: string
  serving_quantity?: number
  ingredients_tags?: string[]
  allergens_tags?: string[]
  labels_tags?: string[]
  nutriment_levels?: Record<string, string>
  vitamins_tags?: string[]
  minerals_tags?: string[]
}

const DIETARY_RESTRICTIONS_MAP: Record<string, string[]> = {
  'Vegetarian': ['en:vegetarian'],
  'Vegan': ['en:vegan'],
  'Gluten-Free': ['en:gluten-free'],
  'Dairy-Free': ['en:dairy-free'],
  'Keto': ['en:keto'],
  'Paleo': ['en:paleo'],
  'Low-Carb': ['en:low-carb'],
  'Low-Fat': ['en:low-fat'],
  'High-Protein': ['en:high-protein'],
  'Halal': ['en:halal'],
  'Kosher': ['en:kosher']
}

const ALLERGENS_MAP: Record<string, string[]> = {
  'Peanuts': ['en:peanuts'],
  'Tree Nuts': ['en:tree-nuts'],
  'Milk': ['en:milk'],
  'Eggs': ['en:eggs'],
  'Soy': ['en:soy'],
  'Wheat': ['en:wheat'],
  'Fish': ['en:fish'],
  'Shellfish': ['en:shellfish'],
  'Sesame': ['en:sesame']
}

const mapOpenFoodFactsToFoodEntry = (product: OpenFoodFactsProduct): FoodEntry => {
  const nutriments = product.nutriments
  const servingSize = product.serving_size || '100'
  const servingUnit = servingSize.includes('g') ? 'g' : 'ml'

  // Map dietary restrictions
  const dietaryRestrictions: string[] = []
  if (product.labels_tags) {
    Object.entries(DIETARY_RESTRICTIONS_MAP).forEach(([restriction, tags]) => {
      if (tags.some(tag => product.labels_tags?.includes(tag))) {
        dietaryRestrictions.push(restriction)
      }
    })
  }

  // Map allergens
  const allergens: string[] = []
  if (product.allergens_tags) {
    Object.entries(ALLERGENS_MAP).forEach(([allergen, tags]) => {
      if (tags.some(tag => product.allergens_tags?.includes(tag))) {
        allergens.push(allergen)
      }
    })
  }

  // Map nutrition facts
  const nutritionFacts = {
    fiber: nutriments.fiber_100g,
    sugar: nutriments.sugars_100g,
    sodium: nutriments.sodium_100g,
    cholesterol: nutriments.cholesterol_100g,
    vitamins: product.vitamins_tags?.reduce((acc, tag) => {
      const [_, vitamin] = tag.split(':')
      return { ...acc, [vitamin]: 0 } // TODO: Get actual vitamin values
    }, {}),
    minerals: product.minerals_tags?.reduce((acc, tag) => {
      const [_, mineral] = tag.split(':')
      return { ...acc, [mineral]: 0 } // TODO: Get actual mineral values
    }, {})
  }

  return {
    name: product.product_name,
    calories: Math.round(nutriments['energy-kcal_100g']),
    protein: Math.round(nutriments.proteins_100g * 10) / 10,
    carbs: Math.round(nutriments.carbohydrates_100g * 10) / 10,
    fat: Math.round(nutriments.fat_100g * 10) / 10,
    servingSize,
    servingUnit,
    dietaryRestrictions,
    allergens,
    ingredients: product.ingredients_tags?.map(tag => tag.replace('en:', '')),
    nutritionFacts
  }
}

export const openFoodFactsService = {
  async searchFood(query: string): Promise<FoodEntry[]> {
    try {
      const response = await fetch(
        `${OPENFOODFACTS_API_URL}/search?search_terms=${encodeURIComponent(query)}&page_size=20`
      )
      const data = await response.json()
      
      if (!data.products) {
        return []
      }

      return data.products
        .filter((product: OpenFoodFactsProduct) => 
          product.product_name && 
          product.nutriments && 
          product.nutriments['energy-kcal_100g']
        )
        .map(mapOpenFoodFactsToFoodEntry)
    } catch (error) {
      console.error('Error searching foods:', error)
      return []
    }
  },

  async getFoodByBarcode(barcode: string): Promise<FoodEntry | null> {
    try {
      const response = await fetch(`${OPENFOODFACTS_API_URL}/product/${barcode}`)
      const data = await response.json()
      
      if (!data.product) {
        return null
      }

      return mapOpenFoodFactsToFoodEntry(data.product)
    } catch (error) {
      console.error('Error fetching food by barcode:', error)
      return null
    }
  }
} 