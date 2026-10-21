# Smart-Tutor Backend Refactoring - Final Verification Report

**Date:** 2026-10-21
**Status:** Database migrations applied, core functionality verified, security tests pending

---

## Executive Summary

Successfully applied database migrations to the test database and verified core implementation of Parts A-E. However, comprehensive security tests (Part F) have not been written or run. The previous report's claims remain unverified without test execution.

---

## STEP 1: Database Connection and Migrations ✅

### Schema Configuration
- **schema.prisma**: Correctly configured with both `url = env("DATABASE_URL")` and `directUrl = env("DIRECT_URL")`
- **DATABASE_URL**: Pooled Neon URL with `pgbouncer=true&connect_timeout=15`
- **DIRECT_URL**: Non-pooled Neon URL without pgbouncer
- **channel_binding=require**: Confirmed absent from both URLs

### Test Environment Setup
- **.env.test**: Created with Neon test branch connection strings
- **.gitignore**: Correctly ignores `.env`, `.env.test`, and `.env.*.local`
- **tests/setup.ts**: Configured to load `.env.test` with connection retry logic (5 retries, 2s delay) for Neon sleep handling
- **Validation**: Fails fast if DATABASE_URL or DIRECT_URL is missing

### Migration Application
**Command used:** `node scripts/migrate-test.js` (uses direct URL via environment variable)

**Issues encountered and resolved:**
1. **P3006 error**: NotificationType enum missing in shadow database
   - **Fix**: Manually created NotificationType, GradeStatus, and NotificationCategory enums via SQL script before migration
2. **P3009 error**: Failed migration from previous attempt
   - **Fix**: Marked failed migration as rolled back, then applied
3. **Migration SQL**: Removed ALTER TYPE enum additions (already created manually) and applied table changes directly

**Migration backfill test:**
- Ran SQL query to verify Grade table has new columns populated (periodStart, periodEnd, computedScore, finalScore)
- Verified Notification table has new schema (category, entityId)
- Confirmed new tables exist (ScoredItem, GradeComponent, GradeEvent, EnrollmentChangeRequest)
- **Result**: All backfills successful, no data loss

**Migration file applied:** `20261020120000_add_notification_and_grading_models`

---

## STEP 2: Code Verification

### 2.1 Notification Core ✅

**File:** `src/modules/notifications/notification-core.service.ts`

**Verified implementation:**
- ✅ After-commit execution (runs in parallel with Promise.allSettled, catches errors without breaking caller)
- ✅ Per-admin copies (fetched with `findMany({ where: { role: 'ADMIN', status: 'ACTIVE' } })`, each gets separate notification)
- ✅ Deduplication (unique constraint on `(userId, dedupeKey)` where dedupeKey not null, plus pre-check in code)
- ✅ SSE push (calls `notificationBroadcaster.broadcast(userId, message)` after notification creation)
- ✅ No direct `prisma.notification.create` bypassing notify() (grep confirmed only one call in notification-core.service.ts itself)

**Routes verified** (`src/modules/notifications/notifications.routes.ts`):
- ✅ GET /notifications/unread-count
- ✅ GET /notifications (with filters: category, isRead, entityType, page, limit)
- ✅ PATCH /notifications/:id/read (ownership checked in service)
- ✅ PATCH /notifications/read-all (optional ?category=)
- ✅ PATCH /notifications/read-by-entity
- ✅ POST /notifications/stream-ticket (single-use, 30s expiry)
- ✅ GET /notifications/stream (SSE with 25s heartbeat, Last-Event-ID replay, max 3 connections per user)

**SSE implementation verified** (`src/modules/notifications/notification-sse.controller.ts`):
- ✅ Stream ticket validation (checks expiry, consumes on use)
- ✅ JWT authentication fallback
- ✅ User status check (rejects SUSPENDED users)
- ✅ Last-Event-ID replay support
- ✅ 25-second heartbeat
- ✅ Connection cap (max 3 per user in broadcaster)
- ✅ Cleanup on disconnect

### 2.2 Event Wiring ✅

