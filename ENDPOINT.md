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
**Error Codes:** 409 (User with this email already exists)

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
  "user": {
    "id": "uuid",
    "fullName": "string",
    "email": "string",
    "phone": "string",
    "role": "PARENT | TUTOR",
    "status": "ACTIVE | PENDING_VETTING",
    "studentCode": null,
    "parentId": null,
    "timezone": null,
    "profilePicture": null,
    "createdAt": "ISO date",
    "updatedAt": "ISO date"
  }
}
```
**Note:** Does NOT return tokens - user must login after verification.  
**Error Codes:** 404 (User not found), 400 (Invalid or expired OTP)

### POST /auth/login
**Auth:** None  
**Rate Limit:** Tier 1 (7 req / 15 min)  
**Body:**
```typescript
{
  email: string (email),
  password: string (min 1)
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
    "phone": "string",
    "role": "PARENT | TUTOR | ADMIN | STUDENT",
    "status": "ACTIVE",
    "studentCode": null,
    "parentId": null,
    "timezone": "string",
    "profilePicture": "string",
    "createdAt": "ISO date",
    "updatedAt": "ISO date"
  }
}
```
**Error Codes:** 401 (Invalid credentials), 403 (Please verify your email first, Account is not active, Your account is pending admin approval)

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
    "phone": "string",
    "role": "STUDENT",
    "status": "ACTIVE",
    "studentCode": "string",
    "parentId": "uuid",
    "timezone": "string",
    "profilePicture": "string",
    "createdAt": "ISO date",
    "updatedAt": "ISO date"
  }
}
```
**Error Codes:** 401 (Invalid credentials), 403 (Account is suspended)

### POST /auth/refresh
**Auth:** None  
**Body:**
```typescript
{
  refreshToken: string (min 1)
}
```
**Response (200):**
```json
{
  "accessToken": "jwt",
  "refreshToken": "jwt"
}
```
**Error Codes:** 401 (TOKEN_INVALID, TOKEN_EXPIRED, TOKEN_REVOKED, TOKEN_ALREADY_USED)

