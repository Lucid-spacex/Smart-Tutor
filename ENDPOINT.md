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

**Token Lifetimes:**
- Access Tokens: 1 day (configurable via `JWT_ACCESS_EXPIRY` environment variable, default `1d`)
- Refresh Tokens: 7 days (configurable via `JWT_REFRESH_EXPIRY` environment variable, default `7d`)
- Refresh tokens are rotated on every use and checked for replay attacks
- Per-request session and status verification enforces revocation even with unexpired tokens

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
  role: 'PARENT' | 'TUTOR',
  // Tutor application fields (required when role=TUTOR)
  birthDay?: number (1-31),
  birthMonth?: number (1-12),
  country?: string (min 1),
  city?: string (min 1),
  highestQualification?: 'SSCE_WAEC' | 'OND_NCE' | 'HND' | 'BACHELORS' | 'BED_PGDE' | 'MASTERS' | 'PHD' | 'OTHER',
  subjects?: string[] (uuid array, min 1),
  levels?: ('PRESCHOOL_TO_G1' | 'G2_TO_G4' | 'G5_TO_G8' | 'G9_TO_G12' | 'EXAM_LEVELS')[] (min 1),
  yearsOfExperience?: number (>= 0),
  whyTeach?: string (min 10),
  howHeard?: 'TEACHMENEST_TUTOR_OR_STAFF' | 'PARENT_OR_FAMILY' | 'FRIEND_OR_FAMILY' | 'INSTAGRAM' | 'FACEBOOK' | 'LINKEDIN' | 'WHATSAPP_GROUP' | 'GOOGLE_SEARCH' | 'JOB_BOARD' | 'OTHER',
  aboutYou?: string[] (min 1, max 3, each max 60 chars)
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
**Note:** For TUTOR role, the application is created in SUBMITTED state during registration. The tutor cannot login until approved by admin after an interview. If rejected, the tutor account is completely deleted from the database.  
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
**Note:** 
- PARENT: status becomes ACTIVE, can login immediately
- TUTOR: status becomes PENDING_VETTING, cannot login until admin approves after interview
- Does NOT return tokens - user must login after verification  
**Error Codes:** 404 (User not found), 400 (Invalid or expired OTP)

### POST /auth/login
**Auth:** None  
**Rate Limit:** Tier 1 (7 req / 15 min) for PARENT/TUTOR, Tier 1c (5 req / 15 min) for ADMIN  
**Body:**
```typescript
{
  email: string (email),
  password: string (min 1),
  portal?: 'PARENT' | 'TUTOR' | 'ADMIN' // Defaults to 'PARENT' if omitted
}
```
**Portal Behavior:**
- Portal mismatch returns same 401 "Invalid credentials" as wrong password (no role leak)
- Rate limit key: IP + email + portal
- PENDING_VETTING tutors can login through TUTOR portal
- Admin portal has stricter rate limit (5 req / 15 min per IP + email)
- Failed admin login attempts are logged to AdminActionLog

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
**Error Codes:** 401 (Invalid credentials), 403 (Please verify your email first, Account is not active, Your account is pending admin approval (tutors must be approved after interview))

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
  "monthlySalaryNGN": 50000,
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
**Note:** monthlySalaryNGN is read-only for tutors. Any write attempt is rejected. hourlyRate is deprecated and not returned.
**Error Codes:** 401 (Not authenticated), 404 (Tutor profile not found)

### GET /students
**Auth:** Required (TUTOR, APPROVED)  
**Response (200):**
```json
[
  {
    "student": {
      "id": "uuid",
      "fullName": "string",
      "gradeLevel": "G5_TO_G8",
      "school": "string"
    },
    "enrollment": {
      "id": "uuid",
      "subjectId": "uuid",
      "sessionFrequency": "WEEKLY",
      "availableDays": ["MON", "WED", "FRI"],
      "preferredStartHour": 14,
      "preferredEndHour": 15,
      "scheduleTimezone": "Africa/Lagos",
      "startDate": "ISO date",
      "endDate": "ISO date",
      "startTimeUtc": "ISO date",
      "status": "ACTIVE",
      "nextExpectedClass": {
        "id": "uuid",
        "scheduledAt": "ISO date",
        "status": "SCHEDULED"
      },
      "sessionsScheduledCount": 5
    },
    "subject": {
      "id": "uuid",
      "name": "Mathematics"
    }
  }
]
```
**Security:** Pricing fields (yearlyPriceNGN, yearlyPriceUSD) excluded. Parent contact info excluded. Schedule fields included for tutor visibility.
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

**Note:** Tutor applications are now submitted during registration (POST /auth/register with role=TUTOR). The application is created in SUBMITTED state directly. The endpoints below are for viewing/managing the application after registration, but tutors cannot access them until approved by admin. Tutors cannot login until their application is approved after an interview.

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

### GET /admin/tutors/pending
**Auth:** Required (ADMIN)  
**Response (200):**
```json
[
  {
    "id": "uuid",
    "fullName": "string",
    "email": "string",
    "status": "PENDING_VETTING",
    "applicationStatus": "DRAFT | SUBMITTED | NONE",
    "submittedAt": "ISO date | null",
    "tutorProfile": {
      "id": "uuid",
      "userId": "uuid",
      "subjects": ["Mathematics"],
      "bio": "string",
      "hourlyRate": 50,
      "availability": {},
      "availabilityStatus": "AVAILABLE",
      "maxStudents": null,
      "statusNote": null,
      "statusUpdatedAt": "ISO date",
      "createdAt": "ISO date",
      "updatedAt": "ISO date"
    },
    "tutorApplication": {
      "id": "uuid",
      "userId": "uuid",
      "status": "DRAFT | SUBMITTED",
      "submittedAt": "ISO date | null",
      "createdAt": "ISO date",
      "updatedAt": "ISO date"
    } | null
  }
]
```
**Note:** Returns every PENDING_VETTING tutor, including those with DRAFT or no application (applicationStatus = NONE). Includes name (fullName), email, applicationStatus, and submittedAt. The applicationStatus filter works when supplied to GET /admin/tutors.

