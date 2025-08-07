/**
 * Smart Exercise Matching Logic
 * 
 * Provides intelligent matching between exercise names and available GIFs
 * with category awareness and preference handling
 */

import { 
  filenameToExerciseName, 
  generateExerciseVariations, 
  calculateNameSimilarity,
  extractCategoryFromPath 
} from './filenameNormalization'

export interface GifFileInfo {
  filename: string
  path: string
  exerciseName: string
  category: string
  similarity?: number
}

export interface ExerciseMatchResult {
  gifPath: string | null
  confidence: number // 0-1
  matchType: 'exact' | 'variation' | 'fuzzy' | 'category_fallback' | 'none'
  alternativeMatches?: GifFileInfo[]
}

export interface ExerciseContext {
  category?: 'warmup' | 'strength' | 'cardio' | 'cooldown' | 'flexibility' | 'plyometric'
  muscleGroups?: string[]
  equipment?: string[]
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
}

/**
 * Smart exercise matching with category awareness and preference handling
 */
export class ExerciseMatchingEngine {
  private availableGifs: GifFileInfo[] = []
  private exerciseVariationCache = new Map<string, string[]>()
  
  /**
   * Initialize the matching engine with available GIF files
   */
  setAvailableGifs(gifFiles: Array<{ filename: string, path: string }>): void {
    this.availableGifs = gifFiles.map(gif => ({
      filename: gif.filename,
      path: gif.path,
      exerciseName: filenameToExerciseName(gif.filename),
      category: extractCategoryFromPath(gif.path)
    }))
    
    // Clear cache when GIFs change
    this.exerciseVariationCache.clear()
  }
  
  /**
   * Find the best matching GIF for an exercise with context awareness
   */
  findBestMatch(
    exerciseName: string, 
    context?: ExerciseContext
  ): ExerciseMatchResult {
    if (this.availableGifs.length === 0) {
      return { gifPath: null, confidence: 0, matchType: 'none' }
    }
    
    // Try different matching strategies in order of preference
    const strategies = [
      () => this.findExactMatch(exerciseName, context),
      () => this.findVariationMatch(exerciseName, context),
      () => this.findFuzzyMatch(exerciseName, context),
      () => this.findCategoryFallback(exerciseName, context)
    ]
    
    for (const strategy of strategies) {
      const result = strategy()
      if (result.gifPath && result.confidence > 0.6) {
        return result
      }
    }
    
    // No good match found
    return { gifPath: null, confidence: 0, matchType: 'none' }
  }
  
  /**
   * Try exact name matching with category preference
   */
  private findExactMatch(
    exerciseName: string, 
    context?: ExerciseContext
  ): ExerciseMatchResult {
    const normalizedTarget = exerciseName.toLowerCase().trim()
    const exactMatches = this.availableGifs.filter(gif => 
      gif.exerciseName.toLowerCase() === normalizedTarget
    )
    
    if (exactMatches.length === 0) {
      return { gifPath: null, confidence: 0, matchType: 'exact' }
    }
    
    // If multiple exact matches, prefer by category
    const bestMatch = this.selectBestByCategory(exactMatches, context)
    
    return {
      gifPath: bestMatch.path,
      confidence: 1.0,
      matchType: 'exact',
      alternativeMatches: exactMatches.filter(m => m !== bestMatch)
    }
  }
  
  /**
   * Try matching against exercise name variations
   */
  private findVariationMatch(
    exerciseName: string, 
    context?: ExerciseContext
  ): ExerciseMatchResult {
    const variations = this.getExerciseVariations(exerciseName)
    let bestMatches: GifFileInfo[] = []
    
    // Check each variation
    for (const variation of variations) {
      const normalizedVariation = variation.toLowerCase().trim()
      const matches = this.availableGifs.filter(gif => 
        gif.exerciseName.toLowerCase() === normalizedVariation
      )
      
      if (matches.length > 0) {
        bestMatches = matches
        break // First variation with matches wins
      }
    }
    
    if (bestMatches.length === 0) {
      return { gifPath: null, confidence: 0, matchType: 'variation' }
    }
    
    const bestMatch = this.selectBestByCategory(bestMatches, context)
    
    return {
      gifPath: bestMatch.path,
      confidence: 0.9,
      matchType: 'variation',
      alternativeMatches: bestMatches.filter(m => m !== bestMatch)
    }
  }
  
  /**
   * Try fuzzy matching based on name similarity
   */
  private findFuzzyMatch(
    exerciseName: string, 
    context?: ExerciseContext
  ): ExerciseMatchResult {
    let bestMatch: GifFileInfo | null = null
    let bestSimilarity = 0
    const alternatives: GifFileInfo[] = []
    
    // Calculate similarity scores for all GIFs
    for (const gif of this.availableGifs) {
      const similarity = calculateNameSimilarity(exerciseName, gif.exerciseName)
      
      if (similarity > 0.7) {
        const gifWithSimilarity = { ...gif, similarity }
        
        if (similarity > bestSimilarity) {
          if (bestMatch) alternatives.push(bestMatch)
          bestMatch = gifWithSimilarity
          bestSimilarity = similarity
        } else {
          alternatives.push(gifWithSimilarity)
        }
      }
    }
    
    if (!bestMatch) {
      return { gifPath: null, confidence: 0, matchType: 'fuzzy' }
    }
    
    // Apply category preference to fuzzy matches
    const categoryAdjustedMatches = [bestMatch, ...alternatives]
      .sort((a, b) => this.getCategoryScore(b, context) - this.getCategoryScore(a, context))
    
    const finalBestMatch = categoryAdjustedMatches[0]
    
    return {
      gifPath: finalBestMatch.path,
      confidence: bestSimilarity * 0.8, // Reduce confidence for fuzzy matches
      matchType: 'fuzzy',
      alternativeMatches: categoryAdjustedMatches.slice(1, 6) // Top 5 alternatives
    }
  }
  