### POST /auth/logout
**Auth:** Required  
**Response (200):**
```json
{
  "message": "Logout successful"
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
  "message": "OTP sent successfully",
  "emailSent": true
}
```
**Error Codes:** 404 (User not found), 400 (Account is already verified)

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
  "message": "If the email exists, a password reset link has been sent.",
  "emailSent": true
}
```
**Note:** Always returns success even if email doesn't exist (security best practice)

### POST /auth/reset-password
**Auth:** None  
**Rate Limit:** Tier 1 (7 req / 15 min)  
**Body:**
```typescript
{
  token: string,
  newPassword: string (min 8, 1 upper, 1 lower, 1 number, 1 special)
}
```
**Response (200):**
```json
{
  "message": "Password reset successful. Please login with your new password."
}
```
**Error Codes:** 400 (Invalid or expired reset token, Reset token has already been used)

### GET /auth/me
**Auth:** Required  
**Response (200):**
```json
{
  "id": "uuid",
  "fullName": "string",
  "email": "string",
  "phone": "string",
  "role": "PARENT | TUTOR | ADMIN | STUDENT",
  "status": "ACTIVE",
  "studentCode": "string",
  "parentId": "uuid",
  "timezone": "string",
  "profilePicture": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```
**Error Codes:** 401 (Not authenticated), 404 (User not found)

### PATCH /auth/me
**Auth:** Required  
**Body:**
```typescript
{
  fullName?: string,
  phone?: string,
  address?: string
}
```
**Response (200):**
```json
{
  "id": "uuid",
  "fullName": "string",
  "email": "string",
  "phone": "string",
  "role": "PARENT | TUTOR | ADMIN | STUDENT",
  "status": "ACTIVE",
  "studentCode": "string",
  "parentId": "uuid",
  "timezone": "string",
  "profilePicture": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```
**Error Codes:** 401 (Not authenticated)

### PATCH /auth/change-password
**Auth:** Required (PARENT, TUTOR, ADMIN only - not STUDENT)  
**Body:**
```typescript
{
  currentPassword: string (min 1),
  newPassword: string (min 8, 1 upper, 1 lower, 1 number, 1 special)
}
```
**Response (200):**
```json
{
  "message": "Password changed successfully. Please login again."
}
```
**Error Codes:** 401 (Not authenticated, Current password is incorrect), 400 (Students must use the PIN change endpoint to update their PIN), 404 (User not found)

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
  "message": "PIN changed successfully. Please login again."
}
```
**Error Codes:** 401 (Not authenticated, Current PIN is incorrect), 400 (Only students can change their PIN), 404 (User not found)

### PATCH /auth/me/timezone
**Auth:** Required  
**Body:**
```typescript
{
  timezone: string (IANA format, e.g., "Africa/Lagos", "America/New_York", "UTC")
}
```
**Response (200):**
```json
{
  "message": "Timezone updated successfully"
}
```
**Error Codes:** 400 (Invalid timezone format)

### PATCH /auth/me/profile-picture
**Auth:** Required  
**Content-Type:** multipart/form-data  
**Body:** file (image, uploaded via multer)  
**Response (200):**
```json
{
  "message": "Profile picture updated successfully",
  "profilePicture": "cloudinary-url"
}
```
**Error Codes:** 401 (Not authenticated), 400 (No file uploaded), 404 (User not found)

### DELETE /auth/me/profile-picture
**Auth:** Required  
**Response (200):**
```json
{
  "message": "Profile picture deleted successfully"
}
```
**Error Codes:** 401 (Not authenticated), 404 (User not found)

---

## Students

### POST /students
**Auth:** Required (PARENT)  
**Body:**
```typescript
{
  fullName: string (min 2, max 100),
  dateOfBirth: string (ISO date),
  actualGrade: 'PRESCHOOL' | 'KINDERGARTEN' | 'GRADE_1' | 'GRADE_2' | 'GRADE_3' | 'GRADE_4' | 'GRADE_5' | 'GRADE_6' | 'GRADE_7' | 'GRADE_8' | 'GRADE_9' | 'GRADE_10' | 'GRADE_11' | 'GRADE_12',
  gradeLevel: string (min 1, max 50),
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY',
  email?: string (email, contact/notification only, NOT a login credential),
  preferredStartDate?: string (ISO date),
  school?: string (max 100),
  notes?: string (max 1000)
}
```
**Response (201):**
```json
{
  "id": "uuid",
  "fullName": "string",
  "actualGrade": "GRADE_5",
  "gradeBandTier": "G5_TO_G8",
  "gender": "MALE",
  "email": "string",
  "preferredStartDate": "ISO date",
  "emailSent": true
}
```
**Security:** studentCode (8 chars) and PIN (6 digits) generated and sent to parent by email, never returned in response  
**Error Codes:** 401 (Not authenticated)

### GET /students
**Auth:** Required (PARENT)  
**Response (200):**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "parentId": "uuid",
    "fullName": "string",
    "dateOfBirth": "ISO date",
    "actualGrade": "GRADE_5",
    "gradeLevel": "Grade 5",
    "gradeBandTier": "G5_TO_G8",
    "gender": "MALE",
    "email": "string",
    "preferredStartDate": "ISO date",
    "school": "string",
    "notes": "string",
    "createdAt": "ISO date",
    "updatedAt": "ISO date",
    "user": {
      "id": "uuid",
      "studentCode": "ABCDEFGH",
      "status": "ACTIVE"
    }
  }
]
```
**Error Codes:** 401 (Not authenticated)

### GET /students/:id
**Auth:** Required (PARENT)  
**Response (200):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "parentId": "uuid",
  "fullName": "string",
  "dateOfBirth": "ISO date",
  "actualGrade": "GRADE_5",
  "gradeLevel": "Grade 5",
  "gradeBandTier": "G5_TO_G8",
  "gender": "MALE",
  "email": "string",
  "preferredStartDate": "ISO date",
  "school": "string",
  "notes": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date",
  "user": {
    "id": "uuid",
    "studentCode": "ABCDEFGH",
    "status": "ACTIVE"
  },
  "enrollments": [
    {
      "id": "uuid",
      "studentId": "uuid",
      "subjectId": "uuid",
      "tutorId": "uuid",
      "status": "ACTIVE",
      "sessionFrequency": "WEEKLY",
      "billingFrequency": "MONTHLY",
      "startDate": "ISO date",
      "endDate": "ISO date",
      "yearlyPriceNGN": 150000,
      "yearlyPriceUSD": 100,
      "subject": {
        "id": "uuid",
        "name": "Mathematics",
        "category": "STEM"
      },
      "tutor": {
        "id": "uuid",
        "fullName": "string",
        "email": "string"
      }
    }
  ]
}
```
**Error Codes:** 401 (Not authenticated), 404 (Student not found)

