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
| Schedule/reschedule a session | ❌ | ❌ | ✅ | ❌ |
| Log session notes/homework (not time/link) | — | ✅ (assigned only) | ✅ | ❌ |
| Create assignments/tests | ❌ | ✅ (assigned only) | ✅ | ❌ |
| Submit a grade | ❌ | ✅ (assigned only, → pending approval) | ✅ | ❌ |
| Approve/reject a grade | ❌ | ❌ | ✅ | ❌ |
| See a tutor's assigned students (no parent info) | — | ✅ (own only) | ✅ | — |
| See parent details | ❌ (self only) | ❌ | ✅ | ❌ |
| Set/override pricing | ❌ | ❌ | ✅ | ❌ |
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

---

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
