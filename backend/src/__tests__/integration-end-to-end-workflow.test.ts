/**
 * End-to-End Integration Tests for Complete Workout Generation Workflow
 * 
 * Tests the complete user journey including:
 * - Configuration validation and service availability
 * - Workout plan generation with OpenAI integration
 * - Exercise data retrieval with caching
 * - Error handling and fallback mechanisms
 * - Performance monitoring and health checks
 * - Real API endpoint integration
 */

// Set test environment
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret-key-at-least-32-characters-long'
process.env.DATABASE_URL = 'test://localhost'
process.env.OPENAI_API_KEY = 'sk-test-key-for-testing-purposes-only-long-enough'
process.env.VITE_EXERCISEDB_API_KEY = 'test-exercisedb-key-for-testing'
process.env.STRIPE_SECRET_KEY = 'sk_test_your_test_secret_key_here'
process.env.STRIPE_BASIC_PLAN_ID = 'price_test_basic'
process.env.STRIPE_PREMIUM_PLAN_ID = 'price_test_premium'

import { describe, beforeAll, beforeEach, afterEach, it, expect, jest } from '@jest/globals'
import request from 'supertest'
import express, { Request, Response } from 'express'
import { OpenAIService } from '../services/openaiService'
import { backendConfigValidator } from '../utils/configValidator'

// Mock the database and external services
jest.mock('../db/prisma', () => ({
  prisma: {
    userProfile: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    workoutPlan: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    workoutLog: {
      create: jest.fn()
    }
  },
  checkDatabaseConnection: jest.fn().mockResolvedValue(true)
}))

// Mock OpenAI with realistic responses
const mockOpenAICreate = jest.fn()
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockOpenAICreate
      }
    }
  }))
}))

// Mock authentication middleware
const mockAuth = (req: any, res: any, next: any) => {
  req.user = {
    userId: 'test-user-id',
    email: 'test@example.com',
    subscription: {
      tier: 'premium',
      status: 'active'
    }
  }
  next()
}