### PATCH /students/:id
**Auth:** Required (PARENT)  
**Body:**
```typescript
{
  fullName?: string (min 2, max 100),
  dateOfBirth?: string (ISO date),
  actualGrade?: 'PRESCHOOL' | 'KINDERGARTEN' | 'GRADE_1' | 'GRADE_2' | 'GRADE_3' | 'GRADE_4' | 'GRADE_5' | 'GRADE_6' | 'GRADE_7' | 'GRADE_8' | 'GRADE_9' | 'GRADE_10' | 'GRADE_11' | 'GRADE_12',
  gradeLevel?: string (min 1, max 50),
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY',
  email?: string (email),
  preferredStartDate?: string (ISO date),
  school?: string (max 100),
  notes?: string (max 1000)
}
```
**Response (200):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "parentId": "uuid",
  "fullName": "string",
  "dateOfBirth": "ISO date",
  "actualGrade": "GRADE_5",
  "gradeLevel": "Grade 5",
  "gradeBandTier": "G5_TO_G8",
  "gender": "MALE",
  "email": "string",
  "preferredStartDate": "ISO date",
  "school": "string",
  "notes": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date",
  "user": {
    "id": "uuid",
    "studentCode": "ABCDEFGH",
    "status": "ACTIVE"
  }
}
```
**Error Codes:** 401 (Not authenticated), 404 (Student not found)

### DELETE /students/:id
**Auth:** Required (PARENT)  
**Response (200):**
```json
{
  "message": "Student deleted successfully"
}
```
**Error Codes:** 401 (Not authenticated), 404 (Student not found), 400 (Cannot delete student with active enrollments)

### GET /students/:id/activity
**Auth:** Required (PARENT, ADMIN)  
**Response (200):**
```json
{
  "student": {
    "id": "uuid",
    "fullName": "string",
    "gradeLevel": "Grade 5",
    "actualGrade": "GRADE_5",
    "gradeBandTier": "G5_TO_G8"
  },
  "statistics": {
    "totalEnrollments": 2,
    "totalSessions": 10,
    "attendedSessions": 8,
    "missedSessions": 2,
    "attendanceRate": 80,
    "pendingAssignments": 3,
    "completedAssignments": 15,
    "totalGrades": 5,
    "averageScore": 85.5
  },
  "enrollments": [
    {
      "id": "uuid",
      "subject": {
        "id": "uuid",
        "name": "Mathematics"
      },
      "status": "ACTIVE",
      "tutor": {
        "id": "uuid",
        "fullName": "string",
        "email": "string",
        "bio": "string",
        "subjects": ["Mathematics", "Physics"]
      }
    }
  ],
  "upcomingSessions": [
    {
      "id": "uuid",
      "scheduledAt": "ISO date",
      "durationMinutes": 60,
      "googleMeetLink": "https://meet.google.com/xxx",
      "subject": "Mathematics",
      "tutor": "string"
    }
  ],
  "pendingAssignments": [
    {
      "id": "uuid",
      "title": "string",
      "description": "string",
      "type": "HOMEWORK",
      "dueDate": "ISO date",
      "subject": "Mathematics",
      "createdBy": "string"
    }
  ],
  "recentGrades": [
    {
      "id": "uuid",
      "score": 85,
      "comments": "string",
      "gradedAt": "ISO date",
      "subject": "Mathematics",
      "gradedBy": "string"
    }
  ],
  "progressReports": [
    {
      "id": "uuid",
      "period": "Q1 2024",
      "summary": "string",
      "strengths": ["string"],
      "areasToImprove": ["string"],
      "createdAt": "ISO date",
      "createdBy": "string",
      "subject": "Mathematics"
    }
  ]
}
```
**Error Codes:** 401 (Not authenticated), 404 (Student not found)

### POST /students/:id/regenerate-pin
**Auth:** Required (PARENT, ADMIN)  
**Response (200):**
```json
{
  "message": "PIN regenerated successfully. New credentials sent to parent email.",
  "emailSent": true
}
```
**Security:** New PIN sent to parent by email, never returned in response. All refresh tokens for the student are revoked.  
**Error Codes:** 401 (Not authenticated), 404 (Student not found)

### GET /students/:id/attendance
**Auth:** Required (PARENT, STUDENT, TUTOR, ADMIN)  
**Response (200):** Student attendance records

---

## Student (Self-Service)

### GET /student/me
**Auth:** Required (STUDENT)  
**Response (200):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "parentId": "uuid",
  "fullName": "string",
  "dateOfBirth": "ISO date",
  "actualGrade": "GRADE_5",
  "gradeLevel": "Grade 5",
  "gradeBandTier": "G5_TO_G8",
  "gender": "MALE",
  "email": "string",
  "preferredStartDate": "ISO date",
  "school": "string",
  "notes": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date",
  "user": {
    "id": "uuid",
    "studentCode": "ABCDEFGH",
    "status": "ACTIVE",
    "timezone": "Africa/Lagos"
  },
  "parent": {
    "id": "uuid",
    "fullName": "string",
    "email": "string"
  }
}
```
**Error Codes:** 401 (Not authenticated), 404 (Student profile not found)

