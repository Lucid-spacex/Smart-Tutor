import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/config/database';
import { hashPassword } from '../../src/utils/password.util';

describe('Grades Workflow & Visibility Integration Tests', () => {
  let adminToken = '', adminId = '';
  let tutorToken = '', tutorId = '';
  let parentToken = '', parentId = '';
  let studentToken = '', studentUserId = '', studentId = '';
  let enrollmentId = '';
  let gradeId = '';
  let testPassword = 'Password12345!';

  beforeAll(async () => {
    const passHash = await hashPassword(testPassword);

    const admin = await prisma.user.create({
      data: {
        fullName: 'Admin Grades',
        email: `grd_admin_${Date.now()}@test.com`,
        passwordHash: passHash,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });
    adminId = admin.id;

    const tutor = await prisma.user.create({
      data: {
        fullName: 'Tutor Grades',
        email: `grd_tutor_${Date.now()}@test.com`,
        passwordHash: passHash,
        role: 'TUTOR',
        status: 'APPROVED',
      },
    });
    tutorId = tutor.id;
    await prisma.tutorProfile.create({
      data: {
        userId: tutor.id,
        subjects: ['Math'],
        bio: 'Bio',
        hourlyRate: 50,
        availability: {},
        vettingStatus: 'APPROVED',
      },
    });

    const parent = await prisma.user.create({
      data: {
        fullName: 'Parent Grades',
        email: `grd_parent_${Date.now()}@test.com`,
        passwordHash: passHash,
        role: 'PARENT',
        status: 'ACTIVE',
      },
    });
    parentId = parent.id;

    const studentUser = await prisma.user.create({
      data: {
        fullName: 'Student Grades',
        studentCode: `GRD${Math.floor(1000 + Math.random() * 9000)}`,
        passwordHash: passHash,
        role: 'STUDENT',
        status: 'ACTIVE',
        parentId: parent.id,
      },
    });
    studentUserId = studentUser.id;

    const studentRecord = await prisma.student.create({
      data: {
        parentId: parent.id,
        userId: studentUser.id,
        fullName: 'Student Grades',
        dateOfBirth: new Date('2014-01-01'),
        gradeLevel: '4th',
      },
    });
    studentId = studentRecord.id;

    const subject = await prisma.subject.create({
      data: {
        name: `Math_Grd_${Date.now()}`,
        gradeBand: 'K-12',
        category: 'CORE',
      },
    });

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId: studentRecord.id,
        subjectId: subject.id,
        tutorId: tutor.id,
        sessionFrequency: 'WEEKLY',
        billingFrequency: 'MONTHLY',
        yearlyPrice: 1200,
        status: 'ACTIVE',
        startDate: new Date(),
      },
    });
    enrollmentId = enrollment.id;

    const [aRes, tRes, pRes, sRes] = await Promise.all([
      request(app).post('/auth/login').send({ email: admin.email, password: testPassword }),
      request(app).post('/auth/login').send({ email: tutor.email, password: testPassword }),
      request(app).post('/auth/login').send({ email: parent.email, password: testPassword }),
      request(app).post('/auth/student-login').send({ parentEmail: parent.email, studentCode: studentUser.studentCode, studentPassword: testPassword }),
    ]);

    adminToken = aRes.body.accessToken;
    tutorToken = tRes.body.accessToken;
    parentToken = pRes.body.accessToken;
    studentToken = sRes.body.accessToken;
  });

  it('Tutor submits grade -> starts PENDING_APPROVAL and visibleToStudent=false', async () => {
    const res = await request(app)
      .post('/grades')
      .set('Authorization', `Bearer ${tutorToken}`)
      .send({
        enrollmentId,
        score: 95,
        comments: 'Excellent work on algebra fundamentals',
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PENDING_APPROVAL');
    expect(res.body.visibleToStudent).toBe(false);
    gradeId = res.body.id;
  });

  it('Parent and Student cannot see PENDING_APPROVAL grade', async () => {
    const parentRes = await request(app)
      .get('/grades')
      .set('Authorization', `Bearer ${parentToken}`)
      .query({ enrollmentId });

    expect(parentRes.status).toBe(200);
    expect(parentRes.body.find((g: any) => g.id === gradeId)).toBeUndefined();

    const studentRes = await request(app)
      .get('/student/me/grades')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(studentRes.status).toBe(200);
    expect(studentRes.body.find((g: any) => g.id === gradeId)).toBeUndefined();
  });

  it('Admin approves grade -> flips visibleToStudent=true', async () => {
    const approveRes = await request(app)
      .patch(`/admin/grades/${gradeId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.status).toBe('APPROVED');
    expect(approveRes.body.visibleToStudent).toBe(true);

    // Now parent and student can see the approved grade
    const parentRes = await request(app)
      .get('/grades')
      .set('Authorization', `Bearer ${parentToken}`)
      .query({ enrollmentId });

    expect(parentRes.body.some((g: any) => g.id === gradeId)).toBe(true);
  });
});
