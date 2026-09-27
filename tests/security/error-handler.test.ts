import request from 'supertest';
import app from '../../src/app';

describe('Error Handler Security Tests', () => {
  describe('Stack Trace Leakage Prevention', () => {
    it('should not leak stack traces in 404 not found responses', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint');

      expect(response.status).toBe(404);
      expect(response.body).not.toHaveProperty('stack');
    });

    it('should not leak stack traces in 400 validation error responses', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'short',
        });

      expect(response.status).toBe(400);
      expect(response.body).not.toHaveProperty('stack');
    });

    it('should not leak stack traces in 500 internal server error responses', async () => {
      // This tests actual unexpected errors (programmer errors)
      // We expect these to also not leak stack traces
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password',
        });

      // Database connection might fail, giving us a 500
      if (response.status === 500) {
        expect(response.body).not.toHaveProperty('stack');
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toBe('Internal server error');
      }
    });

    it('should not leak stack traces in 403 forbidden responses', async () => {
      // Try to access an admin endpoint without proper authorization
      const response = await request(app)
        .get('/admin/pricing-tiers');

      expect([401, 403]).toContain(response.status);
      expect(response.body).not.toHaveProperty('stack');
    });

    it('should not leak internal file paths in any error response', async () => {
      const responses = await Promise.all([
        request(app).post('/auth/login').send({ email: 'wrong@example.com', password: 'wrong' }),
        request(app).get('/api/nonexistent'),
        request(app).post('/auth/register').send({ email: 'invalid', password: '123' }),
      ]);

      responses.forEach(response => {
        const responseBody = JSON.stringify(response.body);
        // Check for common file path patterns
        expect(responseBody).not.toContain('/opt/render/project/src/');
        expect(responseBody).not.toContain('C:\\Users\\');
        expect(responseBody).not.toContain('node_modules');
        expect(responseBody).not.toContain('.ts:');
        expect(responseBody).not.toContain('.js:');
      });
    });
  });

  describe('Proper HTTP Status Codes for Operational Errors', () => {
    it('should return 404 for non-existent resources', async () => {
      const response = await request(app)
        .get('/api/students/nonexistent-uuid');

      expect(response.status).toBe(404);
      expect(response.body).not.toHaveProperty('stack');
    });

    it('should return 400 for validation errors', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'not-an-email',
          password: '123',
        });

      expect(response.status).toBe(400);
      expect(response.body).not.toHaveProperty('stack');
    });
  });
});
