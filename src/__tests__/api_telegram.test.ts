import request from 'supertest';
import app from '../app';

describe('/api/telegram/*', () => {
  let premiumToken = '';
  let chatId = '123456789';
  let code = '';

  beforeAll(async () => {
    // premiumToken = await getPremiumToken();
  });

  it('should require premium for link', async () => {
    const res = await request(app).post('/api/telegram/link').send({ chatId });
    expect(res.status).toBe(401);
  });

  it('should link Telegram and send code', async () => {
    const res = await request(app)
      .post('/api/telegram/link')
      .set('Authorization', `Bearer ${premiumToken}`)
      .send({ chatId });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('sent');
    // code = await getCodeFromDB();
  });

  it('should verify Telegram code', async () => {
    const res = await request(app)
      .post('/api/telegram/verify')
      .set('Authorization', `Bearer ${premiumToken}`)
      .send({ code });
    expect([200, 400]).toContain(res.status); // 200 if correct, 400 if invalid
  });

  it('should send notification', async () => {
    const res = await request(app)
      .post('/api/telegram/notify')
      .set('Authorization', `Bearer ${premiumToken}`)
      .send({ message: 'Test notification' });
    expect([200, 400]).toContain(res.status); // 200 if linked, 400 if not
  });

  it('should process webhook', async () => {
    const res = await request(app)
      .post('/api/telegram/webhook')
      .send({ message: { chat: { id: chatId }, text: '/start' } });
    expect(res.status).toBe(200);
  });
}); 