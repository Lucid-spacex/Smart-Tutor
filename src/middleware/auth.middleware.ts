import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/token.util';
import prisma from '../config/database';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    status: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);

    // Re-check user status from database on each request
    // This ensures suspended/rejected users cannot access endpoints even with valid tokens
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Check account status - block suspended or rejected users
    if (user.status === 'SUSPENDED' || user.status === 'REJECTED') {
      res.status(403).json({ error: 'Account is not active' });
      return;
    }

    // Tutors must be approved to access endpoints (PENDING_VETTING is blocked)
    if (user.role === 'TUTOR' && user.status !== 'APPROVED') {
      res.status(403).json({ error: 'Tutor account is not approved' });
      return;
    }

    req.user = {
      userId: user.id,
      role: user.role,
      status: user.status,
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

// Resource-level ownership checking middleware
// Prevents IDOR (Insecure Direct Object Reference) attacks
export const requireOwnership = (
  resourceLookupFn: (req: AuthRequest) => Promise<{ ownerId: string } | null>
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    try {
      const resource = await resourceLookupFn(req);

      if (!resource) {
        res.status(404).json({ error: 'Resource not found' });
        return;
      }

      // Admins can access any resource
      if (req.user.role === 'ADMIN') {
        next();
        return;
      }

      // Check if the user owns the resource
      if (resource.ownerId !== req.user.userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Error checking resource ownership' });
    }
  };
};

// Helper function to check if user can access a resource based on role-specific rules
export const canAccessResource = async (
  userId: string,
  userRole: string,
  resourceType: string,
  resourceId: string
): Promise<boolean> => {
  // Admins can access everything
  if (userRole === 'ADMIN') return true;

  switch (resourceType) {
    case 'student':
      if (userRole === 'PARENT') {
        const student = await prisma.student.findUnique({
          where: { id: resourceId },
          select: { parentId: true },
        });
        return student?.parentId === userId;
      }
      if (userRole === 'STUDENT') {
        const student = await prisma.student.findUnique({
          where: { id: resourceId },
          select: { userId: true },
        });
        return student?.userId === userId;
      }
      if (userRole === 'TUTOR') {
        // Tutors can access students they're assigned to via enrollments
        const enrollment = await prisma.enrollment.findFirst({
          where: {
            studentId: resourceId,
            tutorId: userId,
          },
        });
        return !!enrollment;
      }
      return false;

    case 'enrollment':
      if (userRole === 'PARENT') {
        const enrollment = await prisma.enrollment.findUnique({
          where: { id: resourceId },
          select: { student: { select: { parentId: true } } },
        });
        return enrollment?.student.parentId === userId;
      }
      if (userRole === 'TUTOR') {
        const enrollment = await prisma.enrollment.findUnique({
          where: { id: resourceId },
          select: { tutorId: true },
        });
        return enrollment?.tutorId === userId;
      }
      return false;

    case 'session':
      if (userRole === 'TUTOR') {
        const session = await prisma.session.findUnique({
          where: { id: resourceId },
          select: { tutorId: true },
        });
        return session?.tutorId === userId;
      }
      if (userRole === 'PARENT' || userRole === 'STUDENT') {
        // Check if user is a participant in the session
        const participant = await prisma.sessionParticipant.findFirst({
          where: {
            sessionId: resourceId,
            enrollment: {
              student: userRole === 'STUDENT'
                ? { userId }
                : { parentId: userId },
            },
          },
        });
        return !!participant;
      }
      return false;

    default:
      return false;
  }
};


