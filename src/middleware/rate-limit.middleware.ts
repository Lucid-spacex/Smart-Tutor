import rateLimit from 'express-rate-limit';
import { Request } from 'express';

// ---------------------------------------------------------------------------
// Rate Limiting — Three Tiers by Risk Level
//
// Each tier is a separate limiter instance applied to the relevant route group.
// Do NOT collapse these into one configurable limiter with conditional logic —
// that makes audit and reasoning much harder.
//
// NOTE — In-memory store limitation:
// These limiters use express-rate-limit's default MemoryStore, which is correct
// for a single-instance deployment. If/when the app scales to multiple server
// instances, limits will NOT be consistent across nodes — each instance will
// maintain its own counter. At that point, replace the store with a shared
// Redis-backed store (e.g. `rate-limit-redis` or `@upstash/ratelimit`).
// This is a known and accepted trade-off for the current single-instance setup.
// ---------------------------------------------------------------------------

/**
 * Tier 1 — STRICT (7 req / 15 min)
 *
 * Applied to:
 *   POST /auth/login
 *   POST /auth/register
 *   POST /auth/verify
 *   POST /auth/resend-otp
 *   POST /payments/initiate
 *
 * Key strategy: IP + the identifying body field (email for standard login/register/verify/resend).
 * This combination:
 *   - Catches someone hammering ONE specific account from a rotating/shared IP.
 *   - Stops a single flagged IP from locking out ALL users behind a school or
 *     office NAT (because each account gets its own counter bucket).
 *
 * Usage: import { tier1AuthRateLimit } from '...' and apply per-route.
 */
export const tier1AuthRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 7,
  standardHeaders: true,  // Emit RateLimit-* headers (RFC 6585)
  legacyHeaders: false,   // Disable X-RateLimit-* legacy headers
  message: {
    error: 'Too many attempts. Please wait 15 minutes before trying again.',
  },
  keyGenerator: (req: Request): string => {
    // Prefer email, then fall back to IP-only so the limiter always has a key.
    const identifier = req.body?.email || 'unknown';
    const ip = req.ip || 'unknown';
    return `t1:${ip}:${identifier}`;
  },
  skipSuccessfulRequests: false,
  validate: { keyGeneratorIpFallback: false },
});

/**
 * Tier 1b — STUDENT LOGIN STRICT (5 req / 15 min)
 *
 * Applied to:
 *   POST /auth/student-login
 *
 * Key strategy: IP + studentCode. Since student PINs are 6 digits (smaller search space),
 * we use a stricter limit than standard auth.
 *
 * Purpose: Protect against brute force attacks on student accounts given the smaller
 * credential space.
 *
 * Usage: import { studentLoginRateLimit } from '...' and apply to student-login route.
 */
export const studentLoginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Stricter than tier1 due to smaller PIN search space
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many login attempts. Please wait 15 minutes before trying again.',
  },
  keyGenerator: (req: Request): string => {
    // Use studentCode as the identifier, fall back to IP
    const identifier = req.body?.studentCode || 'unknown';
    const ip = req.ip || 'unknown';
    return `t1b:${ip}:${identifier}`;
  },
  skipSuccessfulRequests: false,
  validate: { keyGeneratorIpFallback: false },
});

/**
 * Tier 2 — MODERATE (60 req / 1 min)
 *
 * Applied to:
 *   All non-GET, non-Tier-1 API routes (POST/PATCH/PUT/DELETE for creating
 *   students, submitting grades, sending messages, filing complaints, etc.)
 *
 * Key strategy: authenticated userId where available; falls back to IP for
 * any unauthenticated write (which should be rare given RBAC).
 *
 * Purpose: backstop against runaway scripts or bugs, not a user-facing limit.
 * A real parent doing normal actions should never approach 60 writes/minute.
 *
 * Usage: applied centrally in app.ts on all mutating /api routes (after
 * excluding auth and payment initiation which already have Tier 1).
 */
export const tier2WriteRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please slow down.',
  },
  keyGenerator: (req: Request): string => {
    // req.user is set by authenticate() middleware for authenticated routes.
    // Using 'any' cast because express-rate-limit's Request type doesn't know
    // about our custom user property.
    const userId = (req as any).user?.userId;
    const key = userId ? `uid:${userId}` : `ip:${req.ip || 'unknown'}`;
    return `t2:${key}`;
  },
  skipSuccessfulRequests: false,
  validate: { keyGeneratorIpFallback: false },
});

/**
 * Tier 3 — LOOSE (300 req / 15 min)
 *
 * Applied to:
 *   All GET requests under /api (dashboard loads, list views, notification
 *   polling, etc.). Also covers unauthenticated reads like GET /subjects,
 *   GET /health.
 *
 * Key strategy: authenticated userId where available; falls back to IP.
 *
 * Purpose: anti-scraping / abuse backstop only. A real user clicking around
 *   a dashboard should never get close to 300 GETs in 15 minutes.
 *
 * Usage: applied centrally in app.ts on all GET /api routes.
 */
export const tier3ReadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please try again later.',
  },
  keyGenerator: (req: Request): string => {
    const userId = (req as any).user?.userId;
    const key = userId ? `uid:${userId}` : `ip:${req.ip || 'unknown'}`;
    return `t3:${key}`;
  },
  skipSuccessfulRequests: false,
  validate: { keyGeneratorIpFallback: false },
});
