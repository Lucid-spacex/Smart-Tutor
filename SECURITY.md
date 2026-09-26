# Smart-Tutor Platform Security Documentation

## Overview

This platform processes minors' personal data and payment transactions. Security and correctness take priority over speed of delivery. This document specifies the authentication model, three-factor student login, strict RBAC authorization matrix, IDOR protections, messaging permissions, payment security, and scheduled jobs.

---

## 1. Authentication Model

### JWT Token Architecture & Rotation
- **Access Tokens**: Short-lived (15 minutes or less) to minimize token compromise windows.
- **Refresh Tokens**: 7 days duration. Rotated on every single usage.
- **Hashing**: Refresh tokens are stored SHA-256 hashed, never in plaintext.
- **Token Family & Theft Detection**: Tokens are grouped by `tokenFamily`. If a previously used/superseded refresh token is presented (a replay attack/theft signal), the entire session family is instantly revoked.
- **Per-Request Status Verification**: `authenticate` middleware re-checks `User.status` in PostgreSQL on every request. Even with an unexpired JWT, `SUSPENDED` or `REJECTED` users and unapproved `PENDING_VETTING` tutors are immediately blocked with `403 Forbidden`.

### Password Security & Policies
- **Bcrypt**: Hashed with cost factor of 12+.
- **Complexity**: Enforced server-side via Zod schemas.

### OTP Security
- **Hashing & Storage**: Stored as SHA-256 hashes with expiration timestamps.
- **Resend**: `POST /auth/resend-otp` provided for missed or expired verification emails.
- **Rate Limiting**: Aggressive rate limiting per IP and email.

---

## 2. Student Three-Factor Authentication

