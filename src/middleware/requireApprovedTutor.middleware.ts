import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import prisma from '../config/database';

/**
 * Middleware to restrict access to approved tutors only
 * PENDING_VETTING tutors can only access application routes
 * REJECTED tutors get 403 APPLICATION_REJECTED
 * SUSPENDED tutors get 403 (handled by authenticate middleware)
 */
export const requireApprovedTutor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const role = authReq.user?.role;

    // Only apply to TUTOR role
    if (role !== 'TUTOR') {
      next();
      return;
    }

    // Fetch fresh user status from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { status: true },
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Check tutor status
    if (user.status === 'PENDING_VETTING') {
      res.status(403).json({
        error: 'TUTOR_NOT_APPROVED',
        message: 'Your application is still pending approval. Please complete your application.',
      });
      return;
    }

    if (user.status === 'REJECTED') {
      res.status(403).json({
        error: 'APPLICATION_REJECTED',
        message: 'Your application was not approved. Please contact support for more information.',
      });
      return;
    }

    // Approved tutors can proceed
    next();
  } catch (error) {
    console.error('Error in requireApprovedTutor middleware:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
