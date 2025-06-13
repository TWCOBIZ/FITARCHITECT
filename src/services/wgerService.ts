import axios from 'axios'

const WGER_API_BASE_URL = 'https://wger.de/api/v2'

export interface Exercise {
  id: number
  name: string
  muscles: string[]
  equipment: string[]
  description?: string
  difficulty?: string
  instructions?: string[]
  imageUrl?: string
  videoUrl?: string
}

export interface WgerExercise {
  id: number
  uuid: string
  name: string
  description: string
  category: number
  muscles: number[]
  muscles_secondary: number[]
  equipment: number[]
  variations: number | null
  images: {
    id: number
    uuid: string
    exercise_base: number
    image: string
    is_main: boolean
  }[]
  comments: {
    id: number
    uuid: string
    exercise: number
    comment: string
  }[]
}

export interface WgerMuscle {
  id: number
  name: string
  is_front: boolean
  image_url_main: string
  image_url_secondary: string
}

export interface WgerEquipment {
  id: number
  name: string
}

export interface WgerCategory {
  id: number
  name: string
}

// Define a type for the raw exercise object returned by the API
interface RawWgerExercise {
  id: number;
  name: string;
  muscles: { name: string }[];
  equipment: { name: string }[];
  description?: string;
  difficulty?: string;
  instructions?: string;
  images?: {
    id: number;
    image: string;
    is_main: boolean;
  }[];
}

const FALLBACK_EXERCISES: Exercise[] = [
  {
    id: 1,
    name: 'Push-ups',
    muscles: ['chest', 'triceps', 'shoulders'],
    equipment: ['bodyweight'],
    description: 'A classic bodyweight exercise that targets the chest, triceps, and shoulders. Great for building upper body strength.',
    difficulty: 'beginner',
    instructions: [
      'Start in a plank position with hands slightly wider than shoulders',
      'Lower your body until your chest nearly touches the floor',
      'Push back up to the starting position',
      'Keep your core tight and body in a straight line'
    ]
  },
  {
    id: 2,
    name: 'Squats',
    muscles: ['quadriceps', 'glutes', 'hamstrings'],
    equipment: ['bodyweight'],
    description: 'A fundamental lower body exercise that targets the quadriceps, glutes, and hamstrings. Builds leg strength and mobility.',
    difficulty: 'beginner',
    instructions: [
      'Stand with feet shoulder-width apart, toes slightly pointed out',
      'Lower your hips back and down as if sitting in a chair',
      'Keep your chest up and knees tracking over your toes',
      'Return to standing by driving through your heels'
    ]
  },
  {
    id: 3,
    name: 'Plank',
    muscles: ['core', 'shoulders', 'back'],
    equipment: ['bodyweight'],
    description: 'An isometric core exercise that builds stability and strength throughout the entire core and shoulders.',
    difficulty: 'beginner',
    instructions: [
      'Start in a push-up position on your forearms',
      'Keep your body in a straight line from head to heels',
      'Engage your core and avoid letting your hips sag',
      'Hold the position while breathing normally'
    ]
  },
  {
    id: 4,
    name: 'Lunges',
    muscles: ['quadriceps', 'glutes', 'hamstrings'],
    equipment: ['bodyweight'],
    description: 'A unilateral leg exercise that improves balance, coordination, and leg strength.',
    difficulty: 'beginner',
    instructions: [
      'Stand tall with feet hip-width apart',
      'Step forward with one leg and lower your hips',
      'Lower until both knees are bent at 90 degrees',
      'Push back to starting position and repeat'
    ]
  },
  {
    id: 5,
    name: 'Dumbbell Rows',
    muscles: ['back', 'biceps', 'rear deltoids'],
    equipment: ['dumbbell'],
    description: 'A pulling exercise that targets the back muscles and biceps, helping to improve posture and upper body strength.',
    difficulty: 'intermediate',
    instructions: [
      'Hold a dumbbell in one hand, place other hand on bench',
      'Keep your back straight and parallel to the floor',
      'Pull the dumbbell up to your ribcage',
      'Lower with control and repeat'
    ]
  }
];

