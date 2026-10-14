# Section 1: Admin Endpoint Contract Verification

Based on code analysis of routes, controllers, and services (database not accessible for live testing).

## Verification Table

| Endpoint | Exists? | Actual Response Shape | Differs from Spec? | Notes |
|----------|---------|----------------------|-------------------|-------|
| `GET /admin/parents` | ✅ Yes | `{ data: [...], page, limit, total }` | **YES** | Spec says `{parents,...}`, code returns `data` key |
| `GET /admin/parents/:id` | ✅ Yes | `{ parent, children: [...], recentPayments: [...], complaintCount }` | Needs verification | Children include enrollments with effective pricing |
| `GET /admin/payments` | ✅ Yes | `{ data: [...], page, limit, total }` | **YES** | Spec says `{payments,...}`, code returns `data` key |
| `GET /admin/payments/:id` | ✅ Yes | `{ payment, timeline, chargedAmountNGN }` | Needs verification | Timeline includes Initiated and Paid events |
| `GET /admin/payments/summary` | ✅ Yes | `{ totalRevenue, revenueByCurrency, countsByStatus, successRate, revenuePerDay }` | Needs verification | Returns analytics object |
| `GET /admin/tutors` | ✅ Yes | `[...]` (array) | **YES** | No pagination, returns flat array. Needs `{data,page,limit,total}` |
| `GET /admin/tutors/:id` | ❌ Missing | N/A | **MISSING** | Does not exist - needs to be built |
| `GET /admin/students` | ✅ Yes | `[...]` (array) | **YES** | No pagination, no filters. Needs `{data,page,limit,total}` with filters |
| `GET /admin/students/:id` | ❌ Missing | N/A | **MISSING** | Does not exist - needs to be built |
| `GET /admin/users/suspended` | ✅ Yes | `[...]` (array) | **YES** | No pagination. Needs `{data,page,limit,total}` |
| `PATCH /admin/users/:id/reactivate` | ✅ Yes | `{ id, fullName, email, role, status }` | OK | Returns updated user |
| `PATCH /admin/enrollments/:id/pricing` | ✅ Yes | Enrollment object | OK | Returns updated enrollment |
| `GET /admin/reports/overview` | ✅ Yes | `{ activeStudents, activeTutors, revenueThisMonth, totalEnrollments, pendingVetting }` | **YES** | Missing many required fields (see Section 2) |
| `PATCH /admin/complaints/:id/resolve` | ✅ Yes | Complaint object | OK | Path is correct (`/admin/complaints/:id/resolve`) |
| `PATCH /admin/grades/:id/approve` | ✅ Yes | Grade object | OK | Path is correct |
| `PATCH /admin/grades/:id/reject` | ✅ Yes | Grade object | OK | Path is correct |

## Shape Changes Required

### 1. Standardize Paginated Lists to `{ data, page, limit, total }`

The following endpoints need to be changed to use the standard pagination wrapper:

- **GET /admin/parents**: Currently returns `{ data, page, limit, total }` ✅ CORRECT
- **GET /admin/payments**: Currently returns `{ data, page, limit, total }` ✅ CORRECT
- **GET /admin/tutors**: Currently returns flat array ❌ NEEDS CHANGE
- **GET /admin/students**: Currently returns flat array ❌ NEEDS CHANGE
- **GET /admin/users/suspended**: Currently returns flat array ❌ NEEDS CHANGE

**Action Required**: Change all list endpoints to return `{ data: [...], page, limit, total }`. The frontend expects alias keys like `parents`, `payments`, `tutors`, `students` but we will standardize to `data` only.

### 2. Missing Endpoints to Build

- **GET /admin/tutors/:id** - Tutor detail with profile, statuses, subjects, metrics
- **GET /admin/tutors/:id/students** - Paginated tutor's students
- **GET /admin/tutors/:id/sessions** - Paginated tutor's sessions with filters
- **GET /admin/tutors/:id/grades** - Paginated tutor's grades
- **GET /admin/tutors/:id/progress-reports** - Paginated tutor's progress reports
- **PATCH /admin/users/:id/suspend** - Suspend user with reason
- **GET /admin/students/:id** - Student detail with profile, enrollments, grades, etc.
- **GET /admin/students/:id/enrollments** - Paginated student's enrollments
- **GET /admin/students/:id/grades** - Paginated student's grades (includes pending)
- **GET /admin/students/:id/attendance** - Paginated student's attendance
- **GET /admin/students/:id/sessions** - Paginated student's sessions
- **PATCH /admin/payments/:id/note** - Add admin-only note to payment
- **POST /admin/payments/:id/reverify** - Reverify stuck payments via Paystack

### 3. GET /admin/tutors Enhancement

Current implementation accepts: `status`, `availabilityStatus`, `subjectId`, `hasCapacity`
Required: Add `vettingStatus`, `search`, `page`, `limit` and return paginated response

### 4. GET /admin/students Enhancement

Current implementation accepts: `parentId` only
Required: Add `search`, `status`, `gradeBandTier`, `enrolled`, `assigned`, `page`, `limit` and return paginated response

### 5. GET /admin/reports/overview

Current fields: `activeStudents`, `activeTutors`, `revenueThisMonth`, `totalEnrollments`, `pendingVetting`
Required fields (see Section 2):
- totalUsers, totalParents, totalStudents, totalTutors
- pendingTutors, activeEnrollments, pendingPaymentEnrollments, unmatchedEnrollments
- totalRevenueNGN, revenueThisMonthNGN, totalRevenue (deprecated alias)
- failedPayments, pendingGrades, openComplaints, suspendedUsers

## Enum Values

From code analysis:

**User Status**: `UNVERIFIED | ACTIVE | PENDING_VETTING | APPROVED | REJECTED | SUSPENDED`
- Note: There is NO `INACTIVE` status

**Tutor Vetting Status**: `PENDING | APPROVED | REJECTED`

**Tutor Availability Status**: `AVAILABLE | LIMITED | UNAVAILABLE`

**Payment Status**: `PENDING | SUCCESS | FAILED | REFUNDED | EXPIRED`

**Payment Provider**: `PAYSTACK`

**Enrollment Status**: `ACTIVE | PAUSED | COMPLETED | CANCELLED | PENDING_PAYMENT`

**Session Status**: `SCHEDULED | COMPLETED | MISSED | CANCELLED`

**Grade Status**: `PENDING_APPROVAL | APPROVED | REJECTED`

**Complaint Status**: `OPEN | IN_PROGRESS | RESOLVED`

## Summary

- **Endpoints requiring shape changes**: 4 (tutors, students, suspended users, parents/payments standardization)
- **Completely missing endpoints**: 13 (tutor detail, student detail, sub-resources, suspend, payment actions)
- **Endpoints requiring field additions**: 1 (overview report)
- **Total endpoints to modify/create**: 18
