import request from 'supertest';
import app from '../../src/app';

describe('Auth Flow Integration Tests', () => {
  describe('POST /auth/register', () => {
    it('should register a new parent user', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          fullName: 'Test Parent',
          email: 'testparent@example.com',
          phone: '+1234567890',
          password: 'password123',
          role: 'PARENT',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('userId');
      expect(response.body.message).toContain('successful');
    });

    it('should register a new tutor user', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          fullName: 'Test Tutor',
          email: 'testtutor@example.com',
          phone: '+1234567891',
          password: 'password123',
          role: 'TUTOR',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('userId');
    });

    it('should fail with invalid email', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          fullName: 'Test User',
          email: 'invalid-email',
          phone: '+1234567890',
          password: 'password123',
          role: 'PARENT',
        });

      expect(response.status).toBe(400);
    });

    it('should fail with weak password', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          fullName: 'Test User',
          email: 'test@example.com',
          phone: '+1234567890',
          password: '123',
          role: 'PARENT',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /auth/verify', () => {
    it('should verify email with valid OTP', async () => {
      const response = await request(app)
        .post('/auth/verify')
        .send({
          email: 'parent@smarttutor.com', // Using seeded user
          otp: '123456', // MVP accepts any 6-digit OTP
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('user');
    });

    it('should fail with invalid OTP format', async () => {
      const response = await request(app)
        .post('/auth/verify')
        .send({
          email: 'parent@smarttutor.com',
          otp: '123', // Invalid OTP length
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'parent@smarttutor.com',
          password: 'parent123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe('parent@smarttutor.com');
    });

    it('should fail with invalid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'parent@smarttutor.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
    });

    it('should fail with non-existent user', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh access token', async () => {
      // First login to get refresh token
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'parent@smarttutor.com',
          password: 'parent123',
        });

      const refreshToken = loginResponse.body.refreshToken;

      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should fail with invalid refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout authenticated user', async () => {
      // First login to get access token
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'parent@smarttutor.com',
          password: 'parent123',
        });

      const accessToken = loginResponse.body.accessToken;

      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/auth/logout');

      expect(response.status).toBe(401);
    });
  });
});
