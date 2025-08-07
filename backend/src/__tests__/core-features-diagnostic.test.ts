import request from 'supertest';
import app from '../server';
import { prisma } from '../db/prisma';
import { generateToken } from '../auth';

describe('Core Features Diagnostic Tests', () => {
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create a test user with complete profile
    const testUser = await prisma.userProfile.create({
      data: {
        email: 'coretest@example.com',
        passwordHash: 'hashed_password',
        name: 'Core Test User',
        age: 25,
        height: 175,
        weight: 70,
        gender: 'male',
        activityLevel: 'moderate',
        fitnessGoals: ['muscle_building'],
        availableEquipment: ['bodyweight', 'dumbbells'],
        preferredWorkoutDuration: '45-60 minutes',
        experienceLevel: 'intermediate',
        parqCompleted: true,
        tier: 'basic',
        subscriptionStatus: 'active'
      }
    });
    
    testUserId = testUser.id;
    authToken = generateToken(testUser.id);
  });

  afterAll(async () => {
    // Cleanup
    await prisma.workoutPlan.deleteMany({ where: { userId: testUserId } });
    await prisma.mealPlan.deleteMany({ where: { userId: testUserId } });
    await prisma.nutritionLog.deleteMany({ where: { userId: testUserId } });
    await prisma.userProfile.delete({ where: { id: testUserId } });
  });

  describe('Workout Generation API', () => {
    it('should generate workout plan with valid user profile', async () => {
      const userProfile = {
        fitnessGoals: ['muscle_building'],
        experienceLevel: 'intermediate',
        equipment: ['bodyweight', 'dumbbells'],
        workoutDays: 4,
        workoutDuration: '45-60 minutes'
      };

      const response = await request(app)
        .post('/api/workout-plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userProfile })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('weeks');
      expect(response.body.weeks).toBeInstanceOf(Array);
      expect(response.body.weeks.length).toBeGreaterThan(0);
      
      // Verify weeks structure
      const firstWeek = response.body.weeks[0];
      expect(firstWeek).toHaveProperty('weekNumber');
      expect(firstWeek).toHaveProperty('days');
      expect(firstWeek.days).toBeInstanceOf(Array);
    });

    it('should require PAR-Q completion for workout generation', async () => {
      // Create user without PAR-Q completion
      const userWithoutParq = await prisma.userProfile.create({
        data: {
          email: 'noparq@example.com',
          passwordHash: 'hashed_password',
          name: 'No PARQ User',
          tier: 'basic',
          parqCompleted: false,
          subscriptionStatus: 'active'
        }
      });

      const noParqToken = generateToken(userWithoutParq.id);

      const response = await request(app)
        .post('/api/workout-plans/generate')
        .set('Authorization', `Bearer ${noParqToken}`)
        .send({ userProfile: { fitnessGoals: ['muscle_building'] } })
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('PAR-Q health assessment');

      // Cleanup
      await prisma.userProfile.delete({ where: { id: userWithoutParq.id } });
    });

    it('should enforce subscription requirements', async () => {
      // Create free tier user without trial
      const freeUser = await prisma.userProfile.create({
        data: {
          email: 'free@example.com',
          passwordHash: 'hashed_password',
          name: 'Free User',
          tier: 'free',
          parqCompleted: true,
          freeWorkoutTrialUsed: true,
          subscriptionStatus: 'inactive'
        }
      });

      const freeToken = generateToken(freeUser.id);

      const response = await request(app)
        .post('/api/workout-plans/generate')
        .set('Authorization', `Bearer ${freeToken}`)
        .send({ userProfile: { fitnessGoals: ['muscle_building'] } })
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('trial has ended');

      // Cleanup
      await prisma.userProfile.delete({ where: { id: freeUser.id } });
    });
  });

  describe('Meal Planning API', () => {
    it('should generate meal plan for all subscription tiers', async () => {
      const response = await request(app)
        .post('/api/meal-plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dietType: 'balanced',
          days: 7,
          preferences: {
            calories: 2000,
            dietaryRestrictions: []
          }
        })
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('meals');
      expect(response.body).toHaveProperty('shoppingList');
      expect(response.body.meals).toBeInstanceOf(Array);
    });

    it('should work for free tier users', async () => {
      // Create free tier user
      const freeUser = await prisma.userProfile.create({
        data: {
          email: 'freemeal@example.com',
          passwordHash: 'hashed_password',
          name: 'Free Meal User',
          tier: 'free',
          age: 25,
          height: 175,
          weight: 70,
          gender: 'male',
          activityLevel: 'moderate'
        }
      });

      const freeToken = generateToken(freeUser.id);

      const response = await request(app)
        .post('/api/meal-plans/generate')
        .set('Authorization', `Bearer ${freeToken}`)
        .send({
          dietType: 'balanced',
          days: 7
        })
        .expect(200);

      expect(response.body).toHaveProperty('meals');

      // Cleanup
      await prisma.mealPlan.deleteMany({ where: { userId: freeUser.id } });
      await prisma.userProfile.delete({ where: { id: freeUser.id } });
    });
  });

  describe('Nutrition Tracking API', () => {
    it('should handle nutrition log operations', async () => {
      // Create nutrition log
      const createResponse = await request(app)
        .post('/api/nutrition-log')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          date: new Date().toISOString().split('T')[0],
          foods: [
            {
              name: 'Test Food',
              calories: 100,
              protein: 10,
              carbs: 15,
              fat: 5,
              quantity: 1,
              unit: 'serving'
            }
          ],
          totalCalories: 100,
          totalProtein: 10,
          totalCarbs: 15,
          totalFat: 5
        })
        .expect(201);

      expect(createResponse.body).toHaveProperty('id');

      // Get nutrition logs
      const getResponse = await request(app)
        .get('/api/nutrition-log')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body).toBeInstanceOf(Array);
      expect(getResponse.body.length).toBeGreaterThan(0);
    });

    it('should get daily nutrition log', async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const response = await request(app)
        .get(`/api/nutrition-log/daily/${today}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('date');
      expect(response.body).toHaveProperty('foods');
      expect(response.body).toHaveProperty('totalCalories');
    });
  });

  describe('Food Scanning API (Premium Feature)', () => {
    it('should require premium subscription for barcode scanning', async () => {
      const response = await request(app)
        .get('/api/food-scan/barcode/1234567890')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Premium subscription required');
    });

    it('should work for premium users', async () => {
      // Update user to premium
      await prisma.userProfile.update({
        where: { id: testUserId },
        data: { tier: 'premium' }
      });

      // Mock the external API call by checking the endpoint exists
      const response = await request(app)
        .get('/api/food-scan/barcode/invalid_barcode')
        .set('Authorization', `Bearer ${authToken}`);

      // Should return 404 for invalid barcode, not 403 for permission
      expect(response.status).not.toBe(403);
    });
  });

  describe('Feature Access Control', () => {
    it('should return correct feature access for different tiers', async () => {
      const features = [
        'workout-generation',
        'nutrition-tracking', 
        'meal-planning',
        'barcode-scanning',
        'telegram-notifications'
      ];

      for (const feature of features) {
        const response = await request(app)
          .get(`/api/feature-access/${feature}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('hasAccess');
        expect(response.body).toHaveProperty('tier');
        expect(response.body).toHaveProperty('feature');
      }
    });
  });
});