// WGER Exercise Database Service
// Now uses backend proxy for secure API access
import type { 
  WgerExercise, 
  WgerEquipment, 
  WgerMuscle, 
  WgerCategory,
  ExerciseSearchResult
} from '../types/wger'

// Re-export WgerExercise
export type { WgerExercise } from '../types/wger'
import type { Exercise, MuscleGroup, Equipment } from '../types/workout'
import { api } from './api'
import { 
  COMPREHENSIVE_EXERCISE_DATABASE, 
  ComprehensiveExercise,
  getExercisesByMuscleGroup,
  getExercisesByDifficulty,
  getExercisesByEquipment 
} from '../data/comprehensiveExerciseDatabase'

// Re-export from exercise utilities
export { normalizeExerciseName } from '../utils/exerciseNameUtils'

// Map WGER muscle IDs to our muscle groups
const MUSCLE_GROUP_MAP: Record<number, MuscleGroup> = {
  1: 'biceps',
  2: 'shoulders',
  3: 'chest',
  4: 'shoulders',
  5: 'triceps',
  6: 'core',
  7: 'legs',
  8: 'legs',
  9: 'back',
  10: 'legs',
  11: 'legs',
  12: 'back',
  13: 'biceps',
  14: 'core',
  15: 'legs'
}

// Map WGER equipment IDs to our equipment types
const EQUIPMENT_MAP: Record<number, Equipment> = {
  1: 'barbell',
  2: 'dumbbell', 
  3: 'bodyweight',
  4: 'cable',
  5: 'machine',
  6: 'kettlebell',
  7: 'bodyweight',
  8: 'dumbbell',
  9: 'machine',
  10: 'resistanceBand'
}

// Comprehensive fallback exercises with proper typing
export const FALLBACK_EXERCISES: Record<string, ComprehensiveExercise[]> = {
  chest: getExercisesByMuscleGroup('chest').slice(0, 10),
  back: getExercisesByMuscleGroup('back').slice(0, 10),
  shoulders: getExercisesByMuscleGroup('shoulders').slice(0, 10),
  biceps: getExercisesByMuscleGroup('biceps').slice(0, 10),
  triceps: getExercisesByMuscleGroup('triceps').slice(0, 10),
  legs: getExercisesByMuscleGroup('legs').slice(0, 10),
  core: getExercisesByMuscleGroup('core').slice(0, 10),
  fullBody: getExercisesByMuscleGroup('fullBody').slice(0, 10)
}

export class WGERService {
  private exerciseCache = new Map<string, Exercise[]>()
  private lastCacheTime = 0
  private readonly CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

  async fetchExercises(filters: {
    muscles?: string[]
    equipment?: string[]
    language?: number
    category?: string
    limit?: number
  }): Promise<Exercise[]> {
    // Generate cache key from filters
    const cacheKey = JSON.stringify(filters);
    const now = Date.now();
    
    // Check cache first
    if (this.exerciseCache.has(cacheKey) && (now - this.lastCacheTime) < this.CACHE_DURATION) {
      console.log('Returning cached WGER exercises');
      return this.exerciseCache.get(cacheKey)!;
    }

    try {
      // Use backend proxy instead of direct API call
      const response = await api.get('/api/wger/exercises', { params: filters });
      const data = response.data;
      
      if (!data.results || !Array.isArray(data.results)) {
        throw new Error('Invalid response from WGER API');
      }
      
      // Transform WGER exercises to our Exercise format
      const exercises = await Promise.all(
        data.results.map(async (wgerEx: any) => {
          try {
            // Get additional details
            const detailsResponse = await this.getExerciseDetails(wgerEx.id);
            return this.transformExercise(wgerEx, detailsResponse);
          } catch (error) {
            console.error(`Error fetching details for exercise ${wgerEx.id}:`, error);
            return this.transformExercise(wgerEx);
          }
        })
      );
      
      // Cache the results
      this.exerciseCache.set(cacheKey, exercises);
      this.lastCacheTime = now;
      
      return exercises;
    } catch (error) {
      console.error('WGER API error:', error);
      // Return comprehensive fallback data
      return this.getFallbackExercises(filters.muscles?.[0]);
    }
  }