// Create a test Express app with health endpoint
const createTestApp = () => {
  const app = express()
  app.use(express.json())

  // Health check endpoint (similar to main server)
  app.get('/api/health', async (req: Request, res: Response) => {
    try {
      const configValidation = backendConfigValidator.validateAll()
      const dbConnected = true // Mocked
      
      let openaiConnected = false
      let openaiError = null
      try {
        if (configValidation.serviceStatus.openai) {
          const openaiService = new OpenAIService()
          const usageStats = openaiService.getUsageStats()
          openaiConnected = true
        }
      } catch (error) {
        openaiError = error instanceof Error ? error.message : 'Unknown error'
        openaiConnected = false
      }

      const criticalServicesHealthy = dbConnected && openaiConnected && configValidation.serviceStatus.stripe
      const allRequiredConfigValid = configValidation.summary.criticalErrors === 0
      const overallHealthy = criticalServicesHealthy && allRequiredConfigValid

      const status = {
        status: overallHealthy ? 'healthy' : criticalServicesHealthy ? 'degraded' : 'unhealthy',
        timestamp: new Date(),
        services: {
          database: { status: dbConnected ? 'connected' : 'disconnected', required: true },
          openai: { status: openaiConnected ? 'connected' : 'disconnected', required: true, error: openaiError },
          stripe: { status: configValidation.serviceStatus.stripe ? 'configured' : 'not_configured', required: true }
        },
        configuration: {
          isValid: configValidation.isValid,
          summary: configValidation.summary
        }
      }
      
      const httpStatus = overallHealthy ? 200 : 503
      res.status(httpStatus).json(status)
    } catch (error) {
      res.status(500).json({ 
        status: 'error', 
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  // Workout generation endpoint
  app.post('/api/generate-workout', mockAuth, async (req: Request, res: Response) => {
    try {
      const { userProfile, preferences } = req.body
      
      const openaiService = new OpenAIService()
      const workoutPlan = await openaiService.generateWorkoutPlan(userProfile, [])
      
      res.json({
        success: true,
        workoutPlan,
        usageStats: openaiService.getUsageStats()
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  // Meal generation endpoint
  app.post('/api/generate-meal-plan', mockAuth, async (req: Request, res: Response) => {
    try {
      const { userProfile, preferences } = req.body
      
      const openaiService = new OpenAIService()
      const mealPlan = await openaiService.generateMealPlan(userProfile, preferences)
      
      res.json({
        success: true,
        mealPlan,
        usageStats: openaiService.getUsageStats()
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  return app
}

describe('End-to-End Workout Generation Workflow Integration Tests', () => {
  let app: express.Application

  beforeAll(() => {
    app = createTestApp()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default successful OpenAI responses
    mockOpenAICreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            id: 'test-workout-plan',
            name: 'Complete Fitness Program',
            description: 'A comprehensive workout plan',
            difficulty: 'intermediate',
            duration: 4,
            workoutsPerWeek: 3,
            weeks: [{
              weekNumber: 1,
              days: [{
                dayNumber: 1,
                exercises: [{
                  exercise: {
                    id: 'compound-1',
                    name: 'Compound Exercise',
                    description: 'Multi-joint movement',
                    muscleGroups: ['chest', 'shoulders', 'triceps'],
                    equipment: ['barbell'],
                    difficulty: 'intermediate',
                    instructions: [
                      'Set up equipment properly',
                      'Maintain proper form',
                      'Control the movement',
                      'Complete full range of motion'
                    ]
                  },
                  sets: 3,
                  reps: 8,
                  restTime: 120,
                  notes: 'Focus on form over weight'
                }]
              }]
            }],
            targetMuscleGroups: ['chest', 'shoulders', 'triceps'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
        }
      }],
      usage: {
        prompt_tokens: 200,
        completion_tokens: 400,
        total_tokens: 600
      }
    })
  })

  describe('System Health and Configuration Validation', () => {
    it('should return healthy status when all services are configured', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200)

      expect(response.body.status).toBe('healthy')
      expect(response.body.services.database.status).toBe('connected')
      expect(response.body.services.openai.status).toBe('connected')
      expect(response.body.services.stripe.status).toBe('configured')
      expect(response.body.configuration.isValid).toBe(true)
    })

    it('should detect configuration issues and return degraded status', async () => {
      // Temporarily remove required config
      const originalKey = process.env.OPENAI_API_KEY
      delete process.env.OPENAI_API_KEY

      const response = await request(app)
        .get('/api/health')
        .expect(503)

      expect(response.body.status).not.toBe('healthy')
      expect(response.body.services.openai.status).toBe('disconnected')

      // Restore config
      process.env.OPENAI_API_KEY = originalKey
    })

    it('should provide detailed configuration summary', async () => {
      const response = await request(app)
        .get('/api/health')

      expect(response.body.configuration).toHaveProperty('summary')
      expect(response.body.configuration.summary).toHaveProperty('total')
      expect(response.body.configuration.summary).toHaveProperty('valid')
      expect(response.body.configuration.summary).toHaveProperty('criticalErrors')
    })
  })

  describe('Complete Workout Generation Flow', () => {
    it('should generate a complete workout plan with proper structure', async () => {
      const userProfile = {
        fitnessGoal: 'strength',
        experienceLevel: 'intermediate',
        targetMuscles: ['chest', 'back', 'legs'],
        equipment: ['barbell', 'dumbbell'],
        workoutDays: 4,
        timePerWorkout: 60
      }

      const response = await request(app)
        .post('/api/generate-workout')
        .send({ userProfile, preferences: {} })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.workoutPlan).toHaveProperty('weeks')
      expect(response.body.workoutPlan.weeks).toHaveLength(1)
      
      const workout = response.body.workoutPlan.weeks[0].days[0]
      expect(workout).toHaveProperty('exercises')
      expect(workout.exercises).toHaveLength(1)
      
      const exercise = workout.exercises[0]
      expect(exercise).toHaveProperty('exercise')
      expect(exercise).toHaveProperty('sets')
      expect(exercise).toHaveProperty('reps')
      expect(exercise).toHaveProperty('restTime')
      
      // Verify usage tracking
      expect(response.body.usageStats).toHaveProperty('requestCount')
      expect(response.body.usageStats).toHaveProperty('tokenUsage')
      expect(response.body.usageStats).toHaveProperty('estimatedCost')
      expect(response.body.usageStats.requestCount).toBe(1)
    })

    it('should handle different user experience levels appropriately', async () => {
      const beginnerProfile = {
        fitnessGoal: 'general-fitness',
        experienceLevel: 'beginner',
        targetMuscles: ['full-body'],
        equipment: ['bodyweight'],
        workoutDays: 3,
        timePerWorkout: 30
      }

      const response = await request(app)
        .post('/api/generate-workout')
        .send({ userProfile: beginnerProfile, preferences: {} })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.workoutPlan).toHaveProperty('difficulty')
    })

    it('should track token usage across multiple requests', async () => {
      const userProfile = {
        fitnessGoal: 'weight-loss',
        experienceLevel: 'intermediate',
        targetMuscles: ['legs'],
        equipment: ['bodyweight'],
        workoutDays: 4,
        timePerWorkout: 45
      }

      // First request
      const response1 = await request(app)
        .post('/api/generate-workout')
        .send({ userProfile, preferences: {} })
        .expect(200)

      // Second request
      const response2 = await request(app)
        .post('/api/generate-workout')
        .send({ userProfile, preferences: {} })
        .expect(200)

      // Usage should accumulate
      expect(response2.body.usageStats.requestCount).toBe(2)
      expect(response2.body.usageStats.tokenUsage.total).toBe(1200) // 600 * 2
    })
  })

  describe('Complete Meal Plan Generation Flow', () => {
    it('should generate meal plans with proper nutrition structure', async () => {
      // Mock meal plan response
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify([{
              day: 1,
              date: new Date().toISOString().split('T')[0],
              meals: [
                {
                  type: 'breakfast',
                  items: [{
                    name: 'Protein Pancakes',
                    calories: 350,
                    protein: 25,
                    carbs: 40,
                    fat: 12,
                    servingSize: '2 pancakes',
                    servingUnit: 'piece'
                  }]
                },
                {
                  type: 'lunch',
                  items: [{
                    name: 'Grilled Chicken Salad',
                    calories: 450,
                    protein: 35,
                    carbs: 20,
                    fat: 25,
                    servingSize: '1 bowl',
                    servingUnit: 'bowl'
                  }]
                },
                {
                  type: 'dinner',
                  items: [{
                    name: 'Salmon with Vegetables',
                    calories: 500,
                    protein: 40,
                    carbs: 30,
                    fat: 28,
                    servingSize: '1 serving',
                    servingUnit: 'serving'
                  }]
                }
              ]
            }])
          }
        }],
        usage: { prompt_tokens: 150, completion_tokens: 300, total_tokens: 450 }
      })

      const userProfile = {
        age: 30,
        weight: 175,
        height: 70,
        gender: 'male',
        activityLevel: 'moderate',
        fitnessGoal: 'muscle-gain'
      }

      const preferences = {
        dietaryRestrictions: ['none'],
        allergies: [],
        preferredCuisines: ['mediterranean', 'american']
      }

      const response = await request(app)
        .post('/api/generate-meal-plan')
        .send({ userProfile, preferences })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.mealPlan)).toBe(true)
      
      const day = response.body.mealPlan[0]
      expect(day).toHaveProperty('meals')
      expect(day.meals).toHaveLength(3)
      
      const breakfast = day.meals.find((meal: any) => meal.type === 'breakfast')
      expect(breakfast).toBeDefined()
      expect(breakfast.items[0]).toHaveProperty('calories')
      expect(breakfast.items[0]).toHaveProperty('protein')
      expect(breakfast.items[0]).toHaveProperty('carbs')
      expect(breakfast.items[0]).toHaveProperty('fat')
    })
  })

  describe('Error Handling and Resilience', () => {
    it('should handle OpenAI API failures gracefully', async () => {
      // Mock API failure
      mockOpenAICreate.mockRejectedValueOnce(new Error('OpenAI API temporarily unavailable'))

      const userProfile = {
        fitnessGoal: 'strength',
        experienceLevel: 'beginner',
        targetMuscles: ['chest'],
        equipment: ['bodyweight'],
        workoutDays: 3,
        timePerWorkout: 30
      }

      const response = await request(app)
        .post('/api/generate-workout')
        .send({ userProfile, preferences: {} })
        .expect(500)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBeTruthy()
    })

    it('should recover from transient failures with retry logic', async () => {
      // Mock failure followed by success
      mockOpenAICreate
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          choices: [{ message: { content: '{"weeks":[]}' } }],
          usage: { prompt_tokens: 50, completion_tokens: 25, total_tokens: 75 }
        })

      const userProfile = {
        fitnessGoal: 'endurance',
        experienceLevel: 'intermediate',
        targetMuscles: ['legs'],
        equipment: ['bodyweight'],
        workoutDays: 4,
        timePerWorkout: 45
      }

      const response = await request(app)
        .post('/api/generate-workout')
        .send({ userProfile, preferences: {} })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(mockOpenAICreate).toHaveBeenCalledTimes(2) // Initial failure + retry success
    })

    it('should handle malformed user input gracefully', async () => {
      const invalidProfile = {
        // Missing required fields
        experienceLevel: 'invalid-level',
        workoutDays: 'not-a-number'
      }

      const response = await request(app)
        .post('/api/generate-workout')
        .send({ userProfile: invalidProfile, preferences: {} })
        .expect(500)

      expect(response.body.success).toBe(false)
    })
  })

  describe('Performance and Rate Limiting', () => {
    it('should apply rate limiting to prevent API abuse', async () => {
      const userProfile = {
        fitnessGoal: 'strength',
        experienceLevel: 'beginner',
        targetMuscles: ['chest'],
        equipment: ['bodyweight'],
        workoutDays: 3,
        timePerWorkout: 30
      }

      const startTime = Date.now()

      // Make multiple concurrent requests
      const promises = [
        request(app).post('/api/generate-workout').send({ userProfile, preferences: {} }),
        request(app).post('/api/generate-workout').send({ userProfile, preferences: {} })
      ]

      await Promise.all(promises)

      const endTime = Date.now()
      const duration = endTime - startTime

      // Should take some time due to rate limiting
      expect(duration).toBeGreaterThan(100)
    })

    it('should provide accurate cost estimation', async () => {
      const userProfile = {
        fitnessGoal: 'muscle-gain',
        experienceLevel: 'advanced',
        targetMuscles: ['full-body'],
        equipment: ['barbell', 'dumbbell'],
        workoutDays: 5,
        timePerWorkout: 90
      }

      const response = await request(app)
        .post('/api/generate-workout')
        .send({ userProfile, preferences: {} })
        .expect(200)

      const stats = response.body.usageStats
      expect(stats.estimatedCost).toBeGreaterThan(0)
      expect(typeof stats.estimatedCost).toBe('number')
      
      // Cost should be reasonable for test token usage
      expect(stats.estimatedCost).toBeLessThan(1.0) // Less than $1 for test
    })
  })

  describe('Integration with Configuration System', () => {
    it('should detect and report service availability', async () => {
      const response = await request(app)
        .get('/api/health')

      expect(response.body.services).toHaveProperty('openai')
      expect(response.body.services).toHaveProperty('database')
      expect(response.body.services).toHaveProperty('stripe')
      
      expect(response.body.services.openai.required).toBe(true)
      expect(response.body.services.database.required).toBe(true)
      expect(response.body.services.stripe.required).toBe(true)
    })

    it('should validate environment configuration comprehensively', async () => {
      const response = await request(app)
        .get('/api/health')

      expect(response.body.configuration).toHaveProperty('isValid')
      expect(response.body.configuration).toHaveProperty('summary')
      
      const summary = response.body.configuration.summary
      expect(summary).toHaveProperty('total')
      expect(summary).toHaveProperty('valid')
      expect(summary).toHaveProperty('invalid')
      expect(summary).toHaveProperty('criticalErrors')
      
      expect(typeof summary.total).toBe('number')
      expect(typeof summary.valid).toBe('number')
      expect(typeof summary.criticalErrors).toBe('number')
    })
  })

  describe('Real-World Usage Patterns', () => {
    it('should handle sequential workout and meal plan generation', async () => {
      const userProfile = {
        fitnessGoal: 'weight-loss',
        experienceLevel: 'intermediate',
        targetMuscles: ['full-body'],
        equipment: ['bodyweight'],
        workoutDays: 4,
        timePerWorkout: 45,
        age: 28,
        weight: 160,
        height: 68,
        gender: 'female',
        activityLevel: 'active'
      }

      // Generate workout plan
      const workoutResponse = await request(app)
        .post('/api/generate-workout')
        .send({ userProfile, preferences: {} })
        .expect(200)

      expect(workoutResponse.body.success).toBe(true)

      // Setup meal plan response
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify([{ day: 1, meals: [] }]) } }],
        usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 }
      })

      // Generate meal plan
      const mealResponse = await request(app)
        .post('/api/generate-meal-plan')
        .send({ 
          userProfile, 
          preferences: { dietaryRestrictions: ['vegetarian'] }
        })
        .expect(200)

      expect(mealResponse.body.success).toBe(true)

      // Usage should accumulate across both requests
      expect(mealResponse.body.usageStats.requestCount).toBe(2)
    })

    it('should maintain performance under load', async () => {
      const userProfile = {
        fitnessGoal: 'general-fitness',
        experienceLevel: 'beginner',
        targetMuscles: ['full-body'],
        equipment: ['bodyweight'],
        workoutDays: 3,
        timePerWorkout: 30
      }

      const startTime = Date.now()
      
      // Simulate multiple users making requests
      const requests = Array.from({ length: 5 }, () =>
        request(app)
          .post('/api/generate-workout')
          .send({ userProfile, preferences: {} })
      )

      const responses = await Promise.all(requests)
      
      const endTime = Date.now()
      const totalDuration = endTime - startTime

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
      })

      // Should complete within reasonable time (accounting for rate limiting)
      expect(totalDuration).toBeLessThan(30000) // 30 seconds max
    })
  })
});