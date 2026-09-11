import rateLimit from 'express-rate-limit';
import { config } from '../config/env.config';

/**
 * Rate limit configuration for authentication endpoints
 * Prevents brute force attacks and abuse
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Count successful requests
});

/**
 * Rate limit for registration endpoint
 * Prevents registration spam
 */
export const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 registrations per hour
  message: 'Too many registration attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limit for OTP verification endpoint
 * Prevents OTP brute-forcing
 */
export const otpRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 OTP attempts per 15 minutes
  message: 'Too many OTP attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limit for OTP resend endpoint
 * Prevents SMS/email bombing
 */
export const otpResendRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 OTP resends per hour
  message: 'Too many OTP resend attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limit for student login endpoint
 * More aggressive rate limiting for three-factor authentication
 * Prevents targeted brute-forcing of student credentials
 */
export const studentLoginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 student login attempts per 15 minutes
  message: 'Too many student login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by both IP and studentCode to prevent targeted attacks
    const studentCode = req.body?.studentCode || 'unknown';
    const ip = req.ip || 'unknown';
    return `${ip}-${studentCode}`;
  },
});

/**
 * Rate limit for payment initiation
 * Prevents payment spam/abuse
 */
export const paymentRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 payment initiations per hour
  message: 'Too many payment attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General API rate limit for all endpoints
 */
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 minutes
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
