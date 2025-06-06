import request from 'supertest';
import app from '../app';

describe('/api/analytics', () => {
  let token = '';

  beforeAll(async () => {
    // token = await getTestToken();
  });

  it('should require authentication', async () => {
    const res = await request(app).get('/api/analytics');
    expect(res.status).toBe(401);
  });

  it('should fetch analytics for authenticated user', async () => {
    const res = await request(app)
      .get('/api/analytics')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('calories');
    expect(res.body).toHaveProperty('protein');
    expect(res.body).toHaveProperty('carbs');
    expect(res.body).toHaveProperty('fat');
    expect(res.body).toHaveProperty('dates');
    expect(res.body).toHaveProperty('streak');
    expect(res.body).toHaveProperty('bestStreak');
    expect(res.body).toHaveProperty('avgCalories');
  });
}); 