### GET /student/me/schedule
**Auth:** Required (STUDENT)  
**Response (200):**
```json
[
  {
    "sessionId": "uuid",
    "scheduledAt": "ISO date",
    "durationMinutes": 60,
    "googleMeetLink": "https://meet.google.com/xxx",
    "status": "SCHEDULED",
    "tutor": {
      "id": "uuid",
      "fullName": "string"
    },
    "subject": "Mathematics"
  }
]
```
**Error Codes:** 401 (Not authenticated), 404 (Student profile not found)

### GET /student/me/next-class
**Auth:** Required (STUDENT)  
**Response (200):**
```json
{
  "session": {
    "sessionId": "uuid",
    "scheduledAt": "ISO date",
    "durationMinutes": 60,
    "googleMeetLink": "https://meet.google.com/xxx",
    "tutor": {
      "id": "uuid",
      "fullName": "string"
    },
    "subject": "Mathematics"
  },
  "timezone": "Africa/Lagos"
}
```
**Note:** Returns `{"message": "No upcoming classes scheduled", "session": null}` if no upcoming class. Timezone falls back to parent's timezone if student has none.  
**Error Codes:** 401 (Not authenticated), 404 (Student profile not found)

### GET /student/me/assignments
**Auth:** Required (STUDENT)  
**Response (200):**
```json
[
  {
    "id": "uuid",
    "enrollmentId": "uuid",
    "title": "string",
    "description": "string",
    "type": "HOMEWORK",
    "dueDate": "ISO date",
    "status": "PENDING",
    "createdAt": "ISO date",
    "updatedAt": "ISO date",
    "enrollment": {
      "subject": {
        "id": "uuid",
        "name": "Mathematics",
        "category": "STEM"
      }
    }
  }
]
```
**Error Codes:** 401 (Not authenticated), 404 (Student profile not found)

### GET /student/me/grades
**Auth:** Required (STUDENT)  
**Response (200):**
```json
[
  {
    "id": "uuid",
    "enrollmentId": "uuid",
    "score": 85,
    "status": "APPROVED",
    "comments": "string",
    "visibleToStudent": true,
    "createdAt": "ISO date",
    "updatedAt": "ISO date",
    "enrollment": {
      "subject": {
        "id": "uuid",
        "name": "Mathematics",
        "category": "STEM"
      }
    },
    "assignment": {
      "id": "uuid",
      "title": "string"
    },
    "grader": {
      "fullName": "string"
    }
  }
]
```
**Security:** Only APPROVED grades with visibleToStudent=true are returned. Never includes overrideReason or rejectionReason.  
**Error Codes:** 401 (Not authenticated), 404 (Student profile not found)

### GET /student/me/progress-reports
**Auth:** Required (STUDENT)  
**Response (200):**
```json
[
  {
    "id": "uuid",
    "enrollmentId": "uuid",
    "period": "Q1 2024",
    "summary": "string",
    "strengths": ["string"],
    "areasToImprove": ["string"],
    "createdAt": "ISO date",
    "updatedAt": "ISO date",
    "enrollment": {
      "subject": {
        "id": "uuid",
        "name": "Mathematics",
        "category": "STEM"
      }
    },
    "creator": {
      "fullName": "string"
    }
  }
]
```
**Error Codes:** 401 (Not authenticated), 404 (Student profile not found)

### GET /student/me/performance
**Auth:** Required (STUDENT)  
**Query:** `period` (week, month, quarter, year, all), `from` (ISO date), `to` (ISO date), `subjectId` (uuid), `includePending` (boolean)  
**Response (200):** Performance overview with APPROVED grades only (unless includePending=true)  
**Error Codes:** 401 (Not authenticated), 404 (Student profile not found)

