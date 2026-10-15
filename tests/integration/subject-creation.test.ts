import request from 'supertest';
import { prisma } from '../../src/config/database';
import { hashPassword } from '../../src/utils/password.util';
import { app } from '../../src/app';

describe('Subject Creation Integration Test', () => {
  let adminToken: string;
  let adminId: string;

  beforeAll(async () => {
    // Create admin user
    const passwordHash = await hashPassword('admin123');
    const admin = await prisma.user.create({
      data: {
        fullName: 'Test Admin',
        email: 'admin@test.com',
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    adminId = admin.id;

    // Get admin token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'admin123',
      });

    adminToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.subjectPrice.deleteMany({});
    await prisma.subject.deleteMany({});
    await prisma.user.deleteMany({
      where: { email: 'admin@test.com' },
    });
  });

  it('should create a subject with prices using only updatedBy (not updater: { connect })', async () => {
    const subjectData = {
      name: 'Test Subject',
      description: 'Test description',
      category: 'CORE',
      prices: [
        {
          gradeBandTier: 'G5_TO_G8',
          yearlyPriceNGN: 150000,
          yearlyPriceUSD: 200,
        },
      ],
    };

    const res = await request(app)
      .post('/api/admin/subjects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(subjectData)
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe(subjectData.name);
    expect(res.body.subjectPrices).toHaveLength(1);
    expect(res.body.subjectPrices[0].updatedBy).toBe(adminId);
    expect(res.body.subjectPrices[0].updater).toBeDefined();
    expect(res.body.subjectPrices[0].updater.id).toBe(adminId);
  });

  it('should upsert subject price using only updatedBy', async () => {
    // First create a subject
    const subject = await prisma.subject.create({
      data: {
        name: 'Physics',
        category: 'CORE',
      },
    });

    const priceData = {
      yearlyPriceNGN: 300000,
      yearlyPriceUSD: 400,
    };

    const res = await request(app)
      .put(`/api/admin/subjects/${subject.id}/prices/G9_TO_G12`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(priceData)
      .expect(200);

    expect(res.body.updatedBy).toBe(adminId);
    expect(res.body.updater).toBeDefined();
    expect(res.body.updater.id).toBe(adminId);
  });
});
