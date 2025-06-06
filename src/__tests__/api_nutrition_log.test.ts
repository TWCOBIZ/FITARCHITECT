import request from 'supertest';
import app from '../app'; // Your Next.js/Express app
import db from '../lib/db';

describe('/api/nutrition-log', () => {
  let token = '';
  let logId = '';

  beforeAll(async () => {
    // Create user and get JWT token (mock or real)
    // token = await getTestToken();
  });

  it('should require authentication', async () => {
    const res = await request(app).get('/api/nutrition-log');
    expect(res.status).toBe(401);
  });

  it('should create a daily log', async () => {
    const res = await request(app)
      .post('/api/nutrition-log')
      .set('Authorization', `Bearer ${token}`)
      .send({
        date: new Date().toISOString(),
        calories: 100,
        calorieGoal: 2000,
        protein: 10,
        proteinGoal: 150,
        carbs: 20,
        carbsGoal: 250,
        fat: 5,
        fatGoal: 65,
        entries: [{ name: 'Test', calories: 100, protein: 10, carbs: 20, fat: 5, servingSize: '1', servingUnit: 'g' }]
      });
    expect(res.status).toBe(201);
    logId = res.body.id;
  });

  it('should get daily logs', async () => {
    const res = await request(app)
      .get('/api/nutrition-log')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should update a daily log', async () => {
    const res = await request(app)
      .put('/api/nutrition-log')
      .set('Authorization', `Bearer ${token}`)
      .send({
        id: logId,
        date: new Date().toISOString(),
        calories: 200,
        calorieGoal: 2000,
        protein: 20,
        proteinGoal: 150,
        carbs: 40,
        carbsGoal: 250,
        fat: 10,
        fatGoal: 65,
        entries: [{ name: 'Test2', calories: 200, protein: 20, carbs: 40, fat: 10, servingSize: '2', servingUnit: 'g' }]
      });
    expect(res.status).toBe(200);
  });

  it('should delete a daily log', async () => {
    const res = await request(app)
      .delete('/api/nutrition-log')
      .set('Authorization', `Bearer ${token}`)
      .send({ id: logId });
    expect(res.status).toBe(204);
  });

  it('should validate input', async () => {
    const res = await request(app)
      .post('/api/nutrition-log')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });
}); 