### GET /student/me/notifications
**Auth:** Required (STUDENT)  
**Response (200):** See Notifications section (this is an alias to GET /notifications)

### GET /student/me/attendance
**Auth:** Required (STUDENT)  
**Response (200):** See Attendance section (this is an alias to GET /attendance)

### GET /student/me/tutors
**Auth:** Required (STUDENT)  
**Response (200):**
```json
[
  {
    "tutorId": "uuid",
    "fullName": "string",
    "bio": "string",
    "subjects": ["Mathematics", "Physics"],
    "enrollmentSubject": "Mathematics",
    "assignedSince": "ISO date"
  }
]
```
**Note:** Deduplicated by tutor (one entry per distinct tutor). Only ACTIVE enrollments with assigned tutors.  
**Error Codes:** 401 (Not authenticated), 404 (Student profile not found)

### GET /student/me/enrollments
**Auth:** Required (STUDENT)  
**Response (200):**
```json
[
  {
    "id": "uuid",
    "studentId": "uuid",
    "subjectId": "uuid",
    "tutorId": "uuid",
    "status": "ACTIVE",
    "sessionFrequency": "WEEKLY",
    "billingFrequency": "MONTHLY",
    "startDate": "ISO date",
    "endDate": "ISO date",
    "createdAt": "ISO date",
    "updatedAt": "ISO date",
    "tutor": {
      "id": "uuid",
      "fullName": "string",
      "email": "string",
      "tutorProfile": {
        "bio": "string",
        "subjects": ["Mathematics"],
        "vettingStatus": "APPROVED"
      }
    },
    "subject": {
      "id": "uuid",
      "name": "Mathematics",
      "category": "STEM"
    },
    "payments": [
      {
        "id": "uuid",
        "amount": 100,
        "currency": "USD",
        "status": "SUCCESS",
        "createdAt": "ISO date"
      }
    ]
  }
]
```
**Error Codes:** 401 (Not authenticated), 404 (Student profile not found)

### GET /student/me/enrollments/:enrollmentId/sessions
**Auth:** Required (STUDENT)  
**Response (200):**
```json
[
  {
    "sessionId": "uuid",
    "scheduledAt": "ISO date",
    "durationMinutes": 60,
    "googleMeetLink": "https://meet.google.com/xxx",
    "status": "SCHEDULED",
    "tutor": {
      "id": "uuid",
      "fullName": "string"
    }
  }
]
```
**Error Codes:** 401 (Not authenticated), 404 (Student profile not found), 403 (You do not have access to this enrollment)

---

## Tutor

### POST /tutor-profile
**Auth:** Required (TUTOR, APPROVED)  
**Body:**
```typescript
{
  subjects: string[] (min 1, max 20),
  bio: string (min 10, max 2000),
  credentialsUrl?: string (url, max 500),
  hourlyRate: number (positive, max 1000),
  availability: Record<string, any>
}
```
**Response (201):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "subjects": ["Mathematics", "Physics"],
  "bio": "string",
  "credentialsUrl": "string",
  "hourlyRate": 50,
  "availability": {},
  "availabilityStatus": "AVAILABLE",
  "maxStudents": null,
  "statusNote": null,
  "statusUpdatedAt": "ISO date",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```
**Error Codes:** 401 (Not authenticated), 409 (Tutor profile already exists)

### PATCH /tutor-profile
**Auth:** Required (TUTOR, APPROVED)  
**Body:**
```typescript
{
  availability: Record<string, any>
}
```
**Response (200):** Updated tutor profile  
**Error Codes:** 401 (Not authenticated), 404 (Tutor profile not found)

### PATCH /tutor-profile/availability-status
**Auth:** Required (TUTOR, APPROVED)  
**Body:**
```typescript
{
  availabilityStatus: 'AVAILABLE' | 'LIMITED' | 'UNAVAILABLE',
  maxStudents?: number (positive integer),
  statusNote?: string (max 500)
}
```
**Response (200):** Updated tutor profile with statusUpdatedAt timestamp  
**Note:** If setting to UNAVAILABLE while having active students, admin is notified.  
**Error Codes:** 401 (Not authenticated), 404 (Tutor profile not found)

### GET /tutor-profile
**Auth:** Required (TUTOR, APPROVED)  
**Response (200):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "subjects": ["Mathematics", "Physics"],
  "bio": "string",
  "credentialsUrl": "string",
  "hourlyRate": 50,
  "availability": {},
  "availabilityStatus": "AVAILABLE",
  "maxStudents": null,
  "statusNote": null,
  "statusUpdatedAt": "ISO date",
  "createdAt": "ISO date",
  "updatedAt": "ISO date",
  "user": {
    "id": "uuid",
    "fullName": "string",
    "email": "string",
    "phone": "string",
    "status": "ACTIVE"
  }
}
```
**Error Codes:** 401 (Not authenticated), 404 (Tutor profile not found)

