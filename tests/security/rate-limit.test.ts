/**
 * Rate-Limiting Tier Tests
 *
 * Verifies that all three rate-limit tiers fire at their documented thresholds
 * and return the correct headers on every response.
 *
 * Strategy: each test sub-suite uses a unique email/IP combination to avoid
 * pollution across tests. We exhaust the limit, confirm the 429, then verify
 * the required RateLimit-* headers are present.
 *
 * Note: these tests rely on express-rate-limit's MemoryStore resetting between
 * test runs. Jest runs each test file in a fresh process, so the store starts
 * empty for this file. If this file is ever run in --watch mode alongside other
 * suites that hit the same endpoints, consider adding a short wait or unique
 * identifiers per test.
 */

import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/config/database';
import { hashPassword } from '../../src/utils/password.util';

// ---------------------------------------------------------------------------
// Tier 1 Tests (Strict: 7 req / 15 min, keyed by IP+email)
// ---------------------------------------------------------------------------
describe('Tier 1 — Strict rate limit (7 req / 15 min) on auth endpoints', () => {
  const uniqueEmail = `rl_tier1_${Date.now()}@test.com`;

  it('should allow exactly 7 requests to POST /auth/login before returning 429', async () => {
    const payload = { email: uniqueEmail, password: 'WrongPassword1!' };

    // Requests 1–7: may succeed with 401 (wrong creds) — that's fine.
    // The limiter counts ALL requests (skipSuccessfulRequests: false).
    for (let i = 0; i < 7; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send(payload);
      // Should be anything except 429 for the first 7
      expect(res.status).not.toBe(429);
    }

    // Request 8: must hit the limit
    const blockedRes = await request(app)
      .post('/api/auth/login')
      .send(payload);
    expect(blockedRes.status).toBe(429);
    expect(blockedRes.body).toHaveProperty('error');
  });

  it('should return RateLimit-* headers on Tier 1 responses', async () => {
    // Use a fresh email so we're not carrying over the exhausted counter above.
    const freshEmail = `rl_tier1_headers_${Date.now()}@test.com`;
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: freshEmail, password: 'WrongPassword1!' });

    // We don't care about the auth status — just confirm the headers exist.
    expect(res.headers).toHaveProperty('ratelimit-limit');
    expect(res.headers).toHaveProperty('ratelimit-remaining');
    expect(res.headers).toHaveProperty('ratelimit-reset');
    // Legacy X-RateLimit-* must NOT be present
    expect(res.headers).not.toHaveProperty('x-ratelimit-limit');
  });

  it('should apply limit per account (different emails have independent counters)', async () => {
    const emailA = `rl_acct_a_${Date.now()}@test.com`;
    const emailB = `rl_acct_b_${Date.now()}@test.com`;

    // Exhaust emailA's counter
    for (let i = 0; i < 7; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: emailA, password: 'Wrong!' });
    }
    const blockedA = await request(app)
      .post('/api/auth/login')
      .send({ email: emailA, password: 'Wrong!' });
    expect(blockedA.status).toBe(429);

    // emailB's counter is independent — should still pass
    const passB = await request(app)
      .post('/api/auth/login')
      .send({ email: emailB, password: 'Wrong!' });
    expect(passB.status).not.toBe(429);
  });

  it('should apply Tier 1 to POST /auth/register', async () => {
    const regEmail = `rl_reg_${Date.now()}@test.com`;
    for (let i = 0; i < 7; i++) {
      await request(app)
        .post('/api/auth/register')
        .send({ email: `${i}_${regEmail}`, password: 'Password12345!', fullName: 'Test' });
    }
    // 8th attempt with the same IP+email combo (using the same regEmail as body field)
    const blocked = await request(app)
      .post('/api/auth/register')
      .send({ email: regEmail, password: 'Password12345!', fullName: 'Test' });
    expect(blocked.status).toBe(429);
  });
});

