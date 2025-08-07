import { beforeAll, afterAll } from '@jest/globals'

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test'
  process.env.JWT_SECRET = 'test-jwt-secret-key-at-least-32-characters-long'
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
  
  // Disable external API calls during tests
  process.env.OPENAI_API_KEY = 'test-key'
  process.env.STRIPE_SECRET_KEY = ''
  process.env.TELEGRAM_BOT_TOKEN = ''
  
  console.log('🧪 Test environment initialized')
})

afterAll(async () => {
  console.log('🧪 Test environment cleanup completed')
})

// Mock external dependencies
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
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
          }]
        })
      }
    }
  }))
}))

jest.mock('stripe', () => ({
  Stripe: jest.fn().mockImplementation(() => ({
    prices: {
      list: jest.fn().mockResolvedValue({
        data: [
          { id: 'price_test', unit_amount: 999, nickname: 'Basic Plan' },
          { id: 'price_test_premium', unit_amount: 1999, nickname: 'Premium Plan' }
        ]
      })
    },
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_test' })
    },
    subscriptions: {
      create: jest.fn().mockResolvedValue({ id: 'sub_test', status: 'active' })
    }
  }))
}))

jest.mock('node-telegram-bot-api', () => {
  return jest.fn().mockImplementation(() => ({
    sendMessage: jest.fn().mockResolvedValue({ message_id: 1 })
  }))
})


// Mock Prisma client
jest.mock('../db/prisma', () => ({
  prisma: {
    userProfile: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    subscription: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    workoutPlan: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    workoutLog: {
      findMany: jest.fn(),
      create: jest.fn()
    },
    nutritionLog: {
      findMany: jest.fn(),
      create: jest.fn()
    },
    parqResponse: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    }
  },
  checkDatabaseConnection: jest.fn().mockResolvedValue(true)
}))

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true)
}))

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('test_token'),
  verify: jest.fn().mockReturnValue({ userId: 'test_user_id', email: 'test@example.com' })
}))

// Mock cloudinary service
jest.mock('../services/cloudinaryService', () => ({
  upload: {
    single: jest.fn(() => (req: any, res: any, next: any) => next()),
    array: jest.fn(() => (req: any, res: any, next: any) => next())
  },
  uploadImageBuffer: jest.fn().mockResolvedValue('https://test-image-url.com/test.jpg'),
  deleteImage: jest.fn().mockResolvedValue(undefined),
  extractPublicId: jest.fn().mockReturnValue('test_public_id')
}))

// Mock multer directly
jest.mock('multer', () => {
  const multer = () => ({
    single: jest.fn(() => (req: any, res: any, next: any) => next()),
    array: jest.fn(() => (req: any, res: any, next: any) => next()),
    fields: jest.fn(() => (req: any, res: any, next: any) => next()),
    none: jest.fn(() => (req: any, res: any, next: any) => next()),
    any: jest.fn(() => (req: any, res: any, next: any) => next())
  })
  multer.memoryStorage = jest.fn(() => ({}))
  multer.diskStorage = jest.fn(() => ({}))
  return multer
})

// Mock express
jest.mock('express', () => {
  const express = () => ({
    use: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    listen: jest.fn()
  })
  express.json = jest.fn(() => (req: any, res: any, next: any) => next())
  express.urlencoded = jest.fn(() => (req: any, res: any, next: any) => next())
  express.static = jest.fn(() => (req: any, res: any, next: any) => next())
  return express
})

// Test utilities
export const createTestUser = async (overrides = {}) => {
  return {
    email: `test_${Date.now()}@example.com`,
    password: 'TestPass123!',
    name: 'Test User',
    height: 70,
    weight: 180,
    age: 30,
    gender: 'male',
    fitnessGoals: ['Build Muscle'],
    activityLevel: 'moderate',
    dietaryPreferences: ['None'],
    ...overrides
  }
}

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))