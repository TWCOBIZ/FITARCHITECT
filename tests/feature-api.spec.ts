import { test, expect, request } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001'

test.describe('API & Core Feature Endpoints', () => {
  let userToken: string
  let adminToken: string
  let premiumToken: string
  const testUser = {
    name: 'Playwright User',
    email: `pwuser_${Date.now()}@example.com`,
    password: 'Playwright123!'
  }
  const adminUser = {
    email: 'ken@nepacreativeagency.com',
    password: 'adminlog',
  }

  test('Register new user', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/register`, {
      data: {
        email: testUser.email,
        password: testUser.password,
        name: testUser.name,
        height: 70,
        weight: 180,
        age: 30,
        gender: 'male',
        fitnessGoals: ['Build Muscle'],
        activityLevel: 'moderate',
        dietaryPreferences: ['None']
      }
    })
    expect(res.status()).toBe(200)
    const data = await res.json()
    userToken = data.token
    expect(data.user.email).toBe(testUser.email)
  })

  test('Login as user', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/login`, {
      data: { email: testUser.email, password: testUser.password }
    })
    expect(res.status()).toBe(200)
    const data = await res.json()
    userToken = data.token
    expect(data.user.email).toBe(testUser.email)
  })

  test('Login as admin', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/login`, {
      data: { email: adminUser.email, password: adminUser.password }
    })
    expect(res.status()).toBe(200)
    const data = await res.json()
    adminToken = data.token
    expect(data.user.isAdmin).toBe(true)
  })

  test('Feature gating: free user cannot access premium endpoint', async ({ request }) => {
    const res = await request.get(`${baseURL}/api/premium-feature`, {
      headers: { Authorization: `Bearer ${userToken}` }
    })
    expect(res.status()).toBe(403)
  })

  test('Upgrade user to premium', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/upgrade`, {
      data: { email: testUser.email, plan: 'premium' },
      headers: { Authorization: `Bearer ${userToken}` }
    })
    expect(res.status()).toBe(200)
    const data = await res.json()
    premiumToken = data.token
    expect(data.user.tier).toBe('premium')
  })

  test('Premium user can access premium endpoint', async ({ request }) => {
    const res = await request.get(`${baseURL}/api/premium-feature`, {
      headers: { Authorization: `Bearer ${premiumToken}` }
    })
    expect(res.status()).toBe(200)
  })

  test('Core feature: workout logging', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/workout`, {
      data: {
        exercises: [{ name: 'Bench Press', sets: 3, reps: 10, weight: 135 }],
        duration: 45
      },
      headers: { Authorization: `Bearer ${premiumToken}` }
    })
    expect(res.status()).toBe(200)
  })

  test('Core feature: meal planning', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/meal`, {
      data: { mealName: 'Chicken Salad', calories: 400 },
      headers: { Authorization: `Bearer ${premiumToken}` }
    })
    expect(res.status()).toBe(200)
  })

  test('Core feature: analytics', async ({ request }) => {
    const res = await request.get(`${baseURL}/api/analytics`, {
      headers: { Authorization: `Bearer ${premiumToken}` }
    })
    expect(res.status()).toBe(200)
  })

  test('Core feature: calorie tracking', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/calories`, {
      data: { foodName: 'Apple', calories: 95 },
      headers: { Authorization: `Bearer ${premiumToken}` }
    })
    expect(res.status()).toBe(200)
  })
}) 