### GET /admin/tutors
**Auth:** Required (ADMIN)  
**Query:** `status` (APPROVED, PENDING_VETTING, REJECTED, SUSPENDED), `applicationStatus` (DRAFT, SUBMITTED, APPROVED, REJECTED), `vettingStatus` (PENDING, APPROVED, REJECTED), `availabilityStatus` (AVAILABLE, LIMITED, UNAVAILABLE), `subjectId` (uuid), `hasCapacity` (boolean), `search` (string), `page` (number), `limit` (number, max 100)  
**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "fullName": "string",
      "email": "string",
      "phone": "string",
      "role": "TUTOR",
      "status": "APPROVED",
      "createdAt": "ISO date",
      "updatedAt": "ISO date",
      "tutorProfile": {
        "id": "uuid",
        "userId": "uuid",
        "subjects": ["Mathematics"],
        "bio": "string",
        "hourlyRate": 50,
        "availability": {},
        "availabilityStatus": "AVAILABLE",
        "maxStudents": null,
        "statusNote": null,
        "statusUpdatedAt": "ISO date",
        "createdAt": "ISO date",
        "updatedAt": "ISO date",
        "tutorSubjects": [
          {
            "id": "uuid",
            "tutorProfileId": "uuid",
            "subjectId": "uuid",
            "subject": {
              "id": "uuid",
              "name": "Mathematics",
              "category": "STEM"
            }
          }
        ]
      },
      "tutorApplication": {
        "id": "uuid",
        "userId": "uuid",
        "status": "SUBMITTED",
        "submittedAt": "ISO date",
        "createdAt": "ISO date",
        "updatedAt": "ISO date"
      } | null,
      "currentStudentCount": 5,
      "applicationStatus": "DRAFT | SUBMITTED | NONE",
      "submittedAt": "ISO date | null"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 100
}
```
**Note:** When status=PENDING_VETTING, returns all tutors with that status even when applicationStatus is DRAFT or there is no application row. Includes applicationStatus (DRAFT, SUBMITTED, or NONE), submittedAt, fullName, and email. The applicationStatus filter works when supplied (filters after query to include tutors without applications).

### GET /admin/tutors/:id
**Auth:** Required (ADMIN)  
**Response (200):** Comprehensive tutor data (user, application, profile, metrics)

### GET /admin/tutors/:id/students
**Auth:** Required (ADMIN)  
**Response (200):** Tutor's assigned students

### GET /admin/tutors/:id/sessions
**Auth:** Required (ADMIN)  
**Response (200):** Tutor's sessions

### GET /admin/tutors/:id/grades
**Auth:** Required (ADMIN)  
**Response (200):** Tutor's submitted grades

### GET /admin/tutors/:id/progress-reports
**Auth:** Required (ADMIN)  
**Response (200):** Tutor's progress reports

### PATCH /admin/tutors/:id/vetting
**Auth:** Required (ADMIN)  
**Body:**
```typescript
{
  vettingStatus: 'APPROVED' | 'REJECTED',
  rejectionReason?: string (required when REJECTED)
}
```
**Response (200):** Updated tutor status

### PATCH /admin/tutors/:id/salary
**Auth:** Required (ADMIN)  
**Body:**
```typescript
{
  monthlySalaryNGN: number (positive integer, required),
  reason?: string
}
```
**Response (200):**
```json
{
  "id": "uuid",
  "monthlySalaryNGN": number,
  "oldValue": number | null,
  "newValue": number,
  "changedBy": "uuid",
  "reason": "string | null",
  "createdAt": "ISO date"
}
```
**Note:** Salary can be edited but never deleted (null or zero rejected). Every change is recorded in TutorSalaryHistory and AdminActionLog. Tutor is notified with SALARY_UPDATED (no old value leaked).

### GET /admin/tutors/:id/salary-history
**Auth:** Required (ADMIN)  
**Response (200):**
```json
[
  {
    "id": "uuid",
    "tutorId": "uuid",
    "oldValue": number | null,
    "newValue": number,
    "changedBy": "uuid",
    "reason": "string | null",
    "createdAt": "ISO date"
  }
]
```

### GET /admin/enrollments/unmatched
**Auth:** Required (ADMIN)  
**Query:** `includeUnpaid` (boolean)  
**Response (200):** Enrollments without assigned tutors

### GET /admin/enrollments/:id/pricing
**Auth:** Required (ADMIN)  
**Response (200):** Enrollment pricing override details

### PATCH /admin/enrollments/:id/pricing
**Auth:** Required (ADMIN)  
**Body:**
```typescript
{
  yearlyPriceNGN?: number (positive, nullable),
  yearlyPriceUSD?: number (positive, nullable),
  billingFrequency?: 'WEEKLY' | 'MONTHLY' | 'YEARLY',
  note?: string
}
```
**Response (200):** Updated enrollment pricing override

### PATCH /admin/enrollments/:id/assign-tutor
**Auth:** Required (ADMIN)  
**Body:**
```typescript
{
  tutorId: string (uuid),
  force?: boolean
}
```
**Response (200):** Assigned tutor

### GET /admin/enrollments/:id/suggested-tutors
**Auth:** Required (ADMIN)  
**Response (200):** Ranked suggested tutors based on subject, availability, capacity

### GET /admin/subjects
**Auth:** Required (ADMIN)  
**Response (200):** All subjects with per-grade pricing

### POST /admin/subjects
**Auth:** Required (ADMIN)  
**Body:**
```typescript
{
  name: string (min 1, trimmed),
  description?: string,
  category: 'CORE' | 'ENRICHMENT' | 'TEST_PREP',
  prices: Array<{
    gradeBandTier: 'PRESCHOOL_TO_G1' | 'G2_TO_G4' | 'G5_TO_G8' | 'G9_TO_G12',
    yearlyPriceNGN: number (positive),
    yearlyPriceUSD: number (positive)
  }> (min 1)
}
```
**Response (201):** Created subject

### PATCH /admin/subjects/:id
**Auth:** Required (ADMIN)  
**Body:**
```typescript
{
  name?: string (min 1, trimmed),
  description?: string,
  category?: 'CORE' | 'ENRICHMENT' | 'TEST_PREP',
  isActive?: boolean
}
```
**Response (200):** Updated subject

### PUT /admin/subjects/:id/prices/:gradeBandTier
**Auth:** Required (ADMIN)  
**Body:**
```typescript
{
  yearlyPriceNGN: number (positive),
  yearlyPriceUSD: number (positive),
  isActive?: boolean,
  note?: string
}
```
**Response (200):** Upserted subject price

### DELETE /admin/subjects/:id
**Auth:** Required (ADMIN)  
**Response (200):** Deleted subject (soft delete if enrollments exist)

### GET /admin/exchange-rate/current
**Auth:** Required (ADMIN)  
**Response (200):** Current exchange rate

### GET /badge-counts
**Auth:** Required (any role)
**Response (200) - varies by role:**

**For PARENT:**
```json
{
  "unreadNotifications": {
    "ENROLLMENTS": number,
    "PAYMENTS": number,
    "SESSIONS": number,
    "MESSAGES": number,
    "GRADES": number,
    "ASSIGNMENTS": number,
    "QUIZZES": number,
    "PROGRESS": number,
    "SCHEDULE": number,
    "PRICING": number,
    "COMPLAINTS": number,
    "OTHER": number
  },
  "unpaidEnrollments": number,
  "upcomingSessions24h": number,
  "unreadMessages": number
}
```

**For TUTOR:**
```json
{
  "unreadNotifications": {
    "SESSIONS": number,
    "MESSAGES": number,
    "ASSIGNMENTS": number,
    "GRADES": number,
    "COMPLAINTS": number,
    "OTHER": number
  },
  "sessionsNeedingScheduling": number,
  "classesWithin24h": number,
  "draftOrRejectedGrades": number,
  "unmarkedAttendance": number,
  "unreadMessages": number,
  "submissionsToScore": number
}
```

**For STUDENT:**
```json
{
  "unreadNotifications": {
    "ASSIGNMENTS": number,
    "SESSIONS": number,
    "MESSAGES": number,
    "GRADES": number,
    "QUIZZES": number,
    "OTHER": number
  },
  "pendingAssignments": number,
  "classesWithin24h": number
}
```

**For ADMIN:**
```json
{
  "unreadNotifications": {
    "USERS": number,
    "SESSIONS": number,
    "MESSAGES": number,
    "COMPLAINTS": number,
    "ENROLLMENT": number,
    "PAYMENTS": number,
    "GRADES": number,
    "PRICING": number,
    "SCHEDULE": number,
    "QUIZZES": number,
    "ASSIGNMENTS": number,
    "OTHER": number
  },
  "pendingTutorApplications": number,
  "pendingGrades": number,
  "openComplaints": number,
  "unmatchedPaidEnrollments": number,
  "pendingChangeRequests": number,
  "unscheduledWithin24h": number,
  "failedPayments": number,
  "outstandingEnrollments": number,
  "unreadMessages": number,
  "attendanceUnmarkedSessions": number
}
```

**Note:** All counts are computed strictly from the authenticated user's own data. Cross-role leaks are prevented by filtering notifications by userId and computing counts from user-specific relations.

### GET /admin/badge-counts
**Auth:** Required (ADMIN)
**Response (200):**
```json
{
  "pendingTutorApplications": number,
  "pendingGrades": number,
  "openComplaints": number,
  "unmatchedPaidEnrollments": number,
  "pendingChangeRequests": number,
  "unscheduledWithin24h": number,
  "failedPayments": number,
  "outstandingEnrollments": number,
  "unreadMessages": number,
  "unreadNewParents": number,
  "unreadNewTutors": number,
  "attendanceUnmarkedSessions": number
}
```
**Note:** Counts that stay correct regardless of read state. `failedPayments` counts FAILED payments in the last 14 days. `outstandingEnrollments` counts PENDING_PAYMENT enrollments older than 24 hours. `unreadNewParents` and `unreadNewTutors` are computed from unread notifications per admin with entityType=PARENT/TUTOR and type=USER_VERIFIED. `attendanceUnmarkedSessions` counts sessions that ended more than 48 hours ago with unmarked attendance.

### GET /admin/payments
**Auth:** Required (ADMIN)
**Query:** `status` (PENDING, SUCCESS, FAILED, EXPIRED, REFUNDED), `currency` (NGN, USD), `provider` (PAYSTACK), `parentId` (uuid), `studentId` (uuid), `subjectId` (uuid), `from` (ISO date), `to` (ISO date), `search` (string - searches reference, receiptNumber, parent name/email), `page` (number), `limit` (number, max 100), `sort` (string, e.g., createdAt:desc, paidAt:asc, amount:desc)
**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "reference": "paystack-reference",
      "receiptNumber": "RCT-202601-000001",
      "amount": 100,
      "currency": "USD",
      "status": "SUCCESS",
      "createdAt": "ISO date",
      "paidAt": "ISO date",
      "parent": {
        "id": "uuid",
        "fullName": "John Doe",
        "email": "john@example.com"
      },
      "student": {
        "id": "uuid",
        "fullName": "Jane Doe"
      },
      "subjects": ["Mathematics"],
      "enrollmentGroupId": "uuid",
      "hasAdminNote": true,
      "failureReason": null,
      "chargedAmountNGN": 150000
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 100
}
```
**Note:** Never exposes gateway secrets, card numbers, or raw provider payloads. Admin responses never contain studentCode. Single-enrollment payments include student and subject; group payments need to fetch enrollments separately.

