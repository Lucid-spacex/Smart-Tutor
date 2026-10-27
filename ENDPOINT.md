# Smart-Tutor API Endpoint Documentation

**Generated from actual route files, controllers, and Zod schemas**  
**Base URL (development):** `http://localhost:3001/api`  
**Documentation:** Swagger UI at `/api-docs`  

---

## Table of Contents
- [Authentication](#authentication)
- [Students](#students)
- [Student (Self-Service)](#student-self-service)
- [Tutor](#tutor)
- [Tutor Profile](#tutor-profile)
- [Tutor Application](#tutor-application)
- [Admin](#admin)
- [Enrollments](#enrollments)
- [Enrollment Change Requests](#enrollment-change-requests)
- [Sessions](#sessions)
- [Class Reminders](#class-reminders)
- [Payments](#payments)
- [Webhooks](#webhooks)
- [Grades](#grades)
- [Scored Items](#scored-items)
- [Assignments](#assignments)
- [Quiz](#quiz)
- [Notifications](#notifications)
- [Messages](#messages)
- [Complaints](#complaints)
- [Subjects](#subjects)
- [Pricing](#pricing)
- [Progress Reports](#progress-reports)
- [Attendance](#attendance)
- [Performance](#performance)

---

## Authentication

### POST /auth/register
**Auth:** None  
**Rate Limit:** Tier 1 (7 req / 15 min)  
**Body:**
```typescript
{
  firstName?: string (min 1),
  lastName?: string (min 1),
  middleName?: string,
  fullName?: string (min 2, OR firstName+lastName),
  email: string (email),
  phone: string (min 10),
  address?: string (min 5, required for TUTOR),
  password: string (min 8, 1 upper, 1 lower, 1 number, 1 special),
  role: 'PARENT' | 'TUTOR'
}
```
**Response (201):**
```json
{
  "message": "Registration successful. Please verify your email.",
  "userId": "uuid",
  "emailSent": true
}
```

### POST /auth/verify
**Auth:** None  
**Rate Limit:** Tier 1 (7 req / 15 min)  
**Body:**
```typescript
{
  email: string (email),
  otp: string (length 6)
}
```
**Response (200):**
```json
{
  "message": "Email verified successfully",
  "userId": "uuid"
}
```

### POST /auth/login
**Auth:** None  
**Rate Limit:** Tier 1 (7 req / 15 min)  
**Body:**
```typescript
{
  email: string (email),
  password: string
}
```
**Response (200):**
```json
{
  "accessToken": "jwt",
  "refreshToken": "jwt",
  "user": {
    "id": "uuid",
    "fullName": "string",
    "email": "string",
    "role": "PARENT | TUTOR | ADMIN | STUDENT",
    "status": "ACTIVE | SUSPENDED | REJECTED | PENDING_VETTING"
  }
}
```

### POST /auth/student-login
**Auth:** None  
**Rate Limit:** Tier 1b (5 req / 15 min) - stricter due to 6-digit PIN  
**Body:**
```typescript
{
  parentEmail: string (email),
  studentCode: string (min 6),
  studentPin: string (length 6)
}
```
**Response (200):**
```json
{
  "accessToken": "jwt",
  "refreshToken": "jwt",
  "user": {
    "id": "uuid",
    "fullName": "string",
    "email": "string",
    "role": "STUDENT",
    "status": "ACTIVE"
  }
}
```

### POST /auth/refresh
**Auth:** None  
**Body:**
```typescript
{
  refreshToken: string
}
```
**Response (200):**
```json
{
  "accessToken": "jwt",
  "refreshToken": "jwt"
}
```

### POST /auth/logout
**Auth:** Required  
**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

### POST /auth/resend-otp
**Auth:** None  
**Rate Limit:** Tier 1 (7 req / 15 min)  
**Body:**
```typescript
{
  email: string (email)
}
```
**Response (200):**
```json
{
  "message": "OTP resent successfully",
  "emailSent": true
}
```

### POST /auth/forgot-password
**Auth:** None  
**Rate Limit:** Tier 1 (7 req / 15 min)  
**Body:**
```typescript
{
  email: string (email)
}
```
**Response (200):**
```json
{
  "message": "Password reset email sent"
}
```

### POST /auth/reset-password
**Auth:** None  
**Rate Limit:** Tier 1 (7 req / 15 min)  
**Body:**
```typescript
{
  token: string,
  newPassword: string (min 8, complexity rules)
}
```
**Response (200):**
```json
{
  "message": "Password reset successfully"
}
```

### GET /auth/me
**Auth:** Required  
**Response (200):** Full user profile with role-specific data

### PATCH /auth/me
**Auth:** Required  
**Body:** Partial user profile updates  
**Response (200):** Updated user profile

### PATCH /auth/change-password
**Auth:** Required  
**Body:**
```typescript
{
  currentPassword: string,
  newPassword: string (min 8, complexity rules)
}
```
**Response (200):**
```json
{
  "message": "Password changed successfully"
}
```

### PATCH /auth/change-pin
**Auth:** Required (STUDENT only)  
**Body:**
```typescript
{
  currentPin: string (length 6),
  newPin: string (length 6)
}
```
**Response (200):**
```json
{
  "message": "PIN changed successfully"
}
```

### PATCH /auth/me/timezone
**Auth:** Required  
**Body:**
```typescript
{
  timezone: string (IANA format, e.g., "Africa/Lagos")
}
```
**Response (200):** Updated user profile

### PATCH /auth/me/profile-picture
**Auth:** Required  
**Content-Type:** multipart/form-data  
**Body:** file (max 5MB, image types)  
**Response (200):**
```json
{
  "profilePictureUrl": "cloudinary-url"
}
```

### DELETE /auth/me/profile-picture
**Auth:** Required  
**Response (200):**
```json
{
  "message": "Profile picture removed"
}
```

---

## Students

### POST /students
**Auth:** Required (PARENT)  
**Body:** Student creation data  
**Response (201):**
```json
{
  "id": "uuid",
  "fullName": "string",
  "actualGrade": "enum",
  "gradeBandTier": "enum",
  "emailSent": true
}
```
**Security:** PIN sent to parent by email, never returned in response

### GET /students
**Auth:** Required (PARENT)  
**Response (200):** Array of parent's students

### GET /students/:id
**Auth:** Required (PARENT)  
**Response (200):** Student details

### POST /students/:id/regenerate-pin
**Auth:** Required (PARENT)  
**Response (200):**
```json
{
  "message": "PIN regenerated successfully. New credentials sent to parent email.",
  "emailSent": true
}
```
**Security:** PIN sent to parent by email, never returned in response

---

## Student (Self-Service)

### GET /student/me
**Auth:** Required (STUDENT)  
**Response (200):** Student profile

### GET /student/me/schedule
**Auth:** Required (STUDENT)  
**Response (200):** Student's class schedule

### GET /student/me/next-class
**Auth:** Required (STUDENT)  
**Response (200):** Next upcoming class with timezone info

### GET /student/me/assignments
**Auth:** Required (STUDENT)  
**Response (200):** Student's assignments

### GET /student/me/grades
**Auth:** Required (STUDENT)  
**Response (200):** APPROVED grades only (never overrideReason or rejectionReason)

### GET /student/me/performance
**Auth:** Required (STUDENT)  
**Query:** `period` (week, month, quarter, year, all)  
**Response (200):** Performance overview with APPROVED grades only

---

## Tutor

### GET /tutor/me
**Auth:** Required (TUTOR, APPROVED)  
**Response (200):** Tutor profile

### PATCH /tutor/me
**Auth:** Required (TUTOR, APPROVED)  
**Body:** Partial tutor profile updates  
**Response (200):** Updated tutor profile

### GET /tutor/me/students
**Auth:** Required (TUTOR, APPROVED)  
**Response (200):** Assigned students list (no parent contact info)

### GET /tutor/me/students/:studentId
**Auth:** Required (TUTOR, APPROVED)  
**Response (200):** Student details (no parent contact info)

### GET /tutor/me/students/:studentId/assignments
**Auth:** Required (TUTOR, APPROVED)  
**Response (200):** Student's assignments

### GET /tutor/me/students/:studentId/grades
**Auth:** Required (TUTOR, APPROVED)  
**Response (200):** All grades for student (any status, includes overrideReason and rejectionReason)

### GET /tutor/me/students/:studentId/performance
**Auth:** Required (TUTOR, APPROVED)  
**Response (200):** Student performance (includes pending grades count)

### GET /tutor/me/students/:studentId/scored-items
**Auth:** Required (TUTOR, APPROVED)  
**Response (200):** Scored items for student

### POST /tutor/scored-items
**Auth:** Required (TUTOR, APPROVED)  
**Body:** Scored item creation data  
**Response (201):** Created scored item

### PATCH /tutor/scored-items/:id
**Auth:** Required (TUTOR, APPROVED)  
**Body:** Partial scored item updates  
**Response (200):** Updated scored item

### DELETE /tutor/scored-items/:id
**Auth:** Required (TUTOR, APPROVED)  
**Response (200):** Deleted scored item

### GET /tutor/me/sessions
**Auth:** Required (TUTOR, APPROVED)  
**Response (200):** Tutor's sessions

### POST /tutor/sessions
**Auth:** Required (TUTOR, APPROVED)  
**Body:** Session creation (single enrollment)  
**Response (201):** Created session with Google Meet link

### PATCH /tutor/sessions/:id/reschedule
**Auth:** Required (TUTOR, APPROVED)  
**Body:** Reschedule data (scheduledAt, durationMinutes)  
**Response (200):** Rescheduled session

### DELETE /tutor/sessions/:id
**Auth:** Required (TUTOR, APPROVED)  
**Response (200):** Deleted session (must be createdBy tutor, SCHEDULED only)

### GET /tutor/upcoming-classes
**Auth:** Required (TUTOR, APPROVED)  
**Response (200):** Upcoming classes for reminder job

---

## Tutor Profile

### PATCH /tutor-profile/availability-status
**Auth:** Required (TUTOR, APPROVED)  
**Body:**
```typescript
{
  availabilityStatus: 'AVAILABLE' | 'LIMITED' | 'UNAVAILABLE',
  maxStudents?: number,
  statusNote?: string
}
```
**Response (200):** Updated availability status

---

## Tutor Application

### GET /tutor-application
**Auth:** Required (TUTOR, PENDING_VETTING) - bypasses requireApprovedTutor  
**Response (200):** Draft application with missingFields[]

### PATCH /tutor-application
**Auth:** Required (TUTOR, PENDING_VETTING)  
**Body:** Partial application updates (autosave)  
**Response (200):** Updated application with lastSavedAt

### POST /tutor-application/documents
**Auth:** Required (TUTOR, PENDING_VETTING)  
**Content-Type:** multipart/form-data  
**Body:** file (max 5MB, PDF/DOC/DOCX/JPG/PNG)  
**Response (201):** Document metadata with signed Cloudinary URL (10 min expiry)

### GET /tutor-application/documents/:id
**Auth:** Required (owning tutor or ADMIN)  
**Response (200):** Document metadata with fresh signed URL

### DELETE /tutor-application/documents/:id
**Auth:** Required (TUTOR, PENDING_VETTING)  
**Response (200):** Document deleted from database and Cloudinary

### POST /tutor-application/submit
**Auth:** Required (TUTOR, PENDING_VETTING)  
**Response (200):** Submitted application with status

---

## Admin

### GET /admin/tutors
**Auth:** Required (ADMIN)  
**Query:** `status`, `applicationStatus`, `hasCapacity`, `page`, `limit`  
**Response (200):** Paginated tutor list with application data

### GET /admin/tutors/:id
**Auth:** Required (ADMIN)  
**Response (200):** Comprehensive tutor data (user, application, profile, metrics)

### PATCH /admin/tutors/:id/vetting
**Auth:** Required (ADMIN)  
**Body:**
```typescript
{
  vettingStatus: 'APPROVED' | 'REJECTED',
  reason?: string
}
```
**Response (200):** Updated tutor status

### PATCH /admin/tutors/:id/suspend
**Auth:** Required (ADMIN)  
**Body:**
```typescript
{
  suspend: boolean
}
```
**Response (200):** Updated tutor status

### GET /admin/students
**Auth:** Required (ADMIN)  
**Query:** `search`, `status`, `page`, `limit`  
**Response (200):** Paginated student list (studentCode explicitly excluded)

### GET /admin/students/:id
**Auth:** Required (ADMIN)  
**Response (200):** Comprehensive student data (studentCode explicitly excluded)

### PATCH /admin/students/:id/regenerate-pin
**Auth:** Required (ADMIN)  
**Response (200):**
```json
{
  "message": "PIN regenerated successfully. New credentials sent to parent email."
}
```
**Security:** PIN sent to parent by email, never returned in response, studentCode never exposed

### PATCH /admin/students/:id/suspend
**Auth:** Required (ADMIN)  
**Response (200):** Updated student status

### GET /admin/parents
**Auth:** Required (ADMIN)  
**Query:** `search`, `status`, `page`, `limit`  
**Response (200):** Paginated parent list

### GET /admin/parents/:id
**Auth:** Required (ADMIN)  
**Response (200):** Parent profile with children, enrollments, payments, complaints

### PATCH /admin/parents/:id/suspend
**Auth:** Required (ADMIN)  
**Response (200):** Updated parent status

### GET /admin/subjects
**Auth:** Required (ADMIN)  
**Response (200):** All subjects with per-grade pricing

### POST /admin/subjects
**Auth:** Required (ADMIN)  
**Body:** Subject creation data with grade band prices  
**Response (201):** Created subject

### PATCH /admin/subjects/:id
**Auth:** Required (ADMIN)  
**Body:** Partial subject updates  
**Response (200):** Updated subject

### DELETE /admin/subjects/:id
**Auth:** Required (ADMIN)  
**Response (200):** Deleted subject (soft delete if enrollments exist)

### PUT /admin/subjects/:id/prices/:gradeBandTier
**Auth:** Required (ADMIN)  
**Body:**
```typescript
{
  yearlyPriceNGN: number,
  yearlyPriceUSD: number,
  isActive: boolean
}
```
**Response (200):** Upserted subject price

### GET /admin/enrollments
**Auth:** Required (ADMIN)  
**Query:** `status`, `page`, `limit`  
**Response (200):** Paginated enrollment list

### GET /admin/enrollments/:id
**Auth:** Required (ADMIN)  
**Response (200):** Enrollment details

### PATCH /admin/enrollments/:id/assign-tutor
**Auth:** Required (ADMIN)  
**Body:**
```typescript
{
  tutorId: string,
  force?: boolean
}
```
**Response (200):** Assigned tutor

### PATCH /admin/enrollments/:id/pricing
**Auth:** Required (ADMIN)  
**Body:**
```typescript
{
  yearlyPriceNGN?: number,
  yearlyPriceUSD?: number,
  billingFrequency?: 'WEEKLY' | 'MONTHLY' | 'YEARLY',
  note?: string
}
```
**Response (200):** Updated enrollment pricing

### GET /admin/enrollments/:id/suggested-tutors
**Auth:** Required (ADMIN)  
**Response (200):** Ranked suggested tutors based on subject, availability, capacity

### GET /admin/payments
**Auth:** Required (ADMIN)  
**Query:** `status`, `currency`, `provider`, `parentId`, `from`, `to`, `search`, `page`, `limit`  
**Response (200):** Paginated payment list

### GET /admin/payments/:id
**Auth:** Required (ADMIN)  
**Response (200):** Payment details with timeline and NGN equivalent

### PATCH /admin/payments/:id/note
**Auth:** Required (ADMIN)  
**Body:**
```typescript
{
  note: string
}
```
**Response (200):** Added admin note

### POST /admin/payments/:id/reverify
**Auth:** Required (ADMIN)  
**Response (200):** Payment verified via Paystack API, enrollment activated if successful

### GET /admin/payments/summary
**Auth:** Required (ADMIN)  
**Query:** `from`, `to`  
**Response (200):** Revenue totals, counts by status, success rate, daily revenue chart

### GET /admin/sessions
**Auth:** Required (ADMIN)  
**Response (200):** All sessions

### POST /admin/sessions
**Auth:** Required (ADMIN)  
**Body:** Session creation (multiple enrollments)  
**Response (201):** Created session with Google Meet link

### PATCH /admin/sessions/:id
**Auth:** Required (ADMIN)  
**Body:** Session updates  
**Response (200):** Updated session

### GET /admin/complaints
**Auth:** Required (ADMIN)  
**Response (200):** All complaints

### PATCH /admin/complaints/:id
**Auth:** Required (ADMIN)  
**Body:**
```typescript
{
  status: 'RESOLVED',
  resolution?: string
}
```
**Response (200):** Resolved complaint

### GET /admin/class-schedule
**Auth:** Required (ADMIN)  
**Query:** `date`  
**Response (200):** Class schedule view for date

### GET /admin/change-requests
**Auth:** Required (ADMIN)  
**Query:** `status`, `page`, `limit`  
**Response (200):** Paginated change request list

### GET /admin/change-requests/:id
**Auth:** Required (ADMIN)  
**Response (200):** Change request details

### PATCH /admin/change-requests/:id/approve
**Auth:** Required (ADMIN)  
**Response (200):** Approved change request, enrollment updated, sessions flagged

### PATCH /admin/change-requests/:id/reject
**Auth:** Required (ADMIN)  
**Body:**
```typescript
{
  reason: string
}
```
**Response (200):** Rejected change request

### GET /admin/grades
**Auth:** Required (ADMIN)  
**Query:** `status`, `tutorId`, `studentId`, `subjectId`, `page`, `limit`  
**Response (200):** Paginated grade list (excludes DRAFT)

### GET /admin/grades/:id
**Auth:** Required (ADMIN)  
**Response (200):** Grade details (studentCode explicitly excluded)

### PATCH /admin/grades/:id/approve
**Auth:** Required (ADMIN)  
**Response (200):** Approved grade, visible to student/parent

### PATCH /admin/grades/:id/reject
**Auth:** Required (ADMIN)  
**Body:**
```typescript
{
  reason: string
}
```
**Response (200):** Rejected grade, notifies tutor only

### POST /admin/grades/bulk-approve
**Auth:** Required (ADMIN)  
**Body:**
```typescript
{
  gradeIds: string[]
}
```
**Response (200):** Bulk approval results

---

## Enrollments

### POST /enrollments
**Auth:** Required (PARENT)  
**Body:**
```typescript
{
  studentId: string,
  subjectIds: string[],
  sessionFrequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY',
  availableDays: string[],
  preferredStartHour: number,
  preferredEndHour: number,
  billingFrequency: 'WEEKLY' | 'MONTHLY' | 'YEARLY',
  startDate: string (ISO date),
  endDate?: string (ISO date)
}
```
**Response (201):**
```json
{
  "enrollmentGroupId": "uuid",
  "enrollments": [...]
}
```

### GET /enrollments
**Auth:** Required (PARENT, TUTOR, ADMIN)  
**Query:** `status`  
**Response (200):** Enrollments based on role (tutors/students don't see pricing)

### GET /enrollments/:id
**Auth:** Required (PARENT, TUTOR, ADMIN)  
**Response (200):** Enrollment details (tutors/students don't see pricing)

### POST /enrollments/:id/change-requests
**Auth:** Required (PARENT)  
**Body:**
```typescript
{
  requestedValues: {
    sessionFrequency?: string,
    availableDays?: string[],
    preferredStartHour?: number,
    preferredEndHour?: number,
    billingFrequency?: string
  }
}
```
**Response (201):** Created change request

### GET /enrollments/:id/change-requests
**Auth:** Required (PARENT)  
**Response (200):** Change requests for enrollment

---

## Enrollment Change Requests

### PATCH /change-requests/:id/cancel
**Auth:** Required (PARENT)  
**Response (200):** Cancelled change request (PENDING only)

---

## Sessions

### GET /sessions
**Auth:** Required (PARENT, STUDENT, TUTOR, ADMIN)  
**Query:** `status`, `enrollmentId`  
**Response (200):** Sessions based on role and ownership

### GET /sessions/:id
**Auth:** Required  
**Response (200):** Session details

### PATCH /sessions/:id
**Auth:** Required (TUTOR, APPROVED)  
**Body:** Session updates (status, tutorNotes, homeworkAssigned, durationMinutes, participants)  
**Response (200):** Updated session

### GET /sessions/:id/recording
**Auth:** Required  
**Response (200):**
```json
{
  "recordingUrl": "google-drive-url",
  "recordingStatus": "AVAILABLE"
}
```

---

## Class Reminders

### GET /tutor/upcoming-classes
**Auth:** Required (TUTOR, APPROVED)  
**Response (200):** Upcoming classes for reminder job

### GET /admin/class-schedule
**Auth:** Required (ADMIN)  
**Query:** `date`  
**Response (200):** Class schedule view for date

---

## Payments

### POST /payments/initiate
**Auth:** Required (PARENT)  
**Rate Limit:** Tier 1 (7 req / 15 min)  
**Body:**
```typescript
{
  enrollmentId: string,
  currency?: 'NGN' | 'USD'
}
```
**Response (200):**
```json
{
  "authorizationUrl": "paystack-url",
  "reference": "paystack-ref",
  "amount": number,
  "currency": "NGN"
}
```

### GET /payments
**Auth:** Required (PARENT)  
**Response (200):** Parent's payments

### GET /payments/verify/:reference
**Auth:** Required (owning parent or ADMIN)  
**Response (200):** Payment verification status

### POST /payments/webhook
**Auth:** None (webhook)  
**Rate Limit:** Exempt  
**Headers:** `x-paystack-signature` (HMAC-SHA512)  
**Body:** Paystack webhook event  
**Response (200):** Webhook processed

---

## Webhooks

### POST /webhooks/paystack
**Auth:** None (webhook)  
**Rate Limit:** Exempt  
**Headers:** `x-paystack-signature` (HMAC-SHA512)  
**Body:** Paystack webhook event (raw body captured before JSON parsing)  
**Response (200):** Webhook processed  
**Security:** HMAC-SHA512 signature verification on raw body, timing-safe comparison, idempotent

---

## Grades

### POST /grades
**Auth:** Required (TUTOR, APPROVED)  
**Body:**
```typescript
{
  enrollmentId: string,
  periodStart: string (ISO date),
  periodEnd: string (ISO date),
  components: Array<{
    type: string,
    weight: number,
    scoredItemId?: string,
    attendanceRate?: number
  }>,
  tutorComment?: string
}
```
**Response (201):** Created DRAFT grade

### GET /grades
**Auth:** Required (TUTOR, PARENT, STUDENT, ADMIN)  
**Query:** `studentId`, `enrollmentId`  
**Response (200):** Grades based on role:
- Tutors: Their own grades in all statuses (includes overrideReason, rejectionReason)
- Parents/Students: APPROVED grades only (never overrideReason, rejectionReason)
- Admins: All except DRAFT

### PATCH /grades/:id
**Auth:** Required (TUTOR, APPROVED)  
**Body:** Partial grade updates (DRAFT or REJECTED only)  
**Response (200):** Updated grade

### DELETE /grades/:id
**Auth:** Required (TUTOR, APPROVED)  
**Response (200):** Deleted grade (DRAFT or REJECTED only)

### POST /grades/:id/submit
**Auth:** Required (TUTOR, APPROVED)  
**Response (200):** Grade submitted for approval (status: PENDING_APPROVAL)

### POST /grades/:id/withdraw
**Auth:** Required (TUTOR, APPROVED)  
**Response (200):** Grade withdrawn to DRAFT

### GET /grades/:id/preview
**Auth:** Required (TUTOR, APPROVED)  
**Response (200):** Grade preview with computed score

---

## Scored Items

### GET /tutor/students/:studentId/scored-items
**Auth:** Required (TUTOR, APPROVED)  
**Response (200):** Scored items for student

### POST /tutor/scored-items
**Auth:** Required (TUTOR, APPROVED)  
**Body:** Scored item creation data  
**Response (201):** Created scored item

### PATCH /tutor/scored-items/:id
**Auth:** Required (TUTOR, APPROVED)  
**Body:** Partial scored item updates  
**Response (200):** Updated scored item

### DELETE /tutor/scored-items/:id
**Auth:** Required (TUTOR, APPROVED)  
**Response (200):** Deleted scored item

---

## Assignments

### POST /assignments
**Auth:** Required (TUTOR, APPROVED)  
**Body:** Assignment creation data  
**Response (201):** Created assignment

### GET /assignments
**Auth:** Required  
**Response (200):** Assignments based on role

### GET /assignments/:id
**Auth:** Required  
**Response (200):** Assignment details

### PATCH /assignments/:id
**Auth:** Required (TUTOR, APPROVED)  
**Body:** Partial assignment updates (own only)  
**Response (200):** Updated assignment

### DELETE /assignments/:id
**Auth:** Required (TUTOR, APPROVED)  
**Response (200):** Deleted assignment (own only, blocked if submissions exist)

### POST /assignments/:id/submit
**Auth:** Required (STUDENT)  
**Body:** Assignment submission with optional attachments  
**Response (201):** Submitted assignment

---

## Quiz

### POST /quiz/assignments/:id/questions
**Auth:** Required (TUTOR, APPROVED)  
**Body:**
```typescript
{
  questionText: string (min 1, max 1000),
  options: string[] (min 2, max 6),
  correctOptionIndex: number (min 0),
  points: number (positive, default 10),
  orderIndex: number (min 0)
}
```
**Response (201):** Created quiz question

### GET /quiz/assignments/:id/questions
**Auth:** Required (TUTOR, STUDENT)  
**Response (200):** Quiz questions (students never receive correctOptionIndex)

### POST /quiz/assignments/:id/quiz/start
**Auth:** Required (STUDENT)  
**Response (201):** Started quiz attempt

### POST /quiz-attempts/:id/answer
**Auth:** Required (STUDENT)  
**Body:**
```typescript
{
  questionId: string (uuid),
  selectedOptionIndex: number (min 0),
  timeTakenSeconds: number (min 0)
}
```
**Response (200):**
```json
{
  "isCorrect": boolean,
  "pointsAwarded": number
}
```

### PATCH /quiz-attempts/:id/complete
**Auth:** Required (STUDENT)  
**Response (200):** Completed quiz, ScoredItem created

---

## Notifications

### GET /notifications
**Auth:** Required  
**Query:** `category`, `type`, `read`  
**Response (200):** Notifications with filters

### GET /notifications/unread-count
**Auth:** Required  
**Response (200):**
```json
{
  "total": number,
  "byCategory": {
    "ASSIGNMENTS": number,
    "GRADES": number,
    "SESSIONS": number,
    "MESSAGES": number,
    "USERS": number,
    "ENROLLMENT": number,
    "PAYMENTS": number,
    "PRICING": number,
    "COMPLAINTS": number,
    "QUIZZES": number,
    "SCHEDULE": number
  }
}
```

### PATCH /notifications/:id/read
**Auth:** Required  
**Response (200):** Notification marked as read

### PATCH /notifications/read-all
**Auth:** Required  
**Response (200):** All notifications marked as read

### PATCH /notifications/read-by-entity
**Auth:** Required  
**Body:**
```typescript
{
  entityType: string,
  entityId: string
}
```
**Response (200):** Notifications for entity marked as read

### POST /notifications/stream-ticket
**Auth:** Required  
**Response (200):**
```json
{
  "ticket": "sse-ticket"
}
```

### GET /notifications/stream
**Auth:** Required (SSE)  
**Query:** `ticket` (from stream-ticket)  
**Response:** SSE stream with events:
- `message`: Notification data
- `heartbeat`: Keep-alive (every 30s)
- Last-Event-ID supported for reconnection

**Notification Categories:** ASSIGNMENTS, GRADES, SESSIONS, MESSAGES, USERS, ENROLLMENT, PAYMENTS, PRICING, COMPLAINTS, QUIZZES, SCHEDULE

**Notification Types:** 40+ types mapped to categories (see notifications.service.ts)

---

## Messages

### GET /messages
**Auth:** Required  
**Query:** `recipientId`  
**Response (200):** Message threads

### POST /messages
**Auth:** Required  
**Body:**
```typescript
{
  recipientId: string,
  content: string
}
```
**Response (201):** Sent message

### GET /messages/:threadId
**Auth:** Required  
**Response (200):** Thread messages

### GET /messages/admin-contact
**Auth:** Required  
**Response (200):** Active admin ID for starting admin thread

### GET /messages/unread-count
**Auth:** Required  
**Response (200):** Unread message count

---

## Complaints

### POST /complaints
**Auth:** Required (PARENT)  
**Body:** Complaint creation data  
**Response (201):** Created complaint

### GET /complaints
**Auth:** Required (PARENT, ADMIN)  
**Response (200):** Complaints based on role

### GET /complaints/:id
**Auth:** Required  
**Response (200):** Complaint details

### PATCH /complaints/:id
**Auth:** Required (ADMIN)  
**Body:**
```typescript
{
  status: 'RESOLVED',
  resolution?: string
}
```
**Response (200):** Resolved complaint

---

## Subjects

### GET /subjects
**Auth:** Required (pricing only for PARENT/ADMIN)  
**Query:** `gradeBandTier`, `category`  
**Response (200):** Subjects with pricing (PARENT/ADMIN) or without (STUDENT/TUTOR)

### GET /subjects/public
**Auth:** None  
**Response (200):** Active subjects without pricing (for marketing site)

### GET /subjects/:id
**Auth:** Required  
**Response (200):** Subject details

---

## Pricing

### GET /pricing/quote
**Auth:** Required (PARENT)  
**Query:** `studentId`, `subjectIds` (comma-separated)  
**Response (200):**
```json
{
  "student": {
    "id": "uuid",
    "fullName": "string",
    "gradeBandTier": "enum"
  },
  "quotes": [
    {
      "subjectId": "uuid",
      "subjectName": "string",
      "category": "string",
      "yearlyPriceNGN": number,
      "yearlyPriceUSD": number,
      "source": "custom_override | subject_price"
    }
  ],
  "totals": {
    "yearlyPriceNGN": number,
    "yearlyPriceUSD": number
  }
}
```

---

## Progress Reports

### POST /progress-reports
**Auth:** Required (TUTOR, APPROVED)  
**Body:** Progress report creation data  
**Response (201):** Created progress report

### GET /progress-reports
**Auth:** Required  
**Response (200):** Progress reports based on role

### GET /progress-reports/:id
**Auth:** Required  
**Response (200):** Progress report details

### PATCH /progress-reports/:id
**Auth:** Required (TUTOR, APPROVED)  
**Body:** Partial progress report updates  
**Response (200):** Updated progress report

---

## Attendance

### GET /attendance
**Auth:** Required  
**Response (200):** Attendance records based on role

### GET /attendance/:id
**Auth:** Required  
**Response (200):** Attendance details

### POST /attendance
**Auth:** Required (TUTOR, APPROVED)  
**Body:** Attendance marking  
**Response (201):** Marked attendance

---

## Performance

### GET /students/:id/performance
**Auth:** Required (PARENT)  
**Query:** `period` (week, month, quarter, year, all)  
**Response (200):** Student performance (APPROVED grades only)

### GET /student/me/performance
**Auth:** Required (STUDENT)  
**Query:** `period`  
**Response (200):** Own performance (APPROVED grades only)

### GET /tutor/students/:studentId/performance
**Auth:** Required (TUTOR, APPROVED)  
**Query:** `period`  
**Response (200):** Student performance (includes pending grades count)

### GET /admin/students/:id/performance
**Auth:** Required (ADMIN)  
**Query:** `period`, `includePending`  
**Response (200):** Student performance (includes pending if requested)

---

## Security Rules Summary

### What Each Role Never Receives

| Field | Tutors | Students | Parents | Admins |
|-------|--------|----------|---------|--------|
| yearlyPriceNGN/yearlyPriceUSD | ✗ Never | ✗ Never | ✓ Yes | ✓ Yes |
| Student PIN (plaintext) | ✗ Never | ✗ Never | ✗ Never (email only) | ✗ Never (email only) |
| studentCode | ✗ Never | ✗ Never | ✓ Yes (email only) | ✗ Never |
| overrideReason | ✓ Yes | ✗ Never | ✗ Never | ✓ Yes |
| rejectionReason | ✓ Yes | ✗ Never | ✗ Never | ✗ Never |
| Parent contact info | ✗ Never | ✗ Never | ✗ Never | ✓ Yes |
| correctOptionIndex (quiz) | ✓ Yes | ✗ Never | N/A | ✓ Yes |

### Error Format

All errors follow this format:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE" // Specific codes below
}
```

**Specific Error Codes:**
- `TUTOR_NOT_APPROVED`: Tutor is PENDING_VETTING or REJECTED (403)
- `APPLICATION_REJECTED`: Tutor application was rejected (403)
- Standard HTTP status codes: 400, 401, 403, 404, 409, 500

### Rate Limiting

**Production Defaults:**
- Tier 1 (Strict): 7 requests per 15 minutes
  - Applied to: POST /auth/login, /auth/register, /auth/verify, /auth/resend-otp, /auth/student-login, /payments/initiate
  - Key: IP + email (or studentCode for student login)
- Tier 1b (Student Login): 5 requests per 15 minutes (stricter due to 6-digit PIN)
- Tier 2 (Moderate): 60 requests per minute
  - Applied to: All POST/PATCH/PUT/DELETE operations not in Tier 1
  - Key: Authenticated userId, or IP if unauthenticated
- Tier 3 (Loose): 300 requests per 15 minutes
  - Applied to: All GET requests
  - Key: Authenticated userId, or IP if unauthenticated
- Webhooks: Exempt from all rate limiting

**Headers:**
- `RateLimit-Limit`: Maximum requests in window
- `RateLimit-Remaining`: Requests remaining
- `RateLimit-Reset`: Seconds until reset
- Legacy `X-RateLimit-*` headers: Disabled

**429 Response:**
```json
{
  "error": "Too many requests. Please slow down."
}
```

### Enum Reference

**UserRole:** PARENT, TUTOR, ADMIN, STUDENT  
**UserStatus:** ACTIVE, SUSPENDED, REJECTED, PENDING_VETTING  
**EnrollmentStatus:** PENDING_PAYMENT, ACTIVE, SUSPENDED, COMPLETED  
**SessionStatus:** SCHEDULED, COMPLETED, MISSED, CANCELLED  
**GradeStatus:** DRAFT, PENDING_APPROVAL, APPROVED, REJECTED  
**SessionFrequency:** WEEKLY, BIWEEKLY, MONTHLY  
**BillingFrequency:** WEEKLY, MONTHLY, YEARLY  
**GradeBandTier:** PRESCHOOL_TO_G1, G2_TO_G4, G5_TO_G8, G9_TO_G12  
**NotificationCategory:** ASSIGNMENTS, GRADES, SESSIONS, MESSAGES, USERS, ENROLLMENT, PAYMENTS, PRICING, COMPLAINTS, QUIZZES, SCHEDULE  
**TutorAvailabilityStatus:** AVAILABLE, LIMITED, UNAVAILABLE  
**TutorVettingStatus:** APPROVED, REJECTED, PENDING_VETTING

### Pagination Defaults

- Default `page`: 1
- Default `limit`: 20
- Maximum `limit`: 100

### Changes Since Old API

1. **Grading Workflow Refactor:**
   - Old: Direct grade creation and approval
   - New: ScoredItems separate from grades, multi-step approval workflow (DRAFT → PENDING_APPROVAL → APPROVED/REJECTED)

2. **Google Meet instead of Zoom:**
   - Old: Zoom integration
   - New: Google Calendar for meetings and recordings

3. **Class Reminders:**
   - New: Scheduled job sends reminders at 24h, 2h, 1h, 30min before class

4. **Enrollment Change Requests:**
   - New: Formal workflow for enrollment changes (frequency, schedule, pricing)

5. **Notifications System:**
   - New: Centralized notification system with SSE streaming, category/type enums, deduplication

6. **Tutor Application:**
   - New: Formal application process with document upload, restricted access for PENDING_VETTING tutors

7. **Security Enhancements:**
   - Rate limits reset to production defaults
   - Student PIN never returned in plaintext
   - studentCode excluded from admin responses
   - correctOptionIndex excluded from student quiz questions
   - Grades visibility rules enforced (APPROVED only for parents/students)

8. **Messaging Rules:**
   - Student ↔ Tutor messaging removed
   - Only Parent ↔ Admin and Tutor ↔ Admin allowed

9. **Webhook Security:**
   - HMAC-SHA512 verification on raw body
   - Timing-safe comparison
   - Idempotent processing

10. **Rate Limit Headers:**
    - Standard RateLimit-* headers enabled
    - Legacy X-RateLimit-* headers disabled

---

## OpenAPI Export

To export the OpenAPI specification from the actual Swagger:

```bash
curl http://localhost:3001/api-docs.json -o docs/openapi.json
```

Or access Swagger UI at: `http://localhost:3001/api-docs`
