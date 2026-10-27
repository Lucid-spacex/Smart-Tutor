# Smart Tutor API Contract

This document describes all API endpoints for the Smart Tutor backend, grouped by module. Each endpoint includes the method, full path with `/api`, allowed roles, request parameters/body with types, example response with real field names, and error codes.

**Base URL**: `http://localhost:3000/api` (development) or production URL

**Authentication**: Bearer token (JWT) in `Authorization` header

**Common Error Codes**:
- `400` - Bad Request (validation error, invalid input)
- `401` - Unauthorized (no token, invalid token, session revoked)
- `403` - Forbidden (insufficient permissions, account not active)
- `404` - Not Found (resource does not exist)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## Table of Contents

1. [Authentication](#authentication)
2. [Parent](#parent)
3. [Students](#students)
4. [Student (Self-Service)](#student-self-service)
5. [Enrollments](#enrollments)
6. [Enrollment Change Requests](#enrollment-change-requests)
7. [Sessions](#sessions)
8. [Tutor](#tutor)
9. [Tutor Application](#tutor-application)
10. [Tutor Profile](#tutor-profile)
11. [Scored Items](#scored-items)
12. [Grades](#grades)
13. [Assignments](#assignments)
14. [Quiz](#quiz)
15. [Progress Reports](#progress-reports)
16. [Attendance](#attendance)
17. [Performance](#performance)
18. [Payments](#payments)
19. [Subjects](#subjects)
20. [Pricing](#pricing)
21. [Notifications](#notifications)
22. [Messages](#messages)
23. [Complaints](#complaints)
24. [Admin](#admin)
25. [Webhooks](#webhooks)
26. [Class Reminders](#class-reminders)
27. [System](#system)

---

## Authentication

### POST /api/auth/register
Register a new user (parent or tutor)

**Allowed Roles**: Public (no auth required)
**Rate Limit**: Tier 1 (7 req / 15 min)

**Request Body**:
```typescript
{
  firstName?: string; // Optional if fullName provided
  lastName?: string; // Optional if fullName provided
  middleName?: string;
  fullName?: string; // Optional if firstName + lastName provided
  email: string; // Valid email
  phone: string; // Min 10 characters
  address?: string; // Required for TUTOR, optional for PARENT
  password: string; // Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
  role: 'PARENT' | 'TUTOR';
}
```

**Example Response (201)**:
```json
{
  "message": "Registration successful. Please verify your email.",
  "userId": "uuid-string",
  "emailSent": true
}
```

**Error Codes**: 400 (validation error), 429 (rate limit)

---

### POST /api/auth/verify
Verify email with OTP

**Allowed Roles**: Public (no auth required)
**Rate Limit**: Tier 1 (7 req / 15 min)

**Request Body**:
```typescript
{
  email: string;
  otp: string; // Exactly 6 digits
}
```

**Example Response (200)**:
```json
{
  "accessToken": "jwt-token",
  "refreshToken": "jwt-refresh-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "PARENT",
    "status": "ACTIVE"
  }
}
```

**Error Codes**: 400 (invalid OTP), 404 (user not found), 429 (rate limit)

---

### POST /api/auth/login
Login with email and password

**Allowed Roles**: Public (no auth required)
**Rate Limit**: Tier 1 (7 req / 15 min)

**Request Body**:
```typescript
{
  email: string;
  password: string;
}
```

**Example Response (200)**:
```json
{
  "accessToken": "jwt-token",
  "refreshToken": "jwt-refresh-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "PARENT",
    "status": "ACTIVE",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

**Error Codes**: 401 (invalid credentials), 403 (account not active), 429 (rate limit)

---

### POST /api/auth/student-login
Student login with parent email, student code, and PIN

**Allowed Roles**: Public (no auth required)
**Rate Limit**: Student-specific (5 req / 15 min)

**Request Body**:
```typescript
{
  parentEmail: string;
  studentCode: string; // Min 6 characters
  studentPin: string; // Exactly 6 digits
}
```

**Example Response (200)**:
```json
{
  "accessToken": "jwt-token",
  "refreshToken": "jwt-refresh-token",
  "user": {
    "id": "uuid",
    "role": "STUDENT",
    "studentId": "uuid"
  }
}
```

**Error Codes**: 401 (invalid credentials), 403 (account not active), 429 (rate limit)

---

### POST /api/auth/refresh
Refresh access token using refresh token

**Allowed Roles**: Public (no auth required)
**Rate Limit**: Tier 2 (60 req / min)

**Request Body**:
```typescript
{
  refreshToken: string;
}
```

**Example Response (200)**:
```json
{
  "accessToken": "new-jwt-token",
  "refreshToken": "new-refresh-token"
}
```

**Error Codes**: 401 (invalid or expired refresh token), 403 (session revoked)

---

### POST /api/auth/logout
Logout current session

**Allowed Roles**: All authenticated users

**Request Body**: None

**Example Response (200)**:
```json
{
  "message": "Logged out successfully"
}
```

**Error Codes**: 401 (not authenticated)

---

### GET /api/auth/me
Get current user profile

**Allowed Roles**: All authenticated users

**Query Parameters**: None

**Example Response (200)**:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "PARENT",
  "status": "ACTIVE",
  "firstName": "John",
  "lastName": "Doe",
  "middleName": "Michael",
  "fullName": "John Michael Doe",
  "phone": "+1234567890",
  "address": "123 Main St",
  "profilePictureUrl": "https://example.com/photo.jpg",
  "timezone": "Africa/Lagos",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Error Codes**: 401 (not authenticated)

---

### PATCH /api/auth/change-password
Change user password

**Allowed Roles**: All authenticated users

**Request Body**:
```typescript
{
  currentPassword: string;
  newPassword: string; // Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
}
```

**Example Response (200)**:
```json
{
  "message": "Password changed successfully"
}
```

**Error Codes**: 400 (invalid current password), 401 (not authenticated)

---

### PATCH /api/auth/change-pin
Change student PIN

**Allowed Roles**: All authenticated users (typically students)

**Request Body**:
```typescript
{
  currentPin: string; // Exactly 6 digits
  newPin: string; // Exactly 6 digits
}
```

**Example Response (200)**:
```json
{
  "message": "PIN changed successfully"
}
```

**Error Codes**: 400 (invalid current PIN), 401 (not authenticated)

---

### PATCH /api/auth/me/timezone
Update user timezone

**Allowed Roles**: All authenticated users

**Request Body**:
```typescript
{
  timezone: string; // IANA format, e.g., "Africa/Lagos"
}
```

**Example Response (200)**:
```json
{
  "message": "Timezone updated successfully",
  "timezone": "Africa/Lagos"
}
```

**Error Codes**: 400 (invalid timezone format), 401 (not authenticated)

---

### PATCH /api/auth/me/profile-picture
Update profile picture

**Allowed Roles**: All authenticated users

**Request Body**: multipart/form-data with file

**Example Response (200)**:
```json
{
  "message": "Profile picture updated successfully",
  "profilePictureUrl": "https://cloudinary.com/..."
}
```

**Error Codes**: 400 (no file uploaded), 401 (not authenticated)

---

### DELETE /api/auth/me/profile-picture
Delete profile picture

**Allowed Roles**: All authenticated users

**Request Body**: None

**Example Response (200)**:
```json
{
  "message": "Profile picture deleted successfully"
}
```

**Error Codes**: 401 (not authenticated)

---

### POST /api/auth/resend-otp
Resend verification OTP

**Allowed Roles**: Public (no auth required)
**Rate Limit**: Tier 1 (7 req / 15 min)

**Request Body**:
```typescript
{
  email: string;
}
```

**Example Response (200)**:
```json
{
  "message": "OTP sent successfully",
  "emailSent": true
}
```

**Error Codes**: 404 (user not found), 429 (rate limit)

---

## Parent

### GET /api/me
Get parent profile

**Allowed Roles**: PARENT

**Query Parameters**: None

**Example Response (200)**:
```json
{
  "id": "uuid",
  "email": "parent@example.com",
  "role": "PARENT",
  "status": "ACTIVE",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "address": "123 Main St",
  "profilePictureUrl": "https://example.com/photo.jpg",
  "timezone": "Africa/Lagos",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**Error Codes**: 401 (not authenticated), 403 (not a parent)

---

### GET /api/students/:id/performance
Get student performance (parent viewing child)

**Allowed Roles**: PARENT

**Path Parameters**:
- `id`: Student UUID

**Query Parameters**:
- `period?: 'week' | 'month' | 'quarter' | 'year' | 'all'`
- `from?: string` (ISO date)
- `to?: string` (ISO date)
- `subjectId?: string` (UUID)
- `includePending?: boolean`

**Example Response (200)**:
```json
{
  "studentId": "uuid",
  "period": "month",
  "from": "2024-01-01T00:00:00Z",
  "to": "2024-01-31T23:59:59Z",
  "overallStats": {
    "averageScore": 85.5,
    "attendanceRate": 92.5,
    "assignmentsCompleted": 12,
    "assignmentsTotal": 15,
    "sessionsAttended": 8,
    "sessionsTotal": 8
  },
  "bySubject": [
    {
      "subjectId": "uuid",
      "subjectName": "Mathematics",
      "averageScore": 88.0,
      "attendanceRate": 95.0,
      "gradeHistory": [
        {
          "id": "uuid",
          "periodStart": "2024-01-01",
          "periodEnd": "2024-01-31",
          "finalScore": 88.0,
          "status": "APPROVED"
        }
      ]
    }
  ]
}
```

**Error Codes**: 401 (not authenticated), 403 (not parent of student), 404 (student not found)

---

## Students

### POST /api/students
Create a new student (parent-only)

**Allowed Roles**: PARENT

**Request Body**:
```typescript
{
  fullName: string; // Min 2 chars, max 100 chars
  dateOfBirth: string; // ISO date string
  actualGrade: 'PRESCHOOL' | 'KINDERGARTEN' | 'GRADE_1' | 'GRADE_2' | 'GRADE_3' | 'GRADE_4' | 'GRADE_5' | 'GRADE_6' | 'GRADE_7' | 'GRADE_8' | 'GRADE_9' | 'GRADE_10' | 'GRADE_11' | 'GRADE_12';
  gradeLevel: string; // Free-text display field, min 1 char, max 50 chars
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  email?: string; // Contact email (not login credential)
  preferredStartDate?: string; // ISO date string
  school?: string; // Max 100 chars
  notes?: string; // Max 1000 chars
}
```

**Example Response (201)**:
```json
{
  "id": "uuid",
  "parentId": "uuid",
  "fullName": "Jane Doe",
  "dateOfBirth": "2015-05-15",
  "actualGrade": "GRADE_5",
  "gradeLevel": "Grade 5",
  "gender": "FEMALE",
  "email": "jane@example.com",
  "preferredStartDate": "2024-02-01",
  "school": "Springfield Elementary",
  "notes": "Likes math, needs help with reading",
  "studentCode": "ABC123",
  "studentPin": "123456",
  "status": "ACTIVE",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated), 403 (not a parent)

---

### GET /api/students
Get parent's students

**Allowed Roles**: PARENT

**Query Parameters**: None

**Example Response (200)**:
```json
[
  {
    "id": "uuid",
    "fullName": "Jane Doe",
    "actualGrade": "GRADE_5",
    "gradeLevel": "Grade 5",
    "studentCode": "ABC123",
    "status": "ACTIVE",
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

**Error Codes**: 401 (not authenticated), 403 (not a parent)

---

### GET /api/students/:id
Get student details

**Allowed Roles**: PARENT

**Path Parameters**:
- `id`: Student UUID

**Example Response (200)**:
```json
{
  "id": "uuid",
  "parentId": "uuid",
  "fullName": "Jane Doe",
  "dateOfBirth": "2015-05-15",
  "actualGrade": "GRADE_5",
  "gradeLevel": "Grade 5",
  "gender": "FEMALE",
  "email": "jane@example.com",
  "preferredStartDate": "2024-02-01",
  "school": "Springfield Elementary",
  "notes": "Likes math, needs help with reading",
  "studentCode": "ABC123",
  "status": "ACTIVE",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Error Codes**: 401 (not authenticated), 403 (not parent of student), 404 (student not found)

---

### GET /api/students/:id/activity
Get student activity

**Allowed Roles**: PARENT

**Path Parameters**:
- `id`: Student UUID

**Example Response (200)**:
```json
{
  "studentId": "uuid",
  "recentSessions": 5,
  "recentAssignments": 3,
  "recentGrades": 2,
  "lastActivity": "2024-01-15T10:30:00Z"
}
```

**Error Codes**: 401 (not authenticated), 403 (not parent of student), 404 (student not found)

---

### POST /api/students/:id/regenerate-pin
Regenerate student PIN

**Allowed Roles**: PARENT

**Path Parameters**:
- `id`: Student UUID

**Example Response (200)**:
```json
{
  "message": "PIN regenerated successfully",
  "newPin": "654321"
}
```

**Error Codes**: 401 (not authenticated), 403 (not parent of student), 404 (student not found)

---

### GET /api/students/:id/attendance
Get student attendance

**Allowed Roles**: All authenticated users (filtered by role in service)

**Path Parameters**:
- `id`: Student UUID

**Query Parameters**:
- `page?: number` (default: 1)
- `limit?: number` (default: 20)

**Example Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "sessionId": "uuid",
      "studentId": "uuid",
      "attended": true,
      "attendanceDate": "2024-01-15",
      "notes": null
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 50
}
```

**Error Codes**: 401 (not authenticated), 403 (access denied), 404 (student not found)

---

## Student (Self-Service)

### GET /api/student/me
Get student profile

**Allowed Roles**: STUDENT

**Example Response (200)**:
```json
{
  "id": "uuid",
  "fullName": "Jane Doe",
  "actualGrade": "GRADE_5",
  "gradeLevel": "Grade 5",
  "studentCode": "ABC123",
  "status": "ACTIVE",
  "parentId": "uuid"
}
```

**Error Codes**: 401 (not authenticated), 403 (not a student)

---

### GET /api/student/me/schedule
Get student class schedule

**Allowed Roles**: STUDENT

**Example Response (200)**:
```json
{
  "upcomingSessions": [
    {
      "id": "uuid",
      "scheduledAt": "2024-01-20T14:00:00Z",
      "durationMinutes": 60,
      "subject": "Mathematics",
      "tutorName": "Dr. Smith",
      "googleMeetLink": "https://meet.google.com/..."
    }
  ]
}
```

**Error Codes**: 401 (not authenticated), 403 (not a student)

---

### GET /api/student/me/assignments
Get student assignments

**Allowed Roles**: STUDENT

**Example Response (200)**:
```json
{
  "pending": [
    {
      "id": "uuid",
      "title": "Chapter 5 Problems",
      "dueDate": "2024-01-20T23:59:59Z",
      "subject": "Mathematics"
    }
  ],
  "completed": []
}
```

**Error Codes**: 401 (not authenticated), 403 (not a student)

---

### GET /api/student/me/grades
Get student grades

**Allowed Roles**: STUDENT

**Example Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "enrollmentId": "uuid",
      "periodStart": "2024-01-01",
      "periodEnd": "2024-01-31",
      "finalScore": 88.0,
      "status": "APPROVED",
      "subject": "Mathematics"
    }
  ]
}
```

**Error Codes**: 401 (not authenticated), 403 (not a student)

---

### GET /api/student/me/progress-reports
Get student progress reports

**Allowed Roles**: STUDENT

**Example Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "enrollmentId": "uuid",
      "period": "January 2024",
      "summary": "Good progress overall",
      "strengths": "Strong problem-solving skills",
      "areasToImprove": "Needs more practice with fractions",
      "createdAt": "2024-01-31T00:00:00Z"
    }
  ]
}
```

**Error Codes**: 401 (not authenticated), 403 (not a student)

---

### GET /api/student/me/performance
Get student performance

**Allowed Roles**: STUDENT

**Query Parameters**:
- `period?: 'week' | 'month' | 'quarter' | 'year' | 'all'`
- `from?: string` (ISO date)
- `to?: string` (ISO date)
- `subjectId?: string` (UUID)

**Example Response (200)**:
```json
{
  "overallStats": {
    "averageScore": 85.5,
    "attendanceRate": 92.5
  },
  "bySubject": [...]
}
```

**Error Codes**: 401 (not authenticated), 403 (not a student)

---

### GET /api/student/me/next-class
Get next upcoming class

**Allowed Roles**: STUDENT

**Example Response (200)**:
```json
{
  "id": "uuid",
  "scheduledAt": "2024-01-20T14:00:00Z",
  "durationMinutes": 60,
  "subject": "Mathematics",
  "tutorName": "Dr. Smith",
  "googleMeetLink": "https://meet.google.com/..."
}
```

**Error Codes**: 401 (not authenticated), 403 (not a student)

---

### GET /api/student/me/attendance
Get student's own attendance

**Allowed Roles**: STUDENT

**Example Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "sessionId": "uuid",
      "attended": true,
      "attendanceDate": "2024-01-15"
    }
  ],
  "total": 50,
  "attended": 46,
  "rate": 92.0
}
```

**Error Codes**: 401 (not authenticated), 403 (not a student)

---

### GET /api/student/me/tutors
Get student's tutors

**Allowed Roles**: STUDENT

**Example Response (200)**:
```json
[
  {
    "id": "uuid",
    "fullName": "Dr. Smith",
    "subject": "Mathematics",
    "enrollmentId": "uuid"
  }
]
```

**Error Codes**: 401 (not authenticated), 403 (not a student)

---

### GET /api/student/me/enrollments
Get student's enrollments

**Allowed Roles**: STUDENT

**Example Response (200)**:
```json
[
  {
    "id": "uuid",
    "subject": {
      "id": "uuid",
      "name": "Mathematics",
      "category": "CORE"
    },
    "status": "ACTIVE",
    "sessionFrequency": "TWICE_WEEKLY",
    "startDate": "2024-01-01"
  }
]
```

**Error Codes**: 401 (not authenticated), 403 (not a student)

---

### GET /api/student/me/enrollments/:enrollmentId/sessions
Get sessions for a specific enrollment

**Allowed Roles**: STUDENT

**Path Parameters**:
- `enrollmentId`: Enrollment UUID

**Example Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "scheduledAt": "2024-01-20T14:00:00Z",
      "durationMinutes": 60,
      "status": "SCHEDULED",
      "googleMeetLink": "https://meet.google.com/..."
    }
  ]
}
```

**Error Codes**: 401 (not authenticated), 403 (not a student), 404 (enrollment not found)

---

## Enrollments

### POST /api/enrollments
Create a new enrollment (parent-only)

**Allowed Roles**: PARENT

**Request Body**:
```typescript
{
  studentId: string; // UUID
  subjectIds: string[]; // Array of 1-4 subject UUIDs
  sessionFrequency: 'TWICE_WEEKLY' | 'THRICE_WEEKLY' | 'FIVE_TIMES_WEEKLY';
  availableDays: string[]; // Array of day codes: MON, TUE, WED, THU, FRI, SAT, SUN (count must match sessionFrequency)
  preferredStartHour: number; // 0-23 (parent's local timezone)
  preferredEndHour: number; // 0-23 (parent's local timezone, must be > preferredStartHour)
  billingFrequency?: 'WEEKLY' | 'MONTHLY' | 'YEARLY'; // Default: YEARLY
  startDate: string; // ISO date string
  endDate?: string; // ISO date string (optional)
}
```

**Example Response (201)**:
```json
{
  "enrollments": [
    {
      "id": "uuid",
      "studentId": "uuid",
      "subjectId": "uuid",
      "enrollmentGroupId": "uuid",
      "status": "PENDING_PAYMENT",
      "sessionFrequency": "TWICE_WEEKLY",
      "availableDays": ["MON", "WED"],
      "billingFrequency": "YEARLY",
      "startDate": "2024-02-01",
      "createdAt": "2024-01-15T00:00:00Z"
    }
  ],
  "enrollmentGroupId": "uuid",
  "totalPriceNGN": 150000,
  "totalPriceUSD": 100
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated), 403 (not a parent)

---

### GET /api/enrollments
Get enrollments (parent or tutor)

**Allowed Roles**: PARENT, TUTOR

**Query Parameters**:
- `status?: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'`

**Example Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "studentId": "uuid",
      "studentName": "Jane Doe",
      "subjectId": "uuid",
      "subjectName": "Mathematics",
      "tutorId": "uuid",
      "tutorName": "Dr. Smith",
      "status": "ACTIVE",
      "sessionFrequency": "TWICE_WEEKLY",
      "startDate": "2024-01-01"
    }
  ],
  "total": 10
}
```

**Error Codes**: 401 (not authenticated), 403 (access denied)

---

### GET /api/enrollments/group/:groupId
Get enrollments by group ID

**Allowed Roles**: PARENT, TUTOR, ADMIN

**Path Parameters**:
- `groupId`: Enrollment Group UUID

**Example Response (200)**:
```json
{
  "enrollmentGroupId": "uuid",
  "enrollments": [
    {
      "id": "uuid",
      "subjectId": "uuid",
      "subjectName": "Mathematics",
      "status": "ACTIVE"
    }
  ]
}
```

**Error Codes**: 401 (not authenticated), 404 (group not found)

---

### GET /api/enrollments/:id
Get enrollment details

**Allowed Roles**: PARENT, TUTOR

**Path Parameters**:
- `id`: Enrollment UUID

**Example Response (200)**:
```json
{
  "id": "uuid",
  "studentId": "uuid",
  "studentName": "Jane Doe",
  "subjectId": "uuid",
  "subjectName": "Mathematics",
  "tutorId": "uuid",
  "tutorName": "Dr. Smith",
  "status": "ACTIVE",
  "sessionFrequency": "TWICE_WEEKLY",
  "availableDays": ["MON", "WED"],
  "preferredStartHour": 14,
  "preferredEndHour": 16,
  "billingFrequency": "YEARLY",
  "yearlyPriceNGN": 75000,
  "yearlyPriceUSD": 50,
  "startDate": "2024-01-01",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**Error Codes**: 401 (not authenticated), 403 (access denied), 404 (enrollment not found)

---

## Enrollment Change Requests

### POST /api/enrollments/change-requests
Create an enrollment change request (parent-only)

**Allowed Roles**: PARENT

**Request Body**:
```typescript
{
  enrollmentId: string; // UUID
  requestedValues: {
    startDate?: string; // ISO date string
    endDate?: string; // ISO date string
    availableDays?: string[]; // Array of day codes
    preferredStartHour?: number; // 0-23
    preferredEndHour?: number; // 0-23
    sessionFrequency?: string;
  };
}
```

**Example Response (201)**:
```json
{
  "id": "uuid",
  "enrollmentId": "uuid",
  "parentId": "uuid",
  "status": "PENDING",
  "requestedValues": {
    "availableDays": ["TUE", "THU"]
  },
  "currentValues": {
    "availableDays": ["MON", "WED"]
  },
  "createdAt": "2024-01-15T00:00:00Z"
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated), 403 (not a parent)

---

### GET /api/enrollments/change-requests
Get enrollment change requests (parent-only)

**Allowed Roles**: PARENT

**Query Parameters**:
- `enrollmentId: string` (required) - Enrollment UUID

**Example Response (200)**:
```json
[
  {
    "id": "uuid",
    "enrollmentId": "uuid",
    "status": "PENDING",
    "requestedValues": {...},
    "createdAt": "2024-01-15T00:00:00Z"
  }
]
```

**Error Codes**: 400 (missing enrollmentId), 401 (not authenticated), 403 (not a parent)

---

### PATCH /api/enrollments/change-requests/:id/cancel
Cancel an enrollment change request (parent-only)

**Allowed Roles**: PARENT

**Path Parameters**:
- `id`: Change Request UUID

**Example Response (200)**:
```json
{
  "id": "uuid",
  "status": "CANCELLED",
  "cancelledAt": "2024-01-15T12:00:00Z"
}
```

**Error Codes**: 401 (not authenticated), 403 (not parent of request), 404 (request not found)

---

### GET /api/admin/change-requests
Get all enrollment change requests (admin-only)

**Allowed Roles**: ADMIN

**Query Parameters**:
- `status?: string`
- `page?: number` (default: 1)
- `limit?: number` (default: 20, max: 100)

**Example Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "enrollmentId": "uuid",
      "parentId": "uuid",
      "status": "PENDING",
      "requestedValues": {...},
      "createdAt": "2024-01-15T00:00:00Z"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 50
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin)

---

### GET /api/admin/change-requests/:id
Get enrollment change request details (admin-only)

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Change Request UUID

**Example Response (200)**:
```json
{
  "id": "uuid",
  "enrollmentId": "uuid",
  "enrollment": {
    "id": "uuid",
    "studentName": "Jane Doe",
    "subjectName": "Mathematics"
  },
  "parentId": "uuid",
  "parentEmail": "parent@example.com",
  "status": "PENDING",
  "requestedValues": {...},
  "currentValues": {...},
  "createdAt": "2024-01-15T00:00:00Z"
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin), 404 (request not found)

---

### PATCH /api/admin/change-requests/:id/approve
Approve an enrollment change request (admin-only)

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Change Request UUID

**Example Response (200)**:
```json
{
  "id": "uuid",
  "status": "APPROVED",
  "approvedAt": "2024-01-15T12:00:00Z",
  "approvedBy": "uuid",
  "enrollment": {
    "id": "uuid",
    "availableDays": ["TUE", "THU"]
  }
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin), 404 (request not found)

---

### PATCH /api/admin/change-requests/:id/reject
Reject an enrollment change request (admin-only)

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Change Request UUID

**Request Body**:
```typescript
{
  reason: string; // Min 10 characters
}
```

**Example Response (200)**:
```json
{
  "id": "uuid",
  "status": "REJECTED",
  "rejectedAt": "2024-01-15T12:00:00Z",
  "rejectedBy": "uuid",
  "rejectionReason": "Schedule conflict with tutor availability"
}
```

**Error Codes**: 400 (missing reason), 401 (not authenticated), 403 (not an admin), 404 (request not found)

---

## Sessions

### GET /api/sessions
Get sessions (parent/student)

**Allowed Roles**: All authenticated users (filtered by role)

**Query Parameters**:
- `enrollmentId?: string` (UUID)
- `status?: 'SCHEDULED' | 'COMPLETED' | 'MISSED' | 'CANCELLED'`

**Example Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "enrollmentId": "uuid",
      "subjectName": "Mathematics",
      "tutorName": "Dr. Smith",
      "scheduledAt": "2024-01-20T14:00:00Z",
      "durationMinutes": 60,
      "status": "SCHEDULED",
      "googleMeetLink": "https://meet.google.com/..."
    }
  ],
  "total": 20
}
```

**Error Codes**: 401 (not authenticated)

---

### PATCH /api/sessions/:id
Update session (tutor-only)

**Allowed Roles**: TUTOR

**Path Parameters**:
- `id`: Session UUID

**Request Body**:
```typescript
{
  status?: 'COMPLETED' | 'MISSED' | 'CANCELLED';
  tutorNotes?: string;
  homeworkAssigned?: string;
  durationMinutes?: number; // Positive integer
  participants?: Array<{
    enrollmentId: string; // UUID
    attended: boolean;
  }>;
}
```

**Example Response (200)**:
```json
{
  "id": "uuid",
  "status": "COMPLETED",
  "tutorNotes": "Great progress today",
  "homeworkAssigned": "Chapter 5 problems 1-10",
  "durationMinutes": 60,
  "participants": [...]
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated), 403 (not tutor of session), 404 (session not found)

---

### GET /api/sessions/:id/recording
Get session recording URL

**Allowed Roles**: All authenticated users (with proper authorization)

**Path Parameters**:
- `id`: Session UUID

**Example Response (200)**:
```json
{
  "recordingUrl": "https://drive.google.com/..."
}
```

**Error Codes**: 401 (not authenticated), 403 (access denied), 404 (session not found or no recording)

---

## Tutor

### GET /api/tutor/students
Get tutor's assigned students

**Allowed Roles**: TUTOR (approved only)

**Example Response (200)**:
```json
[
  {
    "enrollmentId": "uuid",
    "studentId": "uuid",
    "studentName": "Jane Doe",
    "subjectId": "uuid",
    "subjectName": "Mathematics",
    "sessionFrequency": "TWICE_WEEKLY",
    "startDate": "2024-01-01"
  }
]
```

**Error Codes**: 401 (not authenticated), 403 (not an approved tutor)

---

### GET /api/tutor/students/:studentId
Get student detail (tutor viewing assigned student)

**Allowed Roles**: TUTOR (approved only)

**Path Parameters**:
- `studentId`: Student UUID

**Example Response (200)**:
```json
{
  "studentId": "uuid",
  "studentName": "Jane Doe",
  "actualGrade": "GRADE_5",
  "gradeLevel": "Grade 5",
  "enrollments": [
    {
      "id": "uuid",
      "subjectName": "Mathematics",
      "sessionFrequency": "TWICE_WEEKLY",
      "status": "ACTIVE"
    }
  ]
}
```

**Error Codes**: 401 (not authenticated), 403 (not tutor of student), 404 (student not found)

---

### GET /api/tutor/students/:studentId/performance
Get student performance (tutor viewing assigned student)

**Allowed Roles**: TUTOR (approved only)

**Path Parameters**:
- `studentId`: Student UUID

**Query Parameters**:
- `period?: 'week' | 'month' | 'quarter' | 'year' | 'all'`
- `from?: string` (ISO date)
- `to?: string` (ISO date)
- `subjectId?: string` (UUID)
- `includePending?: boolean`

**Example Response (200)**:
```json
{
  "studentId": "uuid",
  "period": "month",
  "overallStats": {
    "averageScore": 85.5,
    "attendanceRate": 92.5
  },
  "bySubject": [...]
}
```

**Error Codes**: 401 (not authenticated), 403 (not tutor of student), 404 (student not found)

---

### GET /api/tutor/sessions
Get tutor's sessions

**Allowed Roles**: TUTOR (approved only)

**Example Response (200)**:
```json
[
  {
    "id": "uuid",
    "enrollmentId": "uuid",
    "studentName": "Jane Doe",
    "subjectName": "Mathematics",
    "scheduledAt": "2024-01-20T14:00:00Z",
    "durationMinutes": 60,
    "status": "SCHEDULED",
    "googleMeetLink": "https://meet.google.com/..."
  }
]
```

**Error Codes**: 401 (not authenticated), 403 (not an approved tutor)

---

### POST /api/tutor/sessions
Create a tutor session (tutor-only for single enrollment)

**Allowed Roles**: TUTOR (approved only)

**Request Body**:
```typescript
{
  enrollmentId: string; // UUID
  scheduledAt: string; // ISO date string
  durationMinutes: number; // Positive integer
}
```

**Example Response (201)**:
```json
{
  "id": "uuid",
  "enrollmentId": "uuid",
  "tutorId": "uuid",
  "scheduledAt": "2024-01-20T14:00:00Z",
  "durationMinutes": 60,
  "status": "SCHEDULED",
  "googleMeetLink": "https://meet.google.com/...",
  "googleEventId": "event-id"
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated), 403 (not an approved tutor)

---

### PATCH /api/tutor/sessions/:id/reschedule
Reschedule a tutor session

**Allowed Roles**: TUTOR (approved only)

**Path Parameters**:
- `id`: Session UUID

**Request Body**:
```typescript
{
  scheduledAt: string; // ISO date string
  durationMinutes?: number; // Positive integer (optional)
}
```

**Example Response (200)**:
```json
{
  "id": "uuid",
  "scheduledAt": "2024-01-21T14:00:00Z",
  "durationMinutes": 60,
  "googleMeetLink": "https://meet.google.com/...",
  "googleEventId": "new-event-id"
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated), 403 (not tutor of session), 404 (session not found)

---

### DELETE /api/tutor/sessions/:id
Delete a tutor session

**Allowed Roles**: TUTOR (approved only)

**Path Parameters**:
- `id`: Session UUID

**Example Response (200)**:
```json
{
  "message": "Session deleted successfully"
}
```

**Error Codes**: 401 (not authenticated), 403 (not tutor of session), 404 (session not found)

---

## Tutor Application

### GET /api/tutor-application
Get draft tutor application

**Allowed Roles**: TUTOR (not yet approved)
**Rate Limit**: Tier 2 (60 req / min)

**Example Response (200)**:
```json
{
  "id": "uuid",
  "tutorId": "uuid",
  "status": "DRAFT",
  "birthDay": 15,
  "birthMonth": 5,
  "country": "Nigeria",
  "city": "Lagos",
  "highestQualification": "B.Sc. Mathematics",
  "subjects": [
    {
      "id": "uuid",
      "name": "Mathematics"
    }
  ],
  "levels": ["GRADE_5", "GRADE_6"],
  "yearsOfExperience": 5,
  "whyTeach": "I love helping students learn",
  "howHeard": "Friend",
  "aboutYou": ["patient", "organized"],
  "documents": []
}
```

**Error Codes**: 401 (not authenticated), 403 (not a tutor)

---

### PATCH /api/tutor-application
Update tutor application (partial autosave)

**Allowed Roles**: TUTOR (not yet approved)
**Rate Limit**: Tier 2 (60 req / min)

**Request Body**: Partial update of application fields

**Example Response (200)**:
```json
{
  "id": "uuid",
  "status": "DRAFT",
  "updatedAt": "2024-01-15T12:00:00Z"
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated), 403 (not a tutor)

---

### POST /api/tutor-application/documents
Upload document for tutor application

**Allowed Roles**: TUTOR (not yet approved)
**Rate Limit**: Tier 2 (60 req / min)

**Request Body**: multipart/form-data with file (max 5 MB)

**Example Response (201)**:
```json
{
  "id": "uuid",
  "name": "certificate.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 1024000,
  "url": "https://cloudinary.com/...",
  "expiresAt": "2024-01-16T00:00:00Z"
}
```

**Error Codes**: 400 (invalid file), 401 (not authenticated), 403 (not a tutor), 413 (file too large)

---

### GET /api/tutor-application/documents/:id
Get signed URL for document download

**Allowed Roles**: All authenticated users
**Rate Limit**: Tier 2 (60 req / min)

**Path Parameters**:
- `id`: Document UUID

**Example Response (200)**:
```json
{
  "url": "https://cloudinary.com/...",
  "expiresAt": "2024-01-16T00:00:00Z"
}
```

**Error Codes**: 401 (not authenticated), 404 (document not found)

---

### DELETE /api/tutor-application/documents/:id
Delete document from tutor application

**Allowed Roles**: TUTOR (not yet approved)
**Rate Limit**: Tier 2 (60 req / min)

**Path Parameters**:
- `id`: Document UUID

**Example Response (200)**:
```json
{
  "message": "Document deleted successfully"
}
```

**Error Codes**: 401 (not authenticated), 403 (not document owner), 404 (document not found)

---

### POST /api/tutor-application/submit
Submit tutor application for review

**Allowed Roles**: TUTOR (not yet approved)
**Rate Limit**: Tier 2 (60 req / min)

**Request Body**: None (or final validation)

**Example Response (200)**:
```json
{
  "id": "uuid",
  "status": "SUBMITTED",
  "submittedAt": "2024-01-15T12:00:00Z"
}
```

**Error Codes**: 400 (incomplete application), 401 (not authenticated), 403 (not a tutor)

---

## Tutor Profile

### POST /api/tutor/tutor-profile
Create tutor profile (approved tutor only)

**Allowed Roles**: TUTOR (approved only)

**Request Body**:
```typescript
{
  subjects: string[]; // Array of 1-20 subject names
  bio: string; // Min 10 chars, max 2000 chars
  credentialsUrl?: string; // URL, max 500 chars
  hourlyRate: number; // Positive, max 1000
  availability: Record<string, any>; // Availability schedule object
}
```

**Example Response (201)**:
```json
{
  "id": "uuid",
  "tutorId": "uuid",
  "bio": "Experienced math tutor...",
  "hourlyRate": 50,
  "availability": {...},
  "availabilityStatus": "AVAILABLE",
  "maxStudents": 10,
  "vettingStatus": "APPROVED",
  "createdAt": "2024-01-15T00:00:00Z"
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated), 403 (not an approved tutor)

---

### PATCH /api/tutor/tutor-profile
Update tutor availability

**Allowed Roles**: TUTOR (approved only)

**Request Body**:
```typescript
{
  availability: Record<string, any>;
}
```

**Example Response (200)**:
```json
{
  "id": "uuid",
  "availability": {...},
  "updatedAt": "2024-01-15T12:00:00Z"
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated), 403 (not an approved tutor)

---

### PATCH /api/tutor/tutor-profile/availability-status
Update tutor availability status

**Allowed Roles**: TUTOR (approved only)

**Request Body**:
```typescript
{
  availabilityStatus: 'AVAILABLE' | 'LIMITED' | 'UNAVAILABLE';
  maxStudents?: number; // Positive integer
  statusNote?: string; // Max 500 chars
}
```

**Example Response (200)**:
```json
{
  "id": "uuid",
  "availabilityStatus": "LIMITED",
  "maxStudents": 5,
  "statusNote": "Reduced availability due to exams",
  "statusUpdatedAt": "2024-01-15T12:00:00Z"
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated), 403 (not an approved tutor)

---

### GET /api/tutor/tutor-profile
Get tutor profile

**Allowed Roles**: TUTOR (approved only)

**Example Response (200)**:
```json
{
  "id": "uuid",
  "tutorId": "uuid",
  "bio": "Experienced math tutor...",
  "hourlyRate": 50,
  "availability": {...},
  "availabilityStatus": "AVAILABLE",
  "maxStudents": 10,
  "currentStudentCount": 5,
  "vettingStatus": "APPROVED",
  "subjects": [
    {
      "id": "uuid",
      "name": "Mathematics",
      "category": "CORE"
    }
  ],
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**Error Codes**: 401 (not authenticated), 403 (not an approved tutor)

---

## Scored Items

### GET /api/tutor/students/:studentId/scored-items
Get student's scored items (tutor-only)

**Allowed Roles**: TUTOR (approved only)

**Path Parameters**:
- `studentId`: Student UUID

**Query Parameters**:
- `enrollmentId?: string` (UUID)
- `type?: 'QUIZ' | 'TEST' | 'HOMEWORK' | 'CLASSWORK' | 'PROJECT' | 'EXAM'`
- `unassigned?: boolean`

**Example Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "enrollmentId": "uuid",
      "type": "QUIZ",
      "score": 8,
      "maxScore": 10,
      "comment": "Good effort",
      "createdAt": "2024-01-15T00:00:00Z"
    }
  ],
  "total": 20
}
```

**Error Codes**: 401 (not authenticated), 403 (not tutor of student), 404 (student not found)

---

### POST /api/tutor/scored-items
Create a scored item (tutor-only)

**Allowed Roles**: TUTOR (approved only)

**Request Body**:
```typescript
{
  enrollmentId: string; // UUID
  type: 'QUIZ' | 'TEST' | 'HOMEWORK' | 'CLASSWORK' | 'PROJECT' | 'EXAM';
  score: number; // >= 0
  maxScore: number; // > 0
  comment?: string;
}
```

**Example Response (201)**:
```json
{
  "id": "uuid",
  "enrollmentId": "uuid",
  "type": "QUIZ",
  "score": 8,
  "maxScore": 10,
  "comment": "Good effort",
  "createdAt": "2024-01-15T00:00:00Z"
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated), 403 (not an approved tutor)

---

### PATCH /api/tutor/scored-items/:id
Update a scored item (tutor-only)

**Allowed Roles**: TUTOR (approved only)

**Path Parameters**:
- `id`: Scored Item UUID

**Request Body**:
```typescript
{
  score?: number; // >= 0
  maxScore?: number; // > 0
  comment?: string;
}
```

**Example Response (200)**:
```json
{
  "id": "uuid",
  "score": 9,
  "maxScore": 10,
  "comment": "Improved!",
  "updatedAt": "2024-01-15T12:00:00Z"
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated), 403 (not owner), 404 (item not found)

---

### DELETE /api/tutor/scored-items/:id
Delete a scored item (tutor-only)

**Allowed Roles**: TUTOR (approved only)

**Path Parameters**:
- `id`: Scored Item UUID

**Example Response (200)**:
```json
{
  "message": "Scored item deleted"
}
```

**Error Codes**: 401 (not authenticated), 403 (not owner), 404 (item not found)

---

## Grades

### POST /api/grades
Create a draft grade (tutor-only)

**Allowed Roles**: TUTOR (approved only)

**Request Body**:
```typescript
{
  enrollmentId: string; // UUID
  periodStart: string; // ISO date string
  periodEnd: string; // ISO date string
  components: Array<{
    type: string;
    weight: number; // 0-100
    scoredItemId?: string; // UUID (optional)
    attendanceRate?: number; // 0-100 (optional)
  }>; // At least 1 component, weights must total 100
  tutorComment?: string;
}
```

**Example Response (201)**:
```json
{
  "id": "uuid",
  "enrollmentId": "uuid",
  "periodStart": "2024-01-01",
  "periodEnd": "2024-01-31",
  "components": [...],
  "tutorComment": "Good progress",
  "status": "DRAFT",
  "calculatedScore": 85.5,
  "createdAt": "2024-01-15T00:00:00Z"
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated), 403 (not an approved tutor)

---

### PATCH /api/grades/:id
Update a grade (tutor-only)

**Allowed Roles**: TUTOR (approved only)

**Path Parameters**:
- `id`: Grade UUID

**Request Body**:
```typescript
{
  periodStart?: string; // ISO date string
  periodEnd?: string; // ISO date string
  components?: Array<{...}>; // Optional, weights must total 100 if provided
  tutorComment?: string;
  finalScore?: number; // 0-100 (requires overrideReason)
  overrideReason?: string; // Min 10 chars (required if finalScore provided)
}
```

**Example Response (200)**:
```json
{
  "id": "uuid",
  "periodStart": "2024-01-01",
  "periodEnd": "2024-01-31",
  "components": [...],
  "tutorComment": "Updated comment",
  "finalScore": 90.0,
  "overrideReason": "Extra credit for project",
  "status": "DRAFT",
  "updatedAt": "2024-01-15T12:00:00Z"
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated), 403 (not owner)

---

### DELETE /api/grades/:id
Delete a grade (tutor-only)

**Allowed Roles**: TUTOR (approved only)

**Path Parameters**:
- `id`: Grade UUID

**Example Response (200)**:
```json
{
  "message": "Grade deleted successfully"
}
```

**Error Codes**: 401 (not authenticated), 403 (not owner), 404 (grade not found)

---

### POST /api/grades/:id/submit
Submit a grade for admin approval (tutor-only)

**Allowed Roles**: TUTOR (approved only)

**Path Parameters**:
- `id`: Grade UUID

**Example Response (200)**:
```json
{
  "id": "uuid",
  "status": "PENDING_APPROVAL",
  "submittedAt": "2024-01-15T12:00:00Z",
  "finalScore": 85.5
}
```

**Error Codes**: 401 (not authenticated), 403 (not owner), 404 (grade not found)

---

### POST /api/grades/:id/withdraw
Withdraw a submitted grade (tutor-only)

**Allowed Roles**: TUTOR (approved only)

**Path Parameters**:
- `id`: Grade UUID

**Example Response (200)**:
```json
{
  "id": "uuid",
  "status": "DRAFT",
  "withdrawnAt": "2024-01-15T12:00:00Z"
}
```

**Error Codes**: 401 (not authenticated), 403 (not owner), 404 (grade not found)

---

### GET /api/grades/:id/preview
Preview a grade (tutor-only)

**Allowed Roles**: TUTOR (approved only)

**Path Parameters**:
- `id`: Grade UUID

**Example Response (200)**:
```json
{
  "id": "uuid",
  "enrollmentId": "uuid",
  "periodStart": "2024-01-01",
  "periodEnd": "2024-01-31",
  "components": [...],
  "tutorComment": "Good progress",
  "calculatedScore": 85.5,
  "studentName": "Jane Doe",
  "subjectName": "Mathematics"
}
```

**Error Codes**: 401 (not authenticated), 403 (not owner), 404 (grade not found)

---

### GET /api/grades
Get grades (legacy endpoint, filtered by role)

**Allowed Roles**: All authenticated users

**Query Parameters**:
- `status?: string`
- `tutorId?: string` (UUID)
- `studentId?: string` (UUID)
- `subjectId?: string` (UUID)
- `page?: number`
- `limit?: number`

**Example Response (200)**:
```json
{
  "data": [...],
  "page": 1,
  "limit": 20,
  "total": 50
}
```

**Error Codes**: 401 (not authenticated)

---

### GET /api/admin/grades
Get all grades for admin review

**Allowed Roles**: ADMIN

**Query Parameters**:
- `status?: string`
- `tutorId?: string` (UUID)
- `studentId?: string` (UUID)
- `subjectId?: string` (UUID)
- `page?: number`
- `limit?: number`

**Example Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "enrollmentId": "uuid",
      "studentName": "Jane Doe",
      "tutorName": "Dr. Smith",
      "subjectName": "Mathematics",
      "periodStart": "2024-01-01",
      "periodEnd": "2024-01-31",
      "finalScore": 85.5,
      "status": "PENDING_APPROVAL",
      "submittedAt": "2024-01-15T00:00:00Z"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 50
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin)

---

### GET /api/admin/grades/:id
Get grade details for admin review

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Grade UUID

**Example Response (200)**:
```json
{
  "id": "uuid",
  "enrollmentId": "uuid",
  "periodStart": "2024-01-01",
  "periodEnd": "2024-01-31",
  "components": [
    {
      "type": "Attendance",
      "weight": 20,
      "attendanceRate": 92.5
    },
    {
      "type": "Quizzes",
      "weight": 30,
      "scoredItemId": "uuid",
      "score": 85
    }
  ],
  "tutorComment": "Good progress",
  "finalScore": 85.5,
  "status": "PENDING_APPROVAL",
  "student": {
    "id": "uuid",
    "fullName": "Jane Doe"
  },
  "tutor": {
    "id": "uuid",
    "fullName": "Dr. Smith"
  },
  "subject": {
    "id": "uuid",
    "name": "Mathematics"
  }
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin), 404 (grade not found)

---

### PATCH /api/admin/grades/:id/approve
Approve a grade (admin-only)

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Grade UUID

**Example Response (200)**:
```json
{
  "id": "uuid",
  "status": "APPROVED",
  "approvedAt": "2024-01-15T12:00:00Z",
  "approvedBy": "uuid",
  "finalScore": 85.5
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin), 404 (grade not found)

---

### PATCH /api/admin/grades/:id/reject
Reject a grade (admin-only)

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Grade UUID

**Request Body**:
```typescript
{
  reason: string; // Min 10 characters
}
```

**Example Response (200)**:
```json
{
  "id": "uuid",
  "status": "REJECTED",
  "rejectedAt": "2024-01-15T12:00:00Z",
  "rejectedBy": "uuid",
  "rejectionReason": "Missing attendance data"
}
```

**Error Codes**: 400 (missing reason), 401 (not authenticated), 403 (not an admin), 404 (grade not found)

---

### POST /api/admin/grades/bulk-approve
Bulk approve grades (admin-only)

**Allowed Roles**: ADMIN

**Request Body**:
```typescript
{
  gradeIds: string[]; // Array of grade UUIDs, min 1
}
```

**Example Response (200)**:
```json
{
  "approved": 10,
  "failed": 0,
  "grades": [
    {
      "id": "uuid",
      "status": "APPROVED"
    }
  ]
}
```

**Error Codes**: 400 (no grade IDs), 401 (not authenticated), 403 (not an admin)

---

## Assignments

### POST /api/assignments
Create an assignment (tutor-only)

**Allowed Roles**: TUTOR

**Request Body**:
```typescript
{
  enrollmentId: string; // UUID
  title: string; // Min 1 char, max 200 chars
  description?: string;
  type: 'ASSIGNMENT' | 'CLASSWORK' | 'TEST' | 'HOMEWORK' | 'PROJECT' | 'QUIZ';
  dueDate: string; // ISO date string
  attachmentUrl?: string; // URL
  attachmentName?: string;
}
```

**Example Response (201)**:
```json
{
  "id": "uuid",
  "enrollmentId": "uuid",
  "title": "Chapter 5 Problems",
  "description": "Complete problems 1-10",
  "type": "HOMEWORK",
  "dueDate": "2024-01-20T23:59:59Z",
  "attachmentUrl": "https://cloudinary.com/...",
  "attachmentName": "worksheet.pdf",
  "status": "PENDING",
  "createdAt": "2024-01-15T00:00:00Z"
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated), 403 (not a tutor)

---

### GET /api/assignments
Get assignments (filtered by role)

**Allowed Roles**: All authenticated users

**Query Parameters**:
- `enrollmentId?: string` (UUID)
- `status?: 'PENDING' | 'COMPLETED' | 'SUBMITTED' | 'GRADED' | 'CANCELLED'`

**Example Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "enrollmentId": "uuid",
      "title": "Chapter 5 Problems",
      "type": "HOMEWORK",
      "dueDate": "2024-01-20T23:59:59Z",
      "status": "PENDING",
      "subjectName": "Mathematics"
    }
  ],
  "total": 20
}
```

**Error Codes**: 401 (not authenticated)

---

### PATCH /api/assignments/:id
Update an assignment (tutor-only)

**Allowed Roles**: TUTOR

**Path Parameters**:
- `id`: Assignment UUID

**Request Body**:
```typescript
{
  title?: string; // Min 1 char, max 200 chars
  description?: string;
  type?: 'ASSIGNMENT' | 'CLASSWORK' | 'TEST' | 'HOMEWORK' | 'PROJECT' | 'QUIZ';
  dueDate?: string; // ISO date string
  attachmentUrl?: string; // URL
  attachmentName?: string;
}
```

**Example Response (200)**:
```json
{
  "id": "uuid",
  "title": "Updated title",
  "dueDate": "2024-01-25T23:59:59Z",
  "updatedAt": "2024-01-15T12:00:00Z"
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated), 403 (not owner), 404 (assignment not found)

---

### DELETE /api/assignments/:id
Delete an assignment (tutor-only)

**Allowed Roles**: TUTOR

**Path Parameters**:
- `id`: Assignment UUID

**Example Response (200)**:
```json
{
  "message": "Assignment deleted successfully"
}
```

**Error Codes**: 401 (not authenticated), 403 (not owner), 404 (assignment not found)

---

### POST /api/assignments/:id/submit
Submit an assignment (student-only)

**Allowed Roles**: STUDENT

**Path Parameters**:
- `id`: Assignment UUID

**Request Body**:
```typescript
{
  textAnswer?: string;
  attachmentUrl?: string; // URL
  attachmentName?: string;
}
```

**Example Response (201)**:
```json
{
  "id": "uuid",
  "assignmentId": "uuid",
  "studentId": "uuid",
  "textAnswer": "Here is my answer",
  "attachmentUrl": "https://cloudinary.com/...",
  "attachmentName": "solution.pdf",
  "status": "SUBMITTED",
  "submittedAt": "2024-01-15T12:00:00Z"
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated), 403 (not a student), 404 (assignment not found)

---

### PATCH /api/assignments/:id/submissions/:submissionId/feedback
Provide feedback on assignment submission (tutor-only)

**Allowed Roles**: TUTOR

**Path Parameters**:
- `id`: Assignment UUID
- `submissionId`: Submission UUID

**Request Body**:
```typescript
{
  feedbackText?: string;
  feedbackAttachmentUrl?: string; // URL
  feedbackAttachmentName?: string;
}
```

**Example Response (200)**:
```json
{
  "id": "uuid",
  "feedbackText": "Great work!",
  "feedbackAttachmentUrl": "https://cloudinary.com/...",
  "status": "GRADED",
  "gradedAt": "2024-01-15T12:00:00Z"
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated), 403 (not tutor of assignment), 404 (submission not found)

---

## Quiz

### POST /api/quiz/assignments/:id/questions
Create a quiz question (tutor-only)

**Allowed Roles**: TUTOR

**Path Parameters**:
- `id`: Assignment UUID

**Request Body**:
```typescript
{
  questionText: string; // Min 1 char, max 1000 chars
  options: string[]; // Array of 2-6 options, min 1 char each
  correctOptionIndex: number; // >= 0
  points?: number; // Positive, default: 10
  orderIndex: number; // >= 0
}
```

**Example Response (201)**:
```json
{
  "id": "uuid",
  "assignmentId": "uuid",
  "questionText": "What is 2 + 2?",
  "options": ["3", "4", "5", "6"],
  "correctOptionIndex": 1,
  "points": 10,
  "orderIndex": 0
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated), 403 (not a tutor), 404 (assignment not found)

---

### GET /api/quiz/assignments/:id/questions
Get quiz questions for an assignment

**Allowed Roles**: All authenticated users

**Path Parameters**:
- `id`: Assignment UUID

**Example Response (200)**:
```json
[
  {
    "id": "uuid",
    "questionText": "What is 2 + 2?",
    "options": ["3", "4", "5", "6"],
    "points": 10,
    "orderIndex": 0
  }
]
```

**Error Codes**: 401 (not authenticated), 404 (assignment not found)

---

### POST /api/quiz/assignments/:id/quiz/start
Start a quiz attempt (student-only)

**Allowed Roles**: STUDENT

**Path Parameters**:
- `id`: Assignment UUID

**Example Response (201)**:
```json
{
  "id": "uuid",
  "assignmentId": "uuid",
  "studentId": "uuid",
  "status": "IN_PROGRESS",
  "startedAt": "2024-01-15T12:00:00Z",
  "questions": [...]
}
```

**Error Codes**: 401 (not authenticated), 403 (not a student), 404 (assignment not found)

---

### POST /api/quiz/quiz-attempts/:id/answer
Submit a quiz answer (student-only)

**Allowed Roles**: STUDENT

**Path Parameters**:
- `id`: Quiz Attempt UUID

**Request Body**:
```typescript
{
  questionId: string; // UUID
  selectedOptionIndex: number; // >= 0
  timeTakenSeconds: number; // >= 0
}
```

**Example Response (200)**:
```json
{
  "correct": true,
  "pointsEarned": 10,
  "totalPoints": 10
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated), 403 (not a student), 404 (attempt not found)

---

### PATCH /api/quiz/quiz-attempts/:id/complete
Complete a quiz attempt (student-only)

**Allowed Roles**: STUDENT

**Path Parameters**:
- `id`: Quiz Attempt UUID

**Example Response (200)**:
```json
{
  "id": "uuid",
  "status": "COMPLETED",
  "completedAt": "2024-01-15T12:30:00Z",
  "score": 80,
  "maxScore": 100,
  "scoredItemId": "uuid"
}
```

**Error Codes**: 401 (not authenticated), 403 (not a student), 404 (attempt not found)

---

### GET /api/quiz/quiz-attempts/:id
Get quiz attempt details

**Allowed Roles**: All authenticated users (filtered by role)

**Path Parameters**:
- `id`: Quiz Attempt UUID

**Example Response (200)**:
```json
{
  "id": "uuid",
  "assignmentId": "uuid",
  "studentId": "uuid",
  "status": "COMPLETED",
  "score": 80,
  "maxScore": 100,
  "startedAt": "2024-01-15T12:00:00Z",
  "completedAt": "2024-01-15T12:30:00Z",
  "answers": [...]
}
```

**Error Codes**: 401 (not authenticated), 403 (access denied), 404 (attempt not found)

---

## Progress Reports

### POST /api/progress-reports
Create a progress report (tutor-only)

**Allowed Roles**: TUTOR

**Request Body**:
```typescript
{
  enrollmentId: string; // UUID
  period: string; // Min 1 char, max 100 chars
  summary: string; // Min 1 char, max 2000 chars
  strengths: string; // Min 1 char, max 2000 chars
  areasToImprove: string; // Min 1 char, max 2000 chars
}
```

**Example Response (201)**:
```json
{
  "id": "uuid",
  "enrollmentId": "uuid",
  "period": "January 2024",
  "summary": "Good progress overall",
  "strengths": "Strong problem-solving skills",
  "areasToImprove": "Needs more practice with fractions",
  "tutorId": "uuid",
  "createdAt": "2024-01-31T00:00:00Z"
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated), 403 (not a tutor)

---

### GET /api/progress-reports
Get progress reports (filtered by role)

**Allowed Roles**: All authenticated users

**Query Parameters**:
- `enrollmentId?: string` (UUID)

**Example Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "enrollmentId": "uuid",
      "period": "January 2024",
      "summary": "Good progress overall",
      "tutorName": "Dr. Smith",
      "studentName": "Jane Doe",
      "createdAt": "2024-01-31T00:00:00Z"
    }
  ],
  "total": 10
}
```

**Error Codes**: 401 (not authenticated)

---

## Attendance

### GET /api/attendance/student/me/attendance
Get student's own attendance

**Allowed Roles**: STUDENT

**Example Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "sessionId": "uuid",
      "attended": true,
      "attendanceDate": "2024-01-15"
    }
  ],
  "total": 50,
  "attended": 46,
  "rate": 92.0
}
```

**Error Codes**: 401 (not authenticated), 403 (not a student)

---

### GET /api/attendance/students/:id/attendance
Get student attendance (role-filtered)

**Allowed Roles**: All authenticated users

**Path Parameters**:
- `id`: Student UUID

**Query Parameters**:
- `page?: number`
- `limit?: number`

**Example Response (200)**:
```json
{
  "data": [...],
  "page": 1,
  "limit": 20,
  "total": 50
}
```

**Error Codes**: 401 (not authenticated), 403 (access denied), 404 (student not found)

---

## Performance

### GET /api/performance/me/performance
Get own performance (student-only)

**Allowed Roles**: STUDENT

**Query Parameters**:
- `period?: 'week' | 'month' | 'quarter' | 'year' | 'all'`
- `from?: string` (ISO date)
- `to?: string` (ISO date)
- `subjectId?: string` (UUID)

**Example Response (200)**:
```json
{
  "studentId": "uuid",
  "period": "month",
  "overallStats": {
    "averageScore": 85.5,
    "attendanceRate": 92.5
  },
  "bySubject": [...]
}
```

**Error Codes**: 401 (not authenticated), 403 (not a student)

---

### GET /api/performance/students/:id/performance
Get student performance (parent viewing child)

**Allowed Roles**: PARENT

**Path Parameters**:
- `id`: Student UUID

**Query Parameters**: Same as above

**Example Response (200)**: Same as above

**Error Codes**: 401 (not authenticated), 403 (not parent of student), 404 (student not found)

---

### GET /api/performance/tutor/students/:studentId/performance
Get student performance (tutor viewing assigned student)

**Allowed Roles**: TUTOR

**Path Parameters**:
- `studentId`: Student UUID

**Query Parameters**: Same as above

**Example Response (200)**: Same as above

**Error Codes**: 401 (not authenticated), 403 (not tutor of student), 404 (student not found)

---

### GET /api/performance/admin/students/:id/performance
Get student performance (admin viewing any student)

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Student UUID

**Query Parameters**: Same as above

**Example Response (200)**: Same as above

**Error Codes**: 401 (not authenticated), 403 (not an admin), 404 (student not found)

---

## Payments

### POST /api/payments/initiate
Initiate a payment (parent-only)

**Allowed Roles**: PARENT
**Rate Limit**: Tier 1 (7 req / 15 min)

**Request Body**:
```typescript
{
  enrollmentId?: string; // UUID (optional)
  enrollmentGroupId?: string; // UUID (optional)
  currency?: string; // Default: 'USD'
}
```

**Note**: Provide either enrollmentId or enrollmentGroupId, not both

**Example Response (201)**:
```json
{
  "paymentId": "uuid",
  "authorizationUrl": "https://checkout.paystack.co/...",
  "reference": "paystack-reference",
  "amount": 10000,
  "currency": "USD"
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated), 403 (not a parent), 429 (rate limit)

---

### GET /api/payments
Get parent's payments

**Allowed Roles**: PARENT

**Example Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "enrollmentId": "uuid",
      "amount": 10000,
      "currency": "USD",
      "status": "SUCCESS",
      "provider": "PAYSTACK",
      "reference": "paystack-ref",
      "paidAt": "2024-01-15T12:00:00Z"
    }
  ],
  "total": 20
}
```

**Error Codes**: 401 (not authenticated), 403 (not a parent)

---

### GET /api/payments/verify/:reference
Verify payment status by reference (public endpoint)

**Allowed Roles**: Public (no auth required)

**Path Parameters**:
- `reference`: Paystack reference

**Example Response (200)**:
```json
{
  "status": "SUCCESS",
  "paidAt": "2024-01-15T12:00:00Z"
}
```

**Error Codes**: 404 (payment not found)

---

### POST /api/payments/webhook
Paystack webhook (no authentication)

**Allowed Roles**: Public (webhook only)

**Request Body**: Paystack webhook payload

**Example Response (200)**:
```json
{
  "message": "Webhook processed successfully"
}
```

**Error Codes**: 400 (invalid webhook), 500 (processing error)

---

## Subjects

### GET /api/subjects/public
Get public subjects list (no auth required)

**Allowed Roles**: Public

**Query Parameters**:
- `category?: 'CORE' | 'ENRICHMENT' | 'TEST_PREP'`
- `gradeBandTier?: 'PRESCHOOL_TO_G1' | 'G2_TO_G4' | 'G5_TO_G8' | 'G9_TO_G12'`

**Example Response (200)**:
```json
[
  {
    "id": "uuid",
    "name": "Mathematics",
    "description": "Core mathematics subject",
    "category": "CORE",
    "isActive": true
  }
]
```

**Error Codes**: None

---

### GET /api/subjects
Get subjects (authenticated)

**Allowed Roles**: All authenticated users

**Query Parameters**: Same as public endpoint

**Example Response (200)**: Same as public endpoint, with pricing if applicable

**Error Codes**: 401 (not authenticated)

---

## Pricing

### GET /api/pricing/quote
Get pricing quote for student's subjects (parent-only)

**Allowed Roles**: PARENT

**Query Parameters**:
- `studentId: string` (UUID, required)
- `subjectIds: string` (comma-separated list of subject UUIDs, required)

**Example Response (200)**:
```json
{
  "studentId": "uuid",
  "subjects": [
    {
      "id": "uuid",
      "name": "Mathematics",
      "yearlyPriceNGN": 75000,
      "yearlyPriceUSD": 50
    }
  ],
  "totalYearlyPriceNGN": 75000,
  "totalYearlyPriceUSD": 50,
  "exchangeRate": 1500
}
```

**Error Codes**: 400 (missing parameters), 401 (not authenticated), 403 (not a parent), 404 (student not found)

---

## Notifications

### GET /api/notifications/unread-count
Get unread notification count

**Allowed Roles**: All authenticated users

**Example Response (200)**:
```json
{
  "count": 5
}
```

**Error Codes**: 401 (not authenticated)

---

### GET /api/notifications
Get notifications

**Allowed Roles**: All authenticated users

**Query Parameters**:
- `unreadOnly?: boolean`
- `type?: string` (NotificationType enum value)
- `page?: number` (default: 1)
- `limit?: number` (default: 20)

**Example Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "type": "SESSION_REMINDER",
      "category": "SESSIONS",
      "title": "Upcoming session",
      "body": "You have a session at 2 PM today",
      "entityType": "SESSION",
      "entityId": "uuid",
      "isRead": false,
      "readAt": null,
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 50
}
```

**Error Codes**: 401 (not authenticated)

**Note**: The response uses `isRead` and `body` instead of `read` and `message`.

---

### PATCH /api/notifications/:id/read
Mark notification as read

**Allowed Roles**: All authenticated users

**Path Parameters**:
- `id`: Notification UUID

**Example Response (200)**:
```json
{
  "id": "uuid",
  "read": true,
  "readAt": "2024-01-15T12:00:00Z"
}
```

**Error Codes**: 401 (not authenticated), 404 (notification not found)

---

### PATCH /api/notifications/read-all
Mark all notifications as read

**Allowed Roles**: All authenticated users

**Example Response (200)**:
```json
{
  "message": "All notifications marked as read",
  "count": 10
}
```

**Error Codes**: 401 (not authenticated)

---

### PATCH /api/notifications/read-by-entity
Mark notifications by entity as read

**Allowed Roles**: All authenticated users

**Request Body**:
```typescript
{
  entityType: string;
  entityId: string;
}
```

**Example Response (200)**:
```json
{
  "message": "Notifications marked as read",
  "count": 3
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated)

---

### POST /api/notifications/stream-ticket
Create a stream ticket for SSE connection

**Allowed Roles**: All authenticated users

**Example Response (200)**:
```json
{
  "ticket": "hex-string",
  "expiresAt": "2024-01-15T12:00:30Z"
}
```

**Error Codes**: 401 (not authenticated), 500 (ticket generation failed)

---

### GET /api/notifications/stream
SSE endpoint for real-time notifications

**Allowed Roles**: All authenticated users (via JWT or stream ticket)

**Query Parameters**:
- `ticket?: string` (stream ticket from POST /stream-ticket)

**Headers**:
- `Authorization: Bearer <token>` (if not using ticket)
- `Last-Event-ID: <id>` (for replay)

**Response**: Server-Sent Events stream

**Event Format**:
```
id: uuid
event: notification
data: {"id":"uuid","type":"SESSION_REMINDER",...}

: heartbeat
```

**Error Codes**: 401 (not authenticated), 429 (max connections exceeded)

---

## Messages

### GET /api/messages/admin-contact
Get admin contact for messaging

**Allowed Roles**: PARENT, TUTOR

**Example Response (200)**:
```json
{
  "id": "uuid",
  "fullName": "Admin User",
  "email": "admin@smarttutor.com"
}
```

**Error Codes**: 401 (not authenticated), 403 (not PARENT or TUTOR)

---

### POST /api/messages
Send a message

**Allowed Roles**: PARENT, TUTOR, ADMIN (STUDENTS blocked)

**Request Body**:
```typescript
{
  recipientId: string; // UUID
  body: string; // Min 1 char, max 2000 chars
}
```

**Example Response (201)**:
```json
{
  "id": "uuid",
  "senderId": "uuid",
  "recipientId": "uuid",
  "body": "Hello, I have a question",
  "threadId": "uuid",
  "read": false,
  "createdAt": "2024-01-15T12:00:00Z"
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated), 403 (STUDENTs blocked), 404 (recipient not found)

---

### GET /api/messages/threads
Get user's conversation threads

**Allowed Roles**: PARENT, TUTOR, ADMIN (STUDENTS blocked)

**Example Response (200)**:
```json
[
  {
    "id": "uuid",
    "otherParticipant": {
      "id": "uuid",
      "fullName": "John Doe",
      "role": "PARENT"
    },
    "lastMessage": {
      "body": "Hello",
      "createdAt": "2024-01-15T12:00:00Z"
    },
    "unreadCount": 2
  }
]
```

**Error Codes**: 401 (not authenticated), 403 (STUDENTs blocked)

---

### GET /api/messages/threads/:threadId
Get messages in a thread

**Allowed Roles**: PARENT, TUTOR, ADMIN (STUDENTS blocked)

**Path Parameters**:
- `threadId`: Thread UUID

**Example Response (200)**:
```json
[
  {
    "id": "uuid",
    "senderId": "uuid",
    "body": "Hello",
    "read": true,
    "createdAt": "2024-01-15T12:00:00Z"
  }
]
```

**Error Codes**: 401 (not authenticated), 403 (STUDENTs blocked or not in thread), 404 (thread not found)

---

### PATCH /api/messages/threads/:threadId/read
Mark thread messages as read

**Allowed Roles**: PARENT, TUTOR, ADMIN (STUDENTS blocked)

**Path Parameters**:
- `threadId`: Thread UUID

**Example Response (200)**:
```json
{
  "message": "Thread marked as read",
  "count": 5
}
```

**Error Codes**: 401 (not authenticated), 403 (STUDENTs blocked), 404 (thread not found)

---

## Complaints

### POST /api/complaints
Create a complaint (parent-only)

**Allowed Roles**: PARENT

**Request Body**:
```typescript
{
  aboutType: 'STUDENT' | 'TUTOR' | 'PARENT' | 'GENERAL';
  aboutId?: string; // UUID (optional)
  subject: string; // Min 1 char, max 200 chars
  description: string; // Min 1 char, max 2000 chars
}
```

**Example Response (201)**:
```json
{
  "id": "uuid",
  "parentId": "uuid",
  "aboutType": "TUTOR",
  "aboutId": "uuid",
  "subject": "Tutor missed session",
  "description": "The tutor did not show up for the scheduled session",
  "status": "PENDING",
  "createdAt": "2024-01-15T00:00:00Z"
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated), 403 (not a parent)

---

### GET /api/complaints
Get complaints (filtered by role)

**Allowed Roles**: All authenticated users (ADMIN sees all, others see own)

**Example Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "parentId": "uuid",
      "aboutType": "TUTOR",
      "subject": "Tutor missed session",
      "status": "PENDING",
      "createdAt": "2024-01-15T00:00:00Z"
    }
  ],
  "total": 10
}
```

**Error Codes**: 401 (not authenticated)

---

### PATCH /api/complaints/:id/resolve
Resolve a complaint (admin-only)

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Complaint UUID

**Request Body**:
```typescript
{
  reply: string; // Min 1 char, max 2000 chars
}
```

**Example Response (200)**:
```json
{
  "id": "uuid",
  "status": "RESOLVED",
  "reply": "We have addressed this issue with the tutor",
  "resolvedAt": "2024-01-15T12:00:00Z",
  "resolvedBy": "uuid"
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated), 403 (not an admin), 404 (complaint not found)

---

## Admin

### GET /api/admin/tutors/pending
Get pending tutor vetting requests

**Allowed Roles**: ADMIN

**Example Response (200)**:
```json
[
  {
    "id": "uuid",
    "fullName": "John Smith",
    "email": "john@example.com",
    "applicationStatus": "SUBMITTED",
    "vettingStatus": "PENDING",
    "submittedAt": "2024-01-15T00:00:00Z"
  }
]
```

**Error Codes**: 401 (not authenticated), 403 (not an admin)

---

### GET /api/admin/tutors
Get all tutors with filters

**Allowed Roles**: ADMIN

**Query Parameters**:
- `status?: 'APPROVED' | 'PENDING_VETTING' | 'REJECTED' | 'SUSPENDED'`
- `applicationStatus?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'`
- `vettingStatus?: 'PENDING' | 'APPROVED' | 'REJECTED'`
- `availabilityStatus?: 'AVAILABLE' | 'LIMITED' | 'UNAVAILABLE'`
- `subjectId?: string` (UUID)
- `hasCapacity?: boolean`
- `search?: string`
- `page?: number`
- `limit?: number` (max: 100)

**Example Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Smith",
      "email": "john@example.com",
      "status": "APPROVED",
      "tutorProfile": {
        "bio": "Experienced tutor",
        "availabilityStatus": "AVAILABLE",
        "maxStudents": 10,
        "vettingStatus": "APPROVED"
      },
      "currentStudentCount": 5
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 50
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin)

---

### GET /api/admin/tutors/:id
Get detailed tutor profile

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Tutor UUID

**Example Response (200)**:
```json
{
  "user": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Smith",
    "email": "john@example.com",
    "status": "APPROVED"
  },
  "application": {
    "status": "APPROVED",
    "subjects": [...],
    "yearsOfExperience": 5,
    "submittedAt": "2024-01-01T00:00:00Z"
  },
  "profile": {
    "bio": "Experienced tutor",
    "hourlyRate": 50,
    "availabilityStatus": "AVAILABLE",
    "maxStudents": 10
  },
  "metrics": {
    "studentsCount": 5,
    "sessionsCompleted": 20,
    "avgStudentGradePercentage": 85.5
  }
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin), 404 (tutor not found)

---

### GET /api/admin/tutors/:id/students
Get tutor's students (paginated)

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Tutor UUID

**Query Parameters**:
- `page?: number` (default: 1)
- `limit?: number` (default: 20, max: 100)

**Example Response (200)**:
```json
{
  "data": [
    {
      "enrollmentId": "uuid",
      "student": {
        "id": "uuid",
        "fullName": "Jane Doe",
        "gradeLevel": "Grade 5"
      },
      "subject": {
        "id": "uuid",
        "name": "Mathematics"
      },
      "sessionFrequency": "TWICE_WEEKLY",
      "startDate": "2024-01-01"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 50
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin), 404 (tutor not found)

---

### GET /api/admin/tutors/:id/sessions
Get tutor's sessions with filters

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Tutor UUID

**Query Parameters**:
- `status?: 'SCHEDULED' | 'COMPLETED' | 'MISSED' | 'CANCELLED'`
- `from?: string` (ISO date)
- `to?: string` (ISO date)
- `page?: number`
- `limit?: number`

**Example Response (200)**:
```json
{
  "data": [...],
  "page": 1,
  "limit": 20,
  "total": 50
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin), 404 (tutor not found)

---

### GET /api/admin/tutors/:id/grades
Get tutor's grades

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Tutor UUID

**Query Parameters**:
- `status?: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'`
- `page?: number`
- `limit?: number`

**Example Response (200)**:
```json
{
  "data": [...],
  "page": 1,
  "limit": 20,
  "total": 50
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin), 404 (tutor not found)

---

### GET /api/admin/tutors/:id/progress-reports
Get tutor's progress reports

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Tutor UUID

**Query Parameters**:
- `page?: number`
- `limit?: number`

**Example Response (200)**:
```json
{
  "data": [...],
  "page": 1,
  "limit": 20,
  "total": 50
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin), 404 (tutor not found)

---

### PATCH /api/admin/tutors/:id/vetting
Update tutor vetting status

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Tutor UUID

**Request Body**:
```typescript
{
  vettingStatus: 'APPROVED' | 'REJECTED';
  rejectionReason?: string; // Required when vettingStatus is REJECTED
}
```

**Example Response (200)**:
```json
{
  "id": "uuid",
  "vettingStatus": "APPROVED",
  "vettedAt": "2024-01-15T12:00:00Z",
  "vettedBy": "uuid"
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated), 403 (not an admin), 404 (tutor not found)

---

### GET /api/admin/enrollments/unmatched
Get unmatched enrollments (waiting for tutor assignment)

**Allowed Roles**: ADMIN

**Query Parameters**:
- `includeUnpaid?: boolean`

**Example Response (200)**:
```json
[
  {
    "id": "uuid",
    "studentName": "Jane Doe",
    "subjectName": "Mathematics",
    "sessionFrequency": "TWICE_WEEKLY",
    "availableDays": ["MON", "WED"],
    "preferredStartHour": 14,
    "preferredEndHour": 16,
    "paid": true
  }
]
```

**Error Codes**: 401 (not authenticated), 403 (not an admin)

---

### GET /api/admin/enrollments/:id/pricing
Get enrollment pricing override

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Enrollment UUID

**Example Response (200)**:
```json
{
  "enrollmentId": "uuid",
  "yearlyPriceNGN": 75000,
  "yearlyPriceUSD": 50,
  "billingFrequency": "YEARLY",
  "note": "Discount applied"
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin), 404 (enrollment not found)

---

### PATCH /api/admin/enrollments/:id/pricing
Update enrollment pricing override

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Enrollment UUID

**Request Body**:
```typescript
{
  yearlyPriceNGN?: number | null; // Positive or null to clear
  yearlyPriceUSD?: number | null; // Positive or null to clear
  billingFrequency?: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  note?: string;
}
```

**Example Response (200)**:
```json
{
  "enrollmentId": "uuid",
  "yearlyPriceNGN": 75000,
  "yearlyPriceUSD": 50,
  "billingFrequency": "YEARLY",
  "note": "Discount applied",
  "updatedAt": "2024-01-15T12:00:00Z"
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated), 403 (not an admin), 404 (enrollment not found)

---

### PATCH /api/admin/enrollments/:id/assign-tutor
Assign tutor to enrollment

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Enrollment UUID

**Request Body**:
```typescript
{
  tutorId: string; // UUID
  force?: boolean; // Force assignment even if tutor has no capacity
}
```

**Example Response (200)**:
```json
{
  "enrollmentId": "uuid",
  "tutorId": "uuid",
  "tutorName": "Dr. Smith",
  "assignedAt": "2024-01-15T12:00:00Z"
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated), 403 (not an admin), 404 (enrollment not found)

---

### GET /api/admin/enrollments/:id/suggested-tutors
Get suggested tutors for enrollment

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Enrollment UUID

**Example Response (200)**:
```json
[
  {
    "id": "uuid",
    "fullName": "Dr. Smith",
    "subjects": ["Mathematics"],
    "availabilityStatus": "AVAILABLE",
    "matchScore": 95
  }
]
```

**Error Codes**: 401 (not authenticated), 403 (not an admin), 404 (enrollment not found)

---

### GET /api/admin/subjects
Get all subjects

**Allowed Roles**: ADMIN

**Example Response (200)**:
```json
[
  {
    "id": "uuid",
    "name": "Mathematics",
    "description": "Core mathematics subject",
    "category": "CORE",
    "isActive": true,
    "prices": [
      {
        "gradeBandTier": "G5_TO_G8",
        "yearlyPriceNGN": 75000,
        "yearlyPriceUSD": 50
      }
    ]
  }
]
```

**Error Codes**: 401 (not authenticated), 403 (not an admin)

---

### POST /api/admin/subjects
Create a new subject

**Allowed Roles**: ADMIN

**Request Body**:
```typescript
{
  name: string; // Min 1 char
  description?: string;
  category: 'CORE' | 'ENRICHMENT' | 'TEST_PREP';
  prices: Array<{
    gradeBandTier: 'PRESCHOOL_TO_G1' | 'G2_TO_G4' | 'G5_TO_G8' | 'G9_TO_G12';
    yearlyPriceNGN: number; // Positive
    yearlyPriceUSD: number; // Positive
  }>; // At least 1 price required
}
```

**Example Response (201)**:
```json
{
  "id": "uuid",
  "name": "Physics",
  "description": "Introduction to physics",
  "category": "CORE",
  "isActive": true,
  "createdAt": "2024-01-15T00:00:00Z"
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated), 403 (not an admin)

---

### PATCH /api/admin/subjects/:id
Update a subject

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Subject UUID

**Request Body**:
```typescript
{
  name?: string; // Min 1 char
  description?: string;
  category?: 'CORE' | 'ENRICHMENT' | 'TEST_PREP';
  isActive?: boolean;
}
```

**Example Response (200)**:
```json
{
  "id": "uuid",
  "name": "Updated name",
  "updatedAt": "2024-01-15T12:00:00Z"
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated), 403 (not an admin), 404 (subject not found)

---

### PUT /api/admin/subjects/:id/prices/:gradeBandTier
Upsert subject price for grade band

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Subject UUID
- `gradeBandTier`: Grade band tier

**Request Body**:
```typescript
{
  yearlyPriceNGN: number; // Positive
  yearlyPriceUSD: number; // Positive
  isActive?: boolean;
  note?: string;
}
```

**Example Response (200)**:
```json
{
  "subjectId": "uuid",
  "gradeBandTier": "G5_TO_G8",
  "yearlyPriceNGN": 75000,
  "yearlyPriceUSD": 50,
  "isActive": true
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated), 403 (not an admin), 404 (subject not found)

---

### DELETE /api/admin/subjects/:id
Delete a subject

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Subject UUID

**Example Response (200)**:
```json
{
  "message": "Subject deleted successfully"
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin), 404 (subject not found)

---

### GET /api/admin/exchange-rate/current
Get current exchange rate

**Allowed Roles**: ADMIN

**Example Response (200)**:
```json
{
  "rate": 1500,
  "baseCurrency": "USD",
  "targetCurrency": "NGN",
  "lastUpdated": "2024-01-15T12:00:00Z"
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin)

---

### GET /api/admin/payments
Get all payments with filters

**Allowed Roles**: ADMIN

**Query Parameters**:
- `status?: string`
- `currency?: string`
- `provider?: string`
- `parentId?: string` (UUID)
- `from?: string` (ISO date)
- `to?: string` (ISO date)
- `search?: string`
- `page?: number`
- `limit?: number`

**Example Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "enrollmentId": "uuid",
      "amount": 10000,
      "currency": "USD",
      "status": "SUCCESS",
      "provider": "PAYSTACK",
      "reference": "paystack-ref",
      "paidAt": "2024-01-15T12:00:00Z"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 50
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin)

---

### GET /api/admin/payments/summary
Get payments summary

**Allowed Roles**: ADMIN

**Query Parameters**:
- `from?: string` (ISO date)
- `to?: string` (ISO date)

**Example Response (200)**:
```json
{
  "totalAmount": 500000,
  "totalNGN": 750000000,
  "totalUSD": 500000,
  "successCount": 45,
  "failedCount": 5,
  "pendingCount": 0
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin)

---

### GET /api/admin/payments/failed
Get failed payments

**Allowed Roles**: ADMIN

**Example Response (200)**:
```json
[
  {
    "id": "uuid",
    "enrollmentId": "uuid",
    "amount": 10000,
    "currency": "USD",
    "status": "FAILED",
    "failureReason": "Insufficient funds",
    "createdAt": "2024-01-15T00:00:00Z"
  }
]
```

**Error Codes**: 401 (not authenticated), 403 (not an admin)

---

### GET /api/admin/payments/:id
Get payment details

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Payment UUID

**Example Response (200)**:
```json
{
  "id": "uuid",
  "enrollmentId": "uuid",
  "amount": 10000,
  "currency": "USD",
  "status": "SUCCESS",
  "provider": "PAYSTACK",
  "reference": "paystack-ref",
  "paidAt": "2024-01-15T12:00:00Z",
  "metadata": {...}
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin), 404 (payment not found)

---

### PATCH /api/admin/payments/:id/note
Add note to payment

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Payment UUID

**Request Body**:
```typescript
{
  note: string; // Min 1 char
}
```

**Example Response (200)**:
```json
{
  "id": "uuid",
  "note": "Verified with parent",
  "updatedAt": "2024-01-15T12:00:00Z"
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated), 403 (not an admin), 404 (payment not found)

---

### POST /api/admin/payments/:id/reverify
Reverify a payment

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Payment UUID

**Example Response (200)**:
```json
{
  "id": "uuid",
  "status": "SUCCESS",
  "verifiedAt": "2024-01-15T12:00:00Z"
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin), 404 (payment not found)

---

### GET /api/admin/reports/overview
Get overview report

**Allowed Roles**: ADMIN

**Example Response (200)**:
```json
{
  "totalStudents": 100,
  "totalTutors": 20,
  "activeEnrollments": 150,
  "totalRevenue": 5000000,
  "monthlyRevenue": 500000,
  "pendingTutors": 5,
  "pendingGrades": 10
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin)

---

### GET /api/admin/students
Get all students with filters

**Allowed Roles**: ADMIN

**Query Parameters**:
- `parentId?: string` (UUID)
- `search?: string`
- `status?: string`
- `gradeBandTier?: 'PRESCHOOL_TO_G1' | 'G2_TO_G4' | 'G5_TO_G8' | 'G9_TO_G12'`
- `enrolled?: boolean`
- `assigned?: boolean`
- `page?: number`
- `limit?: number` (max: 100)

**Example Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "fullName": "Jane Doe",
      "actualGrade": "GRADE_5",
      "gradeLevel": "Grade 5",
      "status": "ACTIVE",
      "parentId": "uuid",
      "parentEmail": "parent@example.com"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 100
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin)

---

### GET /api/admin/students/:id
Get student details

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Student UUID

**Query Parameters**:
- `period?: 'week' | 'month' | 'quarter' | 'year' | 'all'` (default: 'month')

**Example Response (200)**:
```json
{
  "student": {
    "id": "uuid",
    "fullName": "Jane Doe",
    "actualGrade": "GRADE_5",
    "gradeLevel": "Grade 5",
    "status": "ACTIVE"
  },
  "parent": {
    "id": "uuid",
    "email": "parent@example.com",
    "fullName": "John Doe"
  },
  "enrollments": [...],
  "performance": {...}
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin), 404 (student not found)

---

### GET /api/admin/students/:id/enrollments
Get student enrollments

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Student UUID

**Query Parameters**:
- `page?: number`
- `limit?: number`

**Example Response (200)**:
```json
{
  "data": [...],
  "page": 1,
  "limit": 20,
  "total": 10
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin), 404 (student not found)

---

### GET /api/admin/students/:id/grades
Get student grades

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Student UUID

**Query Parameters**:
- `page?: number`
- `limit?: number`

**Example Response (200)**:
```json
{
  "data": [...],
  "page": 1,
  "limit": 20,
  "total": 20
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin), 404 (student not found)

---

### GET /api/admin/students/:id/attendance
Get student attendance

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Student UUID

**Query Parameters**:
- `page?: number`
- `limit?: number`

**Example Response (200)**:
```json
{
  "data": [...],
  "page": 1,
  "limit": 20,
  "total": 50
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin), 404 (student not found)

---

### GET /api/admin/students/:id/sessions
Get student sessions

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Student UUID

**Query Parameters**:
- `page?: number`
- `limit?: number`

**Example Response (200)**:
```json
{
  "data": [...],
  "page": 1,
  "limit": 20,
  "total": 50
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin), 404 (student not found)

---

### GET /api/admin/students/:id/assignments
Get student assignments

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Student UUID

**Query Parameters**:
- `page?: number`
- `limit?: number`

**Example Response (200)**:
```json
{
  "data": [...],
  "page": 1,
  "limit": 20,
  "total": 30
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin), 404 (student not found)

---

### GET /api/admin/students/:id/progress-reports
Get student progress reports

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Student UUID

**Query Parameters**:
- `page?: number`
- `limit?: number`

**Example Response (200)**:
```json
{
  "data": [...],
  "page": 1,
  "limit": 20,
  "total": 10
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin), 404 (student not found)

---

### GET /api/admin/students/:id/performance
Get student performance

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Student UUID

**Query Parameters**:
- `period?: 'week' | 'month' | 'quarter' | 'year' | 'all'`
- `from?: string` (ISO date)
- `to?: string` (ISO date)
- `subjectId?: string` (UUID)
- `includePending?: boolean`

**Example Response (200)**:
```json
{
  "studentId": "uuid",
  "period": "month",
  "overallStats": {...},
  "bySubject": [...]
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin), 404 (student not found)

---

### PATCH /api/admin/students/:id/regenerate-pin
Regenerate student PIN

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Student UUID

**Example Response (200)**:
```json
{
  "message": "PIN regenerated successfully",
  "newPin": "654321"
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin), 404 (student not found)

---

### GET /api/admin/parents
Get all parents

**Allowed Roles**: ADMIN

**Query Parameters**:
- `search?: string`
- `status?: string`
- `page?: number`
- `limit?: number`

**Example Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "fullName": "John Doe",
      "email": "john@example.com",
      "status": "ACTIVE",
      "studentCount": 2
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 50
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin)

---

### GET /api/admin/parents/:id
Get parent details

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Parent UUID

**Example Response (200)**:
```json
{
  "id": "uuid",
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "status": "ACTIVE",
  "students": [...]
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin), 404 (parent not found)

---

### GET /api/admin/users/suspended
Get suspended users

**Allowed Roles**: ADMIN

**Query Parameters**:
- `page?: number`
- `limit?: number`

**Example Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "fullName": "John Doe",
      "email": "john@example.com",
      "role": "TUTOR",
      "status": "SUSPENDED",
      "suspendedAt": "2024-01-15T00:00:00Z",
      "suspensionReason": "Policy violation"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 5
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin)

---

### PATCH /api/admin/users/:id/suspend
Suspend a user

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: User UUID

**Request Body**:
```typescript
{
  reason: string; // Min 1 char
}
```

**Example Response (200)**:
```json
{
  "id": "uuid",
  "status": "SUSPENDED",
  "suspendedAt": "2024-01-15T12:00:00Z",
  "suspensionReason": "Policy violation"
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated), 403 (not an admin), 404 (user not found)

---

### PATCH /api/admin/users/:id/reactivate
Reactivate a suspended user

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: User UUID

**Example Response (200)**:
```json
{
  "id": "uuid",
  "status": "ACTIVE",
  "reactivatedAt": "2024-01-15T12:00:00Z"
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin), 404 (user not found)

---

### GET /api/admin/diagnostics/email
Get email diagnostics

**Allowed Roles**: ADMIN

**Example Response (200)**:
```json
{
  "emailProvider": "resend",
  "configured": true,
  "lastSent": "2024-01-15T12:00:00Z",
  "totalSent": 1000,
  "totalFailed": 5
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin)

---

### GET /api/admin/sessions
Get all sessions with filters

**Allowed Roles**: ADMIN

**Query Parameters**:
- `status?: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'MISSED'`
- `tutorId?: string` (UUID)
- `studentId?: string` (UUID)
- `enrollmentId?: string` (UUID)
- `from?: string` (ISO date)
- `to?: string` (ISO date)
- `page?: number`
- `limit?: number` (max: 100)

**Example Response (200)**:
```json
{
  "data": [...],
  "page": 1,
  "limit": 20,
  "total": 100
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin)

---

### POST /api/admin/sessions
Create a session (admin-only, multi-participant)

**Allowed Roles**: ADMIN

**Request Body**:
```typescript
{
  tutorId: string; // UUID
  scheduledAt: string; // ISO date string
  durationMinutes: number; // Positive integer
  googleMeetLink?: string; // URL
  googleEventId?: string;
  participantEnrollmentIds: string[]; // Array of enrollment UUIDs, min 1
  sharedSessionConfirmed?: boolean;
}
```

**Example Response (201)**:
```json
{
  "id": "uuid",
  "tutorId": "uuid",
  "scheduledAt": "2024-01-20T14:00:00Z",
  "durationMinutes": 60,
  "status": "SCHEDULED",
  "googleMeetLink": "https://meet.google.com/...",
  "googleEventId": "event-id",
  "participants": [...]
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated), 403 (not an admin)

---

### PATCH /api/admin/sessions/:id/reschedule
Reschedule a session (admin-only)

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Session UUID

**Request Body**:
```typescript
{
  scheduledAt?: string; // ISO date string
  googleMeetLink?: string; // URL
}
```

**Example Response (200)**:
```json
{
  "id": "uuid",
  "scheduledAt": "2024-01-21T14:00:00Z",
  "googleMeetLink": "https://meet.google.com/...",
  "googleEventId": "new-event-id"
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated), 403 (not an admin), 404 (session not found)

---

### GET /api/admin/grades/pending
Get pending grades awaiting approval

**Allowed Roles**: ADMIN

**Example Response (200)**:
```json
[
  {
    "id": "uuid",
    "enrollmentId": "uuid",
    "studentName": "Jane Doe",
    "tutorName": "Dr. Smith",
    "subjectName": "Mathematics",
    "finalScore": 85.5,
    "submittedAt": "2024-01-15T00:00:00Z"
  }
]
```

**Error Codes**: 401 (not authenticated), 403 (not an admin)

---

### PATCH /api/admin/grades/:id/approve
Approve a grade (admin-only, duplicate endpoint)

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Grade UUID

**Example Response (200)**:
```json
{
  "id": "uuid",
  "status": "APPROVED",
  "approvedAt": "2024-01-15T12:00:00Z",
  "approvedBy": "uuid"
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin), 404 (grade not found)

---

### PATCH /api/admin/grades/:id/reject
Reject a grade (admin-only, duplicate endpoint)

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Grade UUID

**Request Body**:
```typescript
{
  reason: string; // Min 10 characters
}
```

**Example Response (200)**:
```json
{
  "id": "uuid",
  "status": "REJECTED",
  "rejectedAt": "2024-01-15T12:00:00Z",
  "rejectedBy": "uuid",
  "rejectionReason": "Missing attendance data"
}
```

**Error Codes**: 400 (missing reason), 401 (not authenticated), 403 (not an admin), 404 (grade not found)

---

### PATCH /api/admin/complaints/:id/resolve
Resolve a complaint (admin-only, duplicate endpoint)

**Allowed Roles**: ADMIN

**Path Parameters**:
- `id`: Complaint UUID

**Request Body**:
```typescript
{
  reply: string; // Min 1 char, max 2000 chars
}
```

**Example Response (200)**:
```json
{
  "id": "uuid",
  "status": "RESOLVED",
  "reply": "We have addressed this issue",
  "resolvedAt": "2024-01-15T12:00:00Z",
  "resolvedBy": "uuid"
}
```

**Error Codes**: 400 (validation error), 401 (not authenticated), 403 (not an admin), 404 (complaint not found)

---

## Webhooks

### POST /api/webhooks/paystack
Paystack payment webhook

**Allowed Roles**: Public (webhook only, no authentication)

**Request Body**: Paystack webhook payload

**Example Response (200)**:
```json
{
  "message": "Webhook processed successfully"
}
```

**Error Codes**: 400 (invalid webhook), 500 (processing error)

---

## Class Reminders

### GET /api/tutor/upcoming-classes
Get tutor's upcoming classes

**Allowed Roles**: TUTOR (approved only)

**Query Parameters**:
- `from?: string` (ISO date)
- `to?: string` (ISO date)

**Example Response (200)**:
```json
[
  {
    "id": "uuid",
    "scheduledAt": "2024-01-20T14:00:00Z",
    "durationMinutes": 60,
    "subjectName": "Mathematics",
    "studentName": "Jane Doe",
    "googleMeetLink": "https://meet.google.com/..."
  }
]
```

**Error Codes**: 401 (not authenticated), 403 (not an approved tutor)

---

### GET /api/admin/class-schedule
Get class schedule (admin-only)

**Allowed Roles**: ADMIN

**Query Parameters**:
- `tutorId?: string` (UUID)
- `status?: string`
- `from?: string` (ISO date)
- `to?: string` (ISO date)
- `page?: number`
- `limit?: number` (max: 100)

**Example Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "tutorId": "uuid",
      "tutorName": "Dr. Smith",
      "scheduledAt": "2024-01-20T14:00:00Z",
      "durationMinutes": 60,
      "status": "SCHEDULED",
      "participants": [...]
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 100
}
```

**Error Codes**: 401 (not authenticated), 403 (not an admin)

---

## System

### GET /health
Health check endpoint

**Allowed Roles**: Public (no authentication)

**Example Response (200)**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T12:00:00Z",
  "database": "connected"
}
```

**Error Codes**: 503 (database disconnected)

---

### GET /api-docs
Swagger UI documentation

**Allowed Roles**: Public (no authentication)

**Response**: HTML page with Swagger UI

---

### GET /api-docs.json
Raw Swagger JSON specification

**Allowed Roles**: Public (no authentication)

**Response**: JSON specification

---

## Changes Since the Old API

### Added Features

1. **Notifications System**
   - SSE-based real-time notifications via `/api/notifications/stream`
   - Stream ticket mechanism for EventSource compatibility via `/api/notifications/stream-ticket`
   - Notification CRUD operations with entity-based marking
   - Live stream with ticket-based authentication and replay support

2. **Scored Items Module**
   - CRUD operations for scored items (quizzes, tests, homework, etc.)
   - Integration with grades system
   - Tutor-only management endpoints

3. **New Grading Workflow**
   - Draft → Submit → Admin Approval → Approved/Rejected workflow
   - Tutor can create draft grades, update them, and submit for approval
   - Admin bulk approval endpoint
   - Grade preview functionality
   - Override capability with reason tracking

4. **Enrollment Change Requests**
   - Parents can request changes to enrollment parameters (schedule, days, etc.)
   - Admin approval/rejection workflow
   - Status tracking (PENDING, APPROVED, REJECTED, CANCELLED)

5. **Class Schedule Management**
   - Tutor upcoming classes endpoint
   - Admin class schedule view with filters
   - Integration with Google Calendar for session management

6. **Google Meet Integration**
   - Sessions now include Google Meet links
   - Google Event ID tracking
   - Recording support via `/api/sessions/:id/recording`

7. **Messaging System**
   - Thread-based messaging
   - Role-based access (PARENT, TUTOR, ADMIN only - STUDENTS blocked)
   - Admin contact endpoint
   - Read status tracking

8. **Quiz System**
   - Quiz question creation and management
   - Quiz attempt tracking
   - Answer submission and scoring
   - Integration with scored items

9. **Performance Tracking**
   - Multi-role performance endpoints (student, parent, tutor, admin)
   - Period-based filtering (week, month, quarter, year, all)
   - Subject-specific performance
   - Pending grade inclusion option

10. **Admin Enhancements**
    - Suggested tutors for enrollment matching
    - Enrollment pricing overrides
    - Payment verification and notes
    - Email diagnostics
    - Session creation with multiple participants
    - Bulk operations

11. **Student Self-Service**
    - Student schedule endpoint
    - Next class endpoint
    - My tutors endpoint
    - My enrollments endpoint with session details

12. **Tutor Availability Management**
    - Availability status (AVAILABLE, LIMITED, UNAVAILABLE)
    - Max students setting
    - Status notes

13. **Enhanced Enrollment Creation**
    - Multi-subject batch enrollment (1-4 subjects)
    - Enrollment group management
    - Shared session support

### Changed Features

1. **Authentication**
   - Added student login with PIN (more secure than password)
   - Session revocation checking
   - Real-time user status validation on each request
   - Tutor approval requirement for endpoints

2. **Tutor Application**
   - Document upload with Cloudinary integration
   - Autosave functionality
   - Draft → Submitted workflow

3. **Sessions**
   - Multi-participant support
   - Google Calendar integration
   - Recording URL support
   - Rescheduling with Google Event ID updates

4. **Grades**
   - Changed from direct creation to draft → approval workflow
   - Added component-based grading
   - Added attendance rate component
   - Added override capability

5. **Rate Limiting**
   - Tiered rate limiting (Tier 1: 7/15min, Tier 2: 60/min, Tier 3: 300/15min)
   - Student-specific stricter limits for PIN login
   - SSE connection cap (max 3 per user)
   - Webhook exemption

### Removed Features

1. **Zoom Integration**
   - Removed Zoom webhooks (replaced with Google Calendar)
   - Google Meet is now the primary video conferencing solution

2. **Direct Grade Creation**
   - Removed direct grade creation by tutors
   - Now requires draft → submit → approve workflow

### Deprecated Features

None currently deprecated.

---

## Notes

### Rate Limiting

The API uses tiered rate limiting:

- **Tier 1 (Strict)**: 7 requests per 15 minutes (keyed by IP + email)
  - Applied to: `/auth/register`, `/auth/verify`, `/auth/login`, `/auth/student-login`, `/auth/resend-otp`, `/payments/initiate`

- **Tier 2 (Moderate)**: 60 requests per minute
  - Applied to: All other POST, PATCH, PUT, DELETE operations
  - Also applied to: `/tutor-application/*` endpoints

- **Tier 3 (Loose)**: 300 requests per 15 minutes
  - Applied to: All GET requests

- **SSE Connection Cap**: Max 3 concurrent SSE connections per user
  - Applied to: `/notifications/stream`

- **Exemptions**:
  - Webhooks (`/webhooks/*`)
  - Health check (`/health`)
  - Swagger docs (`/api-docs`)

### Authentication

All protected endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <access-token>
```

Access tokens expire and must be refreshed using the `/auth/refresh` endpoint.

### Pagination

Most list endpoints support pagination with `page` and `limit` query parameters. Default values:
- `page`: 1
- `limit`: 20 (max 100 for most endpoints)

Response format:
```json
{
  "data": [...],
  "page": 1,
  "limit": 20,
  "total": 100
}
```

### Error Handling

All errors return a JSON response with an `error` field:

```json
{
  "error": "Error message",
  "errorCode": "ERROR_CODE" // Optional
}
```

Common error codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (no token, invalid token, session revoked)
- `403` - Forbidden (insufficient permissions, account not active)
- `404` - Not Found (resource does not exist)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

### Data Types

- **UUID**: String format UUID v4
- **ISO Date**: ISO 8601 date string (e.g., "2024-01-15T12:00:00Z")
- **Boolean**: `true` or `false`
- **Enum**: String with specific allowed values (see individual endpoints)

### Role-Based Access Control

- **ADMIN**: Full access to all resources
- **PARENT**: Access to own students, enrollments, payments
- **TUTOR**: Access to assigned students, sessions, grades (approved tutors only)
- **STUDENT**: Access to own data, assignments, grades

Some endpoints have additional restrictions (e.g., STUDENTs blocked from messaging).

### WebSocket/SSE

Real-time notifications are delivered via Server-Sent Events (SSE):

1. Get a stream ticket: `POST /api/notifications/stream-ticket`
2. Connect to SSE: `GET /api/notifications/stream?ticket=<ticket>`
3. Or use JWT directly: `GET /api/notifications/stream` with `Authorization` header

SSE supports reconnection with `Last-Event-ID` header for replay.
