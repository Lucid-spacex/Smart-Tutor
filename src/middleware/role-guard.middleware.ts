// Role-based access control middleware
// This file provides additional RBAC helpers beyond basic requireRole

import { AuthRequest, requireRole } from './auth.middleware';

// Re-export the basic requireRole function
export { requireRole };

// Admin-only access
export const requireAdmin = requireRole('ADMIN');

// Parent or Admin access
export const requireParentOrAdmin = requireRole('PARENT', 'ADMIN');

// Tutor or Admin access
export const requireTutorOrAdmin = requireRole('TUTOR', 'ADMIN');

// Student or Admin access
export const requireStudentOrAdmin = requireRole('STUDENT', 'ADMIN');

// Parent, Student, or Admin access
export const requireParentStudentOrAdmin = requireRole('PARENT', 'STUDENT', 'ADMIN');

// Tutor, Parent, or Admin access
export const requireTutorParentOrAdmin = requireRole('TUTOR', 'PARENT', 'ADMIN');

// All authenticated users access
export const requireAnyAuth = (req: AuthRequest, res: any, next: any) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
};
