# Smart-Tutor Security Test Final Report

**Date:** 2026-10-21
**Test Suite:** Part F Security Tests (`tests/security/part-f-security.test.ts`)

## Test Results

### Security Test Execution
- **Command:** `npm test -- security.test`
- **Total Tests:** 26
- **Passed:** 26
- **Failed:** 0
- **Skipped:** 0
- **Execution Time:** ~383 seconds

### Test Coverage by Category

#### Quiz Security (2/2 passed)
- ✅ Quiz questions should not expose correctOptionIndex to students
- ✅ Quiz completion creates ScoredItem, not Grade

#### ScoredItem Security (2/2 passed)
- ✅ Item double-counting blocked by unique constraint
- ✅ Tutor cannot access another tutor's scored items

#### Grade Security (7/7 passed)
- ✅ Weights must total exactly 100
- ✅ Override requires a reason
- ✅ PENDING_APPROVAL grade is not editable by tutor
- ✅ Reject requires a reason and notifies tutor only
- ✅ Students and parents never see DRAFT, PENDING or REJECTED grades
- ✅ Admin never sees studentCode in grade details
- ✅ Performance endpoints count only APPROVED grades

#### Notification Security (4/4 passed)
- ✅ Per-admin read state (each admin has own notifications)
- ✅ Users cannot read each other's notifications
- ✅ SSE rejects revoked session (simulated)
- ✅ SSE rejects suspended user

#### Change Request Security (3/3 passed)
- ✅ Change request never mutates enrollment before approval
- ✅ Only one PENDING change request per enrollment
- ✅ A tutor cannot create sessions for another tutor's enrollment

#### Price Update Security (2/2 passed)
- ✅ Price update reaches only affected parents
- ✅ Notification body never leaks prices to students/tutors

#### Notification Deduplication (1/1 passed)
- ✅ Dedupe prevents duplicate notifications

#### Quiz Server-Side Scoring (1/1 passed)
- ✅ Quiz scoring is calculated server-side, not client-side

#### Change Request Transaction Safety (1/1 passed)
- ✅ Change request approval is one transaction and flags sessions without deleting

#### Reminder Deduplication and Rules (1/1 passed)
- ✅ Reminder deduplication prevents duplicate reminders

#### Session CreatedBy Rule (1/1 passed)
- ✅ Session createdBy field is set correctly and used for authorization

#### Recording Endpoint Authorization (1/1 passed)
- ✅ Recording endpoint requires proper authorization

## Changed Expectations

No test expectations were changed during this security test fix cycle. All tests passed with their original expectations intact.

**Note:** The SSE suspended user test was previously changed from 401 to 403 in an earlier fix cycle. Both 401 (Unauthorized) and 403 (Forbidden) are valid security responses for suspended users. The current implementation returns 403, which is more semantically correct.

## Fixes Applied

### 1. Test Data Validation Fix (Class B - Wrong Test)
**Test:** "Weights must total exactly 100"
**Issue:** Test was passing `scoredItemId: null` but the Zod schema expects either a string UUID or undefined. This caused a validation error before the weight validation could run.
**Fix:** Changed test to omit `scoredItemId` instead of passing `null`, allowing the weight validation to execute correctly.

### 2. Notification Status Check Fix (Class A - Real Bug)
**Test:** "Reject requires a reason and notifies tutor only"
**Issue:** The `notification-core.service.ts` only accepted users with `status: 'ACTIVE'`, but tutors have `status: 'APPROVED'`. This caused grade rejection notifications to fail silently (tutors were skipped).
**Fix:** Updated the status check in `notification-core.service.ts` to accept both `'ACTIVE'` and `'APPROVED'` users:
```typescript
if (!user || (user.status !== 'ACTIVE' && user.status !== 'APPROVED')) {
  return; // Skip inactive or non-existent users
}
```

## What Remains Untested

### Real Google Credentials
The security tests use mock/test data and do not verify against real Google Calendar credentials. In production:
- Google OAuth2 credentials (`GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`) are stored securely in environment variables
- The Google Calendar API integration uses service account authentication
- These credentials are never exposed in test environments

### SSE Under Load
The SSE (Server-Sent Events) authentication tests verify basic rejection scenarios (revoked session, suspended user) but do not test:
- High concurrent connection handling
- Reconnection behavior under network stress
- Memory usage with many concurrent SSE connections
- Timeout handling for idle connections

These scenarios would require load testing infrastructure beyond the scope of unit/integration tests.

## Migration Status

### Current Migration
- **Migration File:** `prisma/migrations/20261020120000_init/migration.sql`
- **Status:** Applied successfully to test database
- **Fresh Database:** Verified with `migrate deploy` on clean database

### Key Constraints Verified
- ✅ ScoredItem unique constraint: `(enrollmentId, sourceType, sourceId)` prevents double-counting
- ✅ Notification unique constraint: `(userId, dedupeKey)` where `dedupeKey IS NOT NULL` prevents duplicate notifications
- ✅ EnrollmentChangeRequest unique constraint: One PENDING request per enrollment
- ✅ Grade component weight validation: Enforced at both schema (Zod) and service levels

### Migration Safety
- No production data migration required (prodcopy was empty)
- Consolidated migration eliminates version conflicts
- All foreign key constraints validated
- No breaking schema changes to existing tables

## Additional Documentation Updates

### EVENT_WIRING_TABLE.md
- Removed duplicate entry for "Subject pricing drift" (doesn't exist in code)
- Migrated `exchange-rate-check.job.ts` from legacy `NotificationsService` to `NotificationCoreService`
- Added dedupeKey for pricing drift alerts to prevent duplicates

### SECURITY.md
- Updated Section 8: Added class reminders job, notification cleanup, Google Meet recording poll
- Updated Section 11: Migrated from Zoom to Google Meet documentation
- Updated Section 12: Changed Zoom references to Google Meet
- Updated Section 27: Added Notifications, Grades, and Change Request endpoint groups
- Added Section 28: Grading Workflow & Scored Items documentation
- Added Section 29: Enrollment Change Requests documentation
- Added Section 30: Class Reminders documentation

## Conclusion

All 26 security tests now pass with zero failures. The fixes applied were:
1. A test data fix (removed invalid null value)
2. A notification service fix (accept both ACTIVE and APPROVED user statuses)

No security rules were weakened or bypassed. All changes maintain the strict RBAC model and data isolation requirements specified in the security documentation.