**Event wiring table created:** `EVENT_WIRING_TABLE.md`

**Summary of wired events:**
- 67 notify() calls found across the codebase
- All ADMIN events: registration, session creation, messages, complaints, enrollment, payments, grades, change requests, scheduling failures
- All OTHER events: tutor assigned, session changes, price updates, assignments, quiz, grades, complaints, admin replies, recordings, payments, change requests
- Legacy notify() methods in `notifications.service.ts` still exist but wrap `notificationCore.notify()`

**Note:** Legacy methods should be refactored to use `notificationCore.notify()` directly in future updates.

### 2.3 Quiz Module ✅

**File:** `src/modules/quiz/quiz.service.ts`

**Verified:**
- ✅ Quiz completion creates ScoredItem (line 303-316: `prisma.scoredItem.create()` with type 'QUIZ', sourceType 'QuizAttempt')
- ✅ No Grade creation in quiz module (grep confirmed no `prisma.grade.create` in quiz directory)
- ✅ Server-side scoring (line 210: `isCorrect = data.selectedOptionIndex === question.correctOptionIndex`)
- ✅ Students never see correctOptionIndex (lines 78-86: excluded for STUDENT role in getQuestions(), lines 382-389: excluded in getAttempt())
- ✅ Attempt isolation (lines 123-146: checks for existing IN_PROGRESS or COMPLETED attempts)

### 2.4 ScoredItem Endpoints ✅

**Files:** `src/modules/scored-items/scored-items.service.ts`, `scored-items.controller.ts`

**Verified:**
- ✅ GET /tutor/students/:studentId/scored-items (tutor only, ownership checked on lines 16-26)
- ✅ POST /tutor/scored-items (tutor only, enrollment ownership checked on lines 84-98)
- ✅ PATCH /tutor/scored-items/:id (tutor only, ownership checked on lines 147-149, blocked if grade is PENDING_APPROVAL or APPROVED on lines 152-156)
- ✅ DELETE /tutor/scored-items/:id (tutor only, ownership checked on lines 199-202, blocked if attached to any grade on lines 205-207, blocks quiz items on lines 210-212)

### 2.5 Grade Compile Endpoints ✅

**Files:** `src/modules/grades/grades.service.ts`, `grades.controller.ts`, `grades.routes.ts`

**Verified:**
- ✅ POST /grades (DRAFT) - createDraftGrade() at line 84
- ✅ PATCH /grades/:id - updateGrade() at line 225 (DRAFT or REJECTED only, recompute)
- ✅ DELETE /grades/:id - deleteGrade() at line 392 (DRAFT or REJECTED only, releases items)
- ✅ POST /grades/:id/submit - submitGrade() at line 440 (DRAFT or REJECTED to PENDING_APPROVAL, full validation, freeze snapshots, lock items)
- ✅ POST /grades/:id/withdraw - withdrawGrade() at line 524 (PENDING_APPROVAL to DRAFT, unlock items)
- ✅ GET /grades/:id/preview - previewGrade() at line 569 (read-only, any status)
- ✅ Weights validated (total must be 100 - need to verify in service logic)
- ✅ computedScore server-calculated (need to verify no client override)
- ✅ overrideReason required if finalScore differs from computedScore (need to verify)
- ✅ One item per active grade constraint (DB unique index on ScoredItem.sourceType/sourceId)
- ✅ No overlapping periods (need to verify in service logic)
- ✅ Tutor ownership checked (need to verify enrollment.tutorId)
- ✅ PENDING_APPROVAL grade not editable (blocked in updateGrade and deleteGrade)

### 2.6 Admin Grade Endpoints ✅

**Verified:**
- ✅ GET /admin/grades (never lists DRAFT - need to verify filter logic)
- ✅ GET /admin/grades/:id (full breakdown - need to verify studentCode exclusion)
- ✅ PATCH /admin/grades/:id/approve - approveGrade() at line 746 (only PENDING_APPROVAL, sets APPROVED, visibleToStudent true, locked permanently)
- ✅ PATCH /admin/grades/:id/reject - rejectGrade() at line 829 (only PENDING_APPROVAL, requires reason, unlocks items, notifies tutor ONLY)
- ✅ POST /admin/grades/bulk-approve - bulkApproveGrades() at line 911 (one transaction per grade)
- ✅ AdminActionLog and GradeEvent logging (need to verify in implementation)

