import request from 'supertest';
import { app } from '../../src/index';

describe('API Integration Tests', () => {
  test('GET / should return 200 and service name', async () => {
    const res = await request(app.fetch).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, service: 'api' });
  });

  test('GET /metrics should return Prometheus metrics', async () => {
    const res = await request(app.fetch).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('http_requests_total');
  });

  test('GET /auth/me should return 401 without token', async () => {
    const res = await request(app.fetch).get('/auth/me');
    expect(res.status).toBe(401);
  });
});