### GET /admin/payments/summary
**Auth:** Required (ADMIN)
**Query:** `from` (ISO date), `to` (ISO date), `currency` (NGN, USD - optional, if specified filters by currency only)
**Response (200):**
```json
{
  "byCurrency": {
    "NGN": {
      "collectedTotal": 750000,
      "pendingTotal": 150000,
      "failedTotal": 50000,
      "count": 50,
      "successCount": 40,
      "successRate": 80,
      "averagePayment": 18750
    },
    "USD": {
      "collectedTotal": 500,
      "pendingTotal": 100,
      "failedTotal": 50,
      "count": 30,
      "successCount": 25,
      "successRate": 83.33,
      "averagePayment": 20
    }
  },
  "totalCollectedNGNEquivalent": 1500000,
  "changePercent": 15.5,
  "dailySeries": [
    {
      "date": "2026-01-15",
      "collected": {
        "NGN": 50000,
        "USD": 50
      }
    }
  ],
  "bySubject": [
    {
      "subjectName": "Mathematics",
      "collected": 300000,
      "count": 20
    }
  ],
  "byStatus": [
    {
      "status": "SUCCESS",
      "count": 65
    },
    {
      "status": "PENDING",
      "count": 10
    },
    {
      "status": "FAILED",
      "count": 5
    }
  ]
}
```
**Note:** Per-currency metrics (never mix NGN and USD in one total). `totalCollectedNGNEquivalent` uses `exchangeRateUsed` to convert USD to NGN. `changePercent` compares to previous period of equal length. `dailySeries` or `monthlySeries` (if range > 92 days) shows collected per currency per period. `bySubject` shows top 10 subjects by collected amount. `byStatus` shows counts by payment status.