  async getExerciseById(id: number): Promise<Exercise | null> {
    try {
      const response = await api.get(`/api/wger/exercise/${id}`);
      const data = response.data;
      
      if (!data) {
        throw new Error('Exercise not found');
      }
      
      return this.transformExercise(data);
    } catch (error) {
      console.error(`Error fetching exercise ${id}:`, error);
      return null;
    }
  }

  async searchExerciseByName(name: string): Promise<Exercise | null> {
    if (!name || name.trim().length === 0) {
      return null;
    }

    // Clean the search term
    const searchTerm = name.trim().toLowerCase();
    
    // First check comprehensive database for exact match
    const localExercise = COMPREHENSIVE_EXERCISE_DATABASE.find(ex => 
      ex.name.toLowerCase() === searchTerm ||
      ex.name.toLowerCase().includes(searchTerm) ||
      searchTerm.includes(ex.name.toLowerCase())
    );
    
    if (localExercise) {
      console.log('Found exercise in comprehensive database:', localExercise.name);
      return this.convertComprehensiveToExercise(localExercise);
    }

    try {
      // Search using backend proxy
      const response = await api.get('/api/wger/search', { 
        params: { term: searchTerm, language: 2 } 
      });
      const data = response.data;
      
      if (data.suggestions && data.suggestions.length > 0) {
        // Return the first matching result
        const exercise = data.suggestions[0].data;
        return this.transformExercise(exercise);
      }
      
      // No results from API, use fallback
      return this.findFallbackExercise(name);
    } catch (error) {
      console.error('WGER search error:', error);
      return this.findFallbackExercise(name);
    }
  }

  private async getExerciseDetails(exerciseId: number): Promise<any> {
    try {
      const response = await api.get(`/api/wger/exercise/${exerciseId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching exercise details for ${exerciseId}:`, error);
      return null;
    }
  }

  private transformExercise(rawExercise: any, details?: any): Exercise {
    const exercise = details || rawExercise;
    
    // Extract exercise name from translations or other sources
    let exerciseName = '';
    
    // Check for translations first (WGER API structure)
    if (exercise.translations && exercise.translations.length > 0) {
      exerciseName = exercise.translations[0].name;
    } else if (exercise.name) {
      exerciseName = exercise.name;
    } else if (exercise.exercise_name) {
      exerciseName = exercise.exercise_name;
    } else if (exercise.exercise?.name) {
      exerciseName = exercise.exercise.name;
    }
    
    // Map muscles to our muscle groups
    const muscleGroups: MuscleGroup[] = [];
    const muscles = exercise.muscles || [];
    muscles.forEach((muscle: any) => {
      const muscleId = typeof muscle === 'object' ? muscle.id : muscle;
      const group = MUSCLE_GROUP_MAP[muscleId];
      if (group && !muscleGroups.includes(group)) {
        muscleGroups.push(group);
      }
    });
    
    // Map equipment to our equipment types
    const equipment: Equipment[] = [];
    const equipmentList = exercise.equipment || [];
    equipmentList.forEach((equip: any) => {
      const equipId = typeof equip === 'object' ? equip.id : equip;
      const equipType = EQUIPMENT_MAP[equipId];
      if (equipType && !equipment.includes(equipType)) {
        equipment.push(equipType);
      }
    });
    
    // Default to bodyweight if no equipment specified
    if (equipment.length === 0) {
      equipment.push('bodyweight');
    }
    
    // Default to fullBody if no muscle groups found
    if (muscleGroups.length === 0) {
      muscleGroups.push('fullBody');
    }
    
    // Get images
    let imageUrl: string | undefined;
    if (exercise.images && exercise.images.length > 0) {
      imageUrl = exercise.images[0].image;
    }
    
    // Get instructions from description or translations
    const instructions: string[] = [];
    let description = '';
    
    if (exercise.translations && exercise.translations.length > 0) {
      description = exercise.translations[0].description || '';
    } else {
      description = exercise.description || '';
    }
    
    if (description) {
      // Clean HTML tags and split into instructions
      const cleanDescription = description.replace(/<[^>]*>/g, '').trim();
      const steps = cleanDescription.split(/\d+\.|Step \d+:|•|\n\n|\n-/);
      steps.forEach((step: string) => {
        const cleaned = step.trim();
        if (cleaned.length > 10) {
          instructions.push(cleaned);
        }
      });
    }
    
    // If still no exercise name, create a meaningful one
    if (!exerciseName || exerciseName.trim() === '') {
      const primaryMuscle = muscleGroups[0] || 'fullBody';
      const primaryEquipment = equipment[0] || 'bodyweight';
      
      // Create more specific names based on category and muscles
      if (exercise.category?.name) {
        exerciseName = `${exercise.category.name} ${primaryEquipment} Exercise`;
      } else {
        exerciseName = `${primaryMuscle} ${primaryEquipment} Exercise`;
      }
    }

    return {
      id: String(exercise.id || exercise.uuid || `wger-${Date.now()}`),
      name: exerciseName,
      description: description,
      muscleGroups,
      equipment,
      difficulty: this.mapDifficulty(exercise.difficulty),
      instructions: instructions.length > 0 ? instructions : ['Perform the exercise with proper form'],
      imageUrl,
      videoUrl: exercise.videos?.[0]?.video
    };
  }

