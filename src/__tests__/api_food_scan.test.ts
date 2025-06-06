import request from 'supertest';
import app from '../app';

describe('/api/food-scan', () => {
  let premiumToken = '';
  let freeToken = '';

  beforeAll(async () => {
    // premiumToken = await getPremiumToken();
    // freeToken = await getFreeToken();
  });

  it('should require authentication', async () => {
    const res = await request(app).post('/api/food-scan').send({ barcode: '1234567890123' });
    expect(res.status).toBe(401);
  });

  it('should require premium subscription', async () => {
    const res = await request(app)
      .post('/api/food-scan')
      .set('Authorization', `Bearer ${freeToken}`)
      .send({ barcode: '1234567890123' });
    expect(res.status).toBe(403);
  });

  it('should validate barcode', async () => {
    const res = await request(app)
      .post('/api/food-scan')
      .set('Authorization', `Bearer ${premiumToken}`)
      .send({ barcode: '' });
    expect(res.status).toBe(400);
  });

  it('should fetch food entry for valid barcode', async () => {
    const res = await request(app)
      .post('/api/food-scan')
      .set('Authorization', `Bearer ${premiumToken}`)
      .send({ barcode: '737628064502' }); // Example barcode
    expect([200, 404]).toContain(res.status); // 200 if found, 404 if not
  });
}); 