### GET /admin/payments/outstanding
**Auth:** Required (ADMIN)
**Query:** `page` (number), `limit` (number, max 100), `sort` (string, e.g., daysWaiting:desc)
**Response (200):**
```json
{
  "data": [
    {
      "enrollmentGroupId": "uuid",
      "parent": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+2348000000000"
      },
      "student": {
        "id": "uuid",
        "fullName": "Jane Doe"
      },
      "subjects": ["Mathematics", "English"],
      "expectedAmount": 150,
      "expectedCurrency": "USD",
      "createdAt": "ISO date",
      "daysWaiting": 5,
      "latestPaymentStatus": "FAILED"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 10
}
```
**Note:** Returns enrollments in PENDING_PAYMENT status, grouped by enrollmentGroupId. Uses server-side price resolution (never client values). Sortable by daysWaiting. Paginated.

### GET /admin/payments/failed
**Auth:** Required (ADMIN)
**Response (200):** Failed payments list (filtered by status=FAILED)

### GET /admin/payments/:id
**Auth:** Required (ADMIN)
**Response (200):**
```json
{
  "id": "uuid",
  "reference": "paystack-reference",
  "receiptNumber": "RCT-202601-000001",
  "amount": 100,
  "currency": "USD",
  "status": "SUCCESS",
  "createdAt": "ISO date",
  "paidAt": "ISO date",
  "provider": "PAYSTACK",
  "exchangeRateUsed": 1500,
  "adminNote": "Internal note",
  "parent": {
    "id": "uuid",
    "fullName": "John Doe",
    "email": "john@example.com",
    "phone": "+2348000000000"
  },
  "student": {
    "id": "uuid",
    "fullName": "Jane Doe"
  },
  "subject": {
    "id": "uuid",
    "name": "Mathematics"
  },
  "enrollmentGroupId": "uuid",
  "chargedAmountNGN": 150000,
  "timeline": [
    {
      "event": "Initiated",
      "timestamp": "ISO date"
    },
    {
      "event": "Paid",
      "timestamp": "ISO date"
    }
  ],
  "auditLogs": [
    {
      "id": "uuid",
      "action": "PAYMENT_REVERIFIED",
      "adminId": "uuid",
      "createdAt": "ISO date",
      "details": {}
    }
  ]
}
```
**Note:** Full payment details with NGN equivalent using exchangeRateUsed. Includes audit entries from AdminActionLog for this payment. Never exposes gateway secrets or raw card data. StudentCode never included.

### PATCH /admin/payments/:id/note
**Auth:** Required (ADMIN)  
**Body:**
```typescript
{
  note: string (min 1)
}
```
**Response (200):** Added admin note

### POST /admin/payments/:id/reverify
**Auth:** Required (ADMIN)  
**Response (200):** Payment verified via Paystack API, enrollment activated if successful

### GET /admin/reports/overview
**Auth:** Required (ADMIN)  
**Response (200):** Overview statistics

### GET /admin/students
**Auth:** Required (ADMIN)  
**Query:** `parentId` (uuid), `search` (string), `status` (UNVERIFIED, ACTIVE, PENDING_VETTING, APPROVED, REJECTED, SUSPENDED), `gradeBandTier` (PRESCHOOL_TO_G1, G2_TO_G4, G5_TO_G8, G9_TO_G12), `enrolled` (boolean), `assigned` (boolean), `page` (number), `limit` (number, max 100)  
**Response (200):** Paginated student list (studentCode explicitly excluded)

### GET /admin/students/:id
**Auth:** Required (ADMIN)  
**Response (200):** Comprehensive student data (studentCode explicitly excluded)

### GET /admin/students/:id/enrollments
**Auth:** Required (ADMIN)  
**Response (200):** Student's enrollments

### GET /admin/students/:id/grades
**Auth:** Required (ADMIN)  
**Response (200):** Student's grades

### GET /admin/students/:id/attendance
**Auth:** Required (ADMIN)  
**Response (200):** Student's attendance records

### GET /admin/students/:id/sessions
**Auth:** Required (ADMIN)  
**Response (200):** Student's sessions

### GET /admin/students/:id/assignments
**Auth:** Required (ADMIN)  
**Response (200):** Student's assignments

### GET /admin/students/:id/progress-reports
**Auth:** Required (ADMIN)  
**Response (200):** Student's progress reports

### GET /admin/students/:id/performance
**Auth:** Required (ADMIN)  
**Response (200):** Student performance data

### PATCH /admin/students/:id/regenerate-pin
**Auth:** Required (ADMIN)  
**Response (200):**
```json
{
  "message": "PIN regenerated successfully. New credentials sent to parent email.",
  "emailSent": true
}
```
**Security:** PIN sent to parent by email, never returned in response, studentCode never exposed

### GET /admin/parents
**Auth:** Required (ADMIN)  
**Response (200):** Paginated parent list

### GET /admin/parents/:id
**Auth:** Required (ADMIN)
**Response (200):**
```json
{
  "id": "uuid",
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+2348000000000",
  "status": "ACTIVE",
  "timezone": "Africa/Lagos",
  "profilePicture": "url",
  "createdAt": "ISO date",
  "updatedAt": "ISO date",
  "children": [
    {
      "id": "uuid",
      "fullName": "Jane Doe",
      "dateOfBirth": "ISO date",
      "actualGrade": "GRADE_5",
      "gradeLevel": "Grade 5",
      "gradeBandTier": "G5_TO_G8",
      "status": "ACTIVE",
      "enrollments": [
        {
          "id": "uuid",
          "subject": {
            "id": "uuid",
            "name": "Mathematics"
          },
          "status": "ACTIVE",
          "effectivePriceNGN": 150000,
          "effectivePriceUSD": 100,
          "priceSource": "subject_price",
          "hasPendingPayment": false
        }
      ]
    }
  ],
  "recentPayments": [
    {
      "id": "uuid",
      "reference": "paystack-ref",
      "receiptNumber": "RCT-202601-000001",
      "amount": 100,
      "currency": "USD",
      "status": "SUCCESS",
      "createdAt": "ISO date",
      "paidAt": "ISO date",
      "enrollment": {
        "student": {
          "fullName": "Jane Doe"
        },
        "subject": {
          "name": "Mathematics"
        }
      }
    }
  ],
  "complaintCount": 0,
  "totalPaidNGN": 750000,
  "totalPaidUSD": 500,
  "pendingPaymentCount": 2
}
```
**Note:** Includes totalPaid per currency (SUCCESS payments only), pending payment count, last 10 payments with status, and complaint count. StudentCode never exposed to admins.

