import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { tier1AuthRateLimit } from '../../middleware/rate-limit.middleware';
import { registerSchema, verifySchema, loginSchema, studentLoginSchema, refreshSchema, resendOtpSchema, changePasswordSchema, timezoneSchema } from './auth.validation';

const router = Router();
const authController = new AuthController();

// Tier 1 (Strict) rate limiting applied to all sensitive auth endpoints.
// 7 requests per 15 minutes, keyed by IP + email/studentCode.
// See SECURITY.md §12 for rationale.
router.post('/register', tier1AuthRateLimit, validate(registerSchema), authController.register);
router.post('/verify', tier1AuthRateLimit, validate(verifySchema), authController.verify);
router.post('/login', tier1AuthRateLimit, validate(loginSchema), authController.login);
router.post('/student-login', tier1AuthRateLimit, validate(studentLoginSchema), authController.studentLogin);
router.post('/resend-otp', tier1AuthRateLimit, validate(resendOtpSchema), authController.resendOtp);

// /refresh uses a separate flow (refresh token, not credentials) — Tier 2 via app.ts
// covers it; no extra limit here to avoid breaking normal token rotation.
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getCurrentUser);
router.patch('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);
router.patch('/me/timezone', authenticate, validate(timezoneSchema), authController.updateTimezone);

export default router;