### GET /students
**Auth:** Required (TUTOR, APPROVED)  
**Response (200):**
```json
[
  {
    "student": {
      "id": "uuid"
    },
    "enrollment": {
      "id": "uuid",
      "subjectId": "uuid",
      "sessionFrequency": "WEEKLY",
      "startDate": "ISO date",
      "endDate": "ISO date",
      "status": "ACTIVE"
    }
  }
]
```
**Security:** Pricing fields (yearlyPriceNGN, yearlyPriceUSD) excluded. Parent contact info excluded.  
**Error Codes:** 401 (Not authenticated)

### GET /students/:studentId
**Auth:** Required (TUTOR, APPROVED)  
**Response (200):**
```json
{
  "student": {
    "id": "uuid",
    "fullName": "string",
    "dateOfBirth": "ISO date",
    "gender": "MALE",
    "actualGrade": "GRADE_5",
    "gradeLevel": "Grade 5",
    "gradeBandTier": "G5_TO_G8",
    "school": "string",
    "notes": "string"
  },
  "enrollment": {
    "id": "uuid",
    "subject": {
      "id": "uuid",
      "name": "Mathematics",
      "category": "STEM"
    },
    "status": "ACTIVE",
    "sessionFrequency": "WEEKLY",
    "availableDays": ["Monday", "Wednesday"],
    "startDate": "ISO date",
    "endDate": "ISO date"
  },
  "upcomingSessions": [
    {
      "id": "uuid",
      "scheduledAt": "ISO date",
      "durationMinutes": 60,
      "googleMeetLink": "https://meet.google.com/xxx",
      "status": "SCHEDULED",
      "participants": [...]
    }
  ],
  "pastSessions": [
    {
      "id": "uuid",
      "scheduledAt": "ISO date",
      "status": "COMPLETED",
      "tutorNotes": "string",
      "participants": [...]
    }
  ],
  "assignments": [
    {
      "id": "uuid",
      "title": "string",
      "dueDate": "ISO date",
      "status": "PENDING",
      "enrollment": {
        "subject": {
          "name": "Mathematics"
        }
      }
    }
  ],
  "gradesGiven": [
    {
      "id": "uuid",
      "score": 85,
      "status": "APPROVED",
      "comments": "string",
      "enrollment": {
        "subject": {
          "name": "Mathematics"
        }
      },
      "assignment": {
        "id": "uuid",
        "title": "string"
      }
    }
  ],
  "progressReports": [
    {
      "id": "uuid",
      "period": "Q1 2024",
      "summary": "string",
      "enrollment": {
        "subject": {
          "name": "Mathematics"
        }
      }
    }
  ],
  "attendance": {
    "totalSessions": 10,
    "attended": 8,
    "missed": 2,
    "percentage": 80
  }
}
```
**Security:** Parent contact info excluded. Financial info excluded. Only shows data for enrollments where tutor is assigned.  
**Error Codes:** 401 (Not authenticated), 403 (Not authorized to view this student), 404 (Student not found)

### GET /students/:studentId/performance
**Auth:** Required (TUTOR, APPROVED)  
**Query:** `period` (week, month, quarter, year, all), `from` (ISO date), `to` (ISO date), `subjectId` (uuid), `includePending` (boolean)  
**Response (200):** Student performance data  
**Error Codes:** 401 (Not authenticated)

