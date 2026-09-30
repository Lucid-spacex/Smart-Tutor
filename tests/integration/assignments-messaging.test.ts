import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/config/database';
import { hashPassword } from '../../src/utils/password.util';

describe('Assignments & Messaging Permissions Integration Tests', () => {
  let adminToken = '', adminId = '';
  let tutorToken = '', tutorId = '';
  let parentToken = '', parentId = '';
  let studentToken = '', studentId = '', studentUserId = '';
  let enrollmentId = '';
  let assignmentId = '';
  let testPassword = 'Password12345!';

  beforeAll(async () => {
    const passHash = await hashPassword(testPassword);

    const admin = await prisma.user.create({
      data: {
        fullName: 'Admin',
        email: `am_admin_${Date.now()}@test.com`,
        passwordHash: passHash,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });
    adminId = admin.id;

    const tutor = await prisma.user.create({
      data: {
        fullName: 'Tutor',
        email: `am_tutor_${Date.now()}@test.com`,
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
        fullName: 'Parent',
        email: `am_parent_${Date.now()}@test.com`,
        passwordHash: passHash,
        role: 'PARENT',
        status: 'ACTIVE',
        timezone: 'America/New_York',
      },
    });
    parentId = parent.id;

    const studentUser = await prisma.user.create({
      data: {
        fullName: 'Student',
        studentCode: `AMS${Math.floor(1000 + Math.random() * 9000)}`,
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
        fullName: 'Student',
        dateOfBirth: new Date('2014-01-01'),
        gradeLevel: '4th',
      },
    });
    studentId = studentRecord.id;

    const subject = await prisma.subject.create({
      data: {
        name: `Math_AM_${Date.now()}`,
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

  describe('Assignment Creation and Visibility', () => {
    it('Tutor can create assignment for their assigned student', async () => {
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const res = await request(app)
        .post('/assignments')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          enrollmentId,
          title: 'Chapter 5 Homework',
          description: 'Complete exercises 1-10 from Chapter 5',
          type: 'HOMEWORK',
          dueDate,
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Chapter 5 Homework');
      expect(res.body.enrollmentId).toBe(enrollmentId);
      expect(res.body.createdBy).toBe(tutorId);
      expect(res.body.status).toBe('PENDING');
      assignmentId = res.body.id;
    });

    it('Tutor cannot create assignment for enrollment not assigned to them', async () => {
      // Create another enrollment with different tutor
      const otherTutor = await prisma.user.create({
        data: {
          fullName: 'Other Tutor',
          email: `other_tutor_${Date.now()}@test.com`,
          passwordHash: await hashPassword(testPassword),
          role: 'TUTOR',
          status: 'APPROVED',
        },
      });

      await prisma.tutorProfile.create({
        data: {
          userId: otherTutor.id,
          subjects: ['Math'],
          bio: 'Bio',
          hourlyRate: 50,
          availability: {},
          vettingStatus: 'APPROVED',
        },
      });

      const otherEnrollment = await prisma.enrollment.create({
        data: {
          studentId,
          subjectId: (await prisma.subject.create({
            data: {
              name: `Other_Subject_${Date.now()}`,
              gradeBand: 'K-12',
              category: 'CORE',
            },
          })).id,
          tutorId: otherTutor.id,
          sessionFrequency: 'TWICE_WEEKLY',
          availableDays: ['MON', 'THU'],
          billingFrequency: 'MONTHLY',
          yearlyPrice: 1200,
          status: 'ACTIVE',
          startDate: new Date(),
        },
      });

      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const res = await request(app)
        .post('/assignments')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          enrollmentId: otherEnrollment.id,
          title: 'Unauthorized Assignment',
          description: 'This should fail',
          type: 'HOMEWORK',
          dueDate,
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('not assigned');
    });

    it('Tutor can view assignments for their enrollments', async () => {
      const res = await request(app)
        .get('/assignments')
        .set('Authorization', `Bearer ${tutorToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const assignment = res.body.find((a: any) => a.id === assignmentId);
      expect(assignment).toBeDefined();
      expect(assignment.title).toBe('Chapter 5 Homework');
    });

    it('Student can view assignments for their enrollments', async () => {
      const res = await request(app)
        .get('/assignments')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const assignment = res.body.find((a: any) => a.id === assignmentId);
      expect(assignment).toBeDefined();
      expect(assignment.title).toBe('Chapter 5 Homework');
    });

    it('Parent can view assignments for their children', async () => {
      const res = await request(app)
        .get('/assignments')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const assignment = res.body.find((a: any) => a.id === assignmentId);
      expect(assignment).toBeDefined();
      expect(assignment.title).toBe('Chapter 5 Homework');
    });

    it('Parent cannot view assignments for enrollment not belonging to their children', async () => {
      // Create another parent and student
      const otherParent = await prisma.user.create({
        data: {
          fullName: 'Other Parent',
          email: `other_parent_${Date.now()}@test.com`,
          passwordHash: await hashPassword(testPassword),
          role: 'PARENT',
          status: 'ACTIVE',
        },
      });

      const otherStudentUser = await prisma.user.create({
        data: {
          fullName: 'Other Student',
          studentCode: `OTH${Math.floor(1000 + Math.random() * 9000)}`,
          passwordHash: await hashPassword(testPassword),
          role: 'STUDENT',
          status: 'ACTIVE',
          parentId: otherParent.id,
        },
      });

      const otherStudent = await prisma.student.create({
        data: {
          parentId: otherParent.id,
          userId: otherStudentUser.id,
          fullName: 'Other Student',
          dateOfBirth: new Date('2014-01-01'),
          gradeLevel: '4th',
        },
      });

      const otherEnrollment = await prisma.enrollment.create({
        data: {
          studentId: otherStudent.id,
          subjectId: (await prisma.subject.create({
            data: {
              name: `Other_Subject2_${Date.now()}`,
              gradeBand: 'K-12',
              category: 'CORE',
            },
          })).id,
          tutorId: tutorId,
          sessionFrequency: 'TWICE_WEEKLY',
          availableDays: ['MON', 'THU'],
          billingFrequency: 'MONTHLY',
          yearlyPrice: 1200,
          status: 'ACTIVE',
          startDate: new Date(),
        },
      });

      const res = await request(app)
        .get(`/assignments?enrollmentId=${otherEnrollment.id}`)
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(403);
    });

    it('Assignments can be filtered by enrollmentId', async () => {
      const res = await request(app)
        .get(`/assignments?enrollmentId=${enrollmentId}`)
        .set('Authorization', `Bearer ${tutorToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].enrollmentId).toBe(enrollmentId);
    });

    it('Assignments can be filtered by status', async () => {
      const res = await request(app)
        .get(`/assignments?status=PENDING`)
        .set('Authorization', `Bearer ${tutorToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((assignment: any) => {
        expect(assignment.status).toBe('PENDING');
      });
    });
  });

  describe('Messaging Permissions', () => {
    it('Tutor can message assigned student', async () => {
      const res = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          recipientId: studentUserId,
          body: 'Hello, let\'s discuss your upcoming assignment',
        });

      expect(res.status).toBe(201);
      expect(res.body.body).toBe('Hello, let\'s discuss your upcoming assignment');
      expect(res.body.senderId).toBe(tutorId);
      expect(res.body.recipientId).toBe(studentUserId);
    });

    it('Student can message assigned tutor', async () => {
      const res = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          recipientId: tutorId,
          body: 'Hi Professor, I have a question about the homework',
        });

      expect(res.status).toBe(201);
      expect(res.body.body).toBe('Hi Professor, I have a question about the homework');
      expect(res.body.senderId).toBe(studentUserId);
      expect(res.body.recipientId).toBe(tutorId);
    });

    it('Parent cannot message child\'s assigned tutor', async () => {
      const res = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          recipientId: tutorId,
          body: 'Hello, I wanted to discuss my child\'s progress',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Parents cannot message tutors directly');
    });

    it('Tutor cannot message parent of assigned student', async () => {
      const res = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          recipientId: parentId,
          body: 'Hello, I wanted to discuss your child\'s progress',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Tutors cannot message parents directly');
    });

    it('Parent can message their child', async () => {
      const res = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          recipientId: studentUserId,
          body: 'Don\'t forget to do your homework',
        });

      expect(res.status).toBe(201);
      expect(res.body.body).toBe('Don\'t forget to do your homework');
      expect(res.body.senderId).toBe(parentId);
      expect(res.body.recipientId).toBe(studentUserId);
    });

    it('Student can message their parent', async () => {
      const res = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          recipientId: parentId,
          body: 'Mom, I need help with my homework',
        });

      expect(res.status).toBe(201);
      expect(res.body.body).toBe('Mom, I need help with my homework');
      expect(res.body.senderId).toBe(studentUserId);
      expect(res.body.recipientId).toBe(parentId);
    });

    it('Tutor cannot message unassigned student', async () => {
      // Create another student not assigned to this tutor
      const otherStudentUser = await prisma.user.create({
        data: {
          fullName: 'Other Student',
          studentCode: `OTH2${Math.floor(1000 + Math.random() * 9000)}`,
          passwordHash: await hashPassword(testPassword),
          role: 'STUDENT',
          status: 'ACTIVE',
          parentId: parentId,
        },
      });

      const otherStudent = await prisma.student.create({
        data: {
          parentId: parentId,
          userId: otherStudentUser.id,
          fullName: 'Other Student',
          dateOfBirth: new Date('2014-01-01'),
          gradeLevel: '4th',
        },
      });

      const res = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          recipientId: otherStudentUser.id,
          body: 'This should fail',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('only message students assigned to your active enrollments');
    });

    it('Admin can message any user', async () => {
      const res = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          recipientId: studentUserId,
          body: 'Admin message to student',
        });

      expect(res.status).toBe(201);
      expect(res.body.body).toBe('Admin message to student');
    });

    it('Tutor cannot message another tutor', async () => {
      const otherTutor = await prisma.user.create({
        data: {
          fullName: 'Other Tutor 2',
          email: `other_tutor2_${Date.now()}@test.com`,
          passwordHash: await hashPassword(testPassword),
          role: 'TUTOR',
          status: 'APPROVED',
        },
      });

      const res = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          recipientId: otherTutor.id,
          body: 'This should fail',
        });

      expect(res.status).toBe(403);
    });

    it('Student cannot message another student', async () => {
      const otherStudentUser = await prisma.user.create({
        data: {
          fullName: 'Other Student 2',
          studentCode: `OTH3${Math.floor(1000 + Math.random() * 9000)}`,
          passwordHash: await hashPassword(testPassword),
          role: 'STUDENT',
          status: 'ACTIVE',
          parentId: parentId,
        },
      });

      const otherStudent = await prisma.student.create({
        data: {
          parentId: parentId,
          userId: otherStudentUser.id,
          fullName: 'Other Student 2',
          dateOfBirth: new Date('2014-01-01'),
          gradeLevel: '4th',
        },
      });

      const res = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          recipientId: otherStudentUser.id,
          body: 'This should fail',
        });

      expect(res.status).toBe(403);
    });

    it('Error messages provide clear guidance for messaging restrictions', async () => {
      const otherStudentUser = await prisma.user.create({
        data: {
          fullName: 'Other Student 3',
          studentCode: `OTH4${Math.floor(1000 + Math.random() * 9000)}`,
          passwordHash: await hashPassword(testPassword),
          role: 'STUDENT',
          status: 'ACTIVE',
          parentId: parentId,
        },
      });

      const otherStudent = await prisma.student.create({
        data: {
          parentId: parentId,
          userId: otherStudentUser.id,
          fullName: 'Other Student 3',
          dateOfBirth: new Date('2014-01-01'),
          gradeLevel: '4th',
        },
      });

      const res = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          recipientId: otherStudentUser.id,
          body: 'This should fail',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('only message students assigned to your active enrollments');
    });
  });

  describe('Message Thread Visibility', () => {
    it('Tutor can see threads with assigned students', async () => {
      const res = await request(app)
        .get('/messages/threads')
        .set('Authorization', `Bearer ${tutorToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // Should have threads with the student
      const studentThread = res.body.find((t: any) => t.otherParticipant.id === studentUserId);
      expect(studentThread).toBeDefined();
    });

    it('Student can see threads with assigned tutor', async () => {
      const res = await request(app)
        .get('/messages/threads')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // Should have threads with the tutor
      const tutorThread = res.body.find((t: any) => t.otherParticipant.id === tutorId);
      expect(tutorThread).toBeDefined();
    });

    it('Parent cannot see threads with child\'s tutor (no messaging allowed)', async () => {
      const res = await request(app)
        .get('/messages/threads')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // Should NOT have threads with the tutor since parent-tutor messaging is not allowed
      const tutorThread = res.body.find((t: any) => t.otherParticipant.id === tutorId);
      expect(tutorThread).toBeUndefined();
    });
  });

  describe('Tutor Assignment Edit/Delete Guardrails', () => {
    let assignmentWithSubmissionId = '';
    let assignmentWithoutSubmissionId = '';

    beforeAll(async () => {
      // Create an assignment without submission
      const createRes = await request(app)
        .post('/assignments')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          enrollmentId,
          title: 'Assignment without submission',
          description: 'Test assignment',
          type: 'ASSIGNMENT',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
      assignmentWithoutSubmissionId = createRes.body.id;

      // Create an assignment with submission
      const withSubRes = await request(app)
        .post('/assignments')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          enrollmentId,
          title: 'Assignment with submission',
          description: 'Test assignment with submission',
          type: 'ASSIGNMENT',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
      assignmentWithSubmissionId = withSubRes.body.id;

      // Student submits the assignment
      await request(app)
        .post(`/assignments/${assignmentWithSubmissionId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          textAnswer: 'Here is my submission',
        });
    });

    it('Tutor can edit their own assignment (title, description, dueDate)', async () => {
      const res = await request(app)
        .patch(`/assignments/${assignmentWithoutSubmissionId}`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          title: 'Updated title',
          description: 'Updated description',
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated title');
      expect(res.body.description).toBe('Updated description');
    });

    it('Tutor can delete assignment without submissions', async () => {
      const res = await request(app)
        .delete(`/assignments/${assignmentWithoutSubmissionId}`)
        .set('Authorization', `Bearer ${tutorToken}`);

      expect(res.status).toBe(200);

      // Verify it's deleted
      const checkRes = await request(app)
        .get('/assignments')
        .set('Authorization', `Bearer ${tutorToken}`)
        .query({ enrollmentId });

      expect(checkRes.body.find((a: any) => a.id === assignmentWithoutSubmissionId)).toBeUndefined();
    });

    it('Tutor cannot delete assignment with student submissions', async () => {
      const res = await request(app)
        .delete(`/assignments/${assignmentWithSubmissionId}`)
        .set('Authorization', `Bearer ${tutorToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Cannot delete assignment - student has already submitted work');
    });

    it('Tutor cannot edit another tutor\'s assignment', async () => {
      // Create another tutor
      const otherTutor = await prisma.user.create({
        data: {
          fullName: 'Other Tutor',
          email: `other_tutor_${Date.now()}@test.com`,
          passwordHash: await hashPassword(testPassword),
          role: 'TUTOR',
          status: 'APPROVED',
        },
      });
      await prisma.tutorProfile.create({
        data: {
          userId: otherTutor.id,
          subjects: ['Math'],
          bio: 'Bio',
          hourlyRate: 50,
          availability: {},
          vettingStatus: 'APPROVED',
        },
      });

      const otherTutorRes = await request(app)
        .post('/auth/login')
        .send({ email: otherTutor.email, password: testPassword });

      const otherTutorToken = otherTutorRes.body.accessToken;

      // Try to edit the first tutor's assignment
      const res = await request(app)
        .patch(`/assignments/${assignmentWithSubmissionId}`)
        .set('Authorization', `Bearer ${otherTutorToken}`)
        .send({
          title: 'Malicious edit',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Not authorized to update this assignment');
    });
  });
});