  /**
   * Find category-appropriate fallback when no name matches exist
   */
  private findCategoryFallback(
    exerciseName: string, 
    context?: ExerciseContext
  ): ExerciseMatchResult {
    if (!context?.category) {
      return { gifPath: null, confidence: 0, matchType: 'category_fallback' }
    }
    
    // Find GIFs in the same category
    const categoryMatches = this.availableGifs.filter(gif => 
      gif.category === context.category || 
      this.getCategoryCompatibility(gif.category, context.category) > 0.5
    )
    
    if (categoryMatches.length === 0) {
      return { gifPath: null, confidence: 0, matchType: 'category_fallback' }
    }
    
    // For warmup exercises, prefer simple movements
    if (context.category === 'warmup') {
      const warmupPreferences = ['walking', 'march', 'circle', 'swing', 'stretch']
      
      for (const preference of warmupPreferences) {
        const preferredMatch = categoryMatches.find(gif => 
          gif.exerciseName.toLowerCase().includes(preference)
        )
        if (preferredMatch) {
          return {
            gifPath: preferredMatch.path,
            confidence: 0.4,
            matchType: 'category_fallback',
            alternativeMatches: categoryMatches.filter(m => m !== preferredMatch).slice(0, 3)
          }
        }
      }
    }
    
    // Default to first match in category
    const fallbackMatch = categoryMatches[0]
    
    return {
      gifPath: fallbackMatch.path,
      confidence: 0.3,
      matchType: 'category_fallback',
      alternativeMatches: categoryMatches.slice(1, 4)
    }
  }
  
  /**
   * Select best match from multiple candidates based on category preference
   */
  private selectBestByCategory(matches: GifFileInfo[], context?: ExerciseContext): GifFileInfo {
    if (matches.length === 1) return matches[0]
    
    // Sort by category score
    const scored = matches
      .map(match => ({
        ...match,
        categoryScore: this.getCategoryScore(match, context)
      }))
      .sort((a, b) => b.categoryScore - a.categoryScore)
    
    return scored[0]
  }
  
  /**
   * Calculate category compatibility score (0-1)
   */
  private getCategoryScore(gif: GifFileInfo, context?: ExerciseContext): number {
    if (!context?.category) return 0.5 // Neutral score
    
    const targetCategory = context.category
    const gifCategory = gif.category
    
    // Perfect match
    if (gifCategory === targetCategory) return 1.0
    
    // Category compatibility matrix
    const compatibility = this.getCategoryCompatibility(gifCategory, targetCategory)
    
    return compatibility
  }
  
  /**
   * Get compatibility score between two categories
   */
  private getCategoryCompatibility(gifCategory: string, targetCategory: string): number {
    const compatibilityMatrix: Record<string, Record<string, number>> = {
      'warmup': {
        'cardio': 0.8,
        'flexibility': 0.7,
        'general': 0.6,
        'strength': 0.2, // Avoid strength for warmup
        'core': 0.4
      },
      'strength': {
        'core': 0.9,
        'legs': 0.8,
        'arms': 0.8,
        'back': 0.8,
        'chest': 0.8,
        'shoulders': 0.8,
        'cardio': 0.3,
        'warmup': 0.2
      },
      'cardio': {
        'warmup': 0.8,
        'plyometric': 0.9,
        'core': 0.7,
        'general': 0.6,
        'strength': 0.4
      },
      'cooldown': {
        'flexibility': 0.9,
        'warmup': 0.7,
        'general': 0.6,
        'strength': 0.2
      }
    }
    
    return compatibilityMatrix[targetCategory]?.[gifCategory] || 0.3
  }
  
  /**
   * Get cached exercise variations
   */
  private getExerciseVariations(exerciseName: string): string[] {
    if (!this.exerciseVariationCache.has(exerciseName)) {
      const variations = generateExerciseVariations(exerciseName)
      this.exerciseVariationCache.set(exerciseName, variations)
    }
    
    return this.exerciseVariationCache.get(exerciseName)!
  }
  
  /**
   * Get statistics about matching performance
   */
  getMatchingStats(): {
    totalGifs: number
    categoryCounts: Record<string, number>
    exerciseNameDistribution: Record<string, number>
  } {
    const categoryCounts: Record<string, number> = {}
    const exerciseNameDistribution: Record<string, number> = {}
    
    for (const gif of this.availableGifs) {
      categoryCounts[gif.category] = (categoryCounts[gif.category] || 0) + 1
      
      const nameLength = gif.exerciseName.split(' ').length
      const lengthKey = nameLength === 1 ? '1 word' : 
                       nameLength === 2 ? '2 words' : 
                       nameLength >= 3 ? '3+ words' : 'other'
      exerciseNameDistribution[lengthKey] = (exerciseNameDistribution[lengthKey] || 0) + 1
    }
    
    return {
      totalGifs: this.availableGifs.length,
      categoryCounts,
      exerciseNameDistribution
    }
  }
}