### GET /sessions
**Auth:** Required (TUTOR, APPROVED)  
**Response (200):**
```json
[
  {
    "id": "uuid",
    "tutorId": "uuid",
    "scheduledAt": "ISO date",
    "durationMinutes": 60,
    "googleMeetLink": "https://meet.google.com/xxx",
    "googleEventId": "string",
    "status": "SCHEDULED",
    "tutorNotes": "string",
    "homeworkAssigned": "string",
    "createdAt": "ISO date",
    "updatedAt": "ISO date",
    "participants": [
      {
        "id": "uuid",
        "sessionId": "uuid",
        "enrollmentId": "uuid",
        "attended": null,
        "enrollment": {
          "student": {
            "id": "uuid",
            "fullName": "string",
            "gradeLevel": "Grade 5"
          },
          "subject": {
            "id": "uuid",
            "name": "Mathematics",
            "category": "STEM"
          }
        }
      }
    ]
  }
]
```
**Error Codes:** 401 (Not authenticated)

### POST /sessions
**Auth:** Required (TUTOR, APPROVED)  
**Body:**
```typescript
{
  enrollmentId: string (uuid),
  scheduledAt: string (ISO date),
  durationMinutes: number (positive integer)
}
```
**Response (201):** Created session with Google Meet link  
**Error Codes:** 401 (Not authenticated)

### PATCH /sessions/:id/reschedule
**Auth:** Required (TUTOR, APPROVED)  
**Body:**
```typescript
{
  scheduledAt: string (ISO date),
  durationMinutes?: number (positive integer)
}
```
**Response (200):** Rescheduled session  
**Error Codes:** 401 (Not authenticated)

### DELETE /sessions/:id
**Auth:** Required (TUTOR, APPROVED)  
**Response (200):**
```json
{
  "message": "Session deleted successfully"
}
```
**Error Codes:** 401 (Not authenticated)

### GET /students/:studentId/scored-items
**Auth:** Required (TUTOR, APPROVED)  
**Query:** `enrollmentId` (uuid), `type` (ScoredItemType enum), `unassigned` (boolean)  
**Response (200):** Scored items for student  
**Error Codes:** 401 (Not authenticated)

### POST /scored-items
**Auth:** Required (TUTOR, APPROVED)  
**Body:**
```typescript
{
  enrollmentId: string (uuid),
  type: 'QUIZ' | 'ASSIGNMENT' | 'EXAM' | 'PROJECT' | 'PARTICIPATION' | 'ATTENDANCE',
  score: number (>= 0),
  maxScore: number (> 0),
  comment?: string
}
```
**Response (201):** Created scored item  
**Error Codes:** 401 (Not authenticated)

### PATCH /scored-items/:id
**Auth:** Required (TUTOR, APPROVED)  
**Body:**
```typescript
{
  score?: number (>= 0),
  maxScore?: number (> 0),
  comment?: string
}
```
**Response (200):** Updated scored item  
**Error Codes:** 401 (Not authenticated)

### DELETE /scored-items/:id
**Auth:** Required (TUTOR, APPROVED)  
**Response (200):**
```json
{
  "message": "Scored item deleted"
}
```
**Error Codes:** 401 (Not authenticated)

---

---

## Tutor Application