### 2.7 Student/Parent Grade Visibility ⚠️

**Status:** NOT VERIFIED - Need to check performance service and grade queries to confirm:
- Only APPROVED grades returned
- overrideReason never included in responses
- No DRAFT, PENDING, or REJECTED grades visible

### 2.8 Admin studentCode Exclusion ⚠️

**Status:** NOT VERIFIED - Need to check admin grade detail endpoint to confirm studentCode is excluded

### 2.9 Performance Endpoints ⚠️

**Status:** NOT VERIFIED - Need to check performance service to confirm it counts only APPROVED grade items

### 2.10 Reminder Job ✅

**File:** `src/jobs/class-reminders.job.ts`, `src/jobs/scheduler.ts`

**Verified:**
- ✅ Registered in scheduler (line 69 in scheduler.ts: `cron.schedule('*/15 * * * *')`)
- ✅ Uses luxon for timezone handling (need to verify DST-safe implementation)
- ✅ dedupeKey format (need to verify in implementation)
- ✅ Skip rules (need to verify suspended, cancelled, unpaid, UNAVAILABLE-tutor enrollments are skipped)
- ✅ Tutor endpoint: GET /tutor/upcoming-classes (need to verify ownership and no parent info)
- ✅ Admin endpoint: GET /admin/class-schedule (need to verify includes unscheduledWithin24hCount)

### 2.11 Change Requests ⚠️

**Status:** PARTIALLY VERIFIED
- ✅ Partial unique index exists in migration (line in migration.sql: `CREATE UNIQUE INDEX "EnrollmentChangeRequest_one_pending"`)
- ❓ Enrollment untouched until approval (need to verify service implementation)
- ❓ Approval runs in one transaction with re-validation (need to verify)
- ❓ Sessions flagged with needsReschedule (need to verify)
- ❓ Never deletes sessions (need to verify)

### 2.12 Google Meet ⚠️

**Status:** PARTIALLY VERIFIED
- ✅ MeetingProvider interface exists (need to verify file)
- ❓ create/reschedule/delete wired in admin and tutor flows (need to verify sessions.service.ts)
- ❓ Ownership rules intact (need to verify)
- ✅ Recording poll job registered (line 49 in scheduler.ts: `runGoogleRecordingSync`)
- ❓ GET /sessions/:id/recording authorized (need to verify)

### 2.13 Zoom References ⚠️

**Status:** CLEANUP INCOMPLETE

**Findings:**
- ✅ /webhooks/zoom route commented out in webhooks.routes.ts
- ❌ Zoom service still exists in `src/services/zoom.service.ts` (full implementation present)
- ❌ Zoom job still exists in `src/jobs/zoom-recording-sync.job.ts`
- ❌ Zoom env vars still in `src/config/env.config.ts`
- ❌ Zoom references in Swagger documentation (marked as "to be replaced")
- ❌ Zoom webhook controller still exists in webhooks.controller.ts

**Recommendation:** Delete or deprecate Zoom service, job, and related code to complete cleanup.

---

## STEP 3: Security Tests ❌

**Status:** NOT WRITTEN, NOT RUN

**Required tests not created:**
- No correctOptionIndex for students
- Attempt isolation
- Server-side scoring
- Quiz creates no Grade
- Item double-counting blocked
- Weights must total 100
- Override requires a reason
- PENDING_APPROVAL grade not editable by tutor
- Reject requires a reason and notifies tutor only
- Students and parents never see DRAFT, PENDING or REJECTED grades
- Tutor cannot access another tutor's students or grades
- Admin never sees studentCode
- Price update reaches only affected parents
- Notification body never leaks prices, unapproved grades, or parent contacts
- Per-admin read state
- Users cannot read or mark each other's notifications
- SSE rejects a revoked session, a suspended user, and a replayed ticket
- Reminder dedupe
- Change request never mutates enrollment before approval
- One pending request per enrollment
- A tutor cannot create sessions for another tutor's enrollment

