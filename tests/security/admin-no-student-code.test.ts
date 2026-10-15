import request from 'supertest';
import { prisma } from '../../src/config/database';
import { hashPassword } from '../../src/utils/password.util';
import { app } from '../../src/app';

describe('Admin Student Code Security Test', () => {
  let adminToken: string;
  let parentToken: string;
  let studentId: string;
  let studentCode: string;

  beforeAll(async () => {
    // Create admin user
    const adminPasswordHash = await hashPassword('admin123');
    const admin = await prisma.user.create({
      data: {
        fullName: 'Test Admin',
        email: 'admin@test.com',
        passwordHash: adminPasswordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'admin123',
      });

    adminToken = adminLoginRes.body.accessToken;

    // Create parent user
    const parentPasswordHash = await hashPassword('parent123');
    const parent = await prisma.user.create({
      data: {
        fullName: 'Test Parent',
        email: 'parent@test.com',
        passwordHash: parentPasswordHash,
        role: 'PARENT',
        status: 'ACTIVE',
      },
    });

    const parentLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'parent@test.com',
        password: 'parent123',
      });

    parentToken = parentLoginRes.body.accessToken;

    // Create student
    const studentPasswordHash = await hashPassword('123456');
    studentCode = 'STUDENT01';
    const studentUser = await prisma.user.create({
      data: {
        fullName: 'Test Student',
        email: 'student@test.com',
        passwordHash: studentPasswordHash,
        role: 'STUDENT',
        status: 'ACTIVE',
        studentCode,
        parentId: parent.id,
      },
    });

    const student = await prisma.student.create({
      data: {
        userId: studentUser.id,
        parentId: parent.id,
        fullName: 'Test Student',
        dateOfBirth: new Date('2010-01-01'),
        gradeLevel: 'Grade 5',
        gradeBandTier: 'G5_TO_G8',
      },
    });

    studentId = student.id;
  });

  afterAll(async () => {
    // Cleanup in reverse order of creation to handle foreign key constraints
    await prisma.student.deleteMany({});
    await prisma.user.deleteMany({
      where: { email: { in: ['admin@test.com', 'parent@test.com', 'student@test.com'] } },
    });
  });

  describe('Admin endpoints must never return studentCode', () => {
    it('GET /admin/students should not include studentCode', async () => {
      const res = await request(app)
        .get('/api/admin/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);

      if (res.body.data.length > 0) {
        const student = res.body.data[0];
        expect(student).not.toHaveProperty('studentCode');
        expect(student).not.toHaveProperty('user.studentCode');
      }
    });

    it('GET /admin/students/:id should not include studentCode', async () => {
      const res = await request(app)
        .get(`/api/admin/students/${studentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toBeDefined();
      expect(res.body).not.toHaveProperty('studentCode');
      expect(res.body).not.toHaveProperty('user.studentCode');
    });

    it('GET /admin/parents/:id children should not include studentCode', async () => {
      const parent = await prisma.user.findFirst({ where: { email: 'parent@test.com' } });
      expect(parent).toBeDefined();

      const res = await request(app)
        .get(`/api/admin/parents/${parent.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.children).toBeDefined();
      expect(Array.isArray(res.body.children)).toBe(true);

      if (res.body.children.length > 0) {
        const child = res.body.children[0];
        expect(child).not.toHaveProperty('studentCode');
        expect(child).not.toHaveProperty('user.studentCode');
      }
    });
  });

  describe('Parent endpoints can return studentCode for their own children', () => {
    it('GET /students/:id should include studentCode for parent', async () => {
      const res = await request(app)
        .get(`/api/students/${studentId}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      expect(res.body).toBeDefined();
      // Parents can see their own children's studentCode
      expect(res.body).toHaveProperty('studentCode');
    });
  });
});
