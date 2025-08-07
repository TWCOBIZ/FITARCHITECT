import request from 'supertest'
import { app } from '../server'

describe('Authentication & Authorization', () => {
  const testUserEmail = 'auth_test@fitarchitect.com'
  const testUserPassword = 'AuthTest123!'
  let userToken: string
  let adminToken: string

  beforeAll(async () => {
    // Clean up any existing test users
    await request(app)
      .delete(`/api/test-cleanup/${testUserEmail}`)
      .expect([200, 404]) // OK if user doesn't exist
  })

  describe('User Registration', () => {
    it('should register a new user with valid data', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({
          email: testUserEmail,
          password: testUserPassword,
          name: 'Auth Test User',
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
      expect(res.body.token).toBeDefined()
      userToken = res.body.token
    })

    it('should reject duplicate email registration', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({
          email: testUserEmail,
          password: testUserPassword,
          name: 'Duplicate User',
          height: 70,
          weight: 180,
          age: 30,
          gender: 'male',
          fitnessGoals: ['Build Muscle'],
          activityLevel: 'moderate',
          dietaryPreferences: ['None']
        })
      
      expect(res.statusCode).toBe(409)
      expect(res.body.error).toContain('already exists')
    })

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({
          email: 'invalid-email',
          password: testUserPassword,
          name: 'Invalid Email User',
          height: 70,
          weight: 180,
          age: 30,
          gender: 'male',
          fitnessGoals: ['Build Muscle'],
          activityLevel: 'moderate',
          dietaryPreferences: ['None']
        })
      
      expect(res.statusCode).toBe(400)
      expect(res.body.error).toBe('Validation failed')
    })

    it('should reject weak password', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({
          email: 'weak@example.com',
          password: '123',
          name: 'Weak Password User',
          height: 70,
          weight: 180,
          age: 30,
          gender: 'male',
          fitnessGoals: ['Build Muscle'],
          activityLevel: 'moderate',
          dietaryPreferences: ['None']
        })
      
      expect(res.statusCode).toBe(400)
      expect(res.body.error).toBe('Validation failed')
    })

    it('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({
          email: 'incomplete@example.com',
          password: testUserPassword
          // Missing name, height, weight, age, etc.
        })
      
      expect(res.statusCode).toBe(400)
    })
  })

  describe('User Login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({
          email: testUserEmail,
          password: testUserPassword
        })
      
      expect(res.statusCode).toBe(200)
      expect(res.body.token).toBeDefined()
      expect(res.body.user.email).toBe(testUserEmail)
    })

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUserPassword
        })
      
      expect(res.statusCode).toBe(401)
      expect(res.body.error).toContain('Invalid credentials')
    })

    it('should reject invalid password', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({
          email: testUserEmail,
          password: 'wrongpassword'
        })
      
      expect(res.statusCode).toBe(401)
      expect(res.body.error).toContain('Invalid credentials')
    })

    it('should reject malformed login request', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({
          email: 'invalid-email-format',
          password: 'short'
        })
      
      expect(res.statusCode).toBe(400)
      expect(res.body.error).toBe('Validation failed')
    })
  })

  describe('Admin Authentication', () => {
    it('should login admin with valid credentials', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({
          email: 'ken@nepacreativeagency.com',
          password: 'adminlog'
        })
      
      expect(res.statusCode).toBe(200)
      expect(res.body.token).toBeDefined()
      adminToken = res.body.token
    })

    it('should reject non-admin user login to admin endpoint', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({
          email: testUserEmail,
          password: testUserPassword
        })
      
      expect(res.statusCode).toBe(403)
      expect(res.body.error).toContain('Admin privileges required')
    })
  })

  describe('Authorization Middleware', () => {
    it('should allow authenticated user to access protected route', async () => {
      const res = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${userToken}`)
      
      expect(res.statusCode).toBe(200)
    })

    it('should reject request without token', async () => {
      const res = await request(app)
        .get('/api/profile')
      
      expect(res.statusCode).toBe(401)
      expect(res.body.error).toBe('No token provided')
    })

    it('should reject request with invalid token', async () => {
      const res = await request(app)
        .get('/api/profile')
        .set('Authorization', 'Bearer invalid-token')
      
      expect(res.statusCode).toBe(401)
      expect(res.body.error).toBe('Invalid token')
    })

    it('should reject non-admin user from admin routes', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
      
      expect(res.statusCode).toBe(403)
      expect(res.body.error).toBe('Admin privileges required')
    })

    it('should allow admin user to access admin routes', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
      
      expect(res.statusCode).toBe(200)
    })
  })

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/login')
          .send({
            email: 'rateLimitTest@example.com',
            password: 'wrongpassword'
          })
      }

      // Next attempt should be rate limited
      const res = await request(app)
        .post('/api/login')
        .send({
          email: 'rateLimitTest@example.com',
          password: 'wrongpassword'
        })
      
      expect(res.statusCode).toBe(429)
      expect(res.body.error).toContain('Too many authentication attempts')
    })
  })

  afterAll(async () => {
    // Clean up test user
    await request(app)
      .delete(`/api/test-cleanup/${testUserEmail}`)
  })
})