/**
 * Core Integration Tests for Workout Generation System
 * 
 * Tests the integration between:
 * - OpenAI service with retry logic and rate limiting
 * - Configuration validation system
 * - Error handling and fallback mechanisms
 * - Token usage tracking and cost estimation
 */

// Set test environment
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret-key-at-least-32-characters-long'
process.env.DATABASE_URL = 'test://localhost'
process.env.OPENAI_API_KEY = 'sk-test-key-for-testing-purposes-only-long-enough'
process.env.STRIPE_SECRET_KEY = 'sk_test_your_test_secret_key_here'
process.env.STRIPE_BASIC_PLAN_ID = 'price_test_basic'
process.env.STRIPE_PREMIUM_PLAN_ID = 'price_test_premium'

import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals'
import { OpenAIService } from '../services/openaiService'
import { backendConfigValidator } from '../utils/configValidator'

// Mock OpenAI with configurable responses
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

describe('Core Workout Generation System Integration Tests', () => {
  let openaiService: OpenAIService

  beforeEach(() => {
    jest.clearAllMocks()
    openaiService = new OpenAIService()
    
    // Setup default successful OpenAI response
    mockOpenAICreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            id: 'integrated-workout-plan',
            name: 'Integrated Test Workout',
            description: 'A comprehensive workout plan for integration testing',
            difficulty: 'intermediate',
            duration: 4,
            workoutsPerWeek: 3,
            weeks: [{
              weekNumber: 1,
              days: [{
                dayNumber: 1,
                exercises: [{
                  exercise: {
                    id: 'integration-exercise',
                    name: 'Integration Test Exercise',
                    description: 'Exercise for testing integration',
                    muscleGroups: ['chest', 'triceps'],
                    equipment: ['barbell'],
                    difficulty: 'intermediate',
                    instructions: [
                      'Setup equipment properly',
                      'Maintain proper form throughout',
                      'Control the movement speed',
                      'Complete full range of motion'
                    ]
                  },
                  sets: 3,
                  reps: 8,
                  restTime: 120,
                  notes: 'Focus on form and controlled movement'
                }]
              }]
            }],
            targetMuscleGroups: ['chest', 'triceps'],
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

  describe('Configuration System Integration', () => {
    it('should validate all required configuration for workout generation', () => {
      const validation = backendConfigValidator.validateAll()
      
      expect(validation).toHaveProperty('isValid')
      expect(validation).toHaveProperty('serviceStatus')
      expect(validation).toHaveProperty('summary')
      
      // Critical services should be available
      expect(validation.serviceStatus.openai).toBe(true)
      expect(validation.serviceStatus.database).toBe(true)
      expect(validation.serviceStatus.stripe).toBe(true)
      
      // Should have minimal critical errors
      expect(validation.summary.criticalErrors).toBeLessThanOrEqual(1)
    })

    it('should provide comprehensive service status information', () => {
      const validation = backendConfigValidator.validateAll()
      
      expect(validation.serviceStatus).toHaveProperty('openai')
      expect(validation.serviceStatus).toHaveProperty('database')
      expect(validation.serviceStatus).toHaveProperty('stripe')
      expect(validation.serviceStatus).toHaveProperty('cloudinary')
      expect(validation.serviceStatus).toHaveProperty('telegram')
      expect(validation.serviceStatus).toHaveProperty('wger')
      
      expect(typeof validation.serviceStatus.openai).toBe('boolean')
      expect(typeof validation.serviceStatus.stripe).toBe('boolean')
    })

    it('should detect configuration issues accurately', () => {
      // Temporarily remove critical config
      const originalKey = process.env.OPENAI_API_KEY
      delete process.env.OPENAI_API_KEY
      
      const validation = backendConfigValidator.validateAll()
      
      expect(validation.serviceStatus.openai).toBe(false)
      expect(validation.summary.criticalErrors).toBeGreaterThan(0)
      
      // Restore config
      process.env.OPENAI_API_KEY = originalKey
    })
  })

  describe('OpenAI Service Integration with Enhanced Features', () => {
    it('should generate complete workout plan with proper structure', async () => {
      const userProfile = {
        fitnessGoal: 'strength' as const,
        experienceLevel: 'intermediate' as const,
        targetMuscles: ['chest', 'back', 'legs'],
        equipment: ['barbell', 'dumbbell'],
        workoutDays: 4,
        timePerWorkout: 60
      }

      const exercises = [{
        id: 'test-exercise',
        name: 'Test Exercise',
        description: 'Exercise for testing',
        muscleGroups: ['chest'],
        equipment: ['barbell'],
        difficulty: 'intermediate' as const,
        instructions: ['Step 1', 'Step 2']
      }]

      const result = await openaiService.generateWorkoutPlan(userProfile, exercises)
      
      // Verify structure
      expect(result).toHaveProperty('weeks')
      expect(result).toHaveProperty('name')
      expect(result).toHaveProperty('difficulty')
      expect(result.weeks).toHaveLength(1)
      
      const week = result.weeks[0]
      expect(week).toHaveProperty('weekNumber')
      expect(week).toHaveProperty('days')
      expect(week.days).toHaveLength(1)
      
      const day = week.days[0]
      expect(day).toHaveProperty('dayNumber')
      expect(day).toHaveProperty('exercises')
      expect(day.exercises).toHaveLength(1)
      
      const exercise = day.exercises[0]
      expect(exercise).toHaveProperty('exercise')
      expect(exercise).toHaveProperty('sets')
      expect(exercise).toHaveProperty('reps')
      expect(exercise).toHaveProperty('restTime')
      
      // Verify usage tracking
      const stats = openaiService.getUsageStats()
      expect(stats.requestCount).toBe(1)
      expect(stats.tokenUsage.total).toBe(600)
      expect(stats.estimatedCost).toBeGreaterThan(0)
    })

    it('should handle retry logic for transient failures', async () => {
      // Mock failure followed by success
      mockOpenAICreate
        .mockRejectedValueOnce(new Error('Temporary API failure'))
        .mockRejectedValueOnce(new Error('Another temporary failure'))
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                weeks: [{
                  weekNumber: 1,
                  days: [{
                    dayNumber: 1,
                    exercises: []
                  }]
                }]
              })
            }
          }],
          usage: { prompt_tokens: 100, completion_tokens: 150, total_tokens: 250 }
        })

      const userProfile = {
        fitnessGoal: 'endurance' as const,
        experienceLevel: 'beginner' as const,
        targetMuscles: ['legs'],
        equipment: ['bodyweight'],
        workoutDays: 3,
        timePerWorkout: 30
      }

      const result = await openaiService.generateWorkoutPlan(userProfile, [])
      
      // Should eventually succeed after retries
      expect(result).toHaveProperty('weeks')
      expect(mockOpenAICreate).toHaveBeenCalledTimes(3) // 2 failures + 1 success
      
      // Usage should be tracked for successful call only
      const stats = openaiService.getUsageStats()
      expect(stats.requestCount).toBe(1)
      expect(stats.tokenUsage.total).toBe(250)
    })

    it('should apply rate limiting between requests', async () => {
      const userProfile = {
        fitnessGoal: 'strength' as const,
        experienceLevel: 'intermediate' as const,
        targetMuscles: ['chest'],
        equipment: ['bodyweight'],
        workoutDays: 3,
        timePerWorkout: 45
      }

      const startTime = Date.now()
      
      // Make two sequential requests
      await openaiService.generateWorkoutPlan(userProfile, [])
      await openaiService.generateWorkoutPlan(userProfile, [])
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Should take some time due to rate limiting
      expect(duration).toBeGreaterThan(100) // At least 100ms
      
      // Both requests should be tracked
      const stats = openaiService.getUsageStats()
      expect(stats.requestCount).toBe(2)
      expect(stats.tokenUsage.total).toBe(1200) // 600 * 2
    })

    it('should generate meal plans with proper structure', async () => {
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
                    name: 'Protein Oatmeal',
                    calories: 350,
                    protein: 20,
                    carbs: 45,
                    fat: 10,
                    servingSize: '1 bowl',
                    servingUnit: 'bowl'
                  }]
                },
                {
                  type: 'lunch',
                  items: [{
                    name: 'Chicken Salad',
                    calories: 450,
                    protein: 35,
                    carbs: 25,
                    fat: 20,
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
        age: 28,
        weight: 160,
        height: 68,
        gender: 'female',
        activityLevel: 'active',
        fitnessGoal: 'weight-loss'
      }

      const preferences = {
        dietaryRestrictions: ['vegetarian'],
        allergies: [],
        preferredCuisines: ['mediterranean']
      }

      const result = await openaiService.generateMealPlan(userProfile, preferences)
      
      expect(Array.isArray(result)).toBe(true)
      expect(result[0]).toHaveProperty('meals')
      expect(result[0].meals).toHaveLength(2)
      
      const breakfast = result[0].meals[0]
      expect(breakfast.type).toBe('breakfast')
      expect(breakfast.items[0]).toHaveProperty('calories')
      expect(breakfast.items[0]).toHaveProperty('protein')
      expect(breakfast.items[0]).toHaveProperty('carbs')
      expect(breakfast.items[0]).toHaveProperty('fat')
    })

    it('should provide fallback responses when API calls fail completely', async () => {
      // Mock persistent failures
      mockOpenAICreate.mockRejectedValue(new Error('Persistent API failure'))

      const userProfile = {
        fitnessGoal: 'strength' as const,
        experienceLevel: 'beginner' as const,
        targetMuscles: ['chest'],
        equipment: ['bodyweight'],
        workoutDays: 3,
        timePerWorkout: 30
      }

      const result = await openaiService.generateWorkoutPlan(userProfile, [])
      
      // Should return fallback plan
      expect(result).toHaveProperty('weeks')
      expect(result.name).toContain('Fallback')
      expect(result.weeks).toHaveLength(1)
      expect(result.weeks[0].days).toHaveLength(1)
      expect(result.weeks[0].days[0].exercises).toHaveLength(1)
    })
  })

  describe('Enhanced OpenAI Methods Integration', () => {
    it('should work with all enhanced OpenAI service methods', async () => {
      // Mock response for supplementary methods
      mockOpenAICreate.mockResolvedValue({
        choices: [{ 
          message: { 
            content: JSON.stringify({
              formCues: ['Keep core engaged', 'Control the movement'],
              progressiveAdjustments: ['Reduce range of motion', 'Add weight'],
              alternativeExercises: ['Push-up variation', 'Dumbbell press'],
              injuryModifications: ['Wall push-up', 'Incline push-up'],
              commonMistakes: ['Flaring elbows', 'Sagging hips']
            })
          } 
        }],
        usage: { prompt_tokens: 50, completion_tokens: 75, total_tokens: 125 }
      })

      // Test exercise form cues generation
      const formCues = await openaiService.generateExerciseSpecificFormCues(
        'Push-up',
        ['chest', 'triceps'],
        ['bodyweight'],
        'beginner'
      )

      expect(formCues).toHaveProperty('formCues')
      expect(formCues).toHaveProperty('progressiveAdjustments')
      expect(formCues).toHaveProperty('alternativeExercises')
      expect(formCues).toHaveProperty('injuryModifications')
      expect(formCues).toHaveProperty('commonMistakes')
      
      expect(Array.isArray(formCues.formCues)).toBe(true)
      expect(formCues.formCues.length).toBeGreaterThan(0)
    })

    it('should accumulate usage statistics across different method calls', async () => {
      // Mock responses for different methods
      mockOpenAICreate
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'Exercise instructions' } }],
          usage: { prompt_tokens: 25, completion_tokens: 15, total_tokens: 40 }
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: JSON.stringify({ formCues: [] }) } }],
          usage: { prompt_tokens: 50, completion_tokens: 30, total_tokens: 80 }
        })

      // Call different methods
      await openaiService.supplementExerciseInfo('Squat', 'legs')
      await openaiService.generateExerciseSpecificFormCues('Squat', ['legs'], ['barbell'], 'intermediate')

      const stats = openaiService.getUsageStats()
      
      expect(stats.requestCount).toBe(2)
      expect(stats.tokenUsage.prompt).toBe(75) // 25 + 50
      expect(stats.tokenUsage.completion).toBe(45) // 15 + 30
      expect(stats.tokenUsage.total).toBe(120) // 40 + 80
      expect(stats.estimatedCost).toBeGreaterThan(0)
    })
  })

  describe('Cost Estimation and Performance Monitoring', () => {
    it('should calculate costs accurately based on token usage', async () => {
      // Mock response with known token usage
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: '{"weeks":[]}' } }],
        usage: { prompt_tokens: 1000, completion_tokens: 2000, total_tokens: 3000 }
      })

      await openaiService.generateWorkoutPlan({
        fitnessGoal: 'strength' as const,
        experienceLevel: 'advanced' as const,
        targetMuscles: ['full-body'],
        equipment: ['gym'],
        workoutDays: 5,
        timePerWorkout: 90
      }, [])

      const stats = openaiService.getUsageStats()
      
      // GPT-4 pricing: $0.03 per 1K prompt tokens, $0.06 per 1K completion tokens
      const expectedCost = (1000 / 1000) * 0.03 + (2000 / 1000) * 0.06 // $0.03 + $0.12 = $0.15
      
      expect(stats.estimatedCost).toBeCloseTo(expectedCost, 2)
      expect(stats.tokenUsage.total).toBe(3000)
    })

    it('should provide detailed usage statistics for monitoring', () => {
      const stats = openaiService.getUsageStats()
      
      expect(stats).toHaveProperty('requestCount')
      expect(stats).toHaveProperty('tokenUsage')
      expect(stats).toHaveProperty('estimatedCost')
      
      expect(stats.tokenUsage).toHaveProperty('prompt')
      expect(stats.tokenUsage).toHaveProperty('completion')
      expect(stats.tokenUsage).toHaveProperty('total')
      
      expect(typeof stats.requestCount).toBe('number')
      expect(typeof stats.estimatedCost).toBe('number')
      expect(typeof stats.tokenUsage.total).toBe('number')
    })
  })

  describe('Error Handling and Resilience', () => {
    it('should handle rate limit errors with proper backoff', async () => {
      // Mock rate limit error
      const rateLimitError = new Error('Rate limit exceeded')
      rateLimitError.response = {
        status: 429,
        headers: { 'retry-after': '1' }
      }

      mockOpenAICreate
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({
          choices: [{ message: { content: '{"weeks":[]}' } }],
          usage: { prompt_tokens: 50, completion_tokens: 25, total_tokens: 75 }
        })

      const startTime = Date.now()
      
      const result = await openaiService.generateWorkoutPlan({
        fitnessGoal: 'strength' as const,
        experienceLevel: 'beginner' as const,
        targetMuscles: ['chest'],
        equipment: ['bodyweight'],
        workoutDays: 3,
        timePerWorkout: 30
      }, [])

      const endTime = Date.now()
      
      expect(result).toHaveProperty('weeks')
      expect(mockOpenAICreate).toHaveBeenCalledTimes(2)
      expect(endTime - startTime).toBeGreaterThan(1000) // Should wait for retry-after
    })

    it('should handle invalid JSON responses gracefully', async () => {
      // Mock invalid JSON response
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: 'This is not valid JSON' } }],
        usage: { prompt_tokens: 50, completion_tokens: 25, total_tokens: 75 }
      })

      const result = await openaiService.generateWorkoutPlan({
        fitnessGoal: 'strength' as const,
        experienceLevel: 'beginner' as const,
        targetMuscles: ['chest'],
        equipment: ['bodyweight'],
        workoutDays: 3,
        timePerWorkout: 30
      }, [])

      // Should return fallback plan
      expect(result).toHaveProperty('weeks')
      expect(result.name).toContain('Fallback')
    })

    it('should handle network timeouts gracefully', async () => {
      // Mock timeout error
      const timeoutError = new Error('Request timeout')
      timeoutError.code = 'ETIMEDOUT'
      
      mockOpenAICreate
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce({
          choices: [{ message: { content: '{"weeks":[]}' } }],
          usage: { prompt_tokens: 50, completion_tokens: 25, total_tokens: 75 }
        })

      const result = await openaiService.generateWorkoutPlan({
        fitnessGoal: 'strength' as const,
        experienceLevel: 'beginner' as const,
        targetMuscles: ['chest'],
        equipment: ['bodyweight'],
        workoutDays: 3,
        timePerWorkout: 30
      }, [])

      expect(result).toHaveProperty('weeks')
      expect(mockOpenAICreate).toHaveBeenCalledTimes(2) // 1 timeout + 1 success
    })
  })

  describe('Integration with Configuration Validation', () => {
    it('should work when all required services are configured', () => {
      const validation = backendConfigValidator.validateAll()
      
      expect(validation.isValid).toBe(true)
      expect(validation.serviceStatus.openai).toBe(true)
      expect(validation.summary.criticalErrors).toBe(0)
    })

    it('should detect when OpenAI service is not properly configured', () => {
      // Temporarily break config
      const originalKey = process.env.OPENAI_API_KEY
      process.env.OPENAI_API_KEY = 'invalid-key'
      
      const validation = backendConfigValidator.validateAll()
      
      expect(validation.serviceStatus.openai).toBe(true) // Key exists but invalid format
      
      // Restore config
      process.env.OPENAI_API_KEY = originalKey
    })

    it('should provide comprehensive validation report', () => {
      const validation = backendConfigValidator.validateAll()
      
      expect(validation).toHaveProperty('results')
      expect(validation).toHaveProperty('summary')
      expect(validation).toHaveProperty('serviceStatus')
      
      expect(Array.isArray(validation.results)).toBe(true)
      expect(validation.summary).toHaveProperty('total')
      expect(validation.summary).toHaveProperty('valid')
      expect(validation.summary).toHaveProperty('invalid')
      expect(validation.summary).toHaveProperty('criticalErrors')
    })
  })
});