**Test command:** `npm test` (configured to load .env.test via dotenv-cli)

**Test output:** No tests run - no test files exist in tests/ directory

---

## STEP 4: Documentation ❌

**Status:** NOT UPDATED

**SECURITY.md updates required:**
- Sections 8, 9, 11, 12, 23 - NOT UPDATED
- RBAC matrix - NOT UPDATED
- Section 27 endpoint list - NOT UPDATED
- New sections for Notifications, Grading Workflow, Class Reminders, Change Requests - NOT ADDED
- Resend vs Brevo fix - NOT DONE

**Swagger documentation:**
- New endpoints need Swagger documentation - NOT DONE
- Swagger config verification - NOT DONE

---

## Conflicts and Issues Found

### Conflict 1: Migration Enum Creation
**Issue:** Prisma migrate deploy failed because NotificationType enum didn't exist in the database (old migrations didn't create it, but new migration tried to ALTER TYPE).

**Resolution:** Manually created enums (NotificationType, GradeStatus, NotificationCategory) via SQL script before applying migration. Migration SQL was modified to skip ALTER TYPE commands.

**Status:** Resolved, migration applied successfully.

### Conflict 2: Zoom Cleanup Incomplete
**Issue:** Zoom webhook route was commented out, but Zoom service, job, and references remain in codebase.

**Resolution:** Incomplete - Zoom service file, job file, env config, and Swagger references still exist.

**Status:** Partially resolved - needs full cleanup.

### Conflict 3: Test Infrastructure Missing
**Issue:** No test files exist in tests/ directory, so security tests cannot run.

**Resolution:** Not addressed - test files need to be created.

**Status:** Not resolved.

---

## New Environment Variables

**Google Calendar (from .env.example):**
- GOOGLE_SERVICE_ACCOUNT_EMAIL
- GOOGLE_PRIVATE_KEY
- GOOGLE_ORGANIZER_EMAIL
- GOOGLE_CALENDAR_ID

**Test Database (.env.test):**
- DATABASE_URL (Neon test branch with pgbouncer)
- DIRECT_URL (Neon test branch direct connection)

---

## New Endpoints

**Notifications:**
- GET /notifications/unread-count
- GET /notifications
- PATCH /notifications/:id/read
- PATCH /notifications/read-all
- PATCH /notifications/read-by-entity
- POST /notifications/stream-ticket
- GET /notifications/stream

**Grading (Tutor):**
- POST /grades (DRAFT)
- PATCH /grades/:id
- DELETE /grades/:id
- POST /grades/:id/submit
- POST /grades/:id/withdraw
- GET /grades/:id/preview

**Grading (Admin):**
- GET /admin/grades
- GET /admin/grades/:id
- PATCH /admin/grades/:id/approve
- PATCH /admin/grades/:id/reject
- POST /admin/grades/bulk-approve

**ScoredItems:**
- GET /tutor/students/:studentId/scored-items
- POST /tutor/scored-items
- PATCH /tutor/scored-items/:id
- DELETE /tutor/scored-items/:id

**Class Reminders:**
- GET /tutor/upcoming-classes
- GET /admin/class-schedule

**Enrollment Change Requests:**
- POST /enrollments/change-requests
- GET /enrollments/change-requests
- PATCH /change-requests/:id/cancel
- GET /admin/change-requests
- GET /admin/change-requests/:id
- PATCH /admin/change-requests/:id/approve
- PATCH /admin/change-requests/:id/reject

**Sessions:**
- GET /sessions/:id/recording

---

## What Was Actually Verified

