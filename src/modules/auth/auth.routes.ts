import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { authRateLimit, registerRateLimit, otpRateLimit, otpResendRateLimit, studentLoginRateLimit } from '../../middleware/rate-limit.middleware';
import { registerSchema, verifySchema, loginSchema, studentLoginSchema, refreshSchema, resendOtpSchema, changePasswordSchema, timezoneSchema } from './auth.validation';

const router = Router();
const authController = new AuthController();

// Apply rate limiting to sensitive auth endpoints
router.post('/register', registerRateLimit, validate(registerSchema), authController.register);
router.post('/verify', otpRateLimit, validate(verifySchema), authController.verify);
router.post('/login', authRateLimit, validate(loginSchema), authController.login);
router.post('/student-login', studentLoginRateLimit, validate(studentLoginSchema), authController.studentLogin);
router.post('/refresh', authRateLimit, validate(refreshSchema), authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getCurrentUser);
router.patch('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);
router.patch('/me/timezone', authenticate, validate(timezoneSchema), authController.updateTimezone);
router.post('/resend-otp', otpResendRateLimit, validate(resendOtpSchema), authController.resendOtp);

export default router;
