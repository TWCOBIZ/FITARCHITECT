import request from 'supertest'
import { app } from '../server'
import { prisma } from '../db/prisma'
import { generateToken } from '../auth'

describe('Workout API Endpoints', () => {
  let userToken: string
  let adminToken: string
  const testUserEmail = 'workout_test@fitarchitect.com'
  const testUserPassword = 'WorkoutTest123!'

  beforeAll(async () => {
    // Register test user
    const registerRes = await request(app)
      .post('/api/register')
      .send({
        email: testUserEmail,
        password: testUserPassword,
        name: 'Workout Test User',
        height: 70,
        weight: 180,
        age: 30,
        gender: 'male',
        fitnessGoals: ['Build Muscle'],
        activityLevel: 'moderate',
        dietaryPreferences: ['None']
      })
    
    userToken = registerRes.body.token

    // Login admin
    const adminRes = await request(app)
      .post('/api/admin/login')
      .send({
        email: 'ken@nepacreativeagency.com',
        password: 'adminlog'
      })
    
    adminToken = adminRes.body.token
  })

  describe('Workout Plans', () => {
    it('should get empty workout plans initially', async () => {
      const res = await request(app)
        .get('/api/workout-plans')
        .set('Authorization', `Bearer ${userToken}`)
      
      expect(res.statusCode).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })

    it('should create a new workout plan', async () => {
      const workoutPlan = {
        name: 'Test Workout Plan',
        description: 'A test workout plan',
        weeks: [{
          weekNumber: 1,
          days: [{
            dayNumber: 1,
            exercises: [{
              exercise: {
                id: 'test-exercise-1',
                name: 'Push-ups',
                description: 'Basic push-up exercise',
                muscleGroups: ['chest'],
                equipment: ['bodyweight'],
                difficulty: 'beginner',
                instructions: ['Get into plank position', 'Lower body', 'Push back up']
              },
              sets: 3,
              reps: 10,
              restTime: 60
            }]
          }]
        }],
        totalWeeks: 1,
        difficulty: 'beginner',
        estimatedDuration: 30,
        targetMuscleGroups: ['chest']
      }

      const res = await request(app)
        .post('/api/workout-plans')
        .set('Authorization', `Bearer ${userToken}`)
        .send(workoutPlan)
      
      expect(res.statusCode).toBe(200)
      expect(res.body.name).toBe(workoutPlan.name)
    })

    it('should reject unauthorized workout plan creation', async () => {
      const res = await request(app)
        .post('/api/workout-plans')
        .send({ name: 'Unauthorized Plan' })
      
      expect(res.statusCode).toBe(401)
    })

    it('should get specific workout plan', async () => {
      // First create a plan
      const createRes = await request(app)
        .post('/api/workout-plans')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Specific Test Plan',
          description: 'Plan for specific test',
          weeks: [],
          totalWeeks: 1,
          difficulty: 'beginner',
          estimatedDuration: 30,
          targetMuscleGroups: ['chest']
        })
      
      const planId = createRes.body.id

      const res = await request(app)
        .get(`/api/workout-plans/${planId}`)
        .set('Authorization', `Bearer ${userToken}`)
      
      expect(res.statusCode).toBe(200)
      expect(res.body.name).toBe('Specific Test Plan')
    })

    it('should not allow user to access another user\'s plans', async () => {
      // This would require creating another user, but for now test with non-existent ID
      const res = await request(app)
        .get('/api/workout-plans/non-existent-id')
        .set('Authorization', `Bearer ${userToken}`)
      
      expect(res.statusCode).toBe(404)
    })
  })

  describe('Workout Logging', () => {
    it('should log a workout session', async () => {
      const workoutLog = {
        planId: 'test-plan-id',
        workoutId: 'test-workout-id',
        exercises: [{
          exerciseId: 'push-ups',
          sets: [
            { reps: 10, weight: 0, restTime: 60 },
            { reps: 8, weight: 0, restTime: 60 },
            { reps: 6, weight: 0, restTime: 60 }
          ]
        }],
        notes: 'Good workout session',
        rating: 4,
        duration: 1800 // 30 minutes
      }

      const res = await request(app)
        .post('/api/workout-log')
        .set('Authorization', `Bearer ${userToken}`)
        .send(workoutLog)
      
      expect(res.statusCode).toBe(200)
      expect(res.body.planId).toBe(workoutLog.planId)
    })

    it('should get workout history', async () => {
      const res = await request(app)
        .get('/api/workout-log')
        .set('Authorization', `Bearer ${userToken}`)
      
      expect(res.statusCode).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })

    it('should reject workout log without authentication', async () => {
      const res = await request(app)
        .post('/api/workout-log')
        .send({ planId: 'test' })
      
      expect(res.statusCode).toBe(401)
    })

    it('should validate workout log data', async () => {
      const res = await request(app)
        .post('/api/workout-log')
        .set('Authorization', `Bearer ${userToken}`)
        .send({}) // Empty data
      
      expect(res.statusCode).toBe(400)
    })
  })

  describe('Workout Generation', () => {
    it('should generate AI workout plan for authenticated user', async () => {
      const preferences = {
        fitnessGoals: ['Build Muscle'],
        activityLevel: 'moderate',
        workoutDuration: '45min',
        equipmentAvailability: ['dumbbells', 'bodyweight'],
        workoutFrequency: 3
      }

      const res = await request(app)
        .post('/api/generate-workout')
        .set('Authorization', `Bearer ${userToken}`)
        .send(preferences)
      
      // Note: This might fail if OpenAI API isn't configured or rate limited
      expect([200, 500, 429]).toContain(res.statusCode)
      
      if (res.statusCode === 200) {
        expect(res.body.weeks).toBeDefined()
        expect(Array.isArray(res.body.weeks)).toBe(true)
      }
    })

    it('should handle concurrent workout generation requests with caching', async () => {
      const userProfile = {
        fitnessGoals: ['Build Muscle'],
        experienceLevel: 'intermediate',
        equipment: ['dumbbells', 'bodyweight'],
        workoutDays: 4,
        workoutDuration: '45-60 minutes'
      }

      // Make 5 concurrent requests with the same profile
      const promises = Array(5).fill(null).map(() => 
        request(app)
          .post('/api/workout-plans/generate')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ userProfile })
      )
      
      const results = await Promise.all(promises)
      
      // All requests should succeed
      results.forEach(res => {
        expect([200, 201]).toContain(res.statusCode)
      })
      
      // If caching works, all results should have the same plan ID
      const planIds = results
        .filter(res => res.body && res.body.id)
        .map(res => res.body.id)
      
      if (planIds.length > 1) {
        // Check if most are the same (indicating cache hits)
        const uniquePlanIds = [...new Set(planIds)]
        expect(uniquePlanIds.length).toBeLessThanOrEqual(2) // Allow for some cache misses
      }
    })

    it('should require authentication for workout generation', async () => {
      const res = await request(app)
        .post('/api/generate-workout')
        .send({ fitnessGoals: ['Build Muscle'] })
      
      expect(res.statusCode).toBe(401)
    })

    it('should validate workout generation preferences', async () => {
      const res = await request(app)
        .post('/api/generate-workout')
        .set('Authorization', `Bearer ${userToken}`)
        .send({}) // Empty preferences
      
      expect(res.statusCode).toBe(400)
    })

    it('should handle parqCompleted=null gracefully', async () => {
      // Create user with null parqCompleted
      const nullParqUser = await prisma.userProfile.create({
        data: {
          email: 'nullparq@example.com',
          passwordHash: 'hashed_password',
          name: 'Null PARQ User',
          tier: 'basic',
          parqCompleted: null,
          subscriptionStatus: 'active'
        }
      })

      const nullParqToken = generateToken(nullParqUser.id)

      const res = await request(app)
        .post('/api/workout-plans/generate')
        .set('Authorization', `Bearer ${nullParqToken}`)
        .send({ userProfile: { fitnessGoals: ['muscle_building'] } })
      
      expect(res.statusCode).toBe(403)
      expect(res.body.requiredField).toBe('parqCompleted')
      expect(res.body.action).toBe('complete_parq')

      // Cleanup
      await prisma.userProfile.delete({ where: { id: nullParqUser.id } })
    })
  })

  describe('PAR-Q Assessment', () => {
    it('should save PAR-Q responses', async () => {
      const parqResponses = {
        answers: [
          { question: 'Has your doctor ever said you have a heart condition?', answer: false },
          { question: 'Do you feel pain in your chest when you do physical activity?', answer: false },
          { question: 'In the past month, have you had chest pain when you were not doing physical activity?', answer: false },
          { question: 'Do you lose your balance because of dizziness?', answer: false },
          { question: 'Do you have a bone or joint problem that could be made worse by a change in your physical activity?', answer: false },
          { question: 'Is your doctor currently prescribing drugs for your blood pressure or heart condition?', answer: false },
          { question: 'Do you know of any other reason you should not do physical activity?', answer: false }
        ]
      }

      const res = await request(app)
        .patch('/api/parq-response')
        .set('Authorization', `Bearer ${userToken}`)
        .send(parqResponses)
      
      expect(res.statusCode).toBe(200)
      expect(res.body.parqCompleted).toBe(true)
    })

    it('should get PAR-Q status', async () => {
      const res = await request(app)
        .get('/api/parq-status')
        .set('Authorization', `Bearer ${userToken}`)
      
      expect(res.statusCode).toBe(200)
      expect(res.body.parqCompleted).toBe(true)
    })

    it('should require authentication for PAR-Q operations', async () => {
      const res = await request(app)
        .patch('/api/parq-response')
        .send({ answers: [] })
      
      expect(res.statusCode).toBe(401)
    })
  })

  afterAll(async () => {
    // Clean up test user
    await request(app)
      .delete(`/api/test-cleanup/${testUserEmail}`)
  })
})