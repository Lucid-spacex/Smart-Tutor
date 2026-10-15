# Smart-Tutor Platform Security Documentation

## Overview

This platform processes minors' personal data and payment transactions. Security and correctness take priority over speed of delivery. This document specifies the authentication model, three-factor student login, strict RBAC authorization matrix, IDOR protections, messaging permissions, payment security, and scheduled jobs.

---

## 1. Authentication Model

### JWT Token Architecture & Rotation
- **Access Tokens**: 1 day lifetime (env-driven via `JWT_ACCESS_EXPIRY`, default `1d`). This provides a balance between convenience and security. The longer lifetime is compensated by session-based revocation.
- **Refresh Tokens**: 7 days duration. Rotated on every single usage.
- **Hashing**: Refresh tokens are stored SHA-256 hashed, never in plaintext.
- **Token Family & Theft Detection**: Tokens are grouped by `tokenFamily` (session ID). Access tokens include the session ID (`sid`) in their payload. The `authenticate` middleware checks on every request that the session family is not revoked. If a previously used/superseded refresh token is presented (a replay attack/theft signal), the entire session family is instantly revoked.
- **Session Revocation**: Logout, password change, PIN change, account suspension, and refresh-token reuse detection all revoke the entire token family, immediately invalidating all access tokens in that session.
- **Per-Request Status Verification**: `authenticate` middleware re-checks `User.status` in PostgreSQL on every request. Even with an unexpired JWT, `SUSPENDED` or `REJECTED` users and unapproved `PENDING_VETTING` tutors are immediately blocked with `403 Forbidden`.
- **Trade-off Note**: A 1-day access token is riskier than a shorter-lived token because it cannot be revoked by expiry alone. The session-based revocation system compensates for this by checking revocation status on every request. This design prioritizes user convenience (fewer re-authentications) while maintaining security through immediate revocation capabilities.

### Password Security & Policies
- **Bcrypt**: Hashed with cost factor of 12+.
- **Complexity**: Enforced server-side via Zod schemas.

### OTP Security
- **Hashing & Storage**: Stored as SHA-256 hashes with expiration timestamps.
- **Resend**: `POST /auth/resend-otp` provided for missed or expired verification emails.
- **Rate Limiting**: Aggressive rate limiting per IP and email.

### Email Provider
- **Resend API**: Official Resend SDK used for all email sending (verification, student credentials, notifications, password reset)
- **Configuration**: Requires `RESEND_API_KEY` environment variable
- **Template-based**: Uses predefined email templates for consistent formatting
- **From address**: Configured via `EMAIL_FROM` environment variable

---

## 2. Student Three-Factor Authentication