### GET /admin/users/suspended
**Auth:** Required (ADMIN)  
**Response (200):** Suspended users list

### PATCH /admin/users/:id/suspend
**Auth:** Required (ADMIN)  
**Body:**
```typescript
{
  reason: string (min 1)
}
```
**Response (200):** User suspended

### PATCH /admin/users/:id/reactivate
**Auth:** Required (ADMIN)  
**Response (200):** User reactivated

### GET /admin/diagnostics/email
**Auth:** Required (ADMIN)  
**Response (200):** Email diagnostics information

### GET /admin/sessions
**Auth:** Required (ADMIN)  
**Query:** `status` (SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, MISSED), `tutorId` (uuid), `studentId` (uuid), `enrollmentId` (uuid), `from` (ISO date), `to` (ISO date), `page` (number), `limit` (number, max 100)  
**Response (200):** Paginated sessions list

### POST /admin/sessions
**Auth:** Required (ADMIN)  
**Body:**
```typescript
{
  tutorId: string (uuid),
  scheduledAt: string (ISO date),
  durationMinutes: number (positive integer),
  googleMeetLink?: string (url),
  googleEventId?: string,
  participantEnrollmentIds: string[] (uuid array, min 1),
  sharedSessionConfirmed?: boolean
}
```
**Response (201):** Created session with Google Meet link

### PATCH /admin/sessions/:id/reschedule
**Auth:** Required (ADMIN)  
**Body:**
```typescript
{
  scheduledAt?: string (ISO date),
  googleMeetLink?: string (url)
}
```
**Response (200):** Rescheduled session

### GET /admin/grades/pending
**Auth:** Required (ADMIN)  
**Response (200):** Pending grades awaiting approval

### PATCH /admin/grades/:id/approve
**Auth:** Required (ADMIN)  
**Response (200):** Approved grade, visible to student/parent

### PATCH /admin/grades/:id/reject
**Auth:** Required (ADMIN)  
**Body:**
```typescript
{
  reason: string (min 1)
}
```
**Response (200):** Rejected grade, notifies tutor only

### PATCH /admin/complaints/:id/resolve
**Auth:** Required (ADMIN)  
**Body:**
```typescript
{
  resolution: string (min 1)
}
```
**Response (200):** Resolved complaint

---

## Enrollments

### POST /enrollments
**Auth:** Required (PARENT)  
**Body:**
```typescript
{
  studentId: string (uuid),
  subjectIds: string[] (uuid array),
  sessionFrequency: 'WEEKLY' | 'TWICE_WEEKLY' | 'THRICE_WEEKLY' | 'FIVE_TIMES_WEEKLY',
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
**Auth:** Required (PARENT, TUTOR)  
**Query:** `status`, `studentId`, `tutorId`  
**Response (200):** Enrollments based on role (tutors don't see pricing)

### GET /enrollments/group/:groupId
**Auth:** Required (PARENT, TUTOR, ADMIN)  
**Response (200):** Enrollments by group ID

### GET /enrollments/:id
**Auth:** Required (PARENT, TUTOR)  
**Response (200):** Enrollment details (tutors don't see pricing)

---

## Enrollment Change Requests

### POST /enrollments/:id/change-requests
**Auth:** Required (PARENT)  
**Body:**
```typescript
{
  requestedValues: {
    startDate?: string (ISO date),
    endDate?: string (ISO date),
    availableDays?: string[],
    preferredStartHour?: number,
    preferredEndHour?: number
  }
}
```
**Response (201):** Created change request  
**Note:** Only schedule fields are allowed (startDate, endDate, availableDays, preferredStartHour, preferredEndHour). Changes to sessionFrequency, billingFrequency, or subjects are rejected.

### GET /enrollments/:id/change-requests
**Auth:** Required (PARENT)  
**Response (200):** Change requests for enrollment

### PATCH /change-requests/:id/cancel
**Auth:** Required (PARENT)  
**Response (200):** Cancelled change request (PENDING only)

### GET /admin/change-requests
**Auth:** Required (ADMIN)  
**Query:** `status` (PENDING, APPROVED, REJECTED, CANCELLED), `page` (number), `limit` (number, max 100)  
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
  reason: string (min 1)
}
```
**Response (200):** Rejected change request

---

## Sessions

### GET /sessions
**Auth:** Required (PARENT, STUDENT, TUTOR, ADMIN)  
**Query:** `status` (SCHEDULED, COMPLETED, MISSED, CANCELLED), `enrollmentId` (uuid), `tutorId` (uuid), `studentId` (uuid), `from` (ISO date), `to` (ISO date), `page` (number), `limit` (number, max 100)  
**Response (200):** Sessions based on role and ownership

### PATCH /sessions/:id
**Auth:** Required (TUTOR, APPROVED)  
**Body:**
```typescript
{
  status?: 'COMPLETED' | 'MISSED' | 'CANCELLED',
  tutorNotes?: string,
  homeworkAssigned?: string,
  durationMinutes?: number (positive integer),
  participants?: Array<{
    enrollmentId: string (uuid),
    attended: boolean
  }>
}
```
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
**Query:**
- `mode`: 'sessions' (default) | 'enrollments'
- `tutorId`: uuid (optional)
- `subjectId`: uuid (optional)
- `status`: 'SCHEDULED' | 'UNSCHEDULED' | 'MISSED' | 'NOT_STARTED' (optional, for enrollments mode)
- `from`: ISO date (optional)
- `to`: ISO date (optional)
- `search`: string (optional, searches student/tutor/subject name)
- `page`: number (optional)
- `limit`: number (optional, max 100)

**Response (200) - mode=sessions:**
```json
{
  "data": [
    {
      "id": "uuid",
      "scheduledAt": "ISO date",
      "status": "SCHEDULED",
      "durationMinutes": 60,
      "googleMeetLink": "string",
      "enrollment": {
        "id": "uuid",
        "student": { "id": "uuid", "fullName": "string" },
        "subject": { "id": "uuid", "name": "string" },
        "tutor": { "id": "uuid", "fullName": "string" }
      },
      "participants": [
        {
          "id": "uuid",
          "attended": null,
          "enrollmentId": "uuid"
        }
      ]
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 100,
  "unscheduledWithin24hCount": 5
}
```

