import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/config/database';
import { hashPassword } from '../../src/utils/password.util';

describe('Grades Workflow & Visibility Integration Tests', () => {
  let adminToken = '', adminId = '';
  let tutorToken = '', tutorId = '';
  let anotherTutorToken = '', anotherTutorId = '';
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

    const anotherTutor = await prisma.user.create({
      data: {
        fullName: 'Another Tutor',
        email: `grd_tutor2_${Date.now()}@test.com`,
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
        sessionFrequency: 'TWICE_WEEKLY',
        availableDays: ['MON', 'THU'],
        billingFrequency: 'MONTHLY',
        yearlyPrice: 1200,
        status: 'ACTIVE',
        startDate: new Date(),
      },
    });
    enrollmentId = enrollment.id;

    const [aRes, tRes, t2Res, pRes, sRes] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: admin.email, password: testPassword }),
      request(app).post('/api/auth/login').send({ email: tutor.email, password: testPassword }),
      request(app).post('/api/auth/login').send({ email: anotherTutor.email, password: testPassword }),
      request(app).post('/api/auth/login').send({ email: parent.email, password: testPassword }),
      request(app).post('/api/auth/student-login').send({ parentEmail: parent.email, studentCode: studentUser.studentCode, studentPin: testPassword }),
    ]);

    adminToken = aRes.body.accessToken;
    tutorToken = tRes.body.accessToken;
    anotherTutorToken = t2Res.body.accessToken;
    parentToken = pRes.body.accessToken;
    studentToken = sRes.body.accessToken;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.gradeComponent.deleteMany({});
    await prisma.gradeEvent.deleteMany({});
    await prisma.grade.deleteMany({});
    await prisma.scoredItem.deleteMany({});
    await prisma.enrollment.deleteMany({});
    await prisma.student.deleteMany({});
    await prisma.tutorProfile.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.subject.deleteMany({});
  });

  describe('Test 1: Visibility and Notification Rules', () => {
    let draftGradeId = '';
    let pendingGradeId = '';
    let rejectedGradeId = '';
    let approvedGradeId = '';

    beforeAll(async () => {
      const now = new Date();

      // Verify tutor exists before creating ScoredItems
      const tutorCheck = await prisma.user.findUnique({ where: { id: tutorId } });
      if (!tutorCheck) {
        throw new Error(`Tutor with ID ${tutorId} not found before Test 1`);
      }

      // Create ScoredItems first
      const quizItem1 = await prisma.scoredItem.create({
        data: {
          tutorId,
          studentId,
          enrollmentId,
          type: 'QUIZ',
          score: 85,
          maxScore: 100,
          sourceType: 'MANUAL',
          scoredAt: now,
        },
      });

      const assignmentItem = await prisma.scoredItem.create({
        data: {
          tutorId,
          studentId,
          enrollmentId,
          type: 'ASSIGNMENT',
          score: 90,
          maxScore: 100,
          sourceType: 'MANUAL',
          scoredAt: now,
        },
      });

      const quizItem2 = await prisma.scoredItem.create({
        data: {
          tutorId,
          studentId,
          enrollmentId,
          type: 'QUIZ',
          score: 75,
          maxScore: 100,
          sourceType: 'MANUAL',
          scoredAt: now,
        },
      });

      const quizItem3 = await prisma.scoredItem.create({
        data: {
          tutorId,
          studentId,
          enrollmentId,
          type: 'QUIZ',
          score: 60,
          maxScore: 100,
          sourceType: 'MANUAL',
          scoredAt: now,
        },
      });

      const quizItem4 = await prisma.scoredItem.create({
        data: {
          tutorId,
          studentId,
          enrollmentId,
          type: 'QUIZ',
          score: 95,
          maxScore: 100,
          sourceType: 'MANUAL',
          scoredAt: now,
        },
      });

      // Create DRAFT grade (period 1: now - 10 days to now)
      const draftRes = await request(app)
        .post('/api/grades')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          enrollmentId,
          periodStart: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          periodEnd: now.toISOString(),
          components: [
            { type: 'QUIZ', weight: 40, scoredItemId: quizItem1.id },
            { type: 'ASSIGNMENT', weight: 30, scoredItemId: assignmentItem.id },
            { type: 'ATTENDANCE', weight: 30, attendanceRate: 95 },
          ],
          tutorComment: 'Draft grade',
        });
      draftGradeId = draftRes.body.id;

      // Create and submit another grade for PENDING_APPROVAL (period 2: now - 20 days to now - 11 days)
      const pendingRes = await request(app)
        .post('/api/grades')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          enrollmentId,
          periodStart: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          periodEnd: new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000).toISOString(),
          components: [
            { type: 'QUIZ', weight: 50, scoredItemId: quizItem2.id },
            { type: 'ATTENDANCE', weight: 50, attendanceRate: 90 },
          ],
          tutorComment: 'Pending grade',
        });
      await request(app)
        .post(`/api/grades/${pendingRes.body.id}/submit`)
        .set('Authorization', `Bearer ${tutorToken}`);
      pendingGradeId = pendingRes.body.id;

      // Create, submit, and reject another grade (period 3: now - 30 days to now - 21 days)
      const rejectRes = await request(app)
        .post('/api/grades')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          enrollmentId,
          periodStart: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          periodEnd: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString(),
          components: [
            { type: 'QUIZ', weight: 60, scoredItemId: quizItem3.id },
            { type: 'ATTENDANCE', weight: 40, attendanceRate: 85 },
          ],
          tutorComment: 'To be rejected',
        });
      await request(app)
        .post(`/api/grades/${rejectRes.body.id}/submit`)
        .set('Authorization', `Bearer ${tutorToken}`);
      await request(app)
        .patch(`/api/admin/grades/${rejectRes.body.id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Test rejection reason with sufficient length' });
      rejectedGradeId = rejectRes.body.id;

      // Create, submit, and approve another grade (period 4: now - 40 days to now - 31 days)
      const approveRes = await request(app)
        .post('/api/grades')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          enrollmentId,
          periodStart: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString(),
          periodEnd: new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000).toISOString(),
          components: [
            { type: 'QUIZ', weight: 70, scoredItemId: quizItem4.id },
            { type: 'ATTENDANCE', weight: 30, attendanceRate: 100 },
          ],
          tutorComment: 'To be approved',
        });
      await request(app)
        .post(`/api/grades/${approveRes.body.id}/submit`)
        .set('Authorization', `Bearer ${tutorToken}`);
      await request(app)
        .patch(`/api/admin/grades/${approveRes.body.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
      approvedGradeId = approveRes.body.id;
    });

    it('Student and parent never see DRAFT, PENDING_APPROVAL or REJECTED grades, and never receive overrideReason', async () => {
      // Check parent view
      const parentRes = await request(app)
        .get('/api/grades')
        .set('Authorization', `Bearer ${parentToken}`)
        .query({ enrollmentId });

      expect(parentRes.status).toBe(200);
      const parentGrades = Array.isArray(parentRes.body) ? parentRes.body : parentRes.body.data || parentRes.body.grades || [];
      const parentGradeIds = parentGrades.map((g: any) => g.id);
      expect(parentGradeIds).not.toContain(draftGradeId);
      expect(parentGradeIds).not.toContain(pendingGradeId);
      expect(parentGradeIds).not.toContain(rejectedGradeId);
      expect(parentGradeIds).toContain(approvedGradeId);

      // Check student view
      const studentRes = await request(app)
        .get('/api/student/me/grades')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(studentRes.status).toBe(200);
      const studentGrades = Array.isArray(studentRes.body) ? studentRes.body : studentRes.body.data || studentRes.body.grades || [];
      const studentGradeIds = studentGrades.map((g: any) => g.id);
      expect(studentGradeIds).not.toContain(draftGradeId);
      expect(studentGradeIds).not.toContain(pendingGradeId);
      expect(studentGradeIds).not.toContain(rejectedGradeId);
      expect(studentGradeIds).toContain(approvedGradeId);

      // Verify overrideReason is not in responses (even for approved grades)
      parentGrades.forEach((g: any) => {
        expect(g.overrideReason).toBeUndefined();
      });
      studentGrades.forEach((g: any) => {
        expect(g.overrideReason).toBeUndefined();
      });
    });
  });

  describe('Test 2: PENDING_APPROVAL Grade Edit/Delete Restrictions', () => {
    let pendingGradeId = '';

    beforeAll(async () => {
      const now = new Date();
      const start = new Date(now.getTime() - 70 * 24 * 60 * 60 * 1000);
      const end = new Date(now.getTime() - 61 * 24 * 60 * 60 * 1000);

      // Verify tutor exists
      const tutorCheck = await prisma.user.findUnique({ where: { id: tutorId } });
      if (!tutorCheck) {
        throw new Error(`Tutor with ID ${tutorId} not found before Test 2`);
      }

      const quizItem = await prisma.scoredItem.create({
        data: {
          tutorId,
          studentId,
          enrollmentId,
          type: 'QUIZ',
          score: 75,
          maxScore: 100,
          sourceType: 'MANUAL',
          scoredAt: now,
        },
      });

      const res = await request(app)
        .post('/api/grades')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          enrollmentId,
          periodStart: start.toISOString(),
          periodEnd: end.toISOString(),
          components: [
            { type: 'QUIZ', weight: 100, scoredItemId: quizItem.id },
          ],
          tutorComment: 'Pending for edit test',
        });

      await request(app)
        .post(`/api/grades/${res.body.id}/submit`)
        .set('Authorization', `Bearer ${tutorToken}`);

      pendingGradeId = res.body.id;
    });

    it('A PENDING_APPROVAL grade cannot be edited by the tutor (only withdrawn)', async () => {
      const editRes = await request(app)
        .patch(`/api/grades/${pendingGradeId}`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ tutorComment: 'Trying to edit pending grade' });

      expect(editRes.status).toBe(403);
      expect(editRes.body.error).toContain('Cannot edit submitted or approved grades');
    });

    it('A PENDING_APPROVAL grade cannot be deleted by the tutor (only withdrawn)', async () => {
      const deleteRes = await request(app)
        .delete(`/api/grades/${pendingGradeId}`)
        .set('Authorization', `Bearer ${tutorToken}`);

      expect(deleteRes.status).toBe(403);
      expect(deleteRes.body.error).toContain('Cannot delete submitted or approved grades');
    });

    it('Tutor can withdraw a PENDING_APPROVAL grade back to DRAFT', async () => {
      const withdrawRes = await request(app)
        .post(`/api/grades/${pendingGradeId}/withdraw`)
        .set('Authorization', `Bearer ${tutorToken}`);

      expect(withdrawRes.status).toBe(200);
      expect(withdrawRes.body.message).toContain('withdrawn to draft');

      // Verify it's now DRAFT
      const checkRes = await request(app)
        .get(`/api/grades/${pendingGradeId}/preview`)
        .set('Authorization', `Bearer ${tutorToken}`);

      expect(checkRes.body.status).toBe('DRAFT');
    });
  });

  describe('Test 3: APPROVED Grade Edit/Delete Restrictions', () => {
    let approvedGradeId = '';

    beforeAll(async () => {
      const now = new Date();
      const start = new Date(now.getTime() - 80 * 24 * 60 * 60 * 1000);
      const end = new Date(now.getTime() - 71 * 24 * 60 * 60 * 1000);

      // Verify tutor exists
      const tutorCheck = await prisma.user.findUnique({ where: { id: tutorId } });
      if (!tutorCheck) {
        throw new Error(`Tutor with ID ${tutorId} not found before Test 3`);
      }

      const quizItem = await prisma.scoredItem.create({
        data: {
          tutorId,
          studentId,
          enrollmentId,
          type: 'QUIZ',
          score: 80,
          maxScore: 100,
          sourceType: 'MANUAL',
          scoredAt: now,
        },
      });

      const res = await request(app)
        .post('/api/grades')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          enrollmentId,
          periodStart: start.toISOString(),
          periodEnd: end.toISOString(),
          components: [
            { type: 'QUIZ', weight: 100, scoredItemId: quizItem.id },
          ],
          tutorComment: 'To be approved',
        });

      await request(app)
        .post(`/api/grades/${res.body.id}/submit`)
        .set('Authorization', `Bearer ${tutorToken}`);

      await request(app)
        .patch(`/api/admin/grades/${res.body.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      approvedGradeId = res.body.id;
    });

    it('An APPROVED grade cannot be edited by the tutor', async () => {
      const editRes = await request(app)
        .patch(`/api/grades/${approvedGradeId}`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ tutorComment: 'Trying to edit approved grade' });

      expect(editRes.status).toBe(403);
      expect(editRes.body.error).toContain('Cannot edit submitted or approved grades');
    });

    it('An APPROVED grade cannot be deleted by the tutor', async () => {
      const deleteRes = await request(app)
        .delete(`/api/grades/${approvedGradeId}`)
        .set('Authorization', `Bearer ${tutorToken}`);

      expect(deleteRes.status).toBe(403);
      expect(deleteRes.body.error).toContain('Cannot delete submitted or approved grades');
    });
  });

  describe('Test 4: Tutor Can Edit/Delete Own DRAFT and REJECTED Grades', () => {
    let draftGradeId = '';
    let rejectedGradeId = '';

    beforeAll(async () => {
      const now = new Date();
      const start1 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const end1 = new Date(now.getTime() - 81 * 24 * 60 * 60 * 1000);
      const start2 = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000);
      const end2 = new Date(now.getTime() - 91 * 24 * 60 * 60 * 1000);

      // Verify tutor exists
      const tutorCheck = await prisma.user.findUnique({ where: { id: tutorId } });
      if (!tutorCheck) {
        throw new Error(`Tutor with ID ${tutorId} not found before Test 4`);
      }

      const quizItem1 = await prisma.scoredItem.create({
        data: {
          tutorId,
          studentId,
          enrollmentId,
          type: 'QUIZ',
          score: 70,
          maxScore: 100,
          sourceType: 'MANUAL',
          scoredAt: now,
        },
      });

      const quizItem2 = await prisma.scoredItem.create({
        data: {
          tutorId,
          studentId,
          enrollmentId,
          type: 'QUIZ',
          score: 65,
          maxScore: 100,
          sourceType: 'MANUAL',
          scoredAt: now,
        },
      });

      // Create DRAFT grade
      const draftRes = await request(app)
        .post('/api/grades')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          enrollmentId,
          periodStart: start1.toISOString(),
          periodEnd: end1.toISOString(),
          components: [
            { type: 'QUIZ', weight: 100, scoredItemId: quizItem1.id },
          ],
          tutorComment: 'Draft for edit test',
        });
      draftGradeId = draftRes.body.id;

      // Create and reject another grade
      const rejectRes = await request(app)
        .post('/api/grades')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          enrollmentId,
          periodStart: start2.toISOString(),
          periodEnd: end2.toISOString(),
          components: [
            { type: 'QUIZ', weight: 100, scoredItemId: quizItem2.id },
          ],
          tutorComment: 'To be rejected',
        });

      await request(app)
        .post(`/api/grades/${rejectRes.body.id}/submit`)
        .set('Authorization', `Bearer ${tutorToken}`);

      await request(app)
        .patch(`/api/admin/grades/${rejectRes.body.id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Test rejection with sufficient reason length for validation' });

      rejectedGradeId = rejectRes.body.id;
    });

    it('Tutor can edit their own DRAFT grade', async () => {
      const editRes = await request(app)
        .patch(`/api/grades/${draftGradeId}`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ tutorComment: 'Updated draft comment' });

      expect(editRes.status).toBe(200);
      expect(editRes.body.tutorComment).toBe('Updated draft comment');
    });

    it('Tutor can delete their own DRAFT grade', async () => {
      const deleteRes = await request(app)
        .delete(`/api/grades/${draftGradeId}`)
        .set('Authorization', `Bearer ${tutorToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.message).toContain('deleted successfully');

      // Verify it's deleted
      const checkRes = await request(app)
        .get('/api/grades')
        .set('Authorization', `Bearer ${tutorToken}`)
        .query({ enrollmentId });

      expect(checkRes.body.find((g: any) => g.id === draftGradeId)).toBeUndefined();
    });

    it('Tutor can edit their own REJECTED grade', async () => {
      const editRes = await request(app)
        .patch(`/api/grades/${rejectedGradeId}`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ tutorComment: 'Updated rejected grade comment' });

      expect(editRes.status).toBe(200);
      expect(editRes.body.tutorComment).toBe('Updated rejected grade comment');
    });

    it('Tutor can delete their own REJECTED grade', async () => {
      const deleteRes = await request(app)
        .delete(`/api/grades/${rejectedGradeId}`)
        .set('Authorization', `Bearer ${tutorToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.message).toContain('deleted successfully');
    });
  });

  describe('Test 5: GET /grades Role-Based Visibility', () => {
    let draftGradeId = '';
    let pendingGradeId = '';
    let rejectedGradeId = '';
    let approvedGradeId = '';

    beforeAll(async () => {
      const now = new Date();

      const quizItem1 = await prisma.scoredItem.create({
        data: {
          tutorId,
          studentId,
          enrollmentId,
          type: 'QUIZ',
          score: 85,
          maxScore: 100,
          sourceType: 'MANUAL',
          scoredAt: now,
        },
      });

      const quizItem2 = await prisma.scoredItem.create({
        data: {
          tutorId,
          studentId,
          enrollmentId,
          type: 'QUIZ',
          score: 75,
          maxScore: 100,
          sourceType: 'MANUAL',
          scoredAt: now,
        },
      });

      const quizItem3 = await prisma.scoredItem.create({
        data: {
          tutorId,
          studentId,
          enrollmentId,
          type: 'QUIZ',
          score: 60,
          maxScore: 100,
          sourceType: 'MANUAL',
          scoredAt: now,
        },
      });

      const quizItem4 = await prisma.scoredItem.create({
        data: {
          tutorId,
          studentId,
          enrollmentId,
          type: 'QUIZ',
          score: 95,
          maxScore: 100,
          sourceType: 'MANUAL',
          scoredAt: now,
        },
      });

      // Create DRAFT grade
      const draftRes = await request(app)
        .post('/api/grades')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          enrollmentId,
          periodStart: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          periodEnd: now.toISOString(),
          components: [
            { type: 'QUIZ', weight: 100, scoredItemId: quizItem1.id },
          ],
          tutorComment: 'Draft grade',
        });
      draftGradeId = draftRes.body.id;

      // Create and submit for PENDING_APPROVAL
      const pendingRes = await request(app)
        .post('/api/grades')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          enrollmentId,
          periodStart: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          periodEnd: new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000).toISOString(),
          components: [
            { type: 'QUIZ', weight: 100, scoredItemId: quizItem2.id },
          ],
          tutorComment: 'Pending grade',
        });
      await request(app)
        .post(`/api/grades/${pendingRes.body.id}/submit`)
        .set('Authorization', `Bearer ${tutorToken}`);
      pendingGradeId = pendingRes.body.id;

      // Create, submit, and reject
      const rejectRes = await request(app)
        .post('/api/grades')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          enrollmentId,
          periodStart: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          periodEnd: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString(),
          components: [
            { type: 'QUIZ', weight: 100, scoredItemId: quizItem3.id },
          ],
          tutorComment: 'To be rejected',
        });
      await request(app)
        .post(`/api/grades/${rejectRes.body.id}/submit`)
        .set('Authorization', `Bearer ${tutorToken}`);
      await request(app)
        .patch(`/api/admin/grades/${rejectRes.body.id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Test rejection reason with sufficient length' });
      rejectedGradeId = rejectRes.body.id;

      // Create, submit, and approve
      const approveRes = await request(app)
        .post('/api/grades')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          enrollmentId,
          periodStart: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString(),
          periodEnd: new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000).toISOString(),
          components: [
            { type: 'QUIZ', weight: 100, scoredItemId: quizItem4.id },
          ],
          tutorComment: 'To be approved',
        });
      await request(app)
        .post(`/api/grades/${approveRes.body.id}/submit`)
        .set('Authorization', `Bearer ${tutorToken}`);
      await request(app)
        .patch(`/api/admin/grades/${approveRes.body.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
      approvedGradeId = approveRes.body.id;
    });

    it('Tutors see ONLY their own grades in ALL statuses (DRAFT, PENDING_APPROVAL, APPROVED, REJECTED) with rejectionReason', async () => {
      const res = await request(app)
        .get('/api/grades')
        .set('Authorization', `Bearer ${tutorToken}`)
        .query({ enrollmentId });

      expect(res.status).toBe(200);
      const grades = Array.isArray(res.body) ? res.body : res.body.data || res.body.grades || [];
      const gradeIds = grades.map((g: any) => g.id);

      // Tutor should see all statuses
      expect(gradeIds).toContain(draftGradeId);
      expect(gradeIds).toContain(pendingGradeId);
      expect(gradeIds).toContain(rejectedGradeId);
      expect(gradeIds).toContain(approvedGradeId);

      // Tutor should see rejectionReason for rejected grades
      const rejectedGrade = grades.find((g: any) => g.id === rejectedGradeId);
      expect(rejectedGrade).toBeDefined();
      expect(rejectedGrade.rejectionReason).toBeDefined();
      expect(rejectedGrade.rejectionReason).toContain('Test rejection reason');
    });

    it('Parents see only APPROVED grades for their own children and never receive overrideReason or rejectionReason', async () => {
      const res = await request(app)
        .get('/api/grades')
        .set('Authorization', `Bearer ${parentToken}`)
        .query({ enrollmentId });

      expect(res.status).toBe(200);
      const grades = Array.isArray(res.body) ? res.body : res.body.data || res.body.grades || [];
      const gradeIds = grades.map((g: any) => g.id);

      // Parent should only see APPROVED grades
      expect(gradeIds).not.toContain(draftGradeId);
      expect(gradeIds).not.toContain(pendingGradeId);
      expect(gradeIds).not.toContain(rejectedGradeId);
      expect(gradeIds).toContain(approvedGradeId);

      // Parent should never see overrideReason or rejectionReason
      grades.forEach((g: any) => {
        expect(g.overrideReason).toBeUndefined();
        expect(g.rejectionReason).toBeUndefined();
      });
    });

    it('Students see only APPROVED grades for their own enrollments and never receive overrideReason or rejectionReason', async () => {
      const res = await request(app)
        .get('/api/student/me/grades')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      const grades = Array.isArray(res.body) ? res.body : res.body.data || res.body.grades || [];
      const gradeIds = grades.map((g: any) => g.id);

      // Student should only see APPROVED grades
      expect(gradeIds).not.toContain(draftGradeId);
      expect(gradeIds).not.toContain(pendingGradeId);
      expect(gradeIds).not.toContain(rejectedGradeId);
      expect(gradeIds).toContain(approvedGradeId);

      // Student should never see overrideReason or rejectionReason
      grades.forEach((g: any) => {
        expect(g.overrideReason).toBeUndefined();
        expect(g.rejectionReason).toBeUndefined();
      });
    });

    it('Admins see everything except DRAFT in review lists', async () => {
      const res = await request(app)
        .get('/api/admin/grades')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ enrollmentId });

      expect(res.status).toBe(200);
      const grades = Array.isArray(res.body.data) ? res.body.data : res.body.grades || [];
      const gradeIds = grades.map((g: any) => g.id);

      // Admin should not see DRAFT grades
      expect(gradeIds).not.toContain(draftGradeId);
      // Admin should see PENDING_APPROVAL, APPROVED, REJECTED
      expect(gradeIds).toContain(pendingGradeId);
      expect(gradeIds).toContain(rejectedGradeId);
      expect(gradeIds).toContain(approvedGradeId);
    });

    it('Another tutor cannot read grades from a different tutor', async () => {
      const res = await request(app)
        .get('/api/grades')
        .set('Authorization', `Bearer ${anotherTutorToken}`)
        .query({ enrollmentId });

      expect(res.status).toBe(200);
      const grades = Array.isArray(res.body) ? res.body : res.body.data || res.body.grades || [];
      const gradeIds = grades.map((g: any) => g.id);

      // Another tutor should not see any grades since they don't own any
      expect(gradeIds.length).toBe(0);
    });
  });

  describe('Test 6: Approve Flips Visibility and Notifies Student and Parent', () => {
    let pendingGradeId = '';

    beforeAll(async () => {
      const now = new Date();
      const start = new Date(now.getTime() - 110 * 24 * 60 * 60 * 1000);
      const end = new Date(now.getTime() - 101 * 24 * 60 * 60 * 1000);

      const quizItem = await prisma.scoredItem.create({
        data: {
          tutorId,
          studentId,
          enrollmentId,
          type: 'QUIZ',
          score: 95,
          maxScore: 100,
          sourceType: 'MANUAL',
          scoredAt: now,
        },
      });

      const res = await request(app)
        .post('/api/grades')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          enrollmentId,
          periodStart: start.toISOString(),
          periodEnd: end.toISOString(),
          components: [
            { type: 'QUIZ', weight: 100, scoredItemId: quizItem.id },
          ],
          tutorComment: 'To test approval notification',
        });

      await request(app)
        .post(`/api/grades/${res.body.id}/submit`)
        .set('Authorization', `Bearer ${tutorToken}`);

      pendingGradeId = res.body.id;
    });

    it('Before approval, student and parent cannot see the grade', async () => {
      const parentRes = await request(app)
        .get('/api/grades')
        .set('Authorization', `Bearer ${parentToken}`)
        .query({ enrollmentId });

      const parentGrades = Array.isArray(parentRes.body) ? parentRes.body : parentRes.body.data || parentRes.body.grades || [];
      expect(parentGrades.find((g: any) => g.id === pendingGradeId)).toBeUndefined();

      const studentRes = await request(app)
        .get('/api/student/me/grades')
        .set('Authorization', `Bearer ${studentToken}`);

      const studentGrades = Array.isArray(studentRes.body) ? studentRes.body : studentRes.body.data || studentRes.body.grades || [];
      expect(studentGrades.find((g: any) => g.id === pendingGradeId)).toBeUndefined();
    });

    it('Admin approves grade -> flips visibleToStudent=true', async () => {
      const approveRes = await request(app)
        .patch(`/api/admin/grades/${pendingGradeId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.status).toBe('APPROVED');
      expect(approveRes.body.visibleToStudent).toBe(true);
    });

    it('After approval, student and parent can see the grade', async () => {
      const parentRes = await request(app)
        .get('/api/grades')
        .set('Authorization', `Bearer ${parentToken}`)
        .query({ enrollmentId });

      const parentGrades = Array.isArray(parentRes.body) ? parentRes.body : parentRes.body.data || parentRes.body.grades || [];
      expect(parentGrades.some((g: any) => g.id === pendingGradeId)).toBe(true);

      const studentRes = await request(app)
        .get('/api/student/me/grades')
        .set('Authorization', `Bearer ${studentToken}`);

      const studentGrades = Array.isArray(studentRes.body) ? studentRes.body : studentRes.body.data || studentRes.body.grades || [];
      expect(studentGrades.some((g: any) => g.id === pendingGradeId)).toBe(true);
    });

    it('Notifications were created for student and parent', async () => {
      const studentNotifications = await prisma.notification.findMany({
        where: {
          userId: studentUserId,
          type: 'GRADE_APPROVED',
        },
      });

      const parentNotifications = await prisma.notification.findMany({
        where: {
          userId: parentId,
          type: 'GRADE_APPROVED',
        },
      });

      expect(studentNotifications.length).toBeGreaterThan(0);
      expect(parentNotifications.length).toBeGreaterThan(0);
    });
  });

  describe('Test 6: Reject Requires Reason, Notifies Only Tutor, Leaves No Trace for Student/Parent', () => {
    let pendingGradeId = '';

    beforeAll(async () => {
      const now = new Date();
      const start = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000);
      const end = new Date(now.getTime() - 111 * 24 * 60 * 60 * 1000);

      const quizItem = await prisma.scoredItem.create({
        data: {
          tutorId,
          studentId,
          enrollmentId,
          type: 'QUIZ',
          score: 60,
          maxScore: 100,
          sourceType: 'MANUAL',
          scoredAt: now,
        },
      });

      const res = await request(app)
        .post('/api/grades')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          enrollmentId,
          periodStart: start.toISOString(),
          periodEnd: end.toISOString(),
          components: [
            { type: 'QUIZ', weight: 100, scoredItemId: quizItem.id },
          ],
          tutorComment: 'To test rejection',
        });

      await request(app)
        .post(`/api/grades/${res.body.id}/submit`)
        .set('Authorization', `Bearer ${tutorToken}`);

      pendingGradeId = res.body.id;
    });

    it('Reject without a reason is rejected', async () => {
      const rejectRes = await request(app)
        .patch(`/api/admin/grades/${pendingGradeId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: '' });

      expect(rejectRes.status).toBe(400);
      expect(rejectRes.body.error).toContain('Rejection reason is required');
    });

    it('Reject with a reason succeeds', async () => {
      const rejectRes = await request(app)
        .patch(`/api/admin/grades/${pendingGradeId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'This is a valid rejection reason with sufficient length' });

      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.status).toBe('REJECTED');
      expect(rejectRes.body.rejectionReason).toBe('This is a valid rejection reason with sufficient length');
    });

    it('Student and parent still cannot see the rejected grade', async () => {
      const parentRes = await request(app)
        .get('/api/grades')
        .set('Authorization', `Bearer ${parentToken}`)
        .query({ enrollmentId });

      const parentGrades = Array.isArray(parentRes.body) ? parentRes.body : parentRes.body.data || parentRes.body.grades || [];
      expect(parentGrades.find((g: any) => g.id === pendingGradeId)).toBeUndefined();

      const studentRes = await request(app)
        .get('/api/student/me/grades')
        .set('Authorization', `Bearer ${studentToken}`);

      const studentGrades = Array.isArray(studentRes.body) ? studentRes.body : studentRes.body.data || studentRes.body.grades || [];
      expect(studentGrades.find((g: any) => g.id === pendingGradeId)).toBeUndefined();
    });

    it('Only tutor receives notification about rejection', async () => {
      const tutorNotifications = await prisma.notification.findMany({
        where: {
          userId: tutorId,
          type: 'GRADE_REJECTED',
        },
      });

      const studentNotifications = await prisma.notification.findMany({
        where: {
          userId: studentUserId,
          type: 'GRADE_REJECTED',
        },
      });

      const parentNotifications = await prisma.notification.findMany({
        where: {
          userId: parentId,
          type: 'GRADE_REJECTED',
        },
      });

      expect(tutorNotifications.length).toBeGreaterThan(0);
      expect(studentNotifications.length).toBe(0);
      expect(parentNotifications.length).toBe(0);
    });
  });

  describe('Test 7: Validation Rules - Weights, Override, Scored Item Locking, and Tutor Isolation', () => {
    it('Weights not totaling 100 are rejected', async () => {
      const now = new Date();
      const start = new Date(now.getTime() - 130 * 24 * 60 * 60 * 1000);
      const end = new Date(now.getTime() - 121 * 24 * 60 * 60 * 1000);

      const quizItem = await prisma.scoredItem.create({
        data: {
          tutorId,
          studentId,
          enrollmentId,
          type: 'QUIZ',
          score: 80,
          maxScore: 100,
          sourceType: 'MANUAL',
          scoredAt: now,
        },
      });

      const res = await request(app)
        .post('/api/grades')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          enrollmentId,
          periodStart: start.toISOString(),
          periodEnd: end.toISOString(),
          components: [
            { type: 'QUIZ', weight: 50, scoredItemId: quizItem.id },
            { type: 'ATTENDANCE', weight: 40, attendanceRate: 90 },
          ],
          tutorComment: 'Weights total 90, should fail',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('weights must total exactly 100');
    });

    it('Override without a reason is rejected', async () => {
      const now = new Date();
      const start = new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000);
      const end = new Date(now.getTime() - 41 * 24 * 60 * 60 * 1000);

      const quizItem = await prisma.scoredItem.create({
        data: {
          tutorId,
          studentId,
          enrollmentId,
          type: 'QUIZ',
          score: 80,
          maxScore: 100,
          sourceType: 'MANUAL',
          scoredAt: now,
        },
      });

      const createRes = await request(app)
        .post('/api/grades')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          enrollmentId,
          periodStart: start.toISOString(),
          periodEnd: end.toISOString(),
          components: [
            { type: 'QUIZ', weight: 100, scoredItemId: quizItem.id },
          ],
          tutorComment: 'To test override',
        });

      expect(createRes.status).toBe(201);

      const updateRes = await request(app)
        .patch(`/api/grades/${createRes.body.id}`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ finalScore: 95 });

      expect(updateRes.status).toBe(400);
      expect(updateRes.body.error).toContain('Override reason is required');
    });

    it('A scored item cannot belong to two active grades', async () => {
      const now = new Date();
      const start1 = new Date(now.getTime() - 140 * 24 * 60 * 60 * 1000);
      const end1 = new Date(now.getTime() - 131 * 24 * 60 * 60 * 1000);
      const start2 = new Date(now.getTime() - 150 * 24 * 60 * 60 * 1000);
      const end2 = new Date(now.getTime() - 141 * 24 * 60 * 60 * 1000);

      const quizItem = await prisma.scoredItem.create({
        data: {
          tutorId,
          studentId,
          enrollmentId,
          type: 'QUIZ',
          score: 85,
          maxScore: 100,
          sourceType: 'MANUAL',
          scoredAt: now,
        },
      });

      // Create first grade with the scored item
      const firstRes = await request(app)
        .post('/api/grades')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          enrollmentId,
          periodStart: start1.toISOString(),
          periodEnd: end1.toISOString(),
          components: [
            { type: 'QUIZ', weight: 100, scoredItemId: quizItem.id },
          ],
          tutorComment: 'First grade',
        });

      // Submit and approve it
      await request(app)
        .post(`/api/grades/${firstRes.body.id}/submit`)
        .set('Authorization', `Bearer ${tutorToken}`);

      await request(app)
        .patch(`/api/admin/grades/${firstRes.body.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Try to create a second grade with the same scored item
      const secondRes = await request(app)
        .post('/api/grades')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          enrollmentId,
          periodStart: start2.toISOString(),
          periodEnd: end2.toISOString(),
          components: [
            { type: 'QUIZ', weight: 100, scoredItemId: quizItem.id },
          ],
          tutorComment: 'Second grade with same item',
        });

      // The service should prevent reusing a locked scored item
      // The scored item is now locked to the first grade
      expect(secondRes.status).toBe(400);
    });

    it('Another tutor cannot access or modify these grades', async () => {
      const now = new Date();
      const start = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      const end = new Date(now.getTime() - 51 * 24 * 60 * 60 * 1000);

      const quizItem = await prisma.scoredItem.create({
        data: {
          tutorId,
          studentId,
          enrollmentId,
          type: 'QUIZ',
          score: 75,
          maxScore: 100,
          sourceType: 'MANUAL',
          scoredAt: now,
        },
      });

      const res = await request(app)
        .post('/api/grades')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          enrollmentId,
          periodStart: start.toISOString(),
          periodEnd: end.toISOString(),
          components: [
            { type: 'QUIZ', weight: 100, scoredItemId: quizItem.id },
          ],
          tutorComment: 'Test grade for tutor isolation',
        });

      expect(res.status).toBe(201);
      const gradeId = res.body.id;

      // Another tutor cannot preview (403 because not authorized)
      const previewRes = await request(app)
        .get(`/api/grades/${gradeId}/preview`)
        .set('Authorization', `Bearer ${anotherTutorToken}`);

      expect(previewRes.status).toBe(403);
      expect(previewRes.body.error).toContain('Not authorized');

      // Another tutor cannot edit
      const editRes = await request(app)
        .patch(`/api/grades/${gradeId}`)
        .set('Authorization', `Bearer ${anotherTutorToken}`)
        .send({ tutorComment: 'Trying to edit' });

      expect(editRes.status).toBe(403);
      expect(editRes.body.error).toContain('Not authorized');

      // Another tutor cannot delete
      const deleteRes = await request(app)
        .delete(`/api/grades/${gradeId}`)
        .set('Authorization', `Bearer ${anotherTutorToken}`);

      expect(deleteRes.status).toBe(403);
      expect(deleteRes.body.error).toContain('Not authorized');
    });
  });
});