Students do not authenticate with standard email/password. Instead, students authenticate with **three-factor authentication**:
1. **Parent Email** (verified against the student's linked parent in `User.parentId`)
2. **Student Code** (system-generated 8+ character unique alphanumeric code, case-insensitive comparison)
3. **Student PIN** (system-generated 6-digit numeric PIN, stored bcrypt-hashed)

### Security Rules:
- **Credential Generation**: On `POST /students`, credentials are generated and emailed to the parent. The API returns `studentCode` but **never** the plaintext PIN.
- **Uniform 401 Responses**: On failed `POST /auth/student-login`, generic `401 "Invalid credentials"` is returned for any mismatch (wrong code, mismatched parent email, or invalid PIN) to prevent user enumeration.
- **Rate Limiting**: Rate limited both per IP and per `studentCode` (5 requests per 15 minutes) to block targeted brute-forcing.
- **No Plaintext PIN Retrieval**: PINs can only be regenerated via `POST /students/:id/regenerate-pin` (parent-only) or `PATCH /admin/students/:id/regenerate-pin` (admin-only).

---

## 3. Full RBAC Authorization Matrix

| Action | Parent | Tutor | Admin | Student |
|---|---|---|---|---|
| Register/login with email+password | ✅ | ✅ (PENDING_VETTING can login, restricted access) | ✅ (internal seed) | ❌ (uses code+password) |
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
| File a complaint | ✅ | ❌ | — | ❌ |
| Resolve a complaint | ❌ | ❌ | ✅ | ❌ |
| Regenerate a student's PIN | ✅ (own child) | ❌ | ✅ (support) | ❌ |
| Reactivate a suspended parent | ❌ | ❌ | ✅ | — |
| Message their assigned tutor / assigned student (student↔tutor) | ❌ | ❌ (removed 2026-10-12) | — | ❌ (removed 2026-10-12) |
| Message Admin | ✅ | ✅ | — | ❌ |
| Message a Tutor (parent) or a Parent (tutor) | ❌ | ❌ | — | — |
| View a student's attendance | ✅ (own child) | ✅ (assigned students only) | ✅ (all) | ✅ (own only) |
| Mark session attendance | ❌ | ✅ (assigned session, on completion only) | ❌ | ❌ |
| **Quiz Mode** (explicit RBAC carve-out) | ❌ | ✅ (create questions for own assignments) | ✅ | ✅ (start/answer/complete own quiz only) |
| View detailed student info (single student) | — | ✅ (own assigned students only, no parent info) | ✅ | — |
| View assigned tutor profiles | — | — | — | ✅ (own assigned tutors only) |
| Edit own assignments (title, description, dueDate) | ❌ | ✅ (own only) | ✅ | ❌ |
| Delete own assignments (no submissions) | ❌ | ✅ (own only, blocked if submissions exist) | ✅ | ❌ |
| Edit own grades (PENDING_APPROVAL or REJECTED only) | ❌ | ✅ (own only, not APPROVED) | ✅ | ❌ |
| Delete own grades (PENDING_APPROVAL or REJECTED only) | ❌ | ✅ (own only, not APPROVED) | ✅ | ❌ |
| Delete own sessions (SCHEDULED only, must be createdBy) | ❌ | ✅ (own created only, not admin-created) | ✅ | ❌ |
| Reschedule own sessions (must be createdBy) | ❌ | ✅ (own created only, not admin-created) | ✅ | ❌ |
| Upload/change profile picture | ✅ | ✅ | ✅ | ✅ |
| View profile pictures (any user's) | ✅ (own children's tutors) | ✅ (own assigned students) | ✅ (all) | ✅ (own assigned tutors) |
| Complete tutor application | ❌ | ✅ (PENDING_VETTING only) | ❌ | ❌ |
| Upload application documents | ❌ | ✅ (PENDING_VETTING only) | ❌ | ❌ |
| Submit tutor application | ❌ | ✅ (PENDING_VETTING only) | ❌ | ❌ |
| Approve/reject tutor application | ❌ | ❌ | ✅ | ❌ |

---

**Note**: Additional RBAC entries added 2026-09-26:
- Tutors can now schedule/reschedule sessions for their own assigned students only
- Tutors can view detailed student info for their assigned students (excluding parent info)
- Students can view their assigned tutors' profiles

**Note**: Additional RBAC changes added 2026-09-30:
- Tutors can no longer file complaints (they now use messaging to contact admin)
- Admin inbox is now shared: any admin can see and reply to parent/tutor threads
- Admin can message any parent or tutor, and vice versa
- Tutors can edit/delete their own assignments (blocked if submissions exist)
- Tutors can edit/delete their own grades (only while PENDING_APPROVAL or REJECTED, not APPROVED)
- Tutors can delete/reschedule only sessions they created (not admin-created sessions)
- All roles can upload/change profile pictures via Cloudinary
- Profile picture URLs are included in user info responses throughout the app

**Note**: Additional RBAC changes added 2026-10-15:
- Tutors must complete application process before accessing tutoring features
- PENDING_VETTING tutors can only access application completion endpoints
- REJECTED tutors cannot access any tutoring features
- Tutors can complete application, upload documents, and submit for review
- Admins can approve/reject tutor applications with rejection reason
- Tutor approval automatically creates TutorProfile from application data

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
  - `Tutor <-> Admin` (shared inbox - any admin can reply)
  - `Parent <-> Admin` (shared inbox - any admin can reply)
  - `Admin <-> Admin` (admin-to-admin messaging)
- **Strictly Blocked**:
  - `Student <-> Tutor` (403 Forbidden - removed 2026-10-12)
  - `Student <-> Admin` (403 Forbidden)
  - `Student <-> Parent` (403 Forbidden - handled outside platform)
  - `Parent <-> Tutor` (403 Forbidden in both directions - must route through Admin)
  - `Student <-> Unassigned Tutor` (403 Forbidden)
  - `Parent <-> Parent` (403 Forbidden)
  - `Tutor <-> Tutor` (403 Forbidden)

**Shared Admin Inbox (2026-09-30, updated 2026-10-14)**:
- Parents and tutors message "Admin" as a shared team inbox, not individual admins
- `GET /messages/admin-contact` returns any active admin's ID for starting new threads (for compatibility only, the specific admin ID does not affect routing)
- Admins see all threads with parents and tutors in their thread list, regardless of which specific admin was the original recipient
- Thread identification uses the non-admin participant's ID for admin-support conversations, ensuring all admins see the same thread
- Any admin can reply to any parent/tutor thread (shared reply rights)
- Admin unread count tracks messages from non-admin users that no admin has read yet
- Opening a thread marks messages as read for all admins (shared read state)
- This provides a unified "Admin" conversation experience for parents and tutors

**Note (2026-10-12)**: Students no longer have any messaging capability in the platform. Their sole prior messaging contact (their assigned tutor) has been removed.

**Message Permission Matrix (4×4)**:
| Sender \ Recipient | PARENT | TUTOR | ADMIN | STUDENT |
|-------------------|--------|-------|-------|---------|
| PARENT | ❌ | ❌ | ✅ | ❌ |
| TUTOR | ❌ | ❌ | ✅ | ❌ |
| ADMIN | ✅ | ✅ | ✅ | ❌ |
| STUDENT | ❌ | ❌ | ❌ | ❌ |

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

## 13. Tutor Content Management (2026-09-30)

**Policy Change Notice**: As of 2026-09-30, tutors are permitted to edit and delete their own assignments, grades, and sessions they created. This provides tutors with necessary autonomy while maintaining admin oversight.

### Assignment Management:
- **Tutors**: Can edit (`PATCH /assignments/:id`) and delete (`DELETE /assignments/:id`) assignments they created
- **Guardrails**: 
  - Deletion is blocked if a student has already submitted work for the assignment
  - Only the assignment creator (tutor) can edit or delete their own assignments
  - Tutors cannot edit/delete assignments created by other tutors or admins
- **Scope**: Title, description, type, due date, and attachments can be edited

### Grade Management:
- **Tutors**: Can edit (`PATCH /grades/:id`) and delete (`DELETE /grades/:id`) grades they submitted
- **Guardrails**:
  - Edit/delete is only allowed while grade status is `PENDING_APPROVAL` or `REJECTED`
  - Once `APPROVED` by admin, grades are locked and cannot be modified by tutors
  - Only the grade creator (tutor) can edit or delete their own grades
- **Scope**: Score, comments, and attachments can be edited

### Session Management:
- **Tutors**: Can delete (`DELETE /tutor/sessions/:id`) sessions they created
- **Guardrails**:
  - Only the session creator (tracked via `createdBy` field) can delete
  - Tutors cannot delete admin-created sessions, even if they're the assigned tutor
  - Only `SCHEDULED` sessions can be deleted (past/active sessions are protected)
  - Deleting a session cancels the actual Zoom meeting via Zoom API
- **Reschedule Enhancement**: `PATCH /tutor/sessions/:id/reschedule` now accepts both `scheduledAt` and `durationMinutes`

### Security Considerations:
- The `createdBy` field on Session model is critical for distinguishing tutor-created vs admin-created sessions
- Approved grades are immutable by design to maintain audit trail and prevent grade tampering
- Zoom meeting cancellation on session delete prevents orphaned live meetings

---

## 14. File Storage and Profile Pictures (2026-09-30)

**Implementation Notice**: As of 2026-09-30, all file storage uses Cloudinary cloud storage instead of local filesystem. This includes profile pictures, assignment attachments, grade attachments, and student submissions.

### Cloudinary Integration:
- **Storage Provider**: Cloudinary (configured via `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`)
- **File Types**: Images (JPEG, PNG, GIF, WebP) and PDFs only
- **Size Limits**: 
  - Profile pictures: 5MB
  - Attachments (assignments, grades, submissions): 10MB
- **Validation**: Client-side and server-side validation of file type and size before upload
- **Folder Structure**: Organized by type (profile-pictures, assignments, assignment-submissions, assignment-feedback, grades)

### Profile Pictures:
- **All Roles**: Every role (Parent, Tutor, Admin, Student) can upload, change, and remove their profile picture
- **Endpoints**:
  - `PATCH /auth/me/profile-picture` (multipart) → uploads to Cloudinary, stores URL
  - `DELETE /auth/me/profile-picture` → removes Cloudinary asset, clears field
- **Display**: Profile picture URL included in `GET /auth/me` and user info responses (tutor lists, student cards, etc.)
- **Default Avatars**: Frontend should display sensible defaults (initials on colored circle) when no picture is set

### Attachment Management:
- **Assignments**: Tutors can attach files when creating/editing assignments
- **Grades**: Tutors can attach files when submitting/editing grades
- **Submissions**: Students can attach files when submitting assignments
- **Cleanup**: When attachments are replaced or resources deleted, Cloudinary assets are deleted to prevent storage bloat

### Security Considerations:
- Files are validated for type and size before reaching Cloudinary (fail fast with clear errors)
- Only authenticated users can upload files (role-specific endpoints)
- Cloudinary URLs are public but unguessable (secure random public IDs)
- Profile picture URL is included in user responses - no sensitive data exposure

---

## 15. Rate Limiting Tiers

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

---

## 16. Messaging Graph Update (2026-10-12)

**Policy Change Notice**: As of 2026-10-12, Student ↔ Tutor messaging has been removed from the platform.

### Updated Messaging Rules:
- **Removed**: Students can no longer message their assigned tutors
- **Removed**: Tutors can no longer message their assigned students
- **Still Allowed**: Parent ↔ Admin (shared inbox)
- **Still Allowed**: Tutor ↔ Admin (shared inbox)
- **Allowed**: Admin ↔ Admin (admin-to-admin messaging)

### Rationale:
This change simplifies the communication model and ensures all student-tutor communication flows through parents for oversight and safety. Students and tutors should now communicate session details, assignments, and feedback through the parent or admin channels.

### RBAC Matrix Update:
The RBAC matrix entry for "Message their assigned tutor / assigned student" has been updated to ❌ for both Tutor and Student roles. The "Parent ↔ Child" messaging was never implemented and has been removed from documentation.

---

## 17. Per-Grade Subject Pricing (2026-10-12)

**Implementation Notice**: As of 2026-10-12, subjects support per-grade-band pricing instead of a single gradeBand field. The pricing model is now more granular and flexible.

### Schema Changes:
- **SubjectPrice model**: New table linking subjects to grade bands with specific prices (NGN and USD)
- **PriceChangeLog model**: Tracks all price changes for audit trail
- **Subject**: Deprecated `gradeBand` field (kept for migration compatibility), added `isActive` flag
- **PricingTier**: Legacy table retained for backward compatibility, marked as deprecated

### Pricing Resolution Order:
1. **Enrollment override** (`Enrollment.yearlyPriceNGN/USD`) - highest priority
2. **Subject price** for student's grade band - new standard
3. **Legacy tier** - fallback only if above don't exist (being phased out)
4. **Fail** - clear error if no pricing configured

### Security Rules:
- **Admin-only pricing management**: All subject/price endpoints require ADMIN role
- **Price lock at payment initiation**: `POST /payments/initiate` locks the price at initiation time
- **EXPIRED payment handling**: Earlier PENDING payments are marked EXPIRED when parent re-initiates
- **Price visibility**: Students and tutors never see prices (only PARENT and ADMIN)
- **Change notifications**: Parents receive PRICE_UPDATED notifications when prices change

### Public Subjects Endpoint (2026-10-15):
- **Endpoint**: `GET /subjects/public` - No authentication required
- **Purpose**: For marketing site and tutor application form
- **Returns**: Active subjects without pricing information
- **Security**: Publicly accessible, no sensitive data exposure

### Endpoints:
- `GET /admin/subjects` - All subjects with per-grade pricing and drift info
- `POST /admin/subjects` - Create subject with grade band prices
- `PUT /admin/subjects/:id/prices/:gradeBandTier` - Upsert price for specific band
- `PATCH /admin/subjects/:id` - Update subject metadata
- `DELETE /admin/subjects/:id` - Soft delete if enrollments exist, hard delete otherwise
- `GET /subjects?gradeBandTier=&category=` - Public subjects for parents/students (prices only for PARENT/ADMIN)
- `GET /pricing/quote?studentId=&subjectIds=` - Get pricing quote for enrollment wizard

---

## 18. Tutor Availability & Subject Linking (2026-10-12)

**Implementation Notice**: As of 2026-10-12, tutors can set availability status and are linked to subjects via structured relations instead of free text.

### Schema Changes:
- **TutorProfile**: Added `availabilityStatus` (AVAILABLE/LIMITED/UNAVAILABLE), `maxStudents`, `statusNote`, `statusUpdatedAt`
- **TutorSubject**: New relation table linking tutors to subjects (replaces free-text `subjects` array)
- **TutorAvailabilityStatus enum**: AVAILABLE, LIMITED, UNAVAILABLE

### Availability Management:
- **Tutors**: Can update their availability status via `PATCH /tutor-profile/availability-status`
- **UNAVAILABLE with active students**: Triggers TUTOR_UNAVAILABLE notification to admin
- **Capacity limits**: Admin can see tutor capacity in `GET /admin/tutors?hasCapacity=true`

### Subject Linking:
- **Migration**: Existing free-text subjects migrated to `TutorSubject` by name matching
- **Selection**: Tutors pick from `GET /subjects` instead of entering free text
- **Assignment**: Admin assigns tutors based on actual subject overlap via `TutorSubject`

### Suggested Tutors:
- **Endpoint**: `GET /admin/enrollments/:id/suggested-tutors` (ADMIN only)
- **Ranking criteria**:
  - Must teach the subject (via `TutorSubject`)
  - Must not be UNAVAILABLE
  - Has spare capacity (under `maxStudents`)
  - Availability overlap with enrollment's preferred window
  - Fewer current students preferred
- **Force assignment**: `PATCH /admin/enrollments/:id/assign-tutor` accepts `force: true` to override capacity/availability warnings

### Security Rules:
- **Tutor-only availability updates**: Only tutors can set their own availability status
- **Admin-only suggestion endpoint**: Only admins can see suggested tutors
- **Capacity enforcement**: Assignments blocked unless `force: true` is provided

### Admin Tutor Detail Expansion (2026-10-15):
- **Endpoint**: `GET /admin/tutors/:id` now returns comprehensive tutor data
- **Included data**:
  - User: id, firstName, lastName, middleName, fullName, email, phone, address, status, profilePictureUrl, timezone, createdAt, updatedAt
  - Application: status, birthDay, birthMonth, country, city, highestQualification, subjects[], levels[], yearsOfExperience, whyTeach, howHeard, aboutYou[], documents[] (with Cloudinary URLs), submittedAt, reviewedAt, reviewedBy, rejectionReason
  - Profile: bio, hourlyRate, availability (weekly), availabilityStatus, maxStudents, statusNote, statusUpdatedAt, currentStudentCount, vettingStatus, subjects[]
  - Metrics: studentsCount, sessionsCompleted, sessionsMissed, sessionsCancelled, avgStudentGradePercentage, avgStudentAttendanceRate, reportsSubmitted, assignmentsCreated
- **List enhancement**: `GET /admin/tutors` now includes applicationStatus filter and returns application data alongside profile data
- **Security**: All data respects admin role, no sensitive credential exposure

---

## 19. Admin Parent Directory (2026-10-12)

**Implementation Notice**: As of 2026-10-12, admins have a comprehensive parent directory view with pricing and enrollment details.

### Endpoints:
- `GET /admin/parents?search=&status=&page=&limit=` - Paginated parent list with search by name/email/phone
- `GET /admin/parents/:id` - Detailed parent profile with children, enrollments, effective pricing, payments, complaints

### Parent Profile Includes:
- **Children**: Student profiles with studentCode, grade, school
- **Enrollments**: All enrollments with subject, tutor, status, effective price (NGN and USD) with source
- **Recent payments**: Last 10 payments with student and subject details
- **Metrics**: Children count, active enrollments, pending payment count, total paid (NGN and USD), complaint count

### Pricing Visibility:
- **Effective price**: Shown with source (override or subject_price)
- **Override editing**: Via `PATCH /admin/enrollments/:id/pricing` with optional `note` field
- **Change logging**: All price changes logged to `PriceChangeLog`
- **Parent notifications**: Parents receive PRICE_UPDATED notifications on price changes

### Security Rules:
- **Admin-only**: All parent directory endpoints require ADMIN role
- **No parent contact exposure**: Student details never expose parent contact info
- **Ownership verification**: All parent operations verify the requesting user's role

---

## 20. Admin Transactions (2026-10-12)

**Implementation Notice**: As of 2026-10-12, admins have comprehensive transaction management and reporting.

### Endpoints:
- `GET /admin/payments?status=&currency=&provider=&parentId=&from=&to=&search=&page=&limit=` - Paginated payment list with filters
- `GET /admin/payments/:id` - Payment detail with timeline, enrollment info, NGN equivalent
- `GET /admin/payments/summary?from=&to=` - Revenue totals, counts by status, success rate, daily revenue chart

### Payment List Filters:
- **Status**: PENDING, SUCCESS, FAILED, REFUNDED, EXPIRED
- **Currency**: NGN, USD
- **Provider**: PAYSTACK
- **Parent**: Filter by specific parent
- **Date range**: from/to timestamps
- **Search**: Reference, parent name, or email

### Payment Details:
- **Timeline**: Initiated, Paid timestamps
- **Enrollment info**: Student, subject covered
- **Currency conversion**: NGN equivalent shown for USD payments
- **Amount locked**: Price locked at initiation, never changes retroactively

### Security Rules:
- **Admin-only**: All transaction endpoints require ADMIN role
- **No gateway secrets**: Never expose card or provider secrets in responses
- **EXPIRED handling**: Webhook confirmation of EXPIRED payments still activates enrollment but notifies admin for review

---

## 21. Security Audit Fixes (2026-10-12)

**Audit Notice**: Comprehensive security audit performed on 2026-10-12. The following critical issues were identified and fixed:

### Fixed Issues:

#### 1. Production Seeded Accounts (CRITICAL)
**Problem**: Demo credentials (admin@smarttutor.com, parent@smarttutor.com, tutor@smarttutor.com) were published in README and actually worked in production, allowing unauthorized access.

**Fix Applied**:
- Modified `prisma/seed.ts` to skip creation of parent/tutor/student demo accounts in production
- Production seed script now uses random passwords for any accounts created
- Admin credentials must be provided via `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD` environment variables
- Removed demo credentials section from README
- Seed script refuses to run in production without `FORCE_SEED=true`

**Evidence**:
- Production login test confirmed admin@smarttutor.com/admin123456! worked before fix
- Seed script now includes `NODE_ENV !== 'production'` checks before creating demo accounts

#### 2. README Inaccuracies
**Problem**: README incorrectly stated that OTP, Paystack, and email were "stubs" when they were fully implemented.

**Fix Applied**:
- Updated README to reflect actual implementation:
  - OTP: Real implementation with SHA-256 hashing, 15-minute expiry, rate limiting
  - Paystack: Real API integration with webhook signature verification
  - Email: Real implementation using Brevo API
- Removed all references to "stub" implementations
- Updated environment variable documentation to include all required variables
- Added production checklist section

#### 3. Pricing Fallback Removal
**Problem**: Legacy PricingTier fallback still existed in code paths, despite spec requiring removal.

**Fix Applied**:
- Removed `/admin/pricing-tiers` routes from `admin.routes.ts`
- Removed pricing tier controller methods from active use (kept for backward compatibility in service layer)
- Updated imports to remove unused schemas
- All pricing now uses SubjectPrice-based resolution with clear 409 errors when no price exists
- `SubjectsService.resolveEnrollmentPrice()` is the canonical pricing resolution method

**Evidence**:
- Payment flow uses `SubjectsService.resolveEnrollmentPrice()` which throws clear error if no SubjectPrice exists
- Legacy tier endpoints removed from routes, service methods deprecated with comments

#### 4. Environment Variable Documentation
**Problem**: README was missing critical environment variables (CLOUDINARY, ALLOWED_ORIGINS, FRONTEND_URL, etc.)

**Fix Applied**:
- Added complete environment variable documentation in README
- Included Cloudinary credentials for file storage
- Added ALLOWED_ORIGINS and FRONTEND_URL for CORS configuration
- Added ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD for production seeding
- Added placeholder values only (no real secrets)

### Ongoing Recommendations:

1. **Immediate Action Required**: Change or disable the demo accounts that exist in the production database. The seed script changes prevent future creation, but existing accounts may still be active.

2. **Paystack Webhook Testing**: Implement automated tests for webhook signature rejection with invalid signatures.

3. **Email Logging**: Set up Brevo send log monitoring to verify OTP delivery and redact OTP values from logs.

4. **Node Version**: Consider pinning Node.js version in production environment (already specified in package.json as >=18.0.0).

5. **Security.md Updates**: This section documents all security measures implemented. Keep it updated with any future changes.

6. **Dependency Vulnerabilities**: Run `npm audit` regularly to check for security vulnerabilities in dependencies. Address critical and high-severity issues promptly.

---

## 22. Build Error Fixes (2026-10-12)

**Audit Notice**: TypeScript build error fixed during Render deployment attempt.

### Fixed Issue:

**Problem**: Render build failed with TypeScript error in `src/modules/subjects/subjects.service.ts(199,7)`:
```
Type '{ subjectId: string; gradeBandTier: ...; updater: { connect: { id: string; }; } }' is not assignable to type ...
Types of property 'updater' are incompatible.
Type '{ connect: { id: string; }; }' is not assignable to type 'undefined'.
```

**Root Cause**: Incorrect Prisma relation syntax. The `SubjectPrice` model has `updatedBy` as a direct String field with a relation to User. The `updater` relation is read-only (defined by the relation), so it cannot be set directly in a create operation.

**Fix Applied**:
- Removed `updater: { connect: { id: adminId } }` from the `create` block in `subjects.service.ts` line 206-208
- Kept only `updatedBy: adminId` (line 205), which is the correct field to set
- Prisma automatically handles the `updater` relation based on the `updatedBy` foreign key

**Evidence**:
- Build now passes: `npm run build` completes successfully with exit code 0
- No TypeScript compilation errors
- Render deployment should succeed with this fix

---

## 23. Grade Normalization & Performance Overview (2026-10-14)

**Implementation Notice**: As of 2026-10-14, grades now support variable max scores for proper percentage calculation, and comprehensive performance overview endpoints have been added for all roles.

### Grade.maxScore Field:
- **New field**: `Grade.maxScore` (decimal, default 100) added to Grade model
- **Purpose**: Allows quiz grades and tutor-entered grades to have different point scales while still producing comparable percentages
- **Percentage calculation**: `percentage = (score / maxScore) * 100` computed on read, not stored
- **Quiz grades**: `maxScore` set to sum of quiz question base points
- **Migration**: Existing grades set to `maxScore = 100`

### Grade Visibility Rules:
- **APPROVED grades only**: Only grades with `status: APPROVED` count in any student- or parent-facing metric
- **Pending/Rejected grades**: Never appear in averages, summaries, or performance dashboards for students/parents
- **Admin visibility**: Admins can see all grades regardless of status via admin-only endpoints
- **No ranking/percentile**: No student comparison, ranking, or percentile features allowed anywhere in the platform

### Performance Overview Endpoints:
- **Student**: `GET /student/me/performance` - own performance only
- **Parent**: `GET /students/:id/performance` - must own the student
- **Tutor**: `GET /tutor/students/:studentId/performance` - assigned enrollments only, includes `pendingGradesCount`
- **Admin**: `GET /admin/students/:id/performance` - all enrollments, optional `includePending=true`

### Performance Data Includes:
- **Period filtering**: week, month, quarter, year, all (default month)
- **Average grade**: percentage, gradedCount, trend vs previous period
- **Grades by subject**: breakdown per subject with averages
- **Grade timeline**: time-bucketed averages (weekly for periods ≤ month, monthly for longer)
- **Attendance**: rate, attended/missed counts, trend, timeline
- **Assignments**: total, completed, pending, overdue, submittedLate, completionRate
- **Quizzes**: attempts, averagePercentage
- **Recent grades**: last 5 approved grades with subject and assignment title

### Timezone Handling:
- **Viewer timezone**: Uses `User.timezone` with fallback to `Africa/Lagos`
- **Bucket boundaries**: Computed in viewer's timezone for accurate reporting
- **Time-bucketing**: Uses parameterized SQL via `$queryRaw` for safe aggregation

### Security Rules:
- **Ownership enforcement**: Students can only see own performance, parents only own children, tutors only assigned students
- **Approved-only for students/parents**: Pending/rejected grades never affect student/parent metrics
- **Admin studentCode exclusion**: Admin responses explicitly exclude `studentCode` from all student data. Only parents receive student codes via email during enrollment. Admins must never see student codes to prevent credential exposure.

### Admin Student Detail Expansion (2026-10-15):
- **Endpoint**: `GET /admin/students/:id` now returns comprehensive student data
- **Included data**:
  - Student: id, fullName, dateOfBirth, gender, actualGrade, gradeLevel, gradeBandTier, school, notes, email, preferredStartDate, timezone, profilePictureUrl, createdAt, status
  - Parent: id, fullName, email, phone, profilePictureUrl
  - Tutors[]: each assigned tutor's full profile with subjects they teach this student
  - Enrollments[]: subject, status, tutor, session frequency, available days, preferred hours, billing frequency, effective price (NGN and USD) with source, payment status
  - Sessions[] (latest 20, upcoming first): status, meeting link, recording status and link, tutor notes, homework
  - Attendance: summary and recent records
  - Grades: summary plus recent grades, including PENDING and REJECTED (admin only), with percentage
  - Assignments: summary and recent items, with submission status
  - ProgressReports[]: latest
  - Performance: same object as GET /admin/students/:id/performance, default period=month, with ?period= supported
- **Paginated sub-resources**: `/enrollments`, `/sessions`, `/grades`, `/attendance`, `/assignments`, `/progress-reports`
- **Security**: All data respects admin role, studentCode explicitly excluded

---

## 25. Admin Student Code Exclusion (2026-10-15)

**Security Notice**: As of 2026-10-15, admin responses explicitly exclude `studentCode` from all student data for security reasons.

### Security Rationale:
- **Credential isolation**: Student codes are sensitive credentials used for student login
- **Admin role boundary**: Admins have broad access but should not have access to student login credentials
- **Parent-only distribution**: Student codes are only ever emailed to the linked parent during enrollment
- **Audit trail separation**: Student authentication remains separate from admin operations

### Implementation:
- **Admin service methods**: All admin service methods that return student data explicitly exclude `studentCode` in Prisma selects
- **Affected endpoints**:
  - `GET /admin/students` - Student list excludes studentCode
  - `GET /admin/students/:id` - Student detail excludes studentCode
  - `GET /admin/parents/:id` - Parent's children exclude studentCode
  - All other admin endpoints returning student data
- **Swagger schemas**: Admin response schemas do not include studentCode field
- **Code comments**: Explicit comments added to admin.service.ts: "Explicitly exclude studentCode - admins must never see student codes"

### Verification:
- **Security test**: `tests/security/admin-no-student-code.test.ts` verifies studentCode is not exposed in admin responses
- **Parent access**: Parents receive studentCode via email during enrollment and can regenerate via `POST /students/:id/regenerate-pin`
- **Admin regeneration**: Admins can regenerate student codes via `PATCH /admin/students/:id/regenerate-pin` but never see the existing code

---

## 24. Tutor Application System (2026-10-15)

**Implementation Notice**: As of 2026-10-15, tutors must complete a comprehensive application process before being approved to teach. This system includes document verification, restricted access for pending tutors, and admin review workflow.

### Tutor Registration Flow:
- **Initial registration**: Tutors register with firstName, lastName, middleName, email, phone, password, role, address
- **Status on verification**: After OTP verification, tutor status becomes `PENDING_VETTING`
- **Draft application**: Empty application draft is automatically created for the tutor to complete
- **Full name derivation**: `fullName` is derived from firstName/lastName/middleName if not provided

### Restricted Access for Pending Tutors:
- **PENDING_VETTING tutors** can only access:
  - `/auth/*` - Authentication endpoints
  - `/tutor-application/*` - Application completion endpoints
  - `/subjects/public` - Public subjects list
  - `/notifications` - Notification endpoints
- **All other tutor routes** return `403 Forbidden` with code `TUTOR_NOT_APPROVED`
- **REJECTED tutors** get `403 Forbidden` with code `APPLICATION_REJECTED`
- **Middleware**: `requireApprovedTutor` middleware enforces these restrictions on all tutor routes

### TutorApplication Model:
- **Status lifecycle**: DRAFT → SUBMITTED → APPROVED/REJECTED
- **Required fields for submission**:
  - birthDay, birthMonth (date of birth)
  - country, city (location)
  - highestQualification (education level)
  - subjects[] (subjects they want to teach)
  - levels[] (grade levels they can teach)
  - yearsOfExperience
  - whyTeach (motivation statement)
  - howHeard (how they heard about the platform)
  - aboutYou[] (up to 3 paragraphs about themselves)
  - documents[] (proof of qualifications)
- **Missing fields detection**: `GET /tutor-application` returns `missingFields[]` list for UI validation
- **Auto-save**: `PATCH /tutor-application` allows partial updates (autosave pattern)

### Document Upload Security:
- **Storage**: Cloudinary private/authenticated assets
- **Allowed types**: PDF, DOC, DOCX, JPG, PNG
- **Size limits**: Max 5 MB per document, max 5 documents total
- **Signed URLs**: Download URLs are short-lived (10 minutes expiry)
- **Deletion**: Deleting a document also deletes the Cloudinary asset
- **Rate limiting**: All tutor-application endpoints are Tier 2 rate limited (60 req/min)
- **Max documents**: Enforced at upload time (5 document limit)

### Application Endpoints (PENDING_VETTING only):
- `GET /tutor-application` - Get draft with missingFields[] list
- `PATCH /tutor-application` - Partial autosave, returns lastSavedAt
- `POST /tutor-application/documents` (multipart) - Upload document
- `DELETE /tutor-application/documents/:id` - Delete document
- `POST /tutor-application/submit` - Full validation, sets SUBMITTED, notifies admins, emails applicant

### Admin Review Workflow:
- **Approval queue**: `GET /admin/tutors?status=PENDING_VETTING&applicationStatus=SUBMITTED`
- **Vetting endpoint**: `PATCH /admin/tutors/:id/vetting {vettingStatus: APPROVED|REJECTED, reason?}`
- **Approval requirements**: Can only approve when application status is SUBMITTED
- **On approve**:
  - User.status = APPROVED
  - Create/update TutorProfile from application data
  - Copy subjects to TutorSubject relation
  - Email and notify tutor
- **On reject**:
  - User.status = REJECTED
  - Send rejection reason by email
  - Notify tutor
- **Reactivation**: Reactivating a suspended tutor returns to APPROVED (not ACTIVE)

### Security Rules:
- **Tutor-only application routes**: Only TUTOR role can access /tutor-application/* endpoints
- **Bypass middleware**: Application routes bypass requireApprovedTutor middleware (by design)
- **Admin-only review**: Only ADMIN role can approve/reject applications
- **Document validation**: Server-side validation of file type and size before Cloudinary upload
- **No credential exposure**: Application documents are stored as private Cloudinary assets with signed URLs
- **Email notifications**: All status changes trigger email notifications to the applicant

### RBAC Impact:
- **New row**: PENDING_VETTING tutors have restricted access to application completion only
- **Approval gating**: Tutor cannot access any tutoring features until application is APPROVED
- **Rejection blocking**: REJECTED tutors cannot create new applications (must contact support)
- **Null vs zero**: Returns `null` (not `0`) when no approved grades exist, with `gradedCount: 0`
- **Trend calculation**: `null` if no previous period data exists
- **Admin override**: Admins can include pending grades via `includePending=true` query param

---

## 24. Admin Payment Actions & Audit Logging (2026-10-14)

**Implementation Notice**: As of 2026-10-14, admins have safe, auditable payment management actions while maintaining payment immutability.

### Immutable Payment Records:
- **No generic PATCH**: `PATCH /admin/payments/:id` intentionally NOT implemented
- **Financial history**: Payment records (amount, status, reference) are immutable financial history
- **No client trust**: Never trust client-supplied payment status; always verify via provider API

### Safe Admin Actions:
- **Add note**: `PATCH /admin/payments/:id/note` with `{note}` - admin-only notes for internal tracking
- **Reverify**: `POST /admin/payments/:id/reverify` - calls Paystack verify API server-side for stuck PENDING payments
  - Only for payments stuck in PENDING where webhook never arrived
  - On confirmed success, activates enrollment(s) idempotently
  - Never trusts client-supplied status

### Audit Logging:
- **AdminActionLog model**: New table for tracking all admin actions
  - `id`, `adminId`, `action`, `targetType`, `targetId`, `details` (JSON), `createdAt`
  - Indexes on adminId, action, targetType+targetId, createdAt
- **Logged actions**: Payment note and reverify actions are logged
- **Purpose**: Audit trail for all admin actions on sensitive data

### Payment Schema Changes:
- **Payment.adminNote**: New field for admin-only notes
- **Payment immutability**: Core fields (amount, status, providerReference) remain immutable

### Security Rules:
- **Admin-only**: Both payment actions require ADMIN role
- **Provider verification**: Reverify always calls Paystack API server-side
- **Idempotency**: Reverify and webhook processing are idempotent
- **Audit trail**: All payment admin actions logged to AdminActionLog
- **No refunds**: Refund handling is separate work (not implemented here)


