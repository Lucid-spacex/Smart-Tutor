# Backend Admin Contract Alignment - Implementation Progress

## Completed Work

### Section 1: Endpoint Contract Verification ✅
- Created comprehensive verification table in `ENDPOINT_VERIFICATION.md`
- Analyzed all existing admin endpoints against the spec
- Identified shape mismatches and missing endpoints
- Documented all enum values from the codebase

**Key Findings:**
- 4 endpoints need pagination shape changes (tutors, students, suspended users)
- 13 endpoints are completely missing (tutor detail, student detail, sub-resources, suspend, payment actions)
- 1 endpoint needs field additions (overview report)
- Total: 18 endpoints to modify/create

### Section 2: Overview Report Enhancement ✅
- Updated `getOverviewReport()` in `admin.service.ts` to include all required fields:
  - totalUsers, totalParents, totalStudents, totalTutors
  - pendingTutors, activeEnrollments, pendingPaymentEnrollments, unmatchedEnrollments
  - totalRevenueNGN, revenueThisMonthNGN, totalRevenue (deprecated alias)
  - failedPayments, pendingGrades, openComplaints, suspendedUsers
- All counts exclude soft-deleted records where applicable
- Updated Swagger documentation for the endpoint
- Complaint status corrected to use only OPEN (no IN_PROGRESS in schema)

## Remaining Work

### Section 3a: Tutor Detail Endpoints (HIGH PRIORITY)
Missing endpoints to build:
1. `GET /admin/tutors/:id` - Tutor detail with profile, statuses, subjects, metrics
2. `GET /admin/tutors/:id/students` - Paginated tutor's students
3. `GET /admin/tutors/:id/sessions` - Paginated tutor's sessions with filters
4. `GET /admin/tutors/:id/grades` - Paginated tutor's grades
5. `GET /admin/tutors/:id/progress-reports` - Paginated tutor's progress reports
6. `PATCH /admin/users/:id/suspend` - Suspend user with reason, notify affected enrollments

Also enhance:
- `GET /admin/tutors` - Add vettingStatus, search, page, limit, return paginated response

### Section 3b: Student Detail Endpoints (HIGH PRIORITY)
Missing endpoints to build:
1. `GET /admin/students/:id` - Student detail with profile, enrollments, grades, etc.
2. `GET /admin/students/:id/enrollments` - Paginated student's enrollments
3. `GET /admin/students/:id/grades` - Paginated student's grades (includes pending)
4. `GET /admin/students/:id/attendance` - Paginated student's attendance
5. `GET /admin/students/:id/sessions` - Paginated student's sessions

Also enhance:
- `GET /admin/students` - Add search, status, gradeBandTier, enrolled, assigned, page, limit, return paginated response

### Section 3c: Payment Management (HIGH PRIORITY)
Missing endpoints to build:
1. `PATCH /admin/payments/:id/note` - Add admin-only note to payment
2. `POST /admin/payments/:id/reverify` - Reverify stuck payments via Paystack
3. Create AdminActionLog model if it doesn't exist
4. Log both actions to audit log

### Section 3d: Parent Endpoint Verification (LOW PRIORITY)
- Verify `GET /admin/parents/:id` includes all required data
- Children, enrollments with effective price and source, payment summary, totalPaidNGN, complaint count
- If gaps found, enhance the endpoint

### Section 3e: Admin Messaging Verification (LOW PRIORITY)
- Verify admin can start conversations via `POST /messages`
- Verify `GET /messages/threads` returns shared admin inbox
- Confirm `GET /messages/admin-contact` is for parents/tutors, not admin

### Section 4: Grade maxScore Enhancement (HIGH PRIORITY)
1. Add `maxScore` field to Grade model in schema.prisma
2. Create migration for existing grades (default to 100)
3. Update POST /grades and PATCH /grades/:id to accept maxScore
4. Add validation: 0 ≤ score ≤ maxScore
5. Quiz grade normalization
6. Compute percentage on read, not stored
7. Only APPROVED grades count in student/parent-facing numbers
8. Average = simple mean of percentages
9. Return null (not 0) when no approved grades

### Section 5: Performance Overview Endpoints (HIGH PRIORITY)
Build 4 new endpoints:
1. `GET /student/me/performance` - STUDENT (own)
2. `GET /students/:id/performance` - PARENT (must own student)
3. `GET /tutor/students/:studentId/performance` - TUTOR (assigned only)
4. `GET /admin/students/:id/performance` - ADMIN (all enrollments)

Response structure includes:
- period (from, to, label)
- averageGrade (percentage, gradedCount, trend)
- gradesBySubject
- gradeTimeline (time-bucketed averages)
- attendance (rate, attended, missed, trend, timeline)
- assignments (total, completed, pending, overdue, submittedLate, completionRate)
- quizzes (attempts, averagePercentage)
- recentGrades (last 5 approved grades)

### Section 6: Documentation Updates (MEDIUM PRIORITY)
1. Update Swagger with explicit response schemas for all admin endpoints
2. Add list wrapper schemas (PaginatedResponse)
3. Add all enum values to components/schemas
4. Serve raw spec at `/api-docs.json` (already done ✅)
5. Update SECURITY.md with:
   - Admin-only endpoints list
   - Immutable payments rule
   - No-ranking rule
   - Grade approval workflow rules

### Section 7: Tests (HIGH PRIORITY)
Write integration tests for:
- All new endpoints
- Pagination behavior
- RBAC/ownership checks
- Edge cases (empty results, no grades, etc.)

## Priority Order

1. **HIGH**: Sections 3a, 3b, 3c, 4, 5, 7 (Core functionality for admin portal)
2. **MEDIUM**: Section 6 (Documentation)
3. **LOW**: Sections 3d, 3e (Verification only)

## Estimated Complexity

- Section 3a: ~8 hours (6 new endpoints + 1 enhancement)
- Section 3b: ~6 hours (5 new endpoints + 1 enhancement)
- Section 3c: ~4 hours (2 new endpoints + audit log)
- Section 4: ~6 hours (schema change + migration + quiz normalization)
- Section 5: ~10 hours (4 complex endpoints with time-bucketing)
- Section 6: ~4 hours (Swagger updates + SECURITY.md)
- Section 7: ~8 hours (Test coverage)

**Total estimated: ~46 hours**

## Next Steps

Would you like me to:
1. Continue with Section 3a (Tutor Detail Endpoints) now?
2. Or review the completed work first before proceeding?
3. Or focus on a specific section you prioritize?

The dev server is running on port 3001 (though database is currently inaccessible for live testing).