**Response (200) - mode=enrollments:**
```json
{
  "data": [
    {
      "id": "uuid",
      "student": { "id": "uuid", "fullName": "string" },
      "tutor": { "id": "uuid", "fullName": "string" },
      "subject": { "id": "uuid", "name": "string" },
      "startDate": "ISO date",
      "endDate": "ISO date",
      "availableDays": ["MON", "WED", "FRI"],
      "preferredStartHour": 14,
      "preferredEndHour": 15,
      "scheduleTimezone": "Africa/Lagos",
      "sessionFrequency": "WEEKLY",
      "status": "SCHEDULED",
      "nextExpectedClass": {
        "id": "uuid",
        "scheduledAt": "ISO date",
        "status": "SCHEDULED"
      },
      "sessionsScheduledCount": 5
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 50
}
```

**Note:** mode=enrollments lists every active paid enrollment with schedule info. Status values: SCHEDULED (has upcoming session), UNSCHEDULED (started but no session), MISSED (had sessions but none upcoming), NOT_STARTED (future start date). Tutors don't receive parent contact details or prices. Admins don't receive studentCode.

---

## Payments

### POST /payments/initiate
**Auth:** Required (PARENT)  
**Rate Limit:** Tier 1 (7 req / 15 min)  
**Body:**
```typescript
{
  enrollmentId: string (uuid),
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
**Query:** `status` (PENDING, SUCCESS, FAILED, EXPIRED, REFUNDED), `from` (ISO date), `to` (ISO date), `page` (number), `limit` (number, max 100)  
**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "reference": "paystack-reference",
      "receiptNumber": "RCT-202601-000001",
      "amount": 100,
      "currency": "USD",
      "status": "SUCCESS",
      "createdAt": "ISO date",
      "paidAt": "ISO date",
      "provider": "PAYSTACK",
      "enrollment": {
        "student": {
          "fullName": "string"
        },
        "subject": {
          "name": "Mathematics"
        },
        "billingFrequency": "MONTHLY",
        "enrollmentGroupId": "uuid"
      }
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 100,
  "summary": {
    "totalPaidPerCurrency": {
      "USD": 500,
      "NGN": 75000
    }
  }
}
```
**Note:** Returns the parent's payments from the database (not Paystack API), newest first. Never includes gateway secrets. Each row includes enrollment info (student fullName, subject name, billingFrequency, enrollmentGroupId). Summary fields show total paid per currency (SUCCESS payments only).

### GET /payments/:id
**Auth:** Required (owning parent or ADMIN)  
**Response (200):**
```json
{
  "id": "uuid",
  "parentId": "uuid",
  "enrollmentId": "uuid",
  "enrollmentGroupId": "uuid",
  "amount": 100,
  "currency": "USD",
  "provider": "PAYSTACK",
  "providerReference": "paystack-reference",
  "receiptNumber": "RCT-202601-000001",
  "exchangeRateUsed": 1500,
  "status": "SUCCESS",
  "paidAt": "ISO date",
  "createdAt": "ISO date",
  "updatedAt": "ISO date",
  "enrollment": {
    "student": {
      "id": "uuid",
      "fullName": "string"
    },
    "subject": {
      "id": "uuid",
      "name": "Mathematics"
    }
  },
  "timeline": [
    {
      "event": "Payment Initiated",
      "timestamp": "ISO date",
      "details": "Payment of USD 100 initiated"
    },
    {
      "event": "Payment Successful",
      "timestamp": "ISO date",
      "details": "Payment verified and enrollment activated"
    }
  ]
}
```
**Note:** For parents, includes a timeline of payment events. For admins, returns full payment details with audit logs. Never includes gateway secrets.

### GET /payments/verify/:reference
**Auth:** Required (owning parent or ADMIN)  
**Response (200):** Payment verification status

### GET /payments/:id/receipt
**Auth:** Required (owning parent or ADMIN)  
**Response (200):**
```json
{
  "receiptNumber": "RCT-202601-000001",
  "paidAt": "ISO date",
  "amount": 100,
  "currency": "USD",
  "reference": "paystack-reference",
  "parentName": "John Doe",
  "parentEmail": "john@example.com",
  "studentNames": ["Jane Doe"],
  "subjectNames": ["Mathematics"],
  "billingFrequency": "MONTHLY",
  "enrollmentGroupId": "uuid",
  "platformName": "Smart-Tutor"
}
```
**Error Codes:** 404 (Payment not found), 403 (Not authorized), 409 (Receipt only available for successful payments)

### GET /payments/:id/receipt.pdf
**Auth:** Required (owning parent or ADMIN)  
**Response (200):** PDF file (Content-Type: application/pdf, Content-Disposition: attachment)  
**Error Codes:** 404 (Payment not found), 403 (Not authorized), 409 (Receipt only available for successful payments)

