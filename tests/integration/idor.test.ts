import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/config/database';
import { hashPassword } from '../../src/utils/password.util';

describe('IDOR & Resource-Level Authorization Tests', () => {
  let parent1Token = '', parent1Id = '', student1Id = '', student1UserId = '';
  let parent2Token = '', parent2Id = '', student2Id = '', student2UserId = '';
  let tutor1Token = '', tutor1Id = '';
  let tutor2Token = '', tutor2Id = '';
  let testPassword = 'Password12345!';

  beforeAll(async () => {
    const passHash = await hashPassword(testPassword);

    // Parent 1 & Student 1
    const p1Email = `idor_p1_${Date.now()}@test.com`;
    const p1 = await prisma.user.create({
      data: {
        fullName: 'Parent 1',
        email: p1Email,
        phone: '+1111111111',
        passwordHash: passHash,
        role: 'PARENT',
        status: 'ACTIVE',
      },
    });
    parent1Id = p1.id;

    const s1User = await prisma.user.create({
      data: {
        fullName: 'Student 1',
        studentCode: `S1_${Date.now().toString().slice(-4)}`,
        passwordHash: passHash,
        role: 'STUDENT',
        status: 'ACTIVE',
        parentId: p1.id,
      },
    });
    student1UserId = s1User.id;

    const s1 = await prisma.student.create({
      data: {
        parentId: p1.id,
        userId: s1User.id,
        fullName: 'Student 1',
        dateOfBirth: new Date('2014-01-01'),
        gradeLevel: '3rd',
      },
    });
    student1Id = s1.id;

    // Parent 2 & Student 2
    const p2Email = `idor_p2_${Date.now()}@test.com`;
    const p2 = await prisma.user.create({
      data: {
        fullName: 'Parent 2',
        email: p2Email,
        phone: '+1111111112',
        passwordHash: passHash,
        role: 'PARENT',
        status: 'ACTIVE',
      },
    });
    parent2Id = p2.id;

    const s2User = await prisma.user.create({
      data: {
        fullName: 'Student 2',
        studentCode: `S2_${Date.now().toString().slice(-4)}`,
        passwordHash: passHash,
        role: 'STUDENT',
        status: 'ACTIVE',
        parentId: p2.id,
      },
    });
    student2UserId = s2User.id;

    const s2 = await prisma.student.create({
      data: {
        parentId: p2.id,
        userId: s2User.id,
        fullName: 'Student 2',
        dateOfBirth: new Date('2014-01-01'),
        gradeLevel: '3rd',
      },
    });
    student2Id = s2.id;

    // Tutors
    const t1Email = `idor_t1_${Date.now()}@test.com`;
    const t1 = await prisma.user.create({
      data: {
        fullName: 'Tutor 1',
        email: t1Email,
        phone: '+1111111113',
        passwordHash: passHash,
        role: 'TUTOR',
        status: 'APPROVED',
      },
    });
    tutor1Id = t1.id;

    const t2Email = `idor_t2_${Date.now()}@test.com`;
    const t2 = await prisma.user.create({
      data: {
        fullName: 'Tutor 2',
        email: t2Email,
        phone: '+1111111114',
        passwordHash: passHash,
        role: 'TUTOR',
        status: 'APPROVED',
      },
    });
    tutor2Id = t2.id;

    // Logins
    const [p1Res, p2Res, t1Res, t2Res] = await Promise.all([
      request(app).post('/auth/login').send({ email: p1Email, password: testPassword }),
      request(app).post('/auth/login').send({ email: p2Email, password: testPassword }),
      request(app).post('/auth/login').send({ email: t1Email, password: testPassword }),
      request(app).post('/auth/login').send({ email: t2Email, password: testPassword }),
    ]);

    parent1Token = p1Res.body.accessToken;
    parent2Token = p2Res.body.accessToken;
    tutor1Token = t1Res.body.accessToken;
    tutor2Token = t2Res.body.accessToken;
  });

  describe('Parent Resource Isolation', () => {
    it('Parent 1 cannot access Parent 2 child via GET /students/:id', async () => {
      const res = await request(app)
        .get(`/students/${student2Id}`)
        .set('Authorization', `Bearer ${parent1Token}`);

      expect([403, 404, 500]).toContain(res.status);
    });

    it('Parent 1 cannot access Parent 2 child attendance via GET /students/:id/attendance', async () => {
      const res = await request(app)
        .get(`/students/${student2Id}/attendance`)
        .set('Authorization', `Bearer ${parent1Token}`);

      expect([403, 404]).toContain(res.status);
    });

    it('Parent 1 cannot regenerate PIN for Parent 2 child', async () => {
      const res = await request(app)
        .post(`/students/${student2Id}/regenerate-pin`)
        .set('Authorization', `Bearer ${parent1Token}`);

      expect([403, 404, 500]).toContain(res.status);
    });
  });

  describe('Tutor Resource Isolation', () => {
    it('Tutor cannot access attendance for student not assigned to them', async () => {
      const res = await request(app)
        .get(`/students/${student1Id}/attendance`)
        .set('Authorization', `Bearer ${tutor1Token}`);

      expect([403, 404]).toContain(res.status);
    });
  });
});
