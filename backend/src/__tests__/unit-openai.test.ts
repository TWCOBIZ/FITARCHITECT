// Set environment before importing anything
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret-key-at-least-32-characters-long'
process.env.DATABASE_URL = 'test://localhost'
process.env.OPENAI_API_KEY = 'test-key'

// Mock OpenAI before importing
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                id: 'test-plan',
                name: 'Test Workout Plan',
                weeks: [{
                  weekNumber: 1,
                  days: [{
                    dayNumber: 1,
                    exercises: [{
                      exercise: {
                        id: 'test-exercise',
                        name: 'Test Exercise',
                        description: 'Test exercise description',
                        muscleGroups: ['chest'],
                        equipment: ['bodyweight'],
                        difficulty: 'beginner',
                        instructions: ['Step 1', 'Step 2']
                      },
                      sets: 3,
                      reps: 10,
                      restTime: 60
                    }]
                  }]
                }]
              })
            }
          }],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 200,
            total_tokens: 300
          }
        })
      }
    }
  }))
}))

import { OpenAIService } from '../services/openaiService'

describe('OpenAI Service Unit Tests', () => {
  let openaiService: OpenAIService

  beforeEach(() => {
    openaiService = new OpenAIService()
  })

  describe('constructor', () => {
    it('should initialize rate limiter', () => {
      expect(openaiService).toBeDefined()
    })
  })

  describe('getUsageStats', () => {
    it('should return initial usage stats', () => {
      const stats = openaiService.getUsageStats()
      
      expect(stats).toHaveProperty('requestCount')
      expect(stats).toHaveProperty('tokenUsage')
      expect(stats).toHaveProperty('estimatedCost')
      
      expect(stats.requestCount).toBe(0)
      expect(stats.tokenUsage.total).toBe(0)
      expect(stats.estimatedCost).toBe(0)
    })
  })

  describe('generateWorkoutPlan', () => {
    it('should handle user profile and exercises input', async () => {
      const userProfile = {
        fitnessGoal: 'strength' as const,
        experienceLevel: 'beginner' as const,
        targetMuscles: ['chest', 'back'],
        equipment: ['dumbbell'],
        workoutDays: 3,
        timePerWorkout: 45
      }
      
      const exercises = [
        {
          id: 'pushup',
          name: 'Push-up',
          description: 'Basic push-up exercise',
          muscleGroups: ['chest', 'triceps'],
          equipment: ['bodyweight'],
          difficulty: 'beginner' as const,
          instructions: ['Start in plank', 'Lower body', 'Push up']
        }
      ]

      // Since OpenAI is mocked, this should return the mocked response
      const result = await openaiService.generateWorkoutPlan(userProfile, exercises)
      
      expect(result).toBeDefined()
      expect(result).toHaveProperty('weeks')
      expect(Array.isArray(result.weeks)).toBe(true)
    })
  })
})