### GET /tutor-application
**Auth:** Required (TUTOR, PENDING_VETTING) - bypasses requireApprovedTutor  
**Rate Limit:** Tier 2 (60 req / min)  
**Response (200):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "status": "DRAFT",
  "birthDay": 1,
  "birthMonth": 1,
  "country": "string",
  "city": "string",
  "highestQualification": "BACHELORS",
  "yearsOfExperience": 5,
  "whyTeach": "string",
  "howHeard": "GOOGLE_SEARCH",
  "aboutYou": ["string"],
  "lastSavedAt": "ISO date",
  "submittedAt": null,
  "reviewedAt": null,
  "reviewedBy": null,
  "rejectionReason": null,
  "createdAt": "ISO date",
  "updatedAt": "ISO date",
  "subjects": [
    {
      "id": "uuid",
      "applicationId": "uuid",
      "subjectId": "uuid",
      "subject": {
        "id": "uuid",
        "name": "Mathematics",
        "category": "STEM"
      }
    }
  ],
  "documents": [
    {
      "id": "uuid",
      "applicationId": "uuid",
      "publicId": "string",
      "originalName": "resume.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 102400,
      "createdAt": "ISO date"
    }
  ],
  "missingFields": ["birthDate", "country", "subjects", "documents", "profilePicture"]
}
```
**Error Codes:** 401 (Not authenticated), 404 (Application not found)

### PATCH /tutor-application
**Auth:** Required (TUTOR, PENDING_VETTING)  
**Rate Limit:** Tier 2 (60 req / min)  
**Body:**
```typescript
{
  birthDay?: number (1-31),
  birthMonth?: number (1-12),
  country?: string (min 1),
  city?: string (min 1),
  highestQualification?: 'SSCE_WAEC' | 'OND_NCE' | 'HND' | 'BACHELORS' | 'BED_PGDE' | 'MASTERS' | 'PHD' | 'OTHER',
  subjects?: string[] (uuid array),
  levels?: ('PRESCHOOL_TO_G1' | 'G2_TO_G4' | 'G5_TO_G8' | 'G9_TO_G12' | 'EXAM_LEVELS')[],
  yearsOfExperience?: number (>= 0),
  whyTeach?: string,
  howHeard?: 'TEACHMENEST_TUTOR_OR_STAFF' | 'PARENT_OR_FAMILY' | 'FRIEND_OR_FAMILY' | 'INSTAGRAM' | 'FACEBOOK' | 'LINKEDIN' | 'WHATSAPP_GROUP' | 'GOOGLE_SEARCH' | 'JOB_BOARD' | 'OTHER',
  aboutYou?: string[] (max 3 items, each max 60 chars)
}
```
**Response (200):** Updated application with lastSavedAt timestamp  
**Error Codes:** 401 (Not authenticated), 404 (Application not found), 400 (Cannot update submitted application)

### POST /tutor-application/documents
**Auth:** Required (TUTOR, PENDING_VETTING)  
**Rate Limit:** Tier 2 (60 req / min)  
**Content-Type:** multipart/form-data  
**Body:** file (max 5MB, allowed types: PDF, DOC, DOCX, JPG, PNG)  
**Response (201):**
```json
{
  "id": "uuid",
  "applicationId": "uuid",
  "publicId": "string",
  "originalName": "resume.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 102400,
  "createdAt": "ISO date"
}
```
**Error Codes:** 401 (Not authenticated), 400 (No file uploaded, Invalid file type, File size exceeds 5 MB limit, Maximum 5 documents allowed, Cannot upload documents for submitted application)

### GET /tutor-application/documents/:id
**Auth:** Required (owning tutor or ADMIN)  
**Rate Limit:** Tier 2 (60 req / min)  
**Response (200):**
```json
{
  "id": "uuid",
  "originalName": "resume.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 102400,
  "url": "cloudinary-signed-url",
  "expiresAt": "ISO date (10 minutes from now)"
}
```
**Note:** URL is signed and expires in 10 minutes.  
**Error Codes:** 401 (Not authenticated), 404 (Document not found), 403 (Not authorized to access this document)

### DELETE /tutor-application/documents/:id
**Auth:** Required (TUTOR, PENDING_VETTING)  
**Rate Limit:** Tier 2 (60 req / min)  
**Response (200):**
```json
{
  "message": "Document deleted successfully"
}
```
**Error Codes:** 401 (Not authenticated), 404 (Document not found), 403 (Not authorized to delete this document), 400 (Cannot delete documents from submitted application)

### POST /tutor-application/submit
**Auth:** Required (TUTOR, PENDING_VETTING)  
**Rate Limit:** Tier 2 (60 req / min)  
**Body:**
```typescript
{
  birthDay: number (1-31),
  birthMonth: number (1-12),
  country: string (min 1),
  city: string (min 1),
  highestQualification: 'SSCE_WAEC' | 'OND_NCE' | 'HND' | 'BACHELORS' | 'BED_PGDE' | 'MASTERS' | 'PHD' | 'OTHER',
  subjects: string[] (uuid array, min 1),
  levels: ('PRESCHOOL_TO_G1' | 'G2_TO_G4' | 'G5_TO_G8' | 'G9_TO_G12' | 'EXAM_LEVELS')[] (min 1),
  yearsOfExperience: number (>= 0),
  whyTeach: string (min 10),
  howHeard: 'TEACHMENEST_TUTOR_OR_STAFF' | 'PARENT_OR_FAMILY' | 'FRIEND_OR_FAMILY' | 'INSTAGRAM' | 'FACEBOOK' | 'LINKEDIN' | 'WHATSAPP_GROUP' | 'GOOGLE_SEARCH' | 'JOB_BOARD' | 'OTHER',
  aboutYou: string[] (min 1, max 3, each max 60 chars)
}
```
**Response (200):** Submitted application with status SUBMITTED and submittedAt timestamp  
**Error Codes:** 401 (Not authenticated), 404 (Application not found), 400 (Application has already been submitted, Missing required fields: birthDate, country, subjects, documents, profilePicture, etc.)

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
