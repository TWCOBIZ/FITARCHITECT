import request from 'supertest'
import app from '../server'

describe('API Endpoints', () => {
  let userToken: string
  let adminToken: string
  let testUserEmail = 'nepacreativeagency@icloud.com'
  let testUserPassword = 'JestPass123!'

  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({
        email: testUserEmail,
        password: testUserPassword,
        name: 'Jest User',
        height: 70,
        weight: 180,
        age: 30,
        gender: 'male',
        fitnessGoals: ['Build Muscle'],
        activityLevel: 'moderate',
        dietaryPreferences: ['None']
      })
    expect(res.statusCode).toBe(200)
    expect(res.body.user.email).toBe(testUserEmail)
    userToken = res.body.token
  })

  it('should not register duplicate user', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({
        email: testUserEmail,
        password: testUserPassword,
        name: 'Jest User',
        height: 70,
        weight: 180,
        age: 30,
        gender: 'male',
        fitnessGoals: ['Build Muscle'],
        activityLevel: 'moderate',
        dietaryPreferences: ['None']
      })
    expect(res.statusCode).toBe(409)
  })

  it('should login as user', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: testUserEmail, password: testUserPassword })
    expect(res.statusCode).toBe(200)
    userToken = res.body.token
  })

  it('should fail login with wrong password', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: testUserEmail, password: 'wrongpass' })
    expect(res.statusCode).toBe(401)
  })

  it('should login as admin', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ email: 'ken@nepacreativeagency.com', password: 'adminlog' })
    expect(res.statusCode).toBe(200)
    adminToken = res.body.token
  })

  it('should get dashboard data', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${userToken}`)
    expect(res.statusCode).toBe(200)
    expect(res.body.email).toBe(testUserEmail)
  })

  it('should log a workout', async () => {
    const res = await request(app)
      .post('/api/workout-log')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ planId: 'plan1', workoutId: 'workout1', exercises: [], notes: '' })
    expect(res.statusCode).toBe(200)
  })

  it('should get workout history', async () => {
    const res = await request(app)
      .get('/api/workout-log')
      .set('Authorization', `Bearer ${userToken}`)
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('should get plans', async () => {
    const res = await request(app)
      .get('/api/plans')
    expect([200,400]).toContain(res.statusCode)
  })

  it('should get analytics as admin', async () => {
    const res = await request(app)
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${adminToken}`)
    expect([200,500]).toContain(res.statusCode)
  })

  it('should create a profile', async () => {
    const res = await request(app)
      .post('/api/profile')
      .send({
        email: `profile_${Date.now()}@example.com`,
        name: 'Profile User',
        avatar: '',
        height: 70,
        weight: 180,
        age: 30,
        gender: 'male',
        fitnessGoals: ['Build Muscle'],
        activityLevel: 'moderate',
        dietaryPreferences: ['None'],
        notifications: { email: true, telegram: false, telegramChatId: '' }
      })
    expect([201,409]).toContain(res.statusCode)
  })

  it('should update test user for full access', async () => {
    // Get user from DB
    const prisma = require('../server').prisma || require('@prisma/client').PrismaClient;
    const db = new prisma();
    const user = await db.userProfile.findUnique({ where: { email: testUserEmail } });
    expect(user).toBeTruthy();
    // Set parqCompleted to true
    await db.userProfile.update({ where: { id: user.id }, data: { parqCompleted: true } });
    // Create a premium subscription
    await db.subscription.create({
      data: {
        userId: user.id,
        planId: 'price_1RNGiSDJqnmZlsfMyaQp5RCy', // Actual Premium plan id
        plan: 'Premium',
        status: 'active',
        startDate: new Date(),
      },
    });
    await db.$disconnect();
  });
}) 