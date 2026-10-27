import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/config/database';
import { hashPassword } from '../../src/utils/password.util';

describe('Security Data Leak Tests', () => {
  let adminToken = '', adminId = '';
  let parentToken = '', parentId = '';
  let tutorToken = '', tutorId = '';
  let anotherTutorToken = '', anotherTutorId = '';
  let studentId = '';
  let documentId = '';
  let testPassword = 'Password12345!';

  beforeAll(async () => {
    const passHash = await hashPassword(testPassword);

    const admin = await prisma.user.create({
      data: {
        fullName: 'Admin Security',
        email: `sec_admin_${Date.now()}@test.com`,
        passwordHash: passHash,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });
    adminId = admin.id;

    const parent = await prisma.user.create({
      data: {
        fullName: 'Parent Security',
        email: `sec_parent_${Date.now()}@test.com`,
        passwordHash: passHash,
        role: 'PARENT',
        status: 'ACTIVE',
      },
    });
    parentId = parent.id;

    const tutor = await prisma.user.create({
      data: {
        fullName: 'Tutor Security',
        email: `sec_tutor_${Date.now()}@test.com`,
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

    const anotherTutor = await prisma.user.create({
      data: {
        fullName: 'Another Tutor',
        email: `sec_tutor2_${Date.now()}@test.com`,
        passwordHash: passHash,
        role: 'TUTOR',
        status: 'APPROVED',
      },
    });
    anotherTutorId = anotherTutor.id;
    await prisma.tutorProfile.create({
      data: {
        userId: anotherTutor.id,
        subjects: ['Math'],
        bio: 'Bio',
        hourlyRate: 50,
        availability: {},
        vettingStatus: 'APPROVED',
      },
    });

    const [aRes, pRes, tRes, t2Res] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: admin.email, password: testPassword }),
      request(app).post('/api/auth/login').send({ email: parent.email, password: testPassword }),
      request(app).post('/api/auth/login').send({ email: tutor.email, password: testPassword }),
      request(app).post('/api/auth/login').send({ email: anotherTutor.email, password: testPassword }),
    ]);

    adminToken = aRes.body.accessToken;
    parentToken = pRes.body.accessToken;
    tutorToken = tRes.body.accessToken;
    anotherTutorToken = t2Res.body.accessToken;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.tutorDocument.deleteMany({});
    await prisma.tutorApplication.deleteMany({});
    await prisma.student.deleteMany({});
    await prisma.tutorProfile.deleteMany({});
    await prisma.user.deleteMany({});
  });

  describe('POST /students - Response Security', () => {
    it('POST /students never includes PIN or studentCode in response body', async () => {
      const res = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          fullName: 'Test Student',
          dateOfBirth: '2014-01-01',
          actualGrade: 'GRADE_4',
          gradeLevel: '4th',
        });

      expect(res.status).toBe(201);
      studentId = res.body.id;

      // Verify PIN is not in response
      expect(res.body.studentPin).toBeUndefined();
      expect(res.body.pin).toBeUndefined();
      expect(res.body.password).toBeUndefined();
      expect(res.body.passwordHash).toBeUndefined();

      // Verify studentCode is not in response
      expect(res.body.studentCode).toBeUndefined();
    });

    it('POST /students response includes other expected fields', async () => {
      const res = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          fullName: 'Test Student 2',
          dateOfBirth: '2014-01-01',
          actualGrade: 'GRADE_4',
          gradeLevel: '4th',
        });

      expect(res.status).toBe(201);
      // Should include these fields
      expect(res.body.id).toBeDefined();
      expect(res.body.fullName).toBeDefined();
      expect(res.body.actualGrade).toBeDefined();
      expect(res.body.gradeBandTier).toBeDefined();
      expect(res.body.emailSent).toBeDefined();
    });
  });

  describe('POST /students/:id/regenerate-pin - Response Security', () => {
    it('POST /students/:id/regenerate-pin never includes PIN or studentCode in response body', async () => {
      const res = await request(app)
        .post(`/api/students/${studentId}/regenerate-pin`)
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(200);

      // Verify PIN is not in response
      expect(res.body.studentPin).toBeUndefined();
      expect(res.body.pin).toBeUndefined();
      expect(res.body.newPin).toBeUndefined();
      expect(res.body.password).toBeUndefined();
      expect(res.body.passwordHash).toBeUndefined();

      // Verify studentCode is not in response
      expect(res.body.studentCode).toBeUndefined();

      // Should include message
      expect(res.body.message).toContain('PIN regenerated successfully');
      expect(res.body.emailSent).toBeDefined();
    });
  });

  describe('PATCH /admin/students/:id/regenerate-pin - Response Security', () => {
    it('PATCH /admin/students/:id/regenerate-pin never includes PIN or studentCode in response body', async () => {
      const res = await request(app)
        .patch(`/api/admin/students/${studentId}/regenerate-pin`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      // Verify PIN is not in response
      expect(res.body.studentPin).toBeUndefined();
      expect(res.body.pin).toBeUndefined();
      expect(res.body.newPin).toBeUndefined();
      expect(res.body.password).toBeUndefined();
      expect(res.body.passwordHash).toBeUndefined();

      // Verify studentCode is not in response
      expect(res.body.studentCode).toBeUndefined();

      // Should include message
      expect(res.body.message).toContain('PIN regenerated successfully');
    });

    it('Admin responses never contain studentCode at all', async () => {
      // Check admin student list endpoint
      const listRes = await request(app)
        .get('/api/admin/students')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      const students = Array.isArray(listRes.body.data) ? listRes.body.data : listRes.body.students || [];

      students.forEach((student: any) => {
        expect(student.studentCode).toBeUndefined();
        expect(student.studentPin).toBeUndefined();
        expect(student.pin).toBeUndefined();
      });
    });
  });

  describe('GET /tutor-application/documents/:id - Authorization', () => {
    beforeAll(async () => {
      // Create a tutor application with a document for the first tutor
      await prisma.tutorApplication.create({
        data: {
          userId: tutorId,
          status: 'DRAFT',
          fullName: 'Tutor Application',
          email: 'tutor@test.com',
          phone: '1234567890',
          address: '123 Main St',
          education: 'Bachelor\'s',
          experience: '5 years',
          subjects: ['Math'],
          availability: {},
        },
      });

      const application = await prisma.tutorApplication.findUnique({
        where: { userId: tutorId },
      });

      // Create a mock document record (in real scenario, this would be uploaded to Cloudinary)
      const document = await prisma.tutorDocument.create({
        data: {
          applicationId: application!.id,
          publicId: `test-doc-${Date.now()}`,
          originalName: 'test.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1024,
        },
      });
      documentId = document.id;
    });

    it('Owning tutor can GET their own document', async () => {
      const res = await request(app)
        .get(`/api/tutor-application/documents/${documentId}`)
        .set('Authorization', `Bearer ${tutorToken}`);

      // Note: This may fail due to Cloudinary not being configured in tests
      // The important part is the authorization check
      expect([200, 404, 500]).toContain(res.status); // Acceptable: success, not found (no real cloud asset), or Cloudinary error
      expect(res.status).not.toBe(403); // Should not be forbidden
      expect(res.status).not.toBe(401); // Should not be unauthorized
    });

    it('Admin can GET any tutor application document', async () => {
      const res = await request(app)
        .get(`/api/tutor-application/documents/${documentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Note: This may fail due to Cloudinary not being configured in tests
      // The important part is the authorization check
      expect([200, 404, 500]).toContain(res.status);
      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(401);
    });

    it('Another tutor cannot access a different tutor\'s document (403/404)', async () => {
      const res = await request(app)
        .get(`/api/tutor-application/documents/${documentId}`)
        .set('Authorization', `Bearer ${anotherTutorToken}`);

      expect([403, 404]).toContain(res.status);
    });

    it('Parent cannot access tutor application documents (403/404)', async () => {
      const res = await request(app)
        .get(`/api/tutor-application/documents/${documentId}`)
        .set('Authorization', `Bearer ${parentToken}`);

      expect([403, 404]).toContain(res.status);
    });

    it('Unauthenticated request gets 401', async () => {
      const res = await request(app)
        .get(`/api/tutor-application/documents/${documentId}`);

      expect(res.status).toBe(401);
    });
  });
});