export class WGERService {
  private BASE_URL = 'https://wger.de/api/v2'
  private API_KEY = import.meta.env.VITE_WGER_API_KEY

  async fetchExercises(filters: {
    muscles?: string[]
    equipment?: string[]
    language?: number
  }): Promise<Exercise[]> {
    try {
      // First, fetch the basic exercise data
      const response = await axios.get(`${this.BASE_URL}/exercise/`, {
        params: {
          ...filters,
          language: filters.language || 2, // Default to English
          limit: 50 // Reasonable limit to prevent over-fetching
        },
        headers: this.API_KEY ? { 'Authorization': `Token ${this.API_KEY}` } : {}
      })
      
      console.log('WGER API Response sample:', response.data.results[0]);
      
      // Transform exercises and fetch images for each
      const exercises = await Promise.all(
        response.data.results.map(async (rawExercise: any) => {
          const transformedExercise = this.transformExercise(rawExercise);
          
          // Fetch images for this exercise if available
          if (rawExercise.exercise_base) {
            try {
              const imageResponse = await axios.get(`${this.BASE_URL}/exerciseimage/`, {
                params: {
                  exercise_base: rawExercise.exercise_base,
                  limit: 5
                },
                headers: this.API_KEY ? { 'Authorization': `Token ${this.API_KEY}` } : {}
              });
              
              if (imageResponse.data.results.length > 0) {
                // Get the main image or first available image
                const mainImage = imageResponse.data.results.find((img: any) => img.is_main) || imageResponse.data.results[0];
                transformedExercise.imageUrl = `https://wger.de${mainImage.image}`;
                console.log('Found image for', transformedExercise.name, ':', transformedExercise.imageUrl);
              }
            } catch (imageError) {
              console.log('No images found for exercise:', transformedExercise.name);
            }
          }
          
          return transformedExercise;
        })
      );
      
      console.log('Transformed exercise sample with images:', exercises[0]);
      return exercises;
    } catch (error) {
      console.error('WGER API Error, using fallback exercises:', error)
      return FALLBACK_EXERCISES
    }
  }

  private transformExercise(rawExercise: any): Exercise {
    return {
      id: rawExercise.id,
      name: rawExercise.name,
      muscles: rawExercise.muscles || [],
      equipment: rawExercise.equipment || [],
      description: rawExercise.description || '',
      difficulty: rawExercise.difficulty || 'intermediate',
      instructions: rawExercise.instructions ? [rawExercise.instructions] : [],
      imageUrl: undefined // Will be populated separately by fetchExercises
    }
  }

  async getExerciseById(id: number): Promise<Exercise | null> {
    try {
      const response = await axios.get(`${this.BASE_URL}/exercise/${id}/`, {
        headers: {
          'Authorization': `Token ${this.API_KEY}`
        }
      })
      return this.transformExercise(response.data)
    } catch (error) {
      console.error(`Error fetching exercise ${id}:`, error)
      return null
    }
  }

  async getMuscles(): Promise<{ id: number; name: string }[]> {
    try {
      const response = await axios.get(`${this.BASE_URL}/muscle/`, {
        headers: {
          'Authorization': `Token ${this.API_KEY}`
        }
      })
      return response.data.results
    } catch (error) {
      console.error('Error fetching muscles:', error)
      return []
    }
  }

  async getEquipment(): Promise<{ id: number; name: string }[]> {
    try {
      const response = await axios.get(`${this.BASE_URL}/equipment/`, {
        headers: {
          'Authorization': `Token ${this.API_KEY}`
        }
      })
      return response.data.results
    } catch (error) {
      console.error('Error fetching equipment:', error)
      return []
    }
  }

  async getCategories(): Promise<WgerCategory[]> {
    const response = await axios.get(`${WGER_API_BASE_URL}/exercisecategory/`, {
      headers: {
        'Authorization': `Token ${import.meta.env.VITE_WGER_API_KEY}`
      }
    })
    return response.data
  }
}

export const wgerService = new WGERService() 