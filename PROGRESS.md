# Smart-Tutor Backend Refactoring Progress

**Started:** 2026-10-20

## Schema/Migration Fixes
- [x] Fix EnrollmentChangeRequest unique constraint
- [x] Delete migration_lock.toml from migration folder
- [x] Rename migration folder to 14-digit timestamp
- [x] Add ScoredItem database constraint for one active grade
- [x] Add Notification unique (userId, dedupeKey) where dedupeKey not null
- [x] Verify migration SQL is safe for existing data

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
- [ ] Implement Grade compile service
- [ ] POST /grades (DRAFT)
- [ ] PATCH /grades/:id
- [ ] DELETE /grades/:id
- [ ] POST /grades/:id/submit
- [ ] POST /grades/:id/withdraw
- [ ] GET /grades/:id/preview
- [ ] Implement Admin review
- [ ] GET /admin/grades
- [ ] GET /admin/grades/:id
- [ ] PATCH /admin/grades/:id/approve
- [ ] PATCH /admin/grades/:id/reject
- [ ] POST /admin/grades/bulk-approve
- [ ] Update performance endpoints for APPROVED grades only
- [ ] Run build and tests

## SECTION 3: Class Reminders
- [ ] Implement 15-minute reminder job
- [ ] GET /tutor/upcoming-classes
- [ ] GET /admin/class-schedule
- [ ] Run build and tests

## SECTION 4: Enrollment Change Requests
- [ ] POST /enrollments/:id/change-requests
- [ ] GET /enrollments/:id/change-requests
- [ ] PATCH /change-requests/:id/cancel
- [ ] GET /admin/change-requests
- [ ] GET /admin/change-requests/:id
- [ ] PATCH /admin/change-requests/:id/approve
- [ ] PATCH /admin/change-requests/:id/reject
- [ ] Run build and tests

## SECTION 5: Google Meet
- [ ] Create MeetingProvider interface
- [ ] Implement Google Calendar service
- [ ] Update Session creation to use Google Meet
- [ ] Update Session reschedule to update Google Meet
- [ ] Update Session deletion to remove Google Meet
- [ ] Implement hourly recording poll job
- [ ] GET /sessions/:id/recording
- [ ] Remove /webhooks/zoom
- [ ] Remove ZOOM_* usage from active code
- [ ] Remove Zoom jobs from active code
- [ ] Run build and tests

## SECTION 6: Docs and Tests
- [ ] Update SECURITY.md sections 8, 9, 11, 12, 23
- [ ] Update RBAC matrix in SECURITY.md
- [ ] Update section 27 endpoint list
- [ ] Add new sections for Notifications, Grading Workflow, Class Reminders, Change Requests
- [ ] Fix Resend vs Brevo documentation
- [ ] Update Swagger for all new endpoints
- [ ] Write security tests (answer leak, attempt isolation, server-side scoring, quiz creates no Grade, double-counting, weights total 100, override requires reason, PENDING_APPROVAL not editable, reject requires reason, visibility rules, tutor ownership, admin studentCode exclusion, notification recipient correctness, per-admin read state, SSE auth, reminder dedupe, change request immutability, one pending request)
- [ ] Run build and tests

## Final Report
- [ ] Update PROGRESS.md
- [ ] Write final report