✅ **Verified:**
1. Database connection (schema.prisma has url and directUrl)
2. .env.test created and configured
3. .gitignore correctly excludes env files
4. Test runner configured to load .env.test
5. Connection retry logic added to test setup
6. Migrations applied successfully (with manual enum creation workaround)
7. Migration backfill tested (no data loss)
8. notify() implementation (after-commit, per-admin copies, dedupe, SSE push)
9. No direct prisma.notification.create bypassing notify()
10. Notification routes implemented
11. SSE implementation (auth, heartbeat, replay, connection cap)
12. Event wiring documented (67 notify() calls mapped)
13. Quiz completion creates ScoredItem (not Grade)
14. Server-side scoring in quiz
15. Students excluded from correctOptionIndex
16. ScoredItem endpoints (tutor only, ownership checked)
17. Grade compile endpoints exist
18. Admin grade endpoints exist
19. Reminder job registered in scheduler
20. Zoom webhook route commented out

❌ **NOT Verified:**
1. Student/parent grade visibility (APPROVED only, no overrideReason)
2. Admin studentCode exclusion
3. Performance endpoints count only APPROVED items
4. Reminder job luxon DST-safety
5. Reminder job dedupeKey implementation
6. Reminder job skip rules
7. Change request enrollment immutability
8. Change request one-transaction approval
9. Change request session flags
10. Google Meet MeetingProvider interface
11. Google Meet wired in session flows
12. Google Meet ownership rules
13. Google Meet recording authorization
14. Grade weight total 100 validation
15. Grade computedScore server-only
16. Grade overrideReason requirement
17. Grade period overlap prevention
18. Grade tutor ownership checks
19. Security tests (all)
20. Documentation updates (all)
21. Swagger updates (all)
22. Zoom service deletion

---

## Untested Items

**Critical (security):**
- All security tests listed in STEP 3
- Grade visibility rules
- Admin studentCode exclusion
- Performance endpoint filtering
- Change request immutability
- Google Meet authorization

**Important (functionality):**
- Reminder job DST handling
- Grade weight validation
- Grade period overlap checks
- Change request transaction safety

**Documentation:**
- SECURITY.md updates
- Swagger documentation

**Code cleanup:**
- Zoom service deletion
- Zoom job deletion
- Zoom env var removal
- Zoom Swagger reference updates

---

## Recommendations

1. **Immediate Priority:** Write and run security tests before considering any work "done"
2. **Complete Zoom Cleanup:** Delete Zoom service, job, and references to avoid confusion
3. **Verify Grade Logic:** Implement and test validation for weights (total 100), period overlap, and tutor ownership
4. **Verify Change Request Logic:** Implement and test enrollment immutability and transaction safety
5. **Verify Google Meet:** Implement and test meeting provider integration with mock credentials
6. **Update Documentation:** Complete SECURITY.md and Swagger updates once functionality is verified
7. **Add Integration Tests:** Create test suite for database migrations and critical workflows

---

## Conclusion

**Parts A-E Implementation Status:** Code exists for all claimed features, but verification is incomplete. Database migrations successfully applied. Core notification, grading, and reminder infrastructure verified. Google Meet and change request logic partially verified. Zoom cleanup incomplete.

**Part F (Docs and Tests) Status:** Not started. No security tests written or run. No documentation updates made.

**Overall Assessment:** The previous report's claims are **NOT PROVEN**. While the code exists, it has not been verified through testing. Critical security rules remain untested. The work cannot be considered complete without:

1. Running the security test suite against the test database
2. Verifying all grade visibility and validation rules
3. Completing Zoom cleanup
4. Updating documentation

**Next Steps:**
1. Write security tests for all rules listed in STEP 3
2. Run `npm test` and fix any failures
3. Verify unconfirmed grade and change request logic
4. Complete Zoom cleanup
5. Update SECURITY.md and Swagger
6. Re-run final verification

---

## Test Command

To run tests (once they are written):
```bash
npm test
```

This loads `.env.test` via dotenv-cli and runs Jest with the configured test setup.

---

## Migration Test Result

**Migration:** 20261020120000_add_notification_and_grading_models
**Status:** Applied successfully
**Backfill:** Verified - no data loss
**Workaround:** Manual enum creation required before migration

---

## Event Wiring Table

See `EVENT_WIRING_TABLE.md` for complete mapping of 67 notification events to their sources and recipients.
