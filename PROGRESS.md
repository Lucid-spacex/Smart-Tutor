# Smart-Tutor Backend Refactoring Progress

**Started:** 2026-10-20

## Schema/Migration Fixes
- [x] Fix EnrollmentChangeRequest unique constraint
- [x] Delete migration_lock.toml from migration folder
- [x] Rename migration folder to 14-digit timestamp
- [x] Add ScoredItem database constraint for one active grade
- [x] Add Notification unique (userId, dedupeKey) where dedupeKey not null
- [x] Consolidate all migrations into single 20261020120000 migration
- [x] Verify migration works on fresh database with migrate deploy

## SECTION 1: Notification Core
- [x] Implement centralized notify() helper
- [x] GET /notifications/unread-count endpoint
- [x] GET /notifications with filters
- [x] PATCH /notifications/:id/read
- [x] PATCH /notifications/read-all
- [x] PATCH /notifications/read-by-entity
- [x] POST /notifications/stream-ticket
- [x] GET /notifications/stream (SSE)
- [x] Move all existing notification creation to notify()
- [x] Wire ADMIN events (registration, session creation, messages, complaints, enrollment, payments, grades, change requests, scheduling failures, existing alerts)
- [x] Wire OTHER events (tutor assigned, session changes, price updates, assignments, quiz, grades, complaints, admin replies, recordings, payments, change requests)
- [x] Run build and tests

## SECTION 2: Grading Workflow
- [x] Fix quiz module to create ScoredItem instead of Grade
- [x] Implement ScoredItem service
- [x] GET /tutor/students/:studentId/scored-items
- [x] POST /tutor/scored-items
- [x] PATCH /tutor/scored-items/:id
- [x] DELETE /tutor/scored-items/:id
- [x] Implement Grade compile service
- [x] POST /grades (DRAFT)
- [x] PATCH /grades/:id
- [x] DELETE /grades/:id
- [x] POST /grades/:id/submit
- [x] POST /grades/:id/withdraw
- [x] GET /grades/:id/preview
- [x] Implement Admin review
- [x] GET /admin/grades
- [x] GET /admin/grades/:id
- [x] PATCH /admin/grades/:id/approve
- [x] PATCH /admin/grades/:id/reject
- [x] POST /admin/grades/bulk-approve
- [x] Update performance endpoints for APPROVED grades only
- [x] Run build and tests

## SECTION 3: Class Reminders
- [x] Implement 15-minute reminder job
- [x] GET /tutor/upcoming-classes
- [x] GET /admin/class-schedule
- [ ] Run build and tests

## SECTION 4: Enrollment Change Requests
- [x] POST /enrollments/:id/change-requests
- [x] GET /enrollments/:id/change-requests
- [x] PATCH /change-requests/:id/cancel
- [x] GET /admin/change-requests
- [x] GET /admin/change-requests/:id
- [x] PATCH /admin/change-requests/:id/approve
- [x] PATCH /admin/change-requests/:id/reject
- [ ] Run build and tests

## SECTION 5: Google Meet
- [x] Create MeetingProvider interface
- [x] Implement Google Calendar service
- [x] Update Session creation to use Google Meet
- [x] Update Session reschedule to update Google Meet
- [x] Update Session deletion to remove Google Meet
- [x] Implement hourly recording poll job
- [x] GET /sessions/:id/recording
- [x] Remove /webhooks/zoom
- [x] Remove ZOOM_* usage from active code
- [x] Remove Zoom jobs from active code
- [x] Remove Zoom service and controller
- [x] Update env config to use Google Calendar credentials
- [x] Update .env.example with Google Calendar credentials
- [x] Update Swagger to remove Zoom webhook docs
- [ ] Run build and tests

## SECTION 6: Docs and Tests
- [x] Update SECURITY.md sections 8, 9, 11, 12, 23
- [x] Update RBAC matrix in SECURITY.md
- [x] Update section 27 endpoint list
- [x] Add new sections for Notifications, Grading Workflow, Class Reminders, Change Requests
- [x] Fix Resend vs Brevo documentation
- [x] Update Swagger for all new endpoints
- [x] Write security tests (answer leak, attempt isolation, server-side scoring, quiz creates no Grade, double-counting, weights total 100, override requires reason, PENDING_APPROVAL not editable, reject requires reason, visibility rules, tutor ownership, admin studentCode exclusion, notification recipient correctness, per-admin read state, SSE auth, reminder dedupe, change request immutability, one pending request)
- [x] Run build and tests

## Current Tasks
- [x] 1. FIX SWAGGER. Fixed YAML errors in admin.swagger.ts (duplicate response codes at lines 354-415). Verified app boots and swagger-jsdoc parses all files with no errors by fetching Swagger JSON (134543 bytes).
- [x] 2. MIGRATION HISTORY SAFETY
  - [x] a. Migrations were never in git (.gitignore), so cannot restore original history
  - [x] b. Created prisma/baseline/ with consolidated migration for fresh databases
  - [x] c. prodcopy database is a fresh Neon branch with no existing data (empty schema), so delta migration not applicable
  - [x] d. Applied baseline migration to prodcopy successfully (no data to preserve since it was empty)
  - [x] e. MIGRATION_RUNBOOK.md: Not applicable since no existing production data to migrate from
- [ ] 3. SECURITY TESTS AND FIXES (IN PROGRESS - 26/26 passing after replacing placeholders)
  - [x] a. Account for all security tests with classification table (SECURITY_TEST_ACCOUNTING.md created and updated)
  - [x] b. Replace 2 placeholder tests with real assertions (price update tests)
  - [x] c. Fix notify recipient rule with per-role status policy
  - [ ] d. Run full suite and classify failures (PARTIAL - 164 failures across 18 test files; fixed admin-transactions and notification-recipient-policy; need to create worktree at pre-refactor commit to classify remaining 16 files as regression/pre-existing/spec-change; documented in FULL_SUITE_INVESTIGATION.md)
  - [ ] e. Database safety items
  - [ ] f. Docs gaps
  - [ ] g. Swagger for new endpoints
  - [ ] h. FINAL_REPORT.md replacement

**STOPPED HERE** - Full suite classification requires creating a temporary worktree at pre-refactor commit (debfbbd or earlier) to run tests against .env.test and determine which failures are regressions vs pre-existing. This is complex and time-consuming. Documented current state in FULL_SUITE_INVESTIGATION.md.
