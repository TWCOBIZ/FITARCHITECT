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
}

const FALLBACK_EXERCISES: Exercise[] = [
  {
    id: 1,
    name: 'Push-ups',
    muscles: ['chest', 'triceps'],
    equipment: ['bodyweight'],
    description: 'A bodyweight exercise for chest and triceps.',
    difficulty: 'beginner',
    instructions: ['Start in a plank position', 'Lower your body', 'Push back up']
  },
  {
    id: 2,
    name: 'Squats',
    muscles: ['legs'],
    equipment: ['bodyweight'],
    description: 'A bodyweight exercise for legs.',
    difficulty: 'beginner',
    instructions: ['Stand with feet shoulder-width apart', 'Lower hips', 'Return to standing']
  },
  {
    id: 3,
    name: 'Plank',
    muscles: ['core'],
    equipment: ['bodyweight'],
    description: 'A core stability exercise.',
    difficulty: 'beginner',
    instructions: ['Hold a plank position on elbows and toes']
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
      const response = await axios.get(`${this.BASE_URL}/exercise/`, {
        params: {
          ...filters,
          language: filters.language || 2, // Default to English
          limit: 50 // Reasonable limit to prevent over-fetching
        },
        headers: {
          'Authorization': `Token ${this.API_KEY}`
        }
      })
      return response.data.results.map(this.transformExercise)
    } catch (error) {
      console.error('WGER API Error, using fallback exercises:', error)
      return FALLBACK_EXERCISES
    }
  }

  private transformExercise(rawExercise: RawWgerExercise): Exercise {
    return {
      id: rawExercise.id,
      name: rawExercise.name,
      muscles: rawExercise.muscles.map((m) => m.name),
      equipment: rawExercise.equipment.map((e) => e.name),
      description: rawExercise.description,
      difficulty: rawExercise.difficulty || 'intermediate',
      instructions: rawExercise.instructions ? [rawExercise.instructions] : []
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