### POST /payments/webhook
**Auth:** None (webhook)
**Rate Limit:** Exempt
**Headers:** `x-paystack-signature` (HMAC-SHA512)
**Body:** Paystack webhook event (raw body captured before JSON parsing)
**Response (200):** Webhook processed
**Note:** On payment SUCCESS, assigns receiptNumber (RCT-YYYYMM-000123 format) and exchangeRateUsed (NGN per USD) exactly once (idempotent). Emails receipt to parent (fails silently if email fails). Creates PAYMENT_SUCCESS notification for parent with link to receipt, and PAYMENT_SUCCESS notification for admins. On payment FAILED, creates PAYMENT_FAILED notification for parent and admins. On EXPIRED→SUCCESS transition (via webhook or admin reverify), creates payment-expired-needs-review notification for admins.

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
  enrollmentId: string (uuid),
  periodStart: string (ISO date),
  periodEnd: string (ISO date),
  components: Array<{
    type: string,
    weight: number,
    scoredItemId?: string (uuid),
    attendanceRate?: number
  }>,
  tutorComment?: string
}
```
**Response (201):** Created DRAFT grade  
**Note:** Component weights must total exactly 100.

### GET /grades
**Auth:** Required (TUTOR, PARENT, STUDENT, ADMIN)  
**Query:** `studentId` (uuid), `enrollmentId` (uuid)  
**Response (200):** Grades based on role:
- Tutors: Their own grades in all statuses (includes overrideReason, rejectionReason)
- Parents/Students: APPROVED grades only (never overrideReason, rejectionReason)
- Admins: All except DRAFT

### GET /grades/:id
**Auth:** Required (PARENT, STUDENT, TUTOR, ADMIN)  
**Response (200):** Grade details

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

### POST /admin/grades/bulk-approve
**Auth:** Required (ADMIN)  
**Body:**
```typescript
{
  gradeIds: string[] (uuid array)
}
```
**Response (200):** Bulk approval results

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
**Body:**
```typescript
{
  enrollmentId?: string (uuid, single enrollment),
  enrollmentIds?: string[] (uuid array, multiple enrollments),
  title: string (min 1, max 200),
  description?: string,
  type: 'ASSIGNMENT' | 'CLASSWORK' | 'TEST' | 'HOMEWORK' | 'PROJECT' | 'QUIZ',
  dueDate: string (ISO date),
  attachmentUrl?: string,
  attachmentName?: string
}
```
**Response (201):** Created assignment (array if enrollmentIds provided)  
**Note:** Provide either enrollmentId (single) or enrollmentIds[] (multiple). For multiple enrollments, creates one assignment per enrollment in a transaction. All students/parents are notified.

### GET /assignments
**Auth:** Required  
**Query:** `enrollmentId` (uuid), `status` (PENDING, COMPLETED, SUBMITTED, GRADED, CANCELLED)  
**Response (200):** Assignments based on role (filtered by enrollment for tutors/students/parents)

### GET /assignments/:id
**Auth:** Required  
**Response (200):** Assignment details

### GET /assignments/:id/schema
**Auth:** Required  
**Response (200):** Assignment schema with enrollment and subject info
```json
{
  "id": "uuid",
  "enrollmentId": "uuid",
  "title": "string",
  "description": "string",
  "type": "ASSIGNMENT | CLASSWORK | TEST | HOMEWORK | PROJECT | QUIZ",
  "dueDate": "ISO date",
  "status": "PENDING | COMPLETED | SUBMITTED | GRADED | CANCELLED",
  "attachmentUrl": "string | null",
  "attachmentName": "string | null",
  "createdAt": "ISO date",
  "updatedAt": "ISO date",
  "enrollment": {
    "id": "uuid",
    "subject": {
      "id": "uuid",
      "name": "string",
      "category": "string"
    },
    "student": {
      "id": "uuid",
      "fullName": "string"
    }
  }
}
```

### PATCH /assignments/:id
**Auth:** Required (TUTOR, APPROVED)  
**Body:** Partial assignment updates (own only)  
**Response (200):** Updated assignment

### DELETE /assignments/:id
**Auth:** Required (TUTOR, APPROVED)  
**Response (200):** Deleted assignment (own only, blocked if submissions exist)

### POST /assignments/:id/submit
**Auth:** Required (STUDENT)  
**Body:**
```typescript
{
  textAnswer?: string,
  attachmentUrl?: string,
  attachmentName?: string
}
```
**Response (201):** Submitted assignment  
**Note:** Flips assignment.status to SUBMITTED. Cannot submit again (400 error if already submitted).

### GET /assignments/:id/submissions
**Auth:** Required (TUTOR for own assignments, PARENT for children's assignments)  
**Response (200):** All submissions for the assignment
```json
[
  {
    "id": "uuid",
    "assignmentId": "uuid",
    "studentId": "uuid",
    "studentName": "string",
    "status": "SUBMITTED | GRADED",
    "textAnswer": "string | null",
    "attachmentUrl": "string | null",
    "attachmentName": "string | null",
    "submittedAt": "ISO date",
    "feedbackText": "string | null",
    "feedbackAttachmentUrl": "string | null",
    "feedbackAttachmentName": "string | null",
    "gradedAt": "ISO date | null",
    "scoredItem": {
      "id": "uuid",
      "score": number,
      "maxScore": number,
      "comment": "string",
      "scoredAt": "ISO date"
    } | null,
    "student": {
      "id": "uuid",
      "fullName": "string",
      "user": {
        "id": "uuid",
        "email": "string"
      }
    }
  }
]
```

### GET /assignments/:id/submissions/:submissionId
**Auth:** Required (TUTOR for own assignments, STUDENT for own submissions, PARENT for children's submissions)  
**Response (200):** Specific submission with full details

### POST /tutor/assignments/:id/submissions/:submissionId/score
**Auth:** Required (TUTOR, APPROVED)  
**Body:**
```typescript
{
  score: number (non-negative),
  maxScore?: number (positive, default 100),
  comment?: string
}
```
**Response (201):** Created ScoredItem
```json
{
  "id": "uuid",
  "tutorId": "uuid",
  "studentId": "uuid",
  "enrollmentId": "uuid",
  "type": "QUIZ | ASSIGNMENT | CLASSWORK | TEST | HOMEWORK | PROJECT | PARTICIPATION",
  "sourceType": "AssignmentSubmission",
  "sourceId": "uuid",
  "score": number,
  "maxScore": number,
  "comment": "string",
  "scoredAt": "ISO date",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```
**Note:** Creates a ScoredItem from the submission, marks submission as GRADED, and updates assignment status to GRADED. One scored item per submission enforced. Type is mapped from assignment type (QUIZ→QUIZ, ASSIGNMENT→ASSIGNMENT, CLASSWORK→CLASSWORK, TEST→TEST, HOMEWORK→HOMEWORK, PROJECT→PROJECT).

### PATCH /assignments/:id/submissions/:submissionId/feedback
**Auth:** Required (TUTOR, APPROVED)  
**Body:**
```typescript
{
  feedbackText?: string,
  feedbackAttachmentUrl?: string,
  feedbackAttachmentName?: string
}
```
**Response (200):** Updated submission with feedback  
**Note:** Sets gradedAt timestamp

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

**Availability:** All roles (ADMIN, PARENT, TUTOR, STUDENT) can access these endpoints at `/notifications`. No `/admin/notifications` aliases exist.

### GET /notifications
**Auth:** Required  
**Query:** `category` (ASSIGNMENTS, GRADES, SESSIONS, MESSAGES, USERS, ENROLLMENT, PAYMENTS, PRICING, COMPLAINTS, QUIZZES, SCHEDULE), `type` (string), `isRead` (boolean), `entityType` (string), `entityId` (string), `page` (number), `limit` (number, max 100)  
**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "string",
      "category": "ASSIGNMENTS",
      "title": "string",
      "body": "string",
      "entityType": "string",
      "entityId": "string",
      "isRead": false,
      "readAt": "ISO date",
      "createdAt": "ISO date"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 100
}
```

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
**Response (200):**
```json
{
  "message": "Notification marked as read"
}
```

### PATCH /notifications/read-all
**Auth:** Required  
**Query:** `category` (optional)  
**Response (200):**
```json
{
  "message": "All notifications marked as read"
}
```

### PATCH /notifications/read-by-entity
**Auth:** Required  
**Body:**
```typescript
{
  entityType: string,
  entityId: string
}
```
**Response (200):**
```json
{
  "message": "Notifications marked as read"
}
```

### POST /notifications/stream-ticket
**Auth:** Required  
**Response (200):**
```json
{
  "ticket": "sse-ticket",
  "expiresAt": "ISO date"
}
```
**Note:** Ticket expires in 30 seconds. Uses in-memory storage (not database), so no migration dependencies.

### GET /notifications/stream
**Auth:** Required (SSE)  
**Query:** `ticket` (from stream-ticket) or use Authorization header with JWT  
**Response:** SSE stream with events:
- `notification`: Notification data (same shape as GET /notifications response)
- `heartbeat`: Keep-alive (every 25 seconds)
- Last-Event-ID supported for reconnection (replays notifications after the last received ID)  
**SSE Event Names:** notification, heartbeat

**Notification Categories:** ASSIGNMENTS, GRADES, SESSIONS, MESSAGES, USERS, ENROLLMENT, PAYMENTS, PRICING, COMPLAINTS, QUIZZES, SCHEDULE

**Notification Types:** 40+ types mapped to categories (see notifications.service.ts)

---

## Messages

### GET /messages/admin-contact
**Auth:** Required (PARENT, TUTOR only)  
**Response (200):**
```json
{
  "recipientId": "uuid",
  "fullName": "string"
}
```
**Note:** Returns an active admin user ID. Parents and tutors use this ID to start an admin support thread.

### GET /messages/threads
**Auth:** Required (ADMIN, PARENT, TUTOR only - STUDENTS blocked)  
**Response (200):**
```json
[
  {
    "threadId": "uuid",
    "otherParticipant": {
      "id": "uuid",
      "fullName": "string",
      "role": "ADMIN"
    },
    "lastMessage": {
      "id": "uuid",
      "body": "string",
      "createdAt": "ISO date",
      "senderId": "uuid",
      "readAt": "ISO date"
    },
    "unreadCount": 0
  }
]
```
**Note:** Admins see all ADMIN_SUPPORT threads (one per parent/tutor). Non-admins see only their single admin-support thread.

### GET /messages/threads/:threadId
**Auth:** Required (ADMIN, PARENT, TUTOR only - STUDENTS blocked)  
**Response (200):**
```json
[
  {
    "id": "uuid",
    "senderId": "uuid",
    "recipientId": "uuid",
    "body": "string",
    "threadId": "uuid",
    "readAt": "ISO date",
    "createdAt": "ISO date",
    "sender": {
      "id": "uuid",
      "fullName": "string",
      "role": "ADMIN"
    },
    "recipient": {
      "id": "uuid",
      "fullName": "string",
      "role": "PARENT"
    }
  }
]
```
**Note:** Returns all messages in a thread in chronological order. User must be a participant in the thread.

### POST /messages
**Auth:** Required (ADMIN, PARENT, TUTOR only - STUDENTS blocked)  
**Body:**
```typescript
{
  recipientId: string (uuid),
  body: string (min 1, max 2000)
}
```
**Response (201):**
```json
{
  "id": "uuid",
  "senderId": "uuid",
  "recipientId": "uuid",
  "body": "string",
  "threadId": "uuid",
  "readAt": null,
  "createdAt": "ISO date",
  "sender": {
    "id": "uuid",
    "fullName": "string",
    "role": "PARENT"
  },
  "recipient": {
    "id": "uuid",
    "fullName": "string",
    "role": "ADMIN"
  }
}
```
**Note:** recipientId validation requires UUID format (matches User ID type). Permission matrix: Admin can message any parent/tutor/admin. Parent can message admin. Tutor can message admin. All other pairs are rejected.

### PATCH /messages/threads/:threadId/read
**Auth:** Required (ADMIN, PARENT, TUTOR only - STUDENTS blocked)  
**Response (200):**
```json
{
  "message": "Messages marked as read"
}
```
**Note:** For admin support threads, when an admin marks as read, all messages from non-admin participants are marked as read for all admins (shared read state).

### GET /messages/unread-count
**Auth:** Required (ADMIN, PARENT, TUTOR only - STUDENTS blocked)  
**Response (200):**
```json
{
  "unreadCount": 5
}
```

---

## Complaints

### POST /complaints
**Auth:** Required (PARENT)  
**Body:**
```typescript
{
  aboutType: 'STUDENT' | 'TUTOR' | 'PARENT' | 'GENERAL',
  aboutId?: string (uuid, required if aboutType is STUDENT, TUTOR, or PARENT),
  subject?: string (max 200, optional - defaults to first 80 characters of description),
  description: string (min 1, max 2000)
}
```
**Response (201):**
```json
{
  "id": "uuid",
  "filedBy": "uuid",
  "aboutType": "string",
  "aboutId": "uuid",
  "subject": "string",
  "description": "string",
  "status": "OPEN",
  "adminReply": null,
  "resolvedBy": null,
  "resolvedAt": null,
  "createdAt": "ISO date",
  "updatedAt": "ISO date",
  "filer": {
    "id": "uuid",
    "fullName": "string",
    "email": "string",
    "role": "PARENT"
  }
}
```
**Note:** `aboutId` must be a valid UUID and is required when `aboutType` is STUDENT, TUTOR, or PARENT. When omitted with aboutType=GENERAL, the complaint is about the platform in general.

### GET /complaints
**Auth:** Required (PARENT, ADMIN)  
**Response (200):**
```json
[
  {
    "id": "uuid",
    "filedBy": "uuid",
    "aboutType": "string",
    "aboutId": "uuid",
    "subject": "string",
    "description": "string",
    "status": "OPEN",
    "adminReply": null,
    "resolvedBy": null,
    "resolvedAt": null,
    "createdAt": "ISO date",
    "updatedAt": "ISO date",
    "filer": {
      "id": "uuid",
      "fullName": "string",
      "email": "string",
      "role": "PARENT"
    },
    "resolver": {
      "id": "uuid",
      "fullName": "string"
    }
  }
]
```
**Note:** Parents see only their own complaints. Admins see all complaints. Tutors cannot access complaints (they use messaging instead).

### GET /complaints/:id
**Auth:** Required  
**Response (200):** Complaint details (same shape as POST response with resolver included if resolved)

### PATCH /complaints/:id/resolve
**Auth:** Required (ADMIN)  
**Body:**
```typescript
{
  resolution: string (min 1)
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
**SessionFrequency:** WEEKLY, TWICE_WEEKLY, THRICE_WEEKLY, FIVE_TIMES_WEEKLY  
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
