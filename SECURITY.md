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
| File a complaint | ✅ | ❌ | — | ❌ |
| Resolve a complaint | ❌ | ❌ | ✅ | ❌ |
| Regenerate a student's password | ✅ (own child) | ❌ | ✅ (support) | ❌ |
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
  - `Parent <-> Child` (parent-child relationship verification)
- **Strictly Blocked**:
  - `Student <-> Tutor` (403 Forbidden - removed 2026-10-12)
  - `Student <-> Admin` (403 Forbidden)
  - `Student <-> Parent` (403 Forbidden - handled outside platform)
  - `Parent <-> Tutor` (403 Forbidden in both directions - must route through Admin)
  - `Student <-> Unassigned Tutor` (403 Forbidden)

**Shared Admin Inbox (2026-09-30)**:
- Parents and tutors message "Admin" as a shared team inbox, not individual admins
- `GET /messages/admin-contact` returns any active admin's ID for starting new threads
- Admins see all threads with parents and tutors in their thread list, regardless of which specific admin was the original recipient
- Any admin can reply to any parent/tutor thread (shared reply rights)
- This provides a unified "Admin" conversation experience for parents and tutors

**Note (2026-10-12)**: Students no longer have any messaging capability in the platform. Their sole prior messaging contact (their assigned tutor) has been removed.

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

---

## 15. Messaging Graph Update (2026-10-12)

**Policy Change Notice**: As of 2026-10-12, Student ↔ Tutor messaging has been removed from the platform.

### Updated Messaging Rules:
- **Removed**: Students can no longer message their assigned tutors
- **Removed**: Tutors can no longer message their assigned students
- **Still Allowed**: Parent ↔ Admin (shared inbox)
- **Still Allowed**: Tutor ↔ Admin (shared inbox)
- **Still Allowed**: Parent ↔ Child (parent-child relationship)

### Rationale:
This change simplifies the communication model and ensures all student-tutor communication flows through parents for oversight and safety. Students and tutors should now communicate session details, assignments, and feedback through the parent or admin channels.

### RBAC Matrix Update:
The RBAC matrix entry for "Message their assigned tutor / assigned student" has been updated to ❌ for both Tutor and Student roles.

---

## 16. Per-Grade Subject Pricing (2026-10-12)

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

### Endpoints:
- `GET /admin/subjects` - All subjects with per-grade pricing and drift info
- `POST /admin/subjects` - Create subject with grade band prices
- `PUT /admin/subjects/:id/prices/:gradeBandTier` - Upsert price for specific band
- `PATCH /admin/subjects/:id` - Update subject metadata
- `DELETE /admin/subjects/:id` - Soft delete if enrollments exist, hard delete otherwise
- `GET /subjects?gradeBandTier=&category=` - Public subjects for parents/students (prices only for PARENT/ADMIN)
- `GET /pricing/quote?studentId=&subjectIds=` - Get pricing quote for enrollment wizard

---

## 17. Tutor Availability & Subject Linking (2026-10-12)

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

---

## 18. Admin Parent Directory (2026-10-12)

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

## 19. Admin Transactions (2026-10-12)

**Implementation Notice**: As of 2026-10-12, admins have comprehensive transaction management and reporting.

### Endpoints:
- `GET /admin/payments?status=&currency=&provider=&parentId=&from=&to=&search=&page=&limit=` - Paginated payment list with filters
- `GET /admin/payments/:id` - Payment detail with timeline, enrollment info, NGN equivalent
- `GET /admin/payments/summary?from=&to=` - Revenue totals, counts by status, success rate, daily revenue chart

### Payment List Filters:
- **Status**: PENDING, SUCCESS, FAILED, REFUNDED, EXPIRED
- **Currency**: NGN, USD
- **Provider**: PAYSTACK, STRIPE
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

## 20. Security Audit Fixes (2026-10-12)

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

## 21. Build Error Fixes (2026-10-12)

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

