import axios from 'axios'
import { Exercise, WorkoutPlan } from '../types/workout'
import { wgerService, WgerExercise } from './wgerService'
import { OPENAI_MODEL } from '../config/openai'

const CHATGPT_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

interface UserProfile {
  age: number
  gender: 'male' | 'female' | 'other'
  weight: number // in lbs
  height: number // in inches
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced'
  goals: string[]
  availableEquipment: string[]
  preferredWorkoutDuration: number // in minutes
  daysPerWeek: number
  medicalConditions?: string[]
  injuries?: string[]
}

class ChatGPTService {
  private static instance: ChatGPTService

  private constructor() {}

  static getInstance(): ChatGPTService {
    if (!ChatGPTService.instance) {
      ChatGPTService.instance = new ChatGPTService()
    }
    return ChatGPTService.instance
  }

  private async getExercisesFromWger(muscleGroups: string[]): Promise<WgerExercise[]> {
    const exercises: WgerExercise[] = []
    for (const muscle of muscleGroups) {
      const response = await wgerService.searchExercises(muscle)
      exercises.push(...response)
    }
    return exercises
  }

  private convertWgerExerciseToExercise(wgerExercise: WgerExercise): Exercise {
    return {
      id: wgerExercise.uuid,
      name: wgerExercise.name,
      description: wgerExercise.description,
      muscleGroups: [], // Will be populated from wgerExercise.muscles
      equipment: [], // Will be populated from wgerExercise.equipment
      difficulty: 'beginner', // Default, will be adjusted based on user profile
      instructions: wgerExercise.comments.map(comment => comment.comment),
      videoUrl: undefined,
      imageUrl: wgerExercise.images[0]?.image
    }
  }

  async generateWorkoutPlan(profile: UserProfile): Promise<WorkoutPlan> {
    // First, get exercises from wger API
    const targetMuscleGroups = this.determineTargetMuscleGroups(profile.goals)
    const wgerExercises = await this.getExercisesFromWger(targetMuscleGroups)

    // Prepare the prompt for ChatGPT
    const prompt = this.createWorkoutPlanPrompt(profile, wgerExercises)

    // Call ChatGPT API
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a professional fitness trainer creating personalized workout plans.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${CHATGPT_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    // Parse the response and create the workout plan
    const workoutPlan = this.parseChatGPTResponse(response.data.choices[0].message.content, wgerExercises)
    return workoutPlan
  }

  private determineTargetMuscleGroups(goals: string[]): string[] {
    const muscleGroups: string[] = []
    goals.forEach(goal => {
      switch (goal.toLowerCase()) {
        case 'build muscle':
        case 'strength':
          muscleGroups.push('chest', 'back', 'shoulders', 'arms', 'legs')
          break
        case 'lose weight':
        case 'cardio':
          muscleGroups.push('full body')
          break
        case 'core strength':
          muscleGroups.push('abs', 'core')
          break
        // Add more cases as needed
      }
    })
    return [...new Set(muscleGroups)]
  }

  private createWorkoutPlanPrompt(profile: UserProfile, exercises: WgerExercise[]): string {
    return `
      Create a ${profile.daysPerWeek}-day workout plan for a ${profile.age}-year-old ${profile.gender}
      with the following characteristics:
      - Weight: ${profile.weight}lbs
      - Height: ${profile.height}inches
      - Fitness Level: ${profile.fitnessLevel}
      - Goals: ${profile.goals.join(', ')}
      - Available Equipment: ${profile.availableEquipment.join(', ')}
      - Preferred Workout Duration: ${profile.preferredWorkoutDuration} minutes
      - Medical Conditions: ${profile.medicalConditions?.join(', ') || 'None'}
      - Injuries: ${profile.injuries?.join(', ') || 'None'}

      Available exercises:
      ${exercises.map(ex => `- ${ex.name}: ${ex.description}`).join('\n')}

      Please create a structured workout plan that includes:
      1. Weekly schedule
      2. Exercises for each day
      3. Sets, reps, and rest periods
      4. Progression recommendations
      5. Notes on form and technique
    `
  }

  private parseChatGPTResponse(response: string, wgerExercises: WgerExercise[]): WorkoutPlan {
    // Parse the ChatGPT response and create a structured workout plan
    // This is a simplified version - you'll need to implement proper parsing
    return {
      id: Date.now().toString(),
      name: 'Generated Workout Plan',
      description: 'A personalized workout plan based on your goals and preferences',
      duration: 4, // weeks
      workouts: [], // Will be populated from the parsed response
      targetMuscleGroups: [], // Will be populated from the parsed response
      difficulty: 'beginner', // Will be adjusted based on user profile
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }
}

export const chatGPTService = ChatGPTService.getInstance() 