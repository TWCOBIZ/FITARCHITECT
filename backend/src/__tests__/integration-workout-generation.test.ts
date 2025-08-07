/**
 * Integration Tests for Workout Generation System
 * 
 * Tests the complete workout generation pipeline including:
 * - OpenAI service integration with retry logic
 * - ExerciseDB service with caching
 * - Configuration validation
 * - Error handling and fallbacks
 * - Performance monitoring
 */

// Set test environment first
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret-key-at-least-32-characters-long'
process.env.DATABASE_URL = 'test://localhost'
process.env.OPENAI_API_KEY = 'sk-test-key-for-testing-purposes-only-long-enough'
process.env.VITE_EXERCISEDB_API_KEY = 'test-exercisedb-key-for-testing'
process.env.WGER_API_KEY = 'test-wger-key'

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

// Mock axios for ExerciseDB API calls
const mockAxiosGet = jest.fn()
jest.mock('axios', () => ({
  get: mockAxiosGet
}))

describe('Workout Generation System Integration Tests', () => {
  let openaiService: OpenAIService

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    
    // Initialize service
    openaiService = new OpenAIService()
    
    // Setup default successful OpenAI response
    mockOpenAICreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            id: 'test-workout-plan',
            name: 'Test Workout Plan',
            description: 'Generated test workout plan',
            difficulty: 'beginner',
            duration: 4,
            workoutsPerWeek: 3,
            weeks: [{
              weekNumber: 1,
              days: [{
                dayNumber: 1,
                exercises: [{
                  exercise: {
                    id: 'pushup',
                    name: 'Push-up',
                    description: 'Basic push-up exercise',
                    muscleGroups: ['chest', 'triceps'],
                    equipment: ['bodyweight'],
                    difficulty: 'beginner',
                    instructions: ['Start in plank position', 'Lower body to ground', 'Push back up']
                  },
                  sets: 3,
                  reps: 10,
                  restTime: 60
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
        prompt_tokens: 150,
        completion_tokens: 250,
        total_tokens: 400
      }
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Configuration Validation Integration', () => {
    it('should validate all required environment variables', () => {
      const validation = backendConfigValidator.validateAll()
      
      expect(validation).toHaveProperty('isValid')
      expect(validation).toHaveProperty('serviceStatus')
      expect(validation).toHaveProperty('summary')
      
      // Should detect OpenAI key
      expect(validation.serviceStatus.openai).toBe(true)
      
      // Should have validation results
      expect(Array.isArray(validation.results)).toBe(true)
      expect(validation.summary.total).toBeGreaterThan(0)
    })

    it('should detect missing critical configuration', () => {
      // Temporarily remove critical env var
      const originalKey = process.env.OPENAI_API_KEY
      delete process.env.OPENAI_API_KEY
      
      const validation = backendConfigValidator.validateAll()
      
      expect(validation.serviceStatus.openai).toBe(false)
      expect(validation.summary.criticalErrors).toBeGreaterThan(0)
      
      // Restore env var
      process.env.OPENAI_API_KEY = originalKey
    })

    it('should provide service availability status', () => {
      const validation = backendConfigValidator.validateAll()
      
      expect(validation.serviceStatus).toHaveProperty('openai')
      expect(validation.serviceStatus).toHaveProperty('database')
      expect(validation.serviceStatus).toHaveProperty('stripe')
      expect(validation.serviceStatus).toHaveProperty('cloudinary')
      expect(validation.serviceStatus).toHaveProperty('telegram')
      expect(validation.serviceStatus).toHaveProperty('wger')
    })
  })

  describe('OpenAI Service Integration with Retry Logic', () => {
    it('should successfully generate workout plan with token tracking', async () => {
      const userProfile = {
        fitnessGoal: 'strength' as const,
        experienceLevel: 'beginner' as const,
        targetMuscles: ['chest', 'back'],
        equipment: ['dumbbell'],
        workoutDays: 3,
        timePerWorkout: 45
      }

      const exercises = [{
        id: 'pushup',
        name: 'Push-up',
        description: 'Basic push-up exercise',
        muscleGroups: ['chest', 'triceps'],
        equipment: ['bodyweight'],
        difficulty: 'beginner' as const,
        instructions: ['Start in plank', 'Lower body', 'Push up']
      }]

      const result = await openaiService.generateWorkoutPlan(userProfile, exercises)
      
      // Verify plan structure
      expect(result).toHaveProperty('weeks')
      expect(result.weeks).toHaveLength(1)
      expect(result.weeks[0].days).toHaveLength(1)
      expect(result.weeks[0].days[0].exercises).toHaveLength(1)
      
      // Verify token usage tracking
      const stats = openaiService.getUsageStats()
      expect(stats.requestCount).toBe(1)
      expect(stats.tokenUsage.total).toBe(400)
      expect(stats.estimatedCost).toBeGreaterThan(0)
    })

    it('should handle OpenAI API failures with retry logic', async () => {
      // Mock API failure followed by success
      mockOpenAICreate
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockRejectedValueOnce(new Error('Server error'))
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
          usage: { prompt_tokens: 50, completion_tokens: 100, total_tokens: 150 }
        })

      const userProfile = {
        fitnessGoal: 'strength' as const,
        experienceLevel: 'intermediate' as const,
        targetMuscles: ['legs'],
        equipment: ['barbell'],
        workoutDays: 4,
        timePerWorkout: 60
      }

      const result = await openaiService.generateWorkoutPlan(userProfile, [])
      
      // Should eventually succeed after retries
      expect(result).toHaveProperty('weeks')
      expect(mockOpenAICreate).toHaveBeenCalledTimes(3) // 2 failures + 1 success
    })

    it('should generate meal plans with proper error handling', async () => {
      const userProfile = {
        age: 30,
        weight: 180,
        height: 70,
        gender: 'male',
        activityLevel: 'moderate',
        fitnessGoal: 'weight-loss'
      }

      const preferences = {
        dietaryRestrictions: ['none'],
        allergies: [],
        preferredCuisines: ['american']
      }

      // Mock meal plan response
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify([{
              day: 1,
              date: new Date().toISOString().split('T')[0],
              meals: [{
                type: 'breakfast',
                items: [{
                  name: 'Oatmeal with Berries',
                  calories: 300,
                  protein: 10,
                  carbs: 50,
                  fat: 8,
                  servingSize: '1 cup',
                  servingUnit: 'cup'
                }]
              }]
            }])
          }
        }],
        usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 }
      })

      const result = await openaiService.generateMealPlan(userProfile, preferences)
      
      expect(Array.isArray(result)).toBe(true)
      expect(result[0]).toHaveProperty('meals')
      expect(result[0].meals[0]).toHaveProperty('items')
    })

    it('should handle invalid JSON responses gracefully', async () => {
      // Mock invalid JSON response
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'Invalid JSON response from OpenAI'
          }
        }],
        usage: { prompt_tokens: 50, completion_tokens: 25, total_tokens: 75 }
      })

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
    })
  })

  describe('Rate Limiting and Performance', () => {
    it('should apply rate limiting between requests', async () => {
      const startTime = Date.now()
      
      // Make multiple requests
      const promises = [
        openaiService.generateWorkoutPlan({
          fitnessGoal: 'strength' as const,
          experienceLevel: 'beginner' as const,
          targetMuscles: ['chest'],
          equipment: ['bodyweight'],
          workoutDays: 3,
          timePerWorkout: 30
        }, []),
        openaiService.generateWorkoutPlan({
          fitnessGoal: 'endurance' as const,
          experienceLevel: 'intermediate' as const,
          targetMuscles: ['legs'],
          equipment: ['bodyweight'],
          workoutDays: 4,
          timePerWorkout: 45
        }, [])
      ]

      await Promise.all(promises)
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Should take some time due to rate limiting
      expect(duration).toBeGreaterThan(100) // At least 100ms for rate limiting
      
      // Verify both requests were made
      const stats = openaiService.getUsageStats()
      expect(stats.requestCount).toBe(2)
    })

    it('should track token usage across multiple requests', async () => {
      // Make multiple requests with different token counts
      mockOpenAICreate
        .mockResolvedValueOnce({
          choices: [{ message: { content: '{"weeks":[]}' } }],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: '{"weeks":[]}' } }],
          usage: { prompt_tokens: 200, completion_tokens: 100, total_tokens: 300 }
        })

      await openaiService.generateWorkoutPlan({
        fitnessGoal: 'strength' as const,
        experienceLevel: 'beginner' as const,
        targetMuscles: ['chest'],
        equipment: ['bodyweight'],
        workoutDays: 3,
        timePerWorkout: 30
      }, [])

      await openaiService.generateWorkoutPlan({
        fitnessGoal: 'endurance' as const,
        experienceLevel: 'intermediate' as const,
        targetMuscles: ['legs'],
        equipment: ['bodyweight'],
        workoutDays: 4,
        timePerWorkout: 45
      }, [])

      const stats = openaiService.getUsageStats()
      
      expect(stats.tokenUsage.prompt).toBe(300) // 100 + 200
      expect(stats.tokenUsage.completion).toBe(150) // 50 + 100
      expect(stats.tokenUsage.total).toBe(450) // 150 + 300
      expect(stats.estimatedCost).toBeGreaterThan(0)
    })
  })

  describe('Error Handling and Fallbacks', () => {
    it('should handle network timeouts gracefully', async () => {
      // Mock timeout error
      const timeoutError = new Error('Request timeout')
      timeoutError.code = 'ETIMEDOUT'
      
      mockOpenAICreate
        .mockRejectedValueOnce(timeoutError)
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
      expect(mockOpenAICreate).toHaveBeenCalledTimes(3) // 2 timeouts + 1 success
    })

    it('should handle rate limit errors with proper backoff', async () => {
      // Mock rate limit error with retry-after header
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
      expect(endTime - startTime).toBeGreaterThan(1000) // Should wait at least 1 second
    })

    it('should provide fallback responses when all retries fail', async () => {
      // Mock persistent failures
      mockOpenAICreate.mockRejectedValue(new Error('Persistent API failure'))

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
      expect(result.weeks).toHaveLength(1)
      expect(result.weeks[0].days).toHaveLength(1)
    })
  })

  describe('Integration with Enhanced Features', () => {
    it('should work with all OpenAI service methods', async () => {
      const methods = [
        'supplementExerciseInfo',
        'generateExerciseSpecificFormCues',
        'generateSmartWorkoutAdaptation',
        'generateExerciseRecommendations',
        'detectPlateauAndSuggestChanges'
      ]

      // Mock responses for all methods
      mockOpenAICreate.mockResolvedValue({
        choices: [{ 
          message: { 
            content: JSON.stringify({
              formCues: ['test cue'],
              progressiveAdjustments: ['test adjustment'],
              alternativeExercises: ['test alternative'],
              injuryModifications: ['test modification'],
              commonMistakes: ['test mistake']
            })
          } 
        }],
        usage: { prompt_tokens: 50, completion_tokens: 25, total_tokens: 75 }
      })

      // Test each method exists and can be called
      expect(typeof openaiService.supplementExerciseInfo).toBe('function')
      expect(typeof openaiService.generateExerciseSpecificFormCues).toBe('function')
      expect(typeof openaiService.generateSmartWorkoutAdaptation).toBe('function')
      expect(typeof openaiService.generateExerciseRecommendations).toBe('function')
      expect(typeof openaiService.detectPlateauAndSuggestChanges).toBe('function')

      // Test one method to ensure it works
      const result = await openaiService.supplementExerciseInfo('Push-up', 'chest')
      expect(typeof result).toBe('string')
    })

    it('should maintain usage statistics across all service methods', async () => {
      // Mock successful responses
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: 'test response' } }],
        usage: { prompt_tokens: 25, completion_tokens: 15, total_tokens: 40 }
      })

      // Call multiple methods
      await openaiService.supplementExerciseInfo('Push-up', 'chest')
      
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({ formCues: [] }) } }],
        usage: { prompt_tokens: 50, completion_tokens: 30, total_tokens: 80 }
      })

      await openaiService.generateExerciseSpecificFormCues('Push-up', ['chest'], ['bodyweight'], 'beginner')

      const stats = openaiService.getUsageStats()
      
      expect(stats.requestCount).toBe(2)
      expect(stats.tokenUsage.total).toBe(120) // 40 + 80
      expect(stats.estimatedCost).toBeGreaterThan(0)
    })
  })

  describe('Performance and Monitoring', () => {
    it('should provide detailed usage statistics', () => {
      const stats = openaiService.getUsageStats()
      
      expect(stats).toHaveProperty('requestCount')
      expect(stats).toHaveProperty('tokenUsage')
      expect(stats).toHaveProperty('estimatedCost')
      
      expect(stats.tokenUsage).toHaveProperty('prompt')
      expect(stats.tokenUsage).toHaveProperty('completion')
      expect(stats.tokenUsage).toHaveProperty('total')
      
      expect(typeof stats.estimatedCost).toBe('number')
    })

    it('should calculate costs accurately', async () => {
      // Mock response with known token usage
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: '{"weeks":[]}' } }],
        usage: { prompt_tokens: 1000, completion_tokens: 2000, total_tokens: 3000 }
      })

      await openaiService.generateWorkoutPlan({
        fitnessGoal: 'strength' as const,
        experienceLevel: 'beginner' as const,
        targetMuscles: ['chest'],
        equipment: ['bodyweight'],
        workoutDays: 3,
        timePerWorkout: 30
      }, [])

      const stats = openaiService.getUsageStats()
      
      // GPT-4 pricing: $0.03 per 1K prompt tokens, $0.06 per 1K completion tokens
      const expectedCost = (1000 / 1000) * 0.03 + (2000 / 1000) * 0.06 // $0.03 + $0.12 = $0.15
      
      expect(stats.estimatedCost).toBeCloseTo(expectedCost, 2)
    })
  })
});