Students do not authenticate with standard email/password. Instead, students authenticate with **three-factor authentication**:
1. **Parent Email** (verified against the student's linked parent in `User.parentId`)
2. **Student Code** (system-generated 8+ character unique alphanumeric code, case-insensitive comparison)
3. **Student Password** (system-generated strong random password, 12+ chars, stored bcrypt-hashed)

### Security Rules:
- **Credential Generation**: On `POST /students`, credentials are generated and emailed to the parent. The API returns `studentCode` but **never** the plaintext password.
- **Uniform 401 Responses**: On failed `POST /auth/student-login`, generic `401 "Invalid credentials"` is returned for any mismatch (wrong code, mismatched parent email, or invalid password) to prevent user enumeration.
- **Rate Limiting**: Rate limited both per IP and per `studentCode` to block targeted brute-forcing.
- **No Plaintext Password Retrieval**: Passwords can only be regenerated via `POST /students/:id/regenerate-password` (parent-only) or `PATCH /admin/students/:id/regenerate-password` (admin-only).

---

## 3. Full RBAC Authorization Matrix

| Action | Parent | Tutor | Admin | Student |
|---|---|---|---|---|
| Register/login with email+password | ✅ | ✅ (after approval) | ✅ (internal seed) | ❌ (uses code+password) |
| Enroll a child, view own children | ✅ | ❌ | ✅ (all) | — |
| View own schedule/assignments/progress reports | ✅ (own children) | — | ✅ (all) | ✅ (own only) |
| View grades | ✅ (own children, approved only) | ✅ (own submissions, any status) | ✅ (all) | ✅ (own, approved only) |
| Schedule/reschedule a session | ❌ | ✅ (own assigned students only) | ✅ | ❌ |
| Log session notes/homework (not time/link) | — | ✅ (assigned only) | ✅ | ❌ |
| Create assignments/tests | ❌ | ✅ (assigned only) | ✅ | ❌ |
| Submit a grade | ❌ | ✅ (assigned only, → pending approval) | ✅ | ❌ |
| Approve/reject a grade | ❌ | ❌ | ✅ | ❌ |
| See a tutor's assigned students (no parent info) | — | ✅ (own only) | ✅ | — |
| See parent details | ❌ (self only) | ❌ | ✅ | ❌ |
| Set/override pricing | ❌ | ❌ | ✅ | ❌ |
| View pricing tiers & exchange rates | ❌ | ❌ | ✅ | ❌ |
| Approve/reject tutors | ❌ | ❌ | ✅ | ❌ |
| File a complaint | ✅ | ✅ | — | ❌ |
| Resolve a complaint | ❌ | ❌ | ✅ | ❌ |
| Regenerate a student's password | ✅ (own child) | ❌ | ✅ (support) | ❌ |
| Reactivate a suspended parent | ❌ | ❌ | ✅ | — |
| Message their assigned tutor / assigned student (student↔tutor) | ❌ | ✅ (assigned students only) | — | ✅ (own assigned tutor only) |
| Message Admin | ✅ | ✅ | — | ❌ |
| Message a Tutor (parent) or a Parent (tutor) | ❌ | ❌ | — | — |
| View a student's attendance | ✅ (own child) | ✅ (assigned students only) | ✅ (all) | ✅ (own only) |
| Mark session attendance | ❌ | ✅ (assigned session, on completion only) | ❌ | ❌ |
| **Quiz Mode** (explicit RBAC carve-out) | ❌ | ✅ (create questions for own assignments) | ✅ | ✅ (start/answer/complete own quiz only) |
| View detailed student info (single student) | — | ✅ (own assigned students only, no parent info) | ✅ | — |
| View assigned tutor profiles | — | — | — | ✅ (own assigned tutors only) |

---

**Note**: Additional RBAC entries added 2026-09-26:
- Tutors can now schedule/reschedule sessions for their own assigned students only
- Tutors can view detailed student info for their assigned students (excluding parent info)
- Students can view their assigned tutors' profiles

## 4. IDOR Defense & Resource-Level Authorization

Every endpoint with an `:id` parameter verifies resource-level ownership:
1. **Parents**: Gated to only access their own children, enrollments, sessions, progress reports, and payments.
2. **Tutors**: Gated to only access enrollments, sessions, assignments, and grades for students actively assigned to them. Tutor endpoints never expose parents' personal contact details.
3. **Students**: Resolved securely from `req.user.userId -> Student.userId`. Students can never supply or manipulate an arbitrary student ID.
4. **Grades Visibility**: Unapproved grades (`status: PENDING_APPROVAL`, `visibleToStudent: false`) are strictly omitted from all parent- and student-facing queries.

---

## 5. Messaging Graph Enforcement

The platform enforces communication isolation via the single `canMessage(senderId, recipientId)` function:
- **Allowed**:
  - `Student <-> Assigned Tutor` (verified against an ACTIVE enrollment at send time)
  - `Tutor <-> Admin`
  - `Parent <-> Admin`
- **Strictly Blocked**:
  - `Student <-> Admin` (403 Forbidden)
  - `Student <-> Parent` (403 Forbidden - handled outside platform)
  - `Parent <-> Tutor` (403 Forbidden in both directions - must route through Admin)
  - `Student <-> Unassigned Tutor` (403 Forbidden)

---

## 6. Payment Security & Amount Integrity

- **Server-Side Price Calculation**: `POST /payments/initiate` computes amount server-side from enrollment `yearlyPrice` and `billingFrequency` (weekly: yearlyPrice/52, monthly: yearlyPrice/12, yearly: yearlyPrice). Any client-supplied amount is ignored.
- **Webhook Verification**: Webhook signatures (HMAC SHA-512) are verified on raw request bodies before processing.
- **Idempotency**: Webhook payment updates are idempotent against retried provider events.

---

## 7. Timezone Handling

- `Session.scheduledAt` is always stored in UTC in PostgreSQL.
- Display conversion happens client-side or during response formatting.
- `Student` effective timezone resolution: `student's own timezone -> parent's timezone -> UTC fallback`.
- `GET /student/me/next-class` returns the raw UTC ISO timestamp and the resolved timezone string.

---

## 8. Scheduled Jobs & Account Inactivity

- **Parent Inactivity Job**: Daily runner identifies `PARENT` accounts active > 7 days with 0 child enrollments and sets `status = SUSPENDED`.
- **Assignment Due Alerts**: Daily runner creates notifications for pending assignments due within 48 hours or overdue, with built-in deduplication.
- **Exchange Rate Monitoring**: Daily runner fetches current USD→NGN rate, computes pricing drift for all tiers and overrides, and creates admin notifications if drift exceeds threshold.
- **Zoom Recording Sync**: Hourly runner polls Zoom API for completed sessions without recordings (fallback if webhook unavailable).

---

## 9. Quiz Mode Security (Explicit RBAC Carve-Out)

Students are otherwise fully read-only, but quiz mode provides a **deliberate, narrow exception**:

### Security Rules:
- **Answer Submission Only**: Students may only submit structured answers (`selectedOptionIndex`, `timeTakenSeconds`) for their own in-progress quiz attempts. No open-ended content or arbitrary writes.
- **Server-Side Scoring**: `isCorrect` and `pointsAwarded` are **never trusted from the client**. The server computes correctness by comparing `selectedOptionIndex` to the stored `correctOptionIndex`, and calculates points with a speed multiplier (30s max per question, 1.0→0.5 multiplier).
- **Answer Leak Prevention**: Students fetching quiz questions **never receive `correctOptionIndex`** in the response. Only tutors and admins see the correct answer.
- **Attempt Isolation**: Students can only access their own quiz attempts (`attempt.studentId === userId`). Tutors can access attempts for their own assignments. Admins can access all attempts.
- **No Self-Grading Bypass**: Quiz completion creates a `Grade` record with `status: PENDING_APPROVAL`, same as any other grade. Auto-scoring does not bypass admin oversight.
- **Prevent Retries**: Students cannot start a new attempt if they already have a completed attempt for the same assignment.

---

## 10. Pricing Tier Security

### Tiered Pricing Architecture:
- **Grade Band Tiers**: Default prices by grade band (PRESCHOOL_TO_G1, G2_TO_G4, G5_TO_G8, G9_TO_G12). Admin-configured only.
- **Per-Student Overrides**: Individual enrollments can have override prices (`yearlyPriceNGN`, `yearlyPriceUSD` nullable fields). `null` values revert to tier default.
- **Resolution Order**: Payment flow checks override first, then tier default. Fails clearly if neither exists—never silently defaults to zero.
- **Exchange Rate Monitoring**: Purely informational. The system tracks market rate drift via a scheduled job and alerts admin via notifications if drift exceeds threshold. **Never auto-applies** rate changes to pricing.

### Security Rules:
- **Admin-Only Pricing**: All pricing endpoints (`GET /admin/pricing-tiers`, `PATCH /admin/pricing-tiers/:gradeBandTier`, `PATCH /admin/enrollments/:id/pricing`) require `ADMIN` role.
- **Server-Side Amount Calculation**: `POST /payments/initiate` computes effective price server-side using the resolution order. Client-supplied amounts are ignored.
- **No Student/Parent Pricing Visibility**: Pricing tiers and drift information are admin-only endpoints. Students/parents only see final payment amounts.
- **Grade Band Auto-Mapping**: `Student.gradeBandTier` is auto-set from `gradeLevel` via a mapping function at creation. Admin can manually correct if needed.

---

## 11. Zoom Recording Security

### Recording Sync Architecture:
- **Webhook-First**: Preferred approach—Zoom `recording.completed` webhook triggers immediate recording URL storage. Webhook signature verified via HMAC before processing.
- **Polling Fallback**: Hourly job checks completed sessions without recordings and polls Zoom API if webhook setup isn't feasible.
- **No Video Rehosting**: Only the recording URL is stored. Videos remain hosted on Zoom's infrastructure. The platform links out to Zoom's hosted recording URL surfaced in the UI.

### Security Rules:
- **Webhook Signature Verification**: Zoom webhook signatures are verified using `ZOOM_WEBHOOK_SECRET` via HMAC before trusting any payload.
- **Meeting ID Tracking**: Sessions store `zoomMeetingId` for recording lookup. This is set by admin when creating sessions.
- **No Unauthorized Recording Access**: Recording URLs are included in session responses for completed sessions to authorized users (student's parent, assigned tutor, admin).
- **Rate Limiting**: Zoom API polling is batched (50 sessions per run) to avoid overwhelming the API or triggering rate limits.

---

## 12. Tutor Self-Scheduling Policy Change (2026-09-26)

**Policy Change Notice**: As of 2026-09-26, tutors are now permitted to create and reschedule sessions for their own assigned students. This is a deliberate reversal of the earlier admin-only scheduling rule and is documented here as an intentional policy change.

### Updated Session Scheduling Rules:
- **Tutors**: Can create and reschedule sessions for their own assigned students only (single enrollment sessions)
- **Admins**: Retain full scheduling power across all enrollments, including shared/multi-student sessions
- **Ownership Checks**: 
  - `POST /tutor/sessions` requires the `enrollmentId` to belong to the requesting tutor
  - `PATCH /tutor/sessions/:id/reschedule` requires the session's `tutorId` to match the requesting tutor
  - Tutors cannot create sessions for students they don't teach
  - Tutors cannot reschedule sessions created by other tutors or admins
- **Zoom Integration**: Tutor-created sessions auto-generate Zoom meetings using the same logic as admin-created sessions
- **Scope**: Tutor-created sessions are single-student only. Multi-student shared sessions remain admin-only

### Security Considerations:
- The ownership check (`enrollmentId` must belong to the requesting tutor) is the single most important security constraint
- This change is additive to admin capabilities, not a replacement
- Tutors still cannot modify `scheduledAt` or `zoomLink` when logging session notes (only status, notes, homework, attendance)

---

## 13. Rate Limiting Tiers

Rate limiting is applied in **three separately-instanced tiers** based on risk level. A single blanket limit is intentionally avoided — it would throttle normal usage (dashboard loads, notification polling) while under-protecting the endpoints that actually need aggressive limits.

### Tier 1 — Strict (7 requests / 15 minutes)

**Applies to:**
- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/verify`
- `POST /auth/resend-otp`
- `POST /auth/student-login`
- `POST /payments/initiate`

**Key strategy:** `IP + identifying body field` (email for standard auth endpoints, `studentCode` for student login).

**Why not IP-only:** Keying by IP alone would let a targeted attack on one specific account go undetected from a rotating IP, and would also lock out every other legitimate user behind the same NAT (school or office shared IP). The combined key gives each account its own counter bucket per IP, stopping both targeted attacks and NAT collateral damage.

**Applied at:** Route level (`tier1AuthRateLimit` imported and applied per-route in `auth.routes.ts` and `payments.routes.ts`).

---

### Tier 2 — Moderate (60 requests / 1 minute)

**Applies to:** All `POST / PATCH / PUT / DELETE` requests under `/api` not already covered by Tier 1 (creating students, submitting grades, sending messages, filing complaints, etc.).

**Key strategy:** Authenticated `userId` where available; falls back to `req.ip` for unauthenticated writes.

**Purpose:** Backstop against runaway scripts or client bugs. A real user doing normal actions should never approach 60 writes per minute.

**Applied at:** Central `app.use('/api', ...)` middleware in `app.ts` (dispatched by HTTP method).

---

### Tier 3 — Loose (300 requests / 15 minutes)

**Applies to:** All `GET` requests under `/api` (dashboard loads, list views, notification polling, etc.), including unauthenticated reads like `GET /subjects`.

**Key strategy:** Authenticated `userId` where available; falls back to `req.ip`.

**Purpose:** Anti-scraping / abuse backstop only. A real user clicking around a dashboard should never come close to 300 GETs in 15 minutes.

**Applied at:** Central `app.use('/api', ...)` middleware in `app.ts` (dispatched by HTTP method).

---

### Webhook Exception

`POST /api/webhooks/*` is **exempt from all rate limiting**. Paystack webhook retries must always reach the server regardless of other traffic patterns. Webhook authenticity is instead verified via HMAC signature.

---

### Headers

All three tiers emit standard rate-limit headers on every response:
- `RateLimit-Limit` — the maximum requests allowed in the window
- `RateLimit-Remaining` — requests remaining in the current window
- `RateLimit-Reset` — seconds until the window resets

Legacy `X-RateLimit-*` headers are **disabled** across all tiers.

---

### Known Limitation — In-Memory Store

All three limiters currently use `express-rate-limit`'s default `MemoryStore`. This is correct and sufficient for a single-instance deployment. **If/when the app scales to multiple server instances, limits will NOT be consistent across nodes** — each instance maintains its own counter. At that point, replace the store with a shared Redis-backed implementation (`rate-limit-redis` or `@upstash/ratelimit`) passed as the `store` option to each limiter. No other code changes are required.