  private mapDifficulty(wgerDifficulty?: string): 'beginner' | 'intermediate' | 'advanced' {
    if (!wgerDifficulty) return 'intermediate';
    
    const difficultyMap: Record<string, 'beginner' | 'intermediate' | 'advanced'> = {
      'easy': 'beginner',
      'beginner': 'beginner',
      'medium': 'intermediate',
      'intermediate': 'intermediate',
      'hard': 'advanced',
      'advanced': 'advanced'
    };
    
    return difficultyMap[wgerDifficulty.toLowerCase()] || 'intermediate';
  }

  private convertComprehensiveToExercise(compEx: ComprehensiveExercise): Exercise {
    return {
      id: compEx.id,
      name: compEx.name,
      description: compEx.description,
      muscleGroups: [compEx.primaryMuscle] as MuscleGroup[],
      equipment: compEx.equipment as Equipment[],
      difficulty: compEx.difficulty as 'beginner' | 'intermediate' | 'advanced',
      instructions: compEx.instructions,
      imageUrl: compEx.imageUrl,
      videoUrl: compEx.videoUrl
    };
  }

  private findFallbackExercise(name: string): Exercise | null {
    const searchTerm = name.toLowerCase();
    
    // Search in comprehensive database
    const exercise = COMPREHENSIVE_EXERCISE_DATABASE.find(ex => 
      ex.name.toLowerCase().includes(searchTerm) ||
      searchTerm.includes(ex.name.toLowerCase())
    );
    
    if (exercise) {
      return this.convertComprehensiveToExercise(exercise);
    }
    
    // Try to find by keywords
    const keywords = searchTerm.split(' ');
    for (const keyword of keywords) {
      const found = COMPREHENSIVE_EXERCISE_DATABASE.find(ex => 
        ex.name.toLowerCase().includes(keyword) ||
        ex.primaryMuscle.toLowerCase().includes(keyword) ||
        ex.equipment.some(e => e.toLowerCase().includes(keyword))
      );
      
      if (found) {
        return this.convertComprehensiveToExercise(found);
      }
    }
    
    return null;
  }

  private getFallbackExercises(muscle?: string): Exercise[] {
    const muscleGroup = muscle?.toLowerCase() || 'fullBody';
    const exercises = FALLBACK_EXERCISES[muscleGroup] || FALLBACK_EXERCISES.fullBody;
    
    return exercises.map(ex => this.convertComprehensiveToExercise(ex));
  }

  // Utility methods
  async fetchMuscles(): Promise<WgerMuscle[]> {
    try {
      const response = await api.get('/api/wger/muscles');
      return response.data.results || [];
    } catch (error) {
      console.error('Error fetching muscles:', error);
      return [];
    }
  }

  async fetchEquipment(): Promise<WgerEquipment[]> {
    try {
      const response = await api.get('/api/wger/equipment');
      return response.data.results || [];
    } catch (error) {
      console.error('Error fetching equipment:', error);
      return [];
    }
  }

  async fetchCategories(): Promise<WgerCategory[]> {
    try {
      const response = await api.get('/api/wger/categories');
      return response.data.results || [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }
}

// Export singleton instance
export const wgerService = new WGERService();