// ---------------------------------------------------------------------------
// Tier 2 Tests (Moderate: 60 req / 1 min, keyed by userId)
// ---------------------------------------------------------------------------
describe('Tier 2 — Moderate rate limit (60 req / 1 min) on write endpoints', () => {
  let parentToken = '';
  let subjectId = '';

  beforeAll(async () => {
    const passHash = await hashPassword('Password12345!');
    const parent = await prisma.user.create({
      data: {
        fullName: 'RateLimit Tier2 Parent',
        email: `rl_tier2_${Date.now()}@test.com`,
        passwordHash: passHash,
        role: 'PARENT',
        status: 'ACTIVE',
      },
    });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: parent.email, password: 'Password12345!' });
    parentToken = loginRes.body.accessToken;

    const subject = await prisma.subject.create({
      data: {
        name: `RL_Tier2_Subj_${Date.now()}`,
        gradeBand: '4-8',
        category: 'CORE',
      },
    });
    subjectId = subject.id;
  });

  it('should return 429 after 60 write requests within 1 minute', async () => {
    // We use POST /api/students with invalid data — it will return 400 from
    // validation, but the rate limiter counts it regardless.
    // We need 61 attempts. At request 61, the limiter should fire.
    const makeWriteRequest = () =>
      request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({}); // Intentionally invalid — triggers 400, still counted by limiter

    for (let i = 0; i < 60; i++) {
      const res = await makeWriteRequest();
      expect(res.status).not.toBe(429);
    }

    const blocked = await makeWriteRequest();
    expect(blocked.status).toBe(429);
  }, 30000); // Allow 30s for 61 requests

  it('should include RateLimit-* headers on Tier 2 responses', async () => {
    // Use a fresh user so the Tier2 counter isn't exhausted
    const passHash = await hashPassword('Password12345!');
    const freshParent = await prisma.user.create({
      data: {
        fullName: 'RateLimit Tier2 Headers Parent',
        email: `rl_tier2h_${Date.now()}@test.com`,
        passwordHash: passHash,
        role: 'PARENT',
        status: 'ACTIVE',
      },
    });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: freshParent.email, password: 'Password12345!' });
    const freshToken = loginRes.body.accessToken;

    const res = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${freshToken}`)
      .send({});

    expect(res.headers).toHaveProperty('ratelimit-limit');
    expect(res.headers).toHaveProperty('ratelimit-remaining');
    expect(res.headers).toHaveProperty('ratelimit-reset');
    expect(res.headers).not.toHaveProperty('x-ratelimit-limit');
  });
});

// ---------------------------------------------------------------------------
// Tier 3 Tests (Loose: 300 req / 15 min, keyed by userId)
// ---------------------------------------------------------------------------
describe('Tier 3 — Loose rate limit (300 req / 15 min) on read endpoints', () => {
  let parentToken = '';

  beforeAll(async () => {
    const passHash = await hashPassword('Password12345!');
    const parent = await prisma.user.create({
      data: {
        fullName: 'RateLimit Tier3 Parent',
        email: `rl_tier3_${Date.now()}@test.com`,
        passwordHash: passHash,
        role: 'PARENT',
        status: 'ACTIVE',
      },
    });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: parent.email, password: 'Password12345!' });
    parentToken = loginRes.body.accessToken;
  });

  it('should include RateLimit-* headers on Tier 3 (GET) responses', async () => {
    const res = await request(app)
      .get('/api/subjects')
      .set('Authorization', `Bearer ${parentToken}`);

    expect(res.headers).toHaveProperty('ratelimit-limit');
    expect(res.headers).toHaveProperty('ratelimit-remaining');
    expect(res.headers).toHaveProperty('ratelimit-reset');
    expect(res.headers).not.toHaveProperty('x-ratelimit-limit');
    // Tier 3 limit should be 300
    expect(Number(res.headers['ratelimit-limit'])).toBe(300);
  });

  it('should return 429 after 300 GET requests within 15 minutes', async () => {
    // Note: this test sends 301 requests. It may be slow in CI.
    // If this becomes a bottleneck, consider reducing Tier 3 limit in test env
    // via an env var (RATE_LIMIT_TIER3_MAX=10) and adjusting the assertion.
    for (let i = 0; i < 300; i++) {
      const res = await request(app)
        .get('/api/subjects')
        .set('Authorization', `Bearer ${parentToken}`);
      expect(res.status).not.toBe(429);
    }
    const blocked = await request(app)
      .get('/api/subjects')
      .set('Authorization', `Bearer ${parentToken}`);
    expect(blocked.status).toBe(429);
  }, 60000); // Allow 60s for 301 requests
});

// ---------------------------------------------------------------------------
// Webhook exemption
// ---------------------------------------------------------------------------
describe('Webhook route is exempt from all rate limiting', () => {
  it('POST /api/webhooks/paystack should not be blocked after many requests', async () => {
    // Send 10 requests with an invalid signature — they should all get 400/401
    // (bad signature), never 429 (rate limited).
    for (let i = 0; i < 10; i++) {
      const res = await request(app)
        .post('/api/webhooks/paystack')
        .set('x-paystack-signature', 'invalid')
        .send({ event: 'charge.success' });
      expect(res.status).not.toBe(429);
    }
  });
});
