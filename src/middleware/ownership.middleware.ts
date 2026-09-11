import { AuthRequest } from './auth.middleware';
import prisma from '../config/database';

// Resource ownership lookup functions for use with requireOwnership middleware

// Check if a parent owns a student
export const parentOwnsStudent = async (req: AuthRequest) => {
  const studentId = req.params.id;
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { parentId: true },
  });
  return student ? { ownerId: student.parentId } : null;
};

// Check if a tutor is assigned to an enrollment
export const tutorOwnsEnrollment = async (req: AuthRequest) => {
  const enrollmentId = req.params.id || req.body.enrollmentId;
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { tutorId: true },
  });
  return enrollment ? { ownerId: enrollment.tutorId || '' } : null;
};

// Check if a parent owns an enrollment (via their child)
export const parentOwnsEnrollment = async (req: AuthRequest) => {
  const enrollmentId = req.params.id || req.body.enrollmentId;
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { student: { select: { parentId: true } } },
  });
  return enrollment ? { ownerId: enrollment.student.parentId } : null;
};

// Check if a parent owns a payment
export const parentOwnsPayment = async (req: AuthRequest) => {
  const paymentId = req.params.id;
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { parentId: true },
  });
  return payment ? { ownerId: payment.parentId } : null;
};

// Check if a tutor owns a session
export const tutorOwnsSession = async (req: AuthRequest) => {
  const sessionId = req.params.id;
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { tutorId: true },
  });
  return session ? { ownerId: session.tutorId } : null;
};

// Check if a student is the authenticated user (for student-specific endpoints)
export const studentIsSelf = async (req: AuthRequest) => {
  const studentId = req.params.id;
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { userId: true },
  });
  return student ? { ownerId: student.userId } : null;
};

// Check if a parent owns a student via studentCode lookup
export const parentOwnsStudentByCode = async (req: AuthRequest) => {
  const studentCode = req.params.studentCode;
  const user = await prisma.user.findUnique({
    where: { studentCode: studentCode },
    select: { parentId: true },
  });
  return user ? { ownerId: user.parentId || '' } : null;
};
