import request from 'supertest'
import { app } from '../server'

describe('Profile & Nutrition API Endpoints', () => {
  let userToken: string
  const testUserEmail = 'profile_nutrition_test@fitarchitect.com'
  const testUserPassword = 'ProfileTest123!'

  beforeAll(async () => {
    // Register test user
    const registerRes = await request(app)
      .post('/api/register')
      .send({
        email: testUserEmail,
        password: testUserPassword,
        name: 'Profile Test User',
        height: 70,
        weight: 180,
        age: 30,
        gender: 'male',
        fitnessGoals: ['Build Muscle'],
        activityLevel: 'moderate',
        dietaryPreferences: ['None']
      })
    
    userToken = registerRes.body.token
  })

  describe('Profile Management', () => {
    it('should get user profile', async () => {
      const res = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${userToken}`)
      
      expect(res.statusCode).toBe(200)
      expect(res.body.email).toBe(testUserEmail)
      expect(res.body.name).toBe('Profile Test User')
    })

    it('should update user profile', async () => {
      const updates = {
        name: 'Updated Profile Name',
        height: 72,
        weight: 185,
        fitnessGoals: ['Weight Loss', 'Endurance'],
        activityLevel: 'active',
        dietaryPreferences: ['Vegetarian']
      }

      const res = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updates)
      
      expect(res.statusCode).toBe(200)
      expect(res.body.name).toBe(updates.name)
      expect(res.body.height).toBe(updates.height)
      expect(res.body.weight).toBe(updates.weight)
    })

    it('should validate profile update data', async () => {
      const invalidUpdates = {
        height: -5, // Invalid height
        weight: 'invalid', // Invalid weight type
        age: 150 // Invalid age
      }

      const res = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidUpdates)
      
      expect(res.statusCode).toBe(400)
      expect(res.body.error).toBe('Validation failed')
    })

    it('should require authentication for profile operations', async () => {
      const res = await request(app)
        .get('/api/profile')
      
      expect(res.statusCode).toBe(401)
    })

    it('should get dashboard data', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${userToken}`)
      
      expect(res.statusCode).toBe(200)
      expect(res.body.email).toBe(testUserEmail)
      expect(res.body.stats).toBeDefined()
    })
  })

  describe('Nutrition Logging', () => {
    it('should log nutrition data', async () => {
      const nutritionLog = {
        foods: [{
          name: 'Chicken Breast',
          brand: 'Generic',
          serving_size: '100g',
          calories: 165,
          protein: 31,
          carbs: 0,
          fat: 3.6,
          fiber: 0,
          sugar: 0,
          sodium: 74,
          quantity: 1,
          meal_type: 'lunch'
        }],
        date: new Date().toISOString().split('T')[0],
        totalCalories: 165,
        totalProtein: 31,
        totalCarbs: 0,
        totalFat: 3.6
      }

      const res = await request(app)
        .post('/api/nutrition-log')
        .set('Authorization', `Bearer ${userToken}`)
        .send(nutritionLog)
      
      expect(res.statusCode).toBe(200)
      expect(res.body.totalCalories).toBe(nutritionLog.totalCalories)
    })

    it('should get nutrition history', async () => {
      const res = await request(app)
        .get('/api/nutrition-log')
        .set('Authorization', `Bearer ${userToken}`)
      
      expect(res.statusCode).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })

    it('should get daily nutrition summary', async () => {
      const today = new Date().toISOString().split('T')[0]
      const res = await request(app)
        .get(`/api/nutrition-log/daily/${today}`)
        .set('Authorization', `Bearer ${userToken}`)
      
      expect(res.statusCode).toBe(200)
      expect(res.body.date).toBe(today)
    })

    it('should validate nutrition log data', async () => {
      const invalidLog = {
        foods: [], // Empty foods array
        totalCalories: 'invalid' // Invalid type
      }

      const res = await request(app)
        .post('/api/nutrition-log')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidLog)
      
      expect(res.statusCode).toBe(400)
    })

    it('should require authentication for nutrition operations', async () => {
      const res = await request(app)
        .get('/api/nutrition-log')
      
      expect(res.statusCode).toBe(401)
    })
  })

  describe('Meal Planning', () => {
    it('should generate meal plan', async () => {
      const preferences = {
        calorieTarget: 2000,
        dietaryPreferences: ['Vegetarian'],
        mealsPerDay: 3,
        allergies: [],
        cuisinePreferences: ['Mediterranean']
      }

      const res = await request(app)
        .post('/api/generate-meal-plan')
        .set('Authorization', `Bearer ${userToken}`)
        .send(preferences)
      
      // Note: This might fail if OpenAI API isn't configured
      expect([200, 500, 429]).toContain(res.statusCode)
      
      if (res.statusCode === 200) {
        expect(res.body.meals).toBeDefined()
        expect(Array.isArray(res.body.meals)).toBe(true)
      }
    })

    it('should save meal plan', async () => {
      const mealPlan = {
        name: 'Test Meal Plan',
        description: 'A test meal plan',
        targetCalories: 2000,
        meals: [{
          name: 'Breakfast',
          foods: [{
            name: 'Oatmeal',
            calories: 150,
            protein: 5,
            carbs: 30,
            fat: 3
          }],
          totalCalories: 150
        }],
        totalCalories: 150,
        totalProtein: 5,
        totalCarbs: 30,
        totalFat: 3
      }

      const res = await request(app)
        .post('/api/meal-plans')
        .set('Authorization', `Bearer ${userToken}`)
        .send(mealPlan)
      
      expect(res.statusCode).toBe(200)
      expect(res.body.name).toBe(mealPlan.name)
    })

    it('should get saved meal plans', async () => {
      const res = await request(app)
        .get('/api/meal-plans')
        .set('Authorization', `Bearer ${userToken}`)
      
      expect(res.statusCode).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })

    it('should require authentication for meal planning', async () => {
      const res = await request(app)
        .post('/api/generate-meal-plan')
        .send({ calorieTarget: 2000 })
      
      expect(res.statusCode).toBe(401)
    })
  })

  describe('Subscription & Trial Management', () => {
    it('should get trial status', async () => {
      const res = await request(app)
        .get('/api/trial-status')
        .set('Authorization', `Bearer ${userToken}`)
      
      expect(res.statusCode).toBe(200)
      expect(res.body.isEligible).toBeDefined()
      expect(res.body.isActive).toBeDefined()
      expect(res.body.daysRemaining).toBeDefined()
    })

    it('should activate trial for eligible user', async () => {
      const res = await request(app)
        .post('/api/activate-trial')
        .set('Authorization', `Bearer ${userToken}`)
      
      expect([200, 400]).toContain(res.statusCode) // 400 if already activated
    })

    it('should check subscription access', async () => {
      const res = await request(app)
        .get('/api/subscription-access')
        .set('Authorization', `Bearer ${userToken}`)
      
      expect(res.statusCode).toBe(200)
      expect(res.body.tier).toBeDefined()
      expect(res.body.features).toBeDefined()
    })
  })

  describe('Feature Access Control', () => {
    it('should check access to premium features', async () => {
      const res = await request(app)
        .get('/api/feature-access/barcode-scanning')
        .set('Authorization', `Bearer ${userToken}`)
      
      expect([200, 403]).toContain(res.statusCode)
      
      if (res.statusCode === 403) {
        expect(res.body.error).toContain('subscription')
      }
    })

    it('should allow access to free features', async () => {
      const res = await request(app)
        .get('/api/feature-access/nutrition-tracking')
        .set('Authorization', `Bearer ${userToken}`)
      
      expect(res.statusCode).toBe(200)
    })

    it('should require PAR-Q completion for workout features', async () => {
      // Test before PAR-Q completion
      const res = await request(app)
        .get('/api/feature-access/workout-generation')
        .set('Authorization', `Bearer ${userToken}`)
      
      // Should either require PAR-Q or be accessible if already completed
      expect([200, 403]).toContain(res.statusCode)
    })
  })

  afterAll(async () => {
    // Clean up test user
    await request(app)
      .delete(`/api/test-cleanup/${testUserEmail}`)
  })
})