# Full Test Suite Investigation

**Date:** 2026-10-21
**Command:** `npm test`
**Results:** 164 failed, 2 skipped, 92 passed, 258 total across 22 test suites

## Summary

The full test suite has significant failures. Need to classify each as:
- **Regression**: Caused by this refactor
- **Pre-existing**: Failed before this refactor
- **Spec change**: Deliberate behavior change (e.g., student-tutor messaging removed on 2026-10-12)

## Failing Test Files (18 total)

### 1. admin-transactions.test.ts
**Status:** FIXED
**Issue:** Used deprecated `generateToken` function from token.util.ts (removed in earlier commit)
**Fix:** Changed to use bcrypt and login via /api/auth/login
**Classification:** Regression (caused by token.util.ts refactoring)

### 2. notification-recipient-policy.test.ts
**Status:** FIXED
**Issue:** Test isolation issues - tests shared data via beforeAll/afterAll, causing "Record not found" errors
**Fix:** Changed to beforeEach/afterEach with unique email addresses and student codes using Date.now()
**Classification:** Regression (new test file added in this refactor)

### 3. rate-limit.test.ts
**Issue:** Rate limit test expects 429 but gets 401 (invalid credentials)
**Investigation needed:** Check if rate limiting is properly configured for test environment
**Classification:** TBD

### 4. assignments-messaging.test.ts
**Issue:** Foreign key constraint violated: `Message_threadId_fkey (index)`
**Investigation needed:** Check if message thread creation logic changed
**Classification:** TBD

### 5. messaging.test.ts
**Issues:**
- Foreign key constraint violations
- Student login failures (401)
- Permission failures (403 for messaging students)
**Investigation needed:** Check if messaging permissions or thread creation changed
**Classification:** TBD (may be spec change - student-tutor messaging removed on 2026-10-12)

### 6. grades.test.ts
**Issues:**
- Grade creation returns 400 instead of 201
- Grade approval returns 404 (grade not found)
- Grade edit/delete returns 400 instead of expected 403/200
**Investigation needed:** Check if grade workflow API changed
**Classification:** TBD (likely regression from grading workflow refactor)

### 7. sessions.test.ts
**Issues:**
- Foreign key constraint: `SessionParticipant_enrollmentId_fkey`
- Zoom link expectations (Zoom was removed in favor of Google Meet)
**Investigation needed:** Check if session creation logic changed
**Classification:** TBD (Zoom references are spec changes)

### 8-18. Other failing test files
**Need investigation against pre-refactor baseline**

## Next Steps

1. Create temporary worktree at commit before refactor (debfbbd or earlier)
2. Run full suite against .env.test with that commit
3. Compare failures to classify as regression vs pre-existing
4. Fix regressions or update tests for spec changes
5. Document results in FINAL_REPORT.md

## Current State

- Items 1 and 2 of the user's request are complete
- Item 3 (full suite) is in progress - 2/18 failing files fixed, 16 remain
- Items 4-7 are pending
