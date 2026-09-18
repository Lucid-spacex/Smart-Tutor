# Smart-Tutor API Documentation

## Overview
Smart-Tutor is a comprehensive tutoring platform backend that manages students, parents, tutors, sessions, assignments, grades, payments, and more. This documentation provides all the information needed to build a frontend application.

## Base URL
- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-domain.com/api`

## Authentication
Most endpoints require authentication using JWT tokens. Include the access token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## User Roles
- **PARENT**: Can manage students, enrollments, payments, and view student progress
- **TUTOR**: Can manage tutor profile, view assigned students, create assignments/grades, and manage sessions
- **STUDENT**: Can view their own schedule, assignments, grades, and attend sessions
- **ADMIN**: Can manage tutors, pricing, complaints, and system-wide operations

---

## API Endpoints

### Authentication Endpoints

#### 1. Register Parent or Tutor
**POST** `/api/auth/register`

**Description**: Register a new parent or tutor account. An OTP will be sent to the provided email for verification.

**Request Body**:
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "password": "SecurePass123!",
  "role": "PARENT" // or "TUTOR"
}
```

**Password Requirements**:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Response** (201):
```json
{
  "message": "Registration successful. Please check your email for OTP verification.",
  "user": {
    "id": "uuid",
    "fullName": "John Doe",
    "email": "john@example.com",
    "role": "PARENT",
    "status": "UNVERIFIED"
  }
}
```

---

#### 2. Verify Email with OTP
**POST** `/api/auth/verify`

**Description**: Verify email address using the OTP sent during registration.

**Request Body**:
```json
{
  "email": "john@example.com",
  "otp": "123456"
}
```

**Response** (200):
```json
{
  "message": "Email verified successfully",
  "user": {
    "id": "uuid",
    "fullName": "John Doe",
    "email": "john@example.com",
    "role": "PARENT",
    "status": "ACTIVE"
  },
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token"
}
```

---

#### 3. Login (Parent/Tutor)
**POST** `/api/auth/login`

**Description**: Login for parents and tutors using email and password.

**Request Body**:
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response** (200):
```json
{
  "user": {
    "id": "uuid",
    "fullName": "John Doe",
    "email": "john@example.com",
    "role": "PARENT",
    "status": "ACTIVE"
  },
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token"
}
```

---

#### 4. Student Login
**POST** `/api/auth/student-login`

**Description**: Special login for students using parent email, student code, and student password.

**Request Body**:
```json
{
  "parentEmail": "parent@example.com",
  "studentCode": "ABC12345",
  "studentPassword": "StudentPass123!"
}
```

**Response** (200):
```json
{
  "user": {
    "id": "uuid",
    "fullName": "Student Name",
    "email": null,
    "role": "STUDENT",
    "status": "ACTIVE",
    "studentCode": "ABC12345"
  },
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token"
}
```

---

#### 5. Refresh Access Token
**POST** `/api/auth/refresh`

**Description**: Get a new access token using a refresh token.

**Request Body**:
```json
{
  "refreshToken": "refresh_token"
}
```

**Response** (200):
```json
{
  "accessToken": "new_jwt_token",
  "refreshToken": "new_refresh_token"
}
```

---

#### 6. Logout
**POST** `/api/auth/logout`
**Authentication Required**: Yes

**Description**: Logout the current user and invalidate tokens.

**Response** (200):
```json
{
  "message": "Logged out successfully"
}
```

---

#### 7. Get Current User
**GET** `/api/auth/me`
**Authentication Required**: Yes

**Description**: Get the current authenticated user's information.

**Response** (200):
```json
{
  "id": "uuid",
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "role": "PARENT",
  "status": "ACTIVE",
  "studentCode": null,
  "timezone": "Africa/Lagos",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

#### 8. Change Password
**PATCH** `/api/auth/change-password`
**Authentication Required**: Yes

**Description**: Change the current user's password.

**Request Body**:
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewSecurePass456!"
}
```

**Response** (200):
```json
{
  "message": "Password changed successfully"
}
```

---

#### 9. Update Timezone
**PATCH** `/api/auth/me/timezone`
**Authentication Required**: Yes

**Description**: Update the user's timezone (IANA format).

**Request Body**:
```json
{
  "timezone": "Africa/Lagos"
}
```

**Response** (200):
```json
{
  "message": "Timezone updated successfully",
  "timezone": "Africa/Lagos"
}
```

---

#### 10. Resend OTP
**POST** `/api/auth/resend-otp`

**Description**: Resend OTP verification email.

**Request Body**:
```json
{
  "email": "john@example.com"
}
```

**Response** (200):
```json
{
  "message": "OTP sent successfully"
}
```

---

### Student Management (Parent)

#### 1. Create Student
**POST** `/api/students`
**Authentication Required**: Yes (PARENT only)

**Description**: Create a new student account. System automatically generates student code and password.

**Request Body**:
```json
{
  "fullName": "Jane Doe",
  "dateOfBirth": "2015-05-15",
  "gradeLevel": "Grade 5",
  "school": "Springfield Elementary",
  "notes": "Preferred learning style: visual"
}
```

**Response** (201):
```json
{
  "id": "student_uuid",
  "fullName": "Jane Doe",
  "studentCode": "ABC12345",
  "message": "Student created successfully. Credentials sent to parent email."
}
```

**Note**: The generated password is sent to the parent's email for security.

---

#### 2. Get All Students (Parent's Children)
**GET** `/api/students`
**Authentication Required**: Yes (PARENT only)

**Description**: Get all students belonging to the authenticated parent.

**Response** (200):
```json
[
  {
    "id": "student_uuid",
    "fullName": "Jane Doe",
    "dateOfBirth": "2015-05-15",
    "gradeLevel": "Grade 5",
    "school": "Springfield Elementary",
    "notes": "Preferred learning style: visual",
    "gradeBandTier": "G5_TO_G8",
    "createdAt": "2024-01-01T00:00:00Z",
    "user": {
      "id": "user_uuid",
      "studentCode": "ABC12345",
      "status": "ACTIVE"
    }
  }
]
```

---

#### 3. Get Student by ID
**GET** `/api/students/:id`
**Authentication Required**: Yes (PARENT only)

**Description**: Get detailed information about a specific student.

**Response** (200):
```json
{
  "id": "student_uuid",
  "fullName": "Jane Doe",
  "dateOfBirth": "2015-05-15",
  "gradeLevel": "Grade 5",
  "school": "Springfield Elementary",
  "notes": "Preferred learning style: visual",
  "gradeBandTier": "G5_TO_G8",
  "createdAt": "2024-01-01T00:00:00Z",
  "user": {
    "id": "user_uuid",
    "studentCode": "ABC12345",
    "status": "ACTIVE"
  },
  "enrollments": [
    {
      "id": "enrollment_uuid",
      "subject": {
        "id": "subject_uuid",
        "name": "Mathematics",
        "gradeBand": "G5_TO_G8",
        "category": "CORE"
      },
      "tutor": {
        "id": "tutor_uuid",
        "fullName": "Dr. Smith",
        "email": "smith@example.com"
      },
      "status": "ACTIVE",
      "sessionFrequency": "WEEKLY",
      "billingFrequency": "YEARLY",
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": null
    }
  ]
}
```

---

#### 4. Get Student Activity
**GET** `/api/students/:id/activity`
**Authentication Required**: Yes (PARENT only)

**Description**: Get comprehensive activity statistics for a student.

**Response** (200):
```json
{
  "student": {
    "id": "student_uuid",
    "fullName": "Jane Doe",
    "gradeLevel": "Grade 5"
  },
  "statistics": {
    "totalEnrollments": 2,
    "totalSessions": 24,
    "attendedSessions": 22,
    "missedSessions": 2,
    "attendanceRate": 91.67,
    "pendingAssignments": 3,
    "completedAssignments": 15,
    "totalGrades": 12,
    "averageScore": 85.5
  },
  "enrollments": [
    {
      "id": "enrollment_uuid",
      "subject": "Mathematics",
      "tutor": "Dr. Smith",
      "status": "ACTIVE",
      "sessionCount": 12
    }
  ]
}
```

---

#### 5. Regenerate Student Password
**POST** `/api/students/:id/regenerate-password`
**Authentication Required**: Yes (PARENT only)

**Description**: Regenerate a student's password. New password is sent to parent's email.

**Response** (200):
```json
{
  "message": "Password regenerated successfully. New credentials sent to parent email."
}
```

---

#### 6. Get Student Attendance
**GET** `/api/students/:id/attendance`
**Authentication Required**: Yes

**Description**: Get attendance records for a specific student.

**Response** (200):
```json
{
  "studentId": "student_uuid",
  "studentName": "Jane Doe",
  "totalSessions": 24,
  "attendedSessions": 22,
  "missedSessions": 2,
  "attendanceRate": 91.67,
  "attendanceRecords": [
    {
      "sessionId": "session_uuid",
      "scheduledAt": "2024-01-15T10:00:00Z",
      "subject": "Mathematics",
      "attended": true,
      "durationMinutes": 60
    }
  ]
}
```

---

### Student Dashboard (Student)

#### 1. Get Student Profile
**GET** `/api/student/me`
**Authentication Required**: Yes (STUDENT only)

**Description**: Get the current student's profile information.

**Response** (200):
```json
{
  "id": "student_uuid",
  "fullName": "Jane Doe",
  "dateOfBirth": "2015-05-15",
  "gradeLevel": "Grade 5",
  "school": "Springfield Elementary",
  "notes": "Preferred learning style: visual",
  "user": {
    "id": "user_uuid",
    "studentCode": "ABC12345",
    "status": "ACTIVE",
    "timezone": "Africa/Lagos"
  },
  "parent": {
    "id": "parent_uuid",
    "fullName": "John Doe",
    "email": "john@example.com"
  }
}
```

---

#### 2. Get Student Schedule
**GET** `/api/student/me/schedule`
**Authentication Required**: Yes (STUDENT only)

**Description**: Get upcoming scheduled sessions for the student.

**Response** (200):
```json
[
  {
    "sessionId": "session_uuid",
    "scheduledAt": "2024-01-20T10:00:00Z",
    "durationMinutes": 60,
    "zoomLink": "https://zoom.us/j/123456789",
    "tutor": {
      "id": "tutor_uuid",
      "fullName": "Dr. Smith"
    },
    "subject": "Mathematics"
  }
]
```

---

#### 3. Get Student Assignments
**GET** `/api/student/me/assignments`
**Authentication Required**: Yes (STUDENT only)

**Description**: Get all assignments for the current student.

**Response** (200):
```json
[
  {
    "id": "assignment_uuid",
    "title": "Algebra Homework",
    "description": "Complete exercises 1-10",
    "type": "ASSIGNMENT",
    "dueDate": "2024-01-25T23:59:59Z",
    "status": "PENDING",
    "enrollment": {
      "subject": {
        "name": "Mathematics"
      }
    }
  }
]
```

---

#### 4. Get Student Grades
**GET** `/api/student/me/grades`
**Authentication Required**: Yes (STUDENT only)

**Description**: Get all visible grades for the current student.

**Response** (200):
```json
[
  {
    "id": "grade_uuid",
    "score": 85.5,
    "comments": "Good work on algebra concepts",
    "status": "APPROVED",
    "visibleToStudent": true,
    "createdAt": "2024-01-15T00:00:00Z",
    "enrollment": {
      "subject": {
        "name": "Mathematics"
      }
    },
    "assignment": {
      "title": "Algebra Homework"
    },
    "grader": {
      "fullName": "Dr. Smith"
    }
  }
]
```

---

#### 5. Get Student Progress Reports
**GET** `/api/student/me/progress-reports`
**Authentication Required**: Yes (STUDENT only)

**Description**: Get progress reports for the current student.

**Response** (200):
```json
[
  {
    "id": "report_uuid",
    "period": "January 2024",
    "summary": "Jane has shown excellent progress in mathematics",
    "strengths": "Strong problem-solving skills",
    "areasToImprove": "Practice multiplication tables",
    "createdAt": "2024-01-31T00:00:00Z",
    "enrollment": {
      "subject": {
        "name": "Mathematics"
      }
    },
    "creator": {
      "fullName": "Dr. Smith"
    }
  }
]
```

---

#### 6. Get Student Notifications
**GET** `/api/student/me/notifications`
**Authentication Required**: Yes (STUDENT only)

**Description**: Get notifications for the current student.

**Response** (200):
```json
[
  {
    "id": "notification_uuid",
    "type": "ASSIGNMENT_DUE_SOON",
    "message": "Algebra Homework is due tomorrow",
    "isRead": false,
    "createdAt": "2024-01-24T10:00:00Z"
  }
]
```

---

#### 7. Get Next Class
**GET** `/api/student/me/next-class`
**Authentication Required**: Yes (STUDENT only)

**Description**: Get the next upcoming class for the student.

**Response** (200):
```json
{
  "session": {
    "sessionId": "session_uuid",
    "scheduledAt": "2024-01-20T10:00:00Z",
    "durationMinutes": 60,
    "zoomLink": "https://zoom.us/j/123456789",
    "tutor": {
      "id": "tutor_uuid",
      "fullName": "Dr. Smith"
    },
    "subject": "Mathematics"
  },
  "timezone": "Africa/Lagos"
}
```

---

#### 8. Get My Attendance
**GET** `/api/student/me/attendance`
**Authentication Required**: Yes (STUDENT only)

**Description**: Get attendance records for the current student.

**Response** (200):
```json
{
  "studentId": "student_uuid",
  "studentName": "Jane Doe",
  "totalSessions": 24,
  "attendedSessions": 22,
  "missedSessions": 2,
  "attendanceRate": 91.67,
  "attendanceRecords": [
    {
      "sessionId": "session_uuid",
      "scheduledAt": "2024-01-15T10:00:00Z",
      "subject": "Mathematics",
      "attended": true,
      "durationMinutes": 60
    }
  ]
}
```

---

### Parent Management

#### 1. Get Parent Profile
**GET** `/api/me`
**Authentication Required**: Yes (PARENT only)

**Description**: Get the current parent's profile information.

**Response** (200):
```json
{
  "id": "parent_uuid",
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "role": "PARENT",
  "status": "ACTIVE",
  "timezone": "Africa/Lagos",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

### Tutor Management

#### 1. Create Tutor Profile
**POST** `/api/tutor/tutor-profile`
**Authentication Required**: Yes (TUTOR only)

**Description**: Create or update tutor profile information.

**Request Body**:
```json
{
  "subjects": ["Mathematics", "Physics"],
  "bio": "Experienced tutor with 10+ years of teaching experience",
  "credentialsUrl": "https://example.com/credentials.pdf",
  "hourlyRate": 50.00,
  "availability": {
    "monday": ["09:00-12:00", "14:00-17:00"],
    "tuesday": ["09:00-12:00"],
    "wednesday": ["09:00-12:00", "14:00-17:00"],
    "thursday": ["09:00-12:00"],
    "friday": ["09:00-12:00"]
  }
}
```

**Response** (201):
```json
{
  "id": "profile_uuid",
  "userId": "user_uuid",
  "subjects": ["Mathematics", "Physics"],
  "bio": "Experienced tutor with 10+ years of teaching experience",
  "credentialsUrl": "https://example.com/credentials.pdf",
  "hourlyRate": 50.00,
  "availability": {
    "monday": ["09:00-12:00", "14:00-17:00"],
    "tuesday": ["09:00-12:00"],
    "wednesday": ["09:00-12:00", "14:00-17:00"],
    "thursday": ["09:00-12:00"],
    "friday": ["09:00-12:00"]
  },
  "vettingStatus": "PENDING",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

#### 2. Update Tutor Availability
**PATCH** `/api/tutor/tutor-profile/availability`
**Authentication Required**: Yes (TUTOR only)

**Description**: Update tutor availability schedule.

**Request Body**:
```json
{
  "availability": {
    "monday": ["10:00-12:00", "15:00-17:00"],
    "tuesday": ["10:00-12:00"],
    "wednesday": ["10:00-12:00", "15:00-17:00"],
    "thursday": ["10:00-12:00"],
    "friday": ["10:00-12:00"]
  }
}
```

**Response** (200):
```json
{
  "id": "profile_uuid",
  "userId": "user_uuid",
  "availability": {
    "monday": ["10:00-12:00", "15:00-17:00"],
    "tuesday": ["10:00-12:00"],
    "wednesday": ["10:00-12:00", "15:00-17:00"],
    "thursday": ["10:00-12:00"],
    "friday": ["10:00-12:00"]
  },
  "updatedAt": "2024-01-15T00:00:00Z"
}
```

---

#### 3. Get Tutor Profile
**GET** `/api/tutor/tutor-profile`
**Authentication Required**: Yes (TUTOR only)

**Description**: Get the current tutor's profile information.

**Response** (200):
```json
{
  "id": "profile_uuid",
  "userId": "user_uuid",
  "subjects": ["Mathematics", "Physics"],
  "bio": "Experienced tutor with 10+ years of teaching experience",
  "credentialsUrl": "https://example.com/credentials.pdf",
  "hourlyRate": 50.00,
  "availability": {
    "monday": ["09:00-12:00", "14:00-17:00"],
    "tuesday": ["09:00-12:00"],
    "wednesday": ["09:00-12:00", "14:00-17:00"],
    "thursday": ["09:00-12:00"],
    "friday": ["09:00-12:00"]
  },
  "vettingStatus": "APPROVED",
  "createdAt": "2024-01-01T00:00:00Z",
  "user": {
    "id": "user_uuid",
    "fullName": "Dr. Smith",
    "email": "smith@example.com",
    "phone": "+1234567890",
    "status": "ACTIVE"
  }
}
```

---

#### 4. Get Assigned Students
**GET** `/api/tutor/students`
**Authentication Required**: Yes (TUTOR only)

**Description**: Get all students assigned to the current tutor.

**Response** (200):
```json
[
  {
    "student": {
      "id": "student_uuid",
      "fullName": "Jane Doe",
      "dateOfBirth": "2015-05-15",
      "gradeLevel": "Grade 5",
      "school": "Springfield Elementary",
      "notes": "Preferred learning style: visual",
      "createdAt": "2024-01-01T00:00:00Z"
    },
    "enrollment": {
      "id": "enrollment_uuid",
      "subject": {
        "id": "subject_uuid",
        "name": "Mathematics",
        "gradeBand": "G5_TO_G8",
        "category": "CORE"
      },
      "sessionFrequency": "WEEKLY",
      "billingFrequency": "YEARLY",
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": null,
      "status": "ACTIVE"
    }
  }
]
```

---

#### 5. Get Tutor Sessions
**GET** `/api/tutor/sessions`
**Authentication Required**: Yes (TUTOR only)

**Description**: Get all sessions for the current tutor.

**Response** (200):
```json
[
  {
    "id": "session_uuid",
    "scheduledAt": "2024-01-20T10:00:00Z",
    "durationMinutes": 60,
    "zoomLink": "https://zoom.us/j/123456789",
    "zoomMeetingId": "123456789",
    "recordingUrl": null,
    "recordingStatus": "NONE",
    "status": "SCHEDULED",
    "tutorNotes": null,
    "homeworkAssigned": null,
    "createdAt": "2024-01-15T00:00:00Z",
    "participants": [
      {
        "id": "participant_uuid",
        "attended": null,
        "enrollment": {
          "student": {
            "id": "student_uuid",
            "fullName": "Jane Doe",
            "gradeLevel": "Grade 5"
          },
          "subject": {
            "name": "Mathematics"
          }
        }
      }
    ]
  }
]
```

---

### Subject Management

#### 1. Get Subjects
**GET** `/api/subjects`
**Authentication Required**: Yes

**Description**: Get available subjects, optionally filtered by category and grade band.

**Query Parameters**:
- `category` (optional): Filter by subject category (CORE, ENRICHMENT)
- `gradeBand` (optional): Filter by grade band (PRESCHOOL_TO_G1, G2_TO_G4, G5_TO_G8, G9_TO_G12)

**Response** (200):
```json
[
  {
    "id": "subject_uuid",
    "name": "Mathematics",
    "gradeBand": "G5_TO_G8",
    "category": "CORE",
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

---

### Enrollment Management

#### 1. Create Enrollment
**POST** `/api/enrollments`
**Authentication Required**: Yes (PARENT only)

**Description**: Enroll a student in a subject.

**Request Body**:
```json
{
  "studentId": "student_uuid",
  "subjectId": "subject_uuid",
  "sessionFrequency": "WEEKLY",
  "billingFrequency": "YEARLY",
  "startDate": "2024-02-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z"
}
```

**Session Frequency Options**: WEEKLY, BI_WEEKLY, MONTHLY
**Billing Frequency Options**: WEEKLY, MONTHLY, YEARLY

**Response** (201):
```json
{
  "id": "enrollment_uuid",
  "studentId": "student_uuid",
  "subjectId": "subject_uuid",
  "sessionFrequency": "WEEKLY",
  "billingFrequency": "YEARLY",
  "yearlyPrice": 1200.00,
  "yearlyPriceNGN": 500000.00,
  "yearlyPriceUSD": 1200.00,
  "status": "ACTIVE",
  "startDate": "2024-02-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z",
  "createdAt": "2024-01-20T00:00:00Z"
}
```

---

#### 2. Get Enrollments
**GET** `/api/enrollments`
**Authentication Required**: Yes (PARENT, TUTOR)

**Description**: Get enrollments based on user role.

**Query Parameters**:
- `status` (optional): Filter by status (ACTIVE, PAUSED, COMPLETED, CANCELLED)

**For Parents**: Returns enrollments for their children
**For Tutors**: Returns enrollments where they are assigned as tutor

**Response** (200):
```json
[
  {
    "id": "enrollment_uuid",
    "student": {
      "id": "student_uuid",
      "fullName": "Jane Doe",
      "dateOfBirth": "2015-05-15",
      "gradeLevel": "Grade 5"
    },
    "subject": {
      "id": "subject_uuid",
      "name": "Mathematics",
      "gradeBand": "G5_TO_G8",
      "category": "CORE"
    },
    "tutor": {
      "id": "tutor_uuid",
      "fullName": "Dr. Smith",
      "email": "smith@example.com"
    },
    "sessionFrequency": "WEEKLY",
    "billingFrequency": "YEARLY",
    "yearlyPrice": 1200.00,
    "yearlyPriceNGN": 500000.00,
    "yearlyPriceUSD": 1200.00,
    "status": "ACTIVE",
    "startDate": "2024-02-01T00:00:00Z",
    "endDate": "2024-12-31T23:59:59Z",
    "createdAt": "2024-01-20T00:00:00Z"
  }
]
```

---

#### 3. Get Enrollment by ID
**GET** `/api/enrollments/:id`
**Authentication Required**: Yes (PARENT, TUTOR)

**Description**: Get detailed information about a specific enrollment.

**Response** (200):
```json
{
  "id": "enrollment_uuid",
  "student": {
    "id": "student_uuid",
    "fullName": "Jane Doe",
    "dateOfBirth": "2015-05-15",
    "gradeLevel": "Grade 5"
  },
  "subject": {
    "id": "subject_uuid",
    "name": "Mathematics",
    "gradeBand": "G5_TO_G8",
    "category": "CORE"
  },
  "tutor": {
    "id": "tutor_uuid",
    "fullName": "Dr. Smith",
    "email": "smith@example.com"
  },
  "sessionFrequency": "WEEKLY",
  "billingFrequency": "YEARLY",
  "yearlyPrice": 1200.00,
  "yearlyPriceNGN": 500000.00,
  "yearlyPriceUSD": 1200.00,
  "status": "ACTIVE",
  "startDate": "2024-02-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z",
  "createdAt": "2024-01-20T00:00:00Z"
}
```

---

### Session Management

#### 1. Get Sessions
**GET** `/api/sessions`
**Authentication Required**: Yes

**Description**: Get sessions based on user role and filters.

**Query Parameters**:
- `enrollmentId` (optional): Filter by enrollment ID
- `status` (optional): Filter by status (SCHEDULED, COMPLETED, MISSED, CANCELLED)

**For Parents/Students**: Returns sessions for their enrollments
**For Tutors**: Returns sessions where they are the tutor

**Response** (200):
```json
[
  {
    "id": "session_uuid",
    "scheduledAt": "2024-01-20T10:00:00Z",
    "durationMinutes": 60,
    "zoomLink": "https://zoom.us/j/123456789",
    "zoomMeetingId": "123456789",
    "recordingUrl": null,
    "recordingStatus": "NONE",
    "status": "SCHEDULED",
    "tutorNotes": null,
    "homeworkAssigned": null,
    "createdAt": "2024-01-15T00:00:00Z",
    "enrollment": {
      "id": "enrollment_uuid",
      "student": {
        "id": "student_uuid",
        "fullName": "Jane Doe"
      },
      "subject": {
        "name": "Mathematics"
      }
    }
  }
]
```

---

#### 2. Get Tutor Sessions
**GET** `/api/sessions/tutor`
**Authentication Required**: Yes (TUTOR only)

**Description**: Get all sessions for the current tutor.

**Response** (200):
```json
[
  {
    "id": "session_uuid",
    "scheduledAt": "2024-01-20T10:00:00Z",
    "durationMinutes": 60,
    "zoomLink": "https://zoom.us/j/123456789",
    "zoomMeetingId": "123456789",
    "recordingUrl": null,
    "recordingStatus": "NONE",
    "status": "SCHEDULED",
    "tutorNotes": null,
    "homeworkAssigned": null,
    "createdAt": "2024-01-15T00:00:00Z",
    "participants": [
      {
        "id": "participant_uuid",
        "attended": null,
        "enrollment": {
          "student": {
            "id": "student_uuid",
            "fullName": "Jane Doe",
            "gradeLevel": "Grade 5"
          },
          "subject": {
            "name": "Mathematics"
          }
        }
      }
    ]
  }
]
```

---

#### 3. Update Session
**PATCH** `/api/sessions/:id`
**Authentication Required**: Yes (TUTOR only)

**Description**: Update session details (status, notes, homework, attendance).

**Request Body**:
```json
{
  "status": "COMPLETED",
  "tutorNotes": "Student showed good understanding of algebra concepts",
  "homeworkAssigned": "Complete exercises 11-15",
  "participants": [
    {
      "enrollmentId": "enrollment_uuid",
      "attended": true
    }
  ]
}
```

**Status Options**: COMPLETED, MISSED, CANCELLED

**Response** (200):
```json
{
  "id": "session_uuid",
  "status": "COMPLETED",
  "tutorNotes": "Student showed good understanding of algebra concepts",
  "homeworkAssigned": "Complete exercises 11-15",
  "updatedAt": "2024-01-20T11:00:00Z"
}
```

---

### Assignment Management

#### 1. Create Assignment
**POST** `/api/assignments`
**Authentication Required**: Yes (TUTOR only)

**Description**: Create a new assignment for an enrollment.

**Request Body**:
```json
{
  "enrollmentId": "enrollment_uuid",
  "title": "Algebra Homework",
  "description": "Complete exercises 1-10 from chapter 3",
  "type": "ASSIGNMENT",
  "dueDate": "2024-01-25T23:59:59Z"
}
```

**Type Options**: ASSIGNMENT, CLASSWORK, TEST

**Response** (201):
```json
{
  "id": "assignment_uuid",
  "enrollmentId": "enrollment_uuid",
  "title": "Algebra Homework",
  "description": "Complete exercises 1-10 from chapter 3",
  "type": "ASSIGNMENT",
  "dueDate": "2024-01-25T23:59:59Z",
  "status": "PENDING",
  "createdAt": "2024-01-20T00:00:00Z"
}
```

---

#### 2. Get Assignments
**GET** `/api/assignments`
**Authentication Required**: Yes

**Description**: Get assignments based on user role.

**Query Parameters**:
- `enrollmentId` (optional): Filter by enrollment ID

**For Students**: Returns assignments for their enrollments
**For Tutors**: Returns assignments they created
**For Parents**: Returns assignments for their children's enrollments

**Response** (200):
```json
[
  {
    "id": "assignment_uuid",
    "enrollmentId": "enrollment_uuid",
    "title": "Algebra Homework",
    "description": "Complete exercises 1-10 from chapter 3",
    "type": "ASSIGNMENT",
    "dueDate": "2024-01-25T23:59:59Z",
    "status": "PENDING",
    "createdAt": "2024-01-20T00:00:00Z",
    "enrollment": {
      "student": {
        "id": "student_uuid",
        "fullName": "Jane Doe"
      },
      "subject": {
        "name": "Mathematics"
      }
    }
  }
]
```

---

#### 3. Update Assignment
**PATCH** `/api/assignments/:id`
**Authentication Required**: Yes (TUTOR only)

**Description**: Update assignment status.

**Request Body**:
```json
{
  "status": "COMPLETED"
}
```

**Status Options**: PENDING, COMPLETED

**Response** (200):
```json
{
  "id": "assignment_uuid",
  "status": "COMPLETED",
  "updatedAt": "2024-01-25T00:00:00Z"
}
```

---

### Grade Management

#### 1. Create Grade
**POST** `/api/grades`
**Authentication Required**: Yes (TUTOR only)

**Description**: Create a new grade. Grades start as PENDING_APPROVAL and require admin approval.

**Request Body**:
```json
{
  "enrollmentId": "enrollment_uuid",
  "assignmentId": "assignment_uuid",
  "score": 85.5,
  "comments": "Good work on algebra concepts"
}
```

**Response** (201):
```json
{
  "id": "grade_uuid",
  "enrollmentId": "enrollment_uuid",
  "assignmentId": "assignment_uuid",
  "score": 85.5,
  "comments": "Good work on algebra concepts",
  "status": "PENDING_APPROVAL",
  "visibleToStudent": false,
  "createdAt": "2024-01-25T00:00:00Z"
}
```

---

#### 2. Get Grades
**GET** `/api/grades`
**Authentication Required**: Yes

**Description**: Get grades based on user role.

**Query Parameters**:
- `enrollmentId` (optional): Filter by enrollment ID

**For Students**: Returns only visible grades (APPROVED status)
**For Tutors**: Returns grades they created
**For Parents**: Returns visible grades for their children
**For Admins**: Returns all grades

**Response** (200):
```json
[
  {
    "id": "grade_uuid",
    "enrollmentId": "enrollment_uuid",
    "assignmentId": "assignment_uuid",
    "score": 85.5,
    "comments": "Good work on algebra concepts",
    "status": "APPROVED",
    "visibleToStudent": true,
    "createdAt": "2024-01-25T00:00:00Z",
    "enrollment": {
      "student": {
        "id": "student_uuid",
        "fullName": "Jane Doe"
      },
      "subject": {
        "name": "Mathematics"
      }
    },
    "assignment": {
      "title": "Algebra Homework"
    },
    "grader": {
      "fullName": "Dr. Smith"
    }
  }
]
```

---

#### 3. Get Pending Grades (Admin)
**GET** `/api/grades/pending`
**Authentication Required**: Yes (ADMIN only)

**Description**: Get all grades pending approval.

**Response** (200):
```json
[
  {
    "id": "grade_uuid",
    "enrollmentId": "enrollment_uuid",
    "assignmentId": "assignment_uuid",
    "score": 85.5,
    "comments": "Good work on algebra concepts",
    "status": "PENDING_APPROVAL",
    "visibleToStudent": false,
    "createdAt": "2024-01-25T00:00:00Z",
    "enrollment": {
      "student": {
        "id": "student_uuid",
        "fullName": "Jane Doe"
      },
      "subject": {
        "name": "Mathematics"
      }
    },
    "assignment": {
      "title": "Algebra Homework"
    },
    "grader": {
      "fullName": "Dr. Smith"
    }
  }
]
```

---

#### 4. Approve Grade (Admin)
**PATCH** `/api/grades/:id/approve`
**Authentication Required**: Yes (ADMIN only)

**Description**: Approve a pending grade, making it visible to the student.

**Request Body**:
```json
{}
```

**Response** (200):
```json
{
  "id": "grade_uuid",
  "status": "APPROVED",
  "visibleToStudent": true,
  "approvedBy": "admin_uuid",
  "approvedAt": "2024-01-25T12:00:00Z"
}
```

---

#### 5. Reject Grade (Admin)
**PATCH** `/api/grades/:id/reject`
**Authentication Required**: Yes (ADMIN only)

**Description**: Reject a pending grade.

**Request Body**:
```json
{}
```

**Response** (200):
```json
{
  "id": "grade_uuid",
  "status": "REJECTED",
  "visibleToStudent": false,
  "approvedBy": "admin_uuid",
  "approvedAt": "2024-01-25T12:00:00Z"
}
```

---

### Payment Management

#### 1. Initiate Payment
**POST** `/api/payments/initiate`
**Authentication Required**: Yes (PARENT only)

**Description**: Initiate payment for an enrollment.

**Request Body**:
```json
{
  "enrollmentId": "enrollment_uuid",
  "currency": "USD"
}
```

**Currency Options**: USD, NGN

**Response** (200):
```json
{
  "success": true,
  "reference": "pay_1234567890_abc123",
  "authorizationUrl": "https://paystack.com/pay/pay_1234567890_abc123",
  "message": "Payment initiated successfully"
}
```

---

#### 2. Get Payments
**GET** `/api/payments`
**Authentication Required**: Yes (PARENT only)

**Description**: Get payment history for the parent.

**Response** (200):
```json
[
  {
    "id": "payment_uuid",
    "enrollmentId": "enrollment_uuid",
    "amount": 1200.00,
    "currency": "USD",
    "provider": "PAYSTACK",
    "providerReference": "pay_1234567890_abc123",
    "status": "SUCCESS",
    "paidAt": "2024-01-20T00:00:00Z",
    "createdAt": "2024-01-20T00:00:00Z",
    "enrollment": {
      "student": {
        "fullName": "Jane Doe"
      },
      "subject": {
        "name": "Mathematics"
      }
    }
  }
]
```

---

#### 3. Payment Webhook
**POST** `/api/payments/webhook`
**Authentication Required**: No

**Description**: Webhook endpoint for payment provider (Paystack) to notify payment status.

**Note**: This endpoint is called by the payment provider, not by the frontend.

---

### Progress Reports

#### 1. Create Progress Report
**POST** `/api/progress-reports`
**Authentication Required**: Yes (TUTOR only)

**Description**: Create a progress report for an enrollment.

**Request Body**:
```json
{
  "enrollmentId": "enrollment_uuid",
  "period": "January 2024",
  "summary": "Jane has shown excellent progress in mathematics",
  "strengths": "Strong problem-solving skills",
  "areasToImprove": "Practice multiplication tables"
}
```

**Response** (201):
```json
{
  "id": "report_uuid",
  "enrollmentId": "enrollment_uuid",
  "period": "January 2024",
  "summary": "Jane has shown excellent progress in mathematics",
  "strengths": "Strong problem-solving skills",
  "areasToImprove": "Practice multiplication tables",
  "createdBy": "tutor_uuid",
  "createdAt": "2024-01-31T00:00:00Z"
}
```

---

#### 2. Get Progress Reports
**GET** `/api/progress-reports`
**Authentication Required**: Yes

**Description**: Get progress reports based on user role.

**Query Parameters**:
- `enrollmentId` (optional): Filter by enrollment ID

**For Students**: Returns progress reports for their enrollments
**For Tutors**: Returns progress reports they created
**For Parents**: Returns progress reports for their children

**Response** (200):
```json
[
  {
    "id": "report_uuid",
    "enrollmentId": "enrollment_uuid",
    "period": "January 2024",
    "summary": "Jane has shown excellent progress in mathematics",
    "strengths": "Strong problem-solving skills",
    "areasToImprove": "Practice multiplication tables",
    "createdBy": "tutor_uuid",
    "createdAt": "2024-01-31T00:00:00Z",
    "enrollment": {
      "student": {
        "id": "student_uuid",
        "fullName": "Jane Doe"
      },
      "subject": {
        "name": "Mathematics"
      }
    },
    "creator": {
      "fullName": "Dr. Smith"
    }
  }
]
```

---

### Notifications

#### 1. Get Notifications
**GET** `/api/notifications`
**Authentication Required**: Yes

**Description**: Get notifications for the current user.

**Response** (200):
```json
[
  {
    "id": "notification_uuid",
    "type": "ASSIGNMENT_DUE_SOON",
    "message": "Algebra Homework is due tomorrow",
    "isRead": false,
    "createdAt": "2024-01-24T10:00:00Z"
  }
]
```

**Notification Types**:
- ASSIGNMENT_DUE_SOON
- ASSIGNMENT_OVERDUE
- GRADE_APPROVED
- COMPLAINT_RESOLVED
- GENERAL
- PRICING_DRIFT_ALERT

---

#### 2. Mark Notification as Read
**PATCH** `/api/notifications/:id/read`
**Authentication Required**: Yes

**Description**: Mark a notification as read.

**Response** (200):
```json
{
  "id": "notification_uuid",
  "isRead": true,
  "updatedAt": "2024-01-24T11:00:00Z"
}
```

---

### Messages

#### 1. Send Message
**POST** `/api/messages`
**Authentication Required**: Yes

**Description**: Send a message to another user.

**Request Body**:
```json
{
  "recipientId": "user_uuid",
  "body": "Hello, I have a question about the assignment"
}
```

**Note**: Messaging permissions are enforced in the service layer based on role relationships.

**Response** (201):
```json
{
  "id": "message_uuid",
  "senderId": "sender_uuid",
  "recipientId": "recipient_uuid",
  "threadId": "thread_uuid",
  "body": "Hello, I have a question about the assignment",
  "readAt": null,
  "createdAt": "2024-01-24T10:00:00Z"
}
```

---

#### 2. Get Conversation Threads
**GET** `/api/messages/threads`
**Authentication Required**: Yes

**Description**: Get all conversation threads for the current user.

**Response** (200):
```json
[
  {
    "threadId": "thread_uuid",
    "otherUser": {
      "id": "user_uuid",
      "fullName": "Dr. Smith",
      "role": "TUTOR"
    },
    "lastMessage": {
      "id": "message_uuid",
      "body": "Hello, I have a question about the assignment",
      "createdAt": "2024-01-24T10:00:00Z"
    },
    "unreadCount": 2
  }
]
```

---

#### 3. Get Thread Messages
**GET** `/api/messages/threads/:threadId`
**Authentication Required**: Yes

**Description**: Get all messages in a specific conversation thread.

**Response** (200):
```json
[
  {
    "id": "message_uuid",
    "senderId": "sender_uuid",
    "recipientId": "recipient_uuid",
    "threadId": "thread_uuid",
    "body": "Hello, I have a question about the assignment",
    "readAt": "2024-01-24T11:00:00Z",
    "createdAt": "2024-01-24T10:00:00Z",
    "sender": {
      "id": "sender_uuid",
      "fullName": "Jane Doe"
    }
  }
]
```

---

#### 4. Mark Thread as Read
**PATCH** `/api/messages/threads/:threadId/read`
**Authentication Required**: Yes

**Description**: Mark all messages in a thread as read.

**Response** (200):
```json
{
  "message": "Thread marked as read",
  "threadId": "thread_uuid"
}
```

---

### Complaints

#### 1. Create Complaint
**POST** `/api/complaints`
**Authentication Required**: Yes (PARENT, TUTOR)

**Description**: File a complaint about a student, tutor, parent, or general issue.

**Request Body**:
```json
{
  "aboutType": "TUTOR",
  "aboutId": "tutor_uuid",
  "subject": "Tutor frequently cancels sessions",
  "description": "The tutor has cancelled 3 sessions in the past month without proper notice"
}
```

**About Type Options**: STUDENT, TUTOR, PARENT, GENERAL

**Response** (201):
```json
{
  "id": "complaint_uuid",
  "filedBy": "user_uuid",
  "aboutType": "TUTOR",
  "aboutId": "tutor_uuid",
  "subject": "Tutor frequently cancels sessions",
  "description": "The tutor has cancelled 3 sessions in the past month without proper notice",
  "status": "OPEN",
  "createdAt": "2024-01-24T00:00:00Z"
}
```

---

#### 2. Get Complaints
**GET** `/api/complaints`
**Authentication Required**: Yes

**Description**: Get complaints based on user role.

**For Parents/Tutors**: Returns complaints they filed
**For Admins**: Returns all complaints

**Response** (200):
```json
[
  {
    "id": "complaint_uuid",
    "filedBy": "user_uuid",
    "aboutType": "TUTOR",
    "aboutId": "tutor_uuid",
    "subject": "Tutor frequently cancels sessions",
    "description": "The tutor has cancelled 3 sessions in the past month without proper notice",
    "status": "OPEN",
    "adminReply": null,
    "resolvedBy": null,
    "resolvedAt": null,
    "createdAt": "2024-01-24T00:00:00Z",
    "filer": {
      "fullName": "John Doe"
    }
  }
]
```

---

#### 3. Resolve Complaint (Admin)
**PATCH** `/api/complaints/:id/resolve`
**Authentication Required**: Yes (ADMIN only)

**Description**: Resolve a complaint with an admin reply.

**Request Body**:
```json
{
  "adminReply": "We have reviewed the complaint and taken appropriate action with the tutor"
}
```

**Response** (200):
```json
{
  "id": "complaint_uuid",
  "status": "RESOLVED",
  "adminReply": "We have reviewed the complaint and taken appropriate action with the tutor",
  "resolvedBy": "admin_uuid",
  "resolvedAt": "2024-01-25T00:00:00Z"
}
```

---

### Quiz Management

#### 1. Create Quiz Question
**POST** `/api/quiz/assignments/:id/questions`
**Authentication Required**: Yes (TUTOR only)

**Description**: Add a quiz question to an assignment.

**Request Body**:
```json
{
  "questionText": "What is 2 + 2?",
  "options": ["3", "4", "5", "6"],
  "correctOptionIndex": 1,
  "points": 10,
  "orderIndex": 1
}
```

**Response** (201):
```json
{
  "id": "question_uuid",
  "assignmentId": "assignment_uuid",
  "questionText": "What is 2 + 2?",
  "options": ["3", "4", "5", "6"],
  "correctOptionIndex": 1,
  "points": 10,
  "orderIndex": 1,
  "createdAt": "2024-01-24T00:00:00Z"
}
```

---

#### 2. Get Quiz Questions
**GET** `/api/quiz/assignments/:id/questions`
**Authentication Required**: Yes

**Description**: Get quiz questions for an assignment.

**For Students**: Returns questions without correct answers
**For Tutors**: Returns complete question details including correct answers

**Response** (200):
```json
[
  {
    "id": "question_uuid",
    "assignmentId": "assignment_uuid",
    "questionText": "What is 2 + 2?",
    "options": ["3", "4", "5", "6"],
    "correctOptionIndex": 1,
    "points": 10,
    "orderIndex": 1,
    "createdAt": "2024-01-24T00:00:00Z"
  }
]
```

---

#### 3. Start Quiz
**POST** `/api/quiz/assignments/:id/quiz/start`
**Authentication Required**: Yes (STUDENT only)

**Description**: Start a quiz attempt for an assignment.

**Response** (201):
```json
{
  "id": "attempt_uuid",
  "assignmentId": "assignment_uuid",
  "studentId": "student_uuid",
  "status": "IN_PROGRESS",
  "totalScore": null,
  "startedAt": "2024-01-24T10:00:00Z",
  "completedAt": null
}
```

---

#### 4. Submit Quiz Answer
**POST** `/api/quiz/quiz-attempts/:id/answer`
**Authentication Required**: Yes (STUDENT only)

**Description**: Submit an answer for a quiz question.

**Request Body**:
```json
{
  "questionId": "question_uuid",
  "selectedOptionIndex": 1,
  "timeTakenSeconds": 30
}
```

**Response** (201):
```json
{
  "id": "response_uuid",
  "attemptId": "attempt_uuid",
  "questionId": "question_uuid",
  "selectedOptionIndex": 1,
  "isCorrect": true,
  "timeTakenSeconds": 30,
  "pointsAwarded": 10,
  "createdAt": "2024-01-24T10:01:00Z"
}
```

---

#### 5. Complete Quiz
**PATCH** `/api/quiz/quiz-attempts/:id/complete`
**Authentication Required**: Yes (STUDENT only)

**Description**: Complete a quiz attempt and calculate final score.

**Response** (200):
```json
{
  "id": "attempt_uuid",
  "status": "COMPLETED",
  "totalScore": 85.5,
  "completedAt": "2024-01-24T10:15:00Z"
}
```

---

#### 6. Get Quiz Attempt
**GET** `/api/quiz/quiz-attempts/:id`
**Authentication Required**: Yes

**Description**: Get details of a quiz attempt.

**For Students**: Can view their own attempts
**For Tutors**: Can view attempts for their assignments
**For Admins**: Can view all attempts

**Response** (200):
```json
{
  "id": "attempt_uuid",
  "assignmentId": "assignment_uuid",
  "studentId": "student_uuid",
  "status": "COMPLETED",
  "totalScore": 85.5,
  "startedAt": "2024-01-24T10:00:00Z",
  "completedAt": "2024-01-24T10:15:00Z",
  "assignment": {
    "title": "Math Quiz",
    "type": "TEST"
  },
  "student": {
    "fullName": "Jane Doe"
  },
  "responses": [
    {
      "id": "response_uuid",
      "questionId": "question_uuid",
      "selectedOptionIndex": 1,
      "isCorrect": true,
      "timeTakenSeconds": 30,
      "pointsAwarded": 10
    }
  ]
}
```

---

### Admin Endpoints

#### 1. Get Pending Tutors
**GET** `/api/admin/tutors/pending`
**Authentication Required**: Yes (ADMIN only)

**Description**: Get tutors pending vetting approval.

**Response** (200):
```json
[
  {
    "id": "tutor_uuid",
    "fullName": "Dr. Smith",
    "email": "smith@example.com",
    "phone": "+1234567890",
    "status": "PENDING_VETTING",
    "profile": {
      "id": "profile_uuid",
      "subjects": ["Mathematics", "Physics"],
      "bio": "Experienced tutor with 10+ years of teaching experience",
      "credentialsUrl": "https://example.com/credentials.pdf",
      "hourlyRate": 50.00,
      "availability": {}
    }
  }
]
```

---

#### 2. Get All Tutors
**GET** `/api/admin/tutors`
**Authentication Required**: Yes (ADMIN only)

**Description**: Get all tutors with optional filtering.

**Query Parameters**:
- `vettingStatus` (optional): Filter by vetting status (PENDING, APPROVED, REJECTED)
- `status` (optional): Filter by user status (UNVERIFIED, ACTIVE, PENDING_VETTING, APPROVED, REJECTED, SUSPENDED)

**Response** (200):
```json
[
  {
    "id": "tutor_uuid",
    "fullName": "Dr. Smith",
    "email": "smith@example.com",
    "phone": "+1234567890",
    "status": "APPROVED",
    "profile": {
      "id": "profile_uuid",
      "subjects": ["Mathematics", "Physics"],
      "bio": "Experienced tutor with 10+ years of teaching experience",
      "credentialsUrl": "https://example.com/credentials.pdf",
      "hourlyRate": 50.00,
      "vettingStatus": "APPROVED"
    }
  }
]
```

---

#### 3. Update Tutor Vetting Status
**PATCH** `/api/admin/tutors/:id/vetting`
**Authentication Required**: Yes (ADMIN only)

**Description**: Update tutor vetting status.

**Request Body**:
```json
{
  "vettingStatus": "APPROVED"
}
```

**Vetting Status Options**: PENDING, APPROVED, REJECTED

**Response** (200):
```json
{
  "id": "tutor_uuid",
  "vettingStatus": "APPROVED",
  "status": "APPROVED",
  "updatedAt": "2024-01-24T00:00:00Z"
}
```

---

#### 4. Get Unmatched Enrollments
**GET** `/api/admin/enrollments/unmatched`
**Authentication Required**: Yes (ADMIN only)

**Description**: Get enrollments without assigned tutors.

**Response** (200):
```json
[
  {
    "id": "enrollment_uuid",
    "student": {
      "id": "student_uuid",
      "fullName": "Jane Doe",
      "gradeLevel": "Grade 5"
    },
    "subject": {
      "id": "subject_uuid",
      "name": "Mathematics",
      "gradeBand": "G5_TO_G8",
      "category": "CORE"
    },
    "sessionFrequency": "WEEKLY",
    "billingFrequency": "YEARLY",
    "status": "ACTIVE",
    "startDate": "2024-02-01T00:00:00Z"
  }
]
```

---

#### 5. Get Enrollment Pricing Override
**GET** `/api/admin/enrollments/:id/pricing`
**Authentication Required**: Yes (ADMIN only)

**Description**: Get pricing override details for an enrollment.

**Response** (200):
```json
{
  "enrollmentId": "enrollment_uuid",
  "yearlyPrice": 1200.00,
  "yearlyPriceNGN": 500000.00,
  "yearlyPriceUSD": 1200.00,
  "billingFrequency": "YEARLY"
}
```

---

#### 6. Update Enrollment Pricing Override
**PATCH** `/api/admin/enrollments/:id/pricing`
**Authentication Required**: Yes (ADMIN only)

**Description**: Update pricing override for an enrollment.

**Request Body**:
```json
{
  "yearlyPriceNGN": 550000.00,
  "yearlyPriceUSD": 1300.00
}
```

**Response** (200):
```json
{
  "enrollmentId": "enrollment_uuid",
  "yearlyPriceNGN": 550000.00,
  "yearlyPriceUSD": 1300.00,
  "updatedAt": "2024-01-24T00:00:00Z"
}
```

---

#### 7. Assign Tutor to Enrollment
**PATCH** `/api/admin/enrollments/:id/assign-tutor`
**Authentication Required**: Yes (ADMIN only)

**Description**: Assign a tutor to an enrollment.

**Request Body**:
```json
{
  "tutorId": "tutor_uuid"
}
```

**Response** (200):
```json
{
  "id": "enrollment_uuid",
  "tutorId": "tutor_uuid",
  "updatedAt": "2024-01-24T00:00:00Z"
}
```

---

#### 8. Get Pricing Tiers
**GET** `/api/admin/pricing-tiers`
**Authentication Required**: Yes (ADMIN only)

**Description**: Get all pricing tiers by grade band.

**Response** (200):
```json
[
  {
    "id": "tier_uuid",
    "gradeBandTier": "G5_TO_G8",
    "yearlyPriceNGN": 500000.00,
    "yearlyPriceUSD": 1200.00,
    "updatedAt": "2024-01-24T00:00:00Z"
  }
]
```

---

#### 9. Update Pricing Tier
**PATCH** `/api/admin/pricing-tiers/:gradeBandTier`
**Authentication Required**: Yes (ADMIN only)

**Description**: Update pricing for a specific grade band tier.

**Request Body**:
```json
{
  "yearlyPriceNGN": 550000.00,
  "yearlyPriceUSD": 1300.00
}
```

**Grade Band Options**: PRESCHOOL_TO_G1, G2_TO_G4, G5_TO_G8, G9_TO_G12

**Response** (200):
```json
{
  "id": "tier_uuid",
  "gradeBandTier": "G5_TO_G8",
  "yearlyPriceNGN": 550000.00,
  "yearlyPriceUSD": 1300.00,
  "updatedAt": "2024-01-24T00:00:00Z"
}
```

---

#### 10. Get Current Exchange Rate
**GET** `/api/admin/exchange-rate/current`
**Authentication Required**: Yes (ADMIN only)

**Description**: Get current exchange rate between currencies.

**Response** (200):
```json
{
  "id": "rate_uuid",
  "fromCurrency": "USD",
  "toCurrency": "NGN",
  "rate": 416.67,
  "fetchedAt": "2024-01-24T00:00:00Z"
}
```

---

#### 11. Get Failed Payments
**GET** `/api/admin/payments/failed`
**Authentication Required**: Yes (ADMIN only)

**Description**: Get all failed payments.

**Response** (200):
```json
[
  {
    "id": "payment_uuid",
    "enrollmentId": "enrollment_uuid",
    "amount": 1200.00,
    "currency": "USD",
    "provider": "PAYSTACK",
    "providerReference": "pay_1234567890_abc123",
    "status": "FAILED",
    "createdAt": "2024-01-24T00:00:00Z",
    "enrollment": {
      "student": {
        "fullName": "Jane Doe"
      },
      "subject": {
        "name": "Mathematics"
      }
    }
  }
]
```

---

#### 12. Get Overview Report
**GET** `/api/admin/reports/overview`
**Authentication Required**: Yes (ADMIN only)

**Description**: Get system overview statistics.

**Response** (200):
```json
{
  "totalUsers": 150,
  "totalStudents": 100,
  "totalTutors": 40,
  "totalParents": 10,
  "activeEnrollments": 85,
  "pendingTutors": 5,
  "totalRevenue": 102000.00,
  "failedPayments": 3
}
```

---

#### 13. Get All Students
**GET** `/api/admin/students`
**Authentication Required**: Yes (ADMIN only)

**Description**: Get all students with optional filtering.

**Query Parameters**:
- `status` (optional): Filter by user status
- `gradeBandTier` (optional): Filter by grade band tier

**Response** (200):
```json
[
  {
    "id": "student_uuid",
    "fullName": "Jane Doe",
    "dateOfBirth": "2015-05-15",
    "gradeLevel": "Grade 5",
    "gradeBandTier": "G5_TO_G8",
    "school": "Springfield Elementary",
    "user": {
      "id": "user_uuid",
      "studentCode": "ABC12345",
      "status": "ACTIVE"
    }
  }
]
```

---

#### 14. Regenerate Student Password (Admin)
**PATCH** `/api/admin/students/:id/regenerate-password`
**Authentication Required**: Yes (ADMIN only)

**Description**: Admin can regenerate any student's password.

**Response** (200):
```json
{
  "message": "Password regenerated successfully. New credentials sent to parent email."
}
```

---

#### 15. Get Suspended Users
**GET** `/api/admin/users/suspended`
**Authentication Required**: Yes (ADMIN only)

**Description**: Get all suspended users.

**Response** (200):
```json
[
  {
    "id": "user_uuid",
    "fullName": "John Doe",
    "email": "john@example.com",
    "role": "PARENT",
    "status": "SUSPENDED",
    "suspendedAt": "2024-01-20T00:00:00Z"
  }
]
```

---

#### 16. Reactivate User
**PATCH** `/api/admin/users/:id/reactivate`
**Authentication Required**: Yes (ADMIN only)

**Description**: Reactivate a suspended user.

**Response** (200):
```json
{
  "id": "user_uuid",
  "status": "ACTIVE",
  "reactivatedAt": "2024-01-24T00:00:00Z"
}
```

---

#### 17. Create Session (Admin)
**POST** `/api/admin/sessions`
**Authentication Required**: Yes (ADMIN only)

**Description**: Admin can create sessions manually.

**Request Body**:
```json
{
  "tutorId": "tutor_uuid",
  "scheduledAt": "2024-01-25T10:00:00Z",
  "durationMinutes": 60,
  "zoomLink": "https://zoom.us/j/123456789",
  "participantEnrollmentIds": ["enrollment_uuid"],
  "sharedSessionConfirmed": true
}
```

**Response** (201):
```json
{
  "id": "session_uuid",
  "tutorId": "tutor_uuid",
  "scheduledAt": "2024-01-25T10:00:00Z",
  "durationMinutes": 60,
  "zoomLink": "https://zoom.us/j/123456789",
  "status": "SCHEDULED",
  "createdAt": "2024-01-24T00:00:00Z"
}
```

---

#### 18. Reschedule Session (Admin)
**PATCH** `/api/admin/sessions/:id/reschedule`
**Authentication Required**: Yes (ADMIN only)

**Description**: Admin can reschedule sessions.

**Request Body**:
```json
{
  "scheduledAt": "2024-01-26T10:00:00Z",
  "zoomLink": "https://zoom.us/j/987654321"
}
```

**Response** (200):
```json
{
  "id": "session_uuid",
  "scheduledAt": "2024-01-26T10:00:00Z",
  "zoomLink": "https://zoom.us/j/987654321",
  "updatedAt": "2024-01-24T00:00:00Z"
}
```

---

### Webhooks

#### 1. Zoom Webhook
**POST** `/api/webhooks/zoom`
**Authentication Required**: No

**Description**: Webhook endpoint for Zoom events (e.g., recording completed).

**Note**: This endpoint is called by Zoom, not by the frontend. Zoom verifies the request signature.

---

### Health Check

#### 1. Health Check
**GET** `/health`

**Description**: Check API and database health status.

**Response** (200):
```json
{
  "status": "ok",
  "timestamp": "2024-01-24T10:00:00Z",
  "database": "connected"
}
```

**Response** (503):
```json
{
  "status": "error",
  "timestamp": "2024-01-24T10:00:00Z",
  "database": "disconnected",
  "error": "Database connection failed"
}
```

---

### API Documentation

#### 1. Swagger UI
**GET** `/api-docs`

**Description**: Interactive API documentation using Swagger UI.

---

## Error Handling

All endpoints return appropriate HTTP status codes:

- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Authentication required or invalid
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

Error response format:
```json
{
  "error": "Error message description"
}
```

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General rate limit**: 100 requests per 15 minutes per IP
- **Auth endpoints**: Stricter limits for security
- **Payment endpoints**: 10 requests per minute per user

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset time (Unix timestamp)

---

## Data Models

### User
```typescript
{
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: 'PARENT' | 'TUTOR' | 'ADMIN' | 'STUDENT';
  status: 'UNVERIFIED' | 'ACTIVE' | 'PENDING_VETTING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  studentCode?: string | null;
  parentId?: string | null;
  timezone?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### Student
```typescript
{
  id: string;
  parentId: string;
  userId: string;
  fullName: string;
  dateOfBirth: Date;
  gradeLevel: string;
  gradeBandTier: 'PRESCHOOL_TO_G1' | 'G2_TO_G4' | 'G5_TO_G8' | 'G9_TO_G12';
  school?: string | null;
  notes?: string | null;
  deletedAt?: Date | null;
  createdAt: Date;
}
```

### Enrollment
```typescript
{
  id: string;
  studentId: string;
  subjectId: string;
  tutorId?: string | null;
  sessionFrequency: 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY';
  billingFrequency: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  yearlyPrice: number;
  yearlyPriceNGN?: number | null;
  yearlyPriceUSD?: number | null;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  startDate: Date;
  endDate?: Date | null;
  deletedAt?: Date | null;
  createdAt: Date;
}
```

### Session
```typescript
{
  id: string;
  tutorId: string;
  scheduledAt: Date;
  durationMinutes: number;
  zoomLink?: string | null;
  zoomMeetingId?: string | null;
  recordingUrl?: string | null;
  recordingStatus: 'NONE' | 'PROCESSING' | 'AVAILABLE' | 'FAILED';
  status: 'SCHEDULED' | 'COMPLETED' | 'MISSED' | 'CANCELLED';
  tutorNotes?: string | null;
  homeworkAssigned?: string | null;
  createdAt: Date;
}
```

### Assignment
```typescript
{
  id: string;
  enrollmentId: string;
  createdBy: string;
  title: string;
  description?: string | null;
  type: 'ASSIGNMENT' | 'CLASSWORK' | 'TEST';
  dueDate: Date;
  status: 'PENDING' | 'COMPLETED';
  createdAt: Date;
  updatedAt: Date;
}
```

### Grade
```typescript
{
  id: string;
  enrollmentId: string;
  assignmentId?: string | null;
  gradedBy: string;
  score: number;
  comments: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  approvedBy?: string | null;
  approvedAt?: Date | null;
  visibleToStudent: boolean;
  createdAt: Date;
}
```

---

## Frontend Implementation Guide

### Authentication Flow

1. **Parent/Tutor Registration**:
   - POST `/api/auth/register` with user details
   - User receives OTP via email
   - POST `/api/auth/verify` with OTP
   - Receive access token and refresh token
   - Store tokens securely (httpOnly cookies recommended)

2. **Login**:
   - POST `/api/auth/login` or `/api/auth/student-login`
   - Receive access token and refresh token
   - Store tokens securely

3. **Token Refresh**:
   - When access token expires, use POST `/api/auth/refresh`
   - Update stored tokens

4. **Logout**:
   - POST `/api/auth/logout`
   - Clear stored tokens

### Student Creation Flow (Parent)

1. Parent authenticates
2. POST `/api/students` with student details
3. System generates student code and password
4. Credentials sent to parent email
5. Parent shares credentials with student

### Enrollment Flow (Parent)

1. GET `/api/subjects` to view available subjects
2. POST `/api/enrollments` with student and subject details
3. System calculates pricing based on grade band
4. POST `/api/payments/initiate` to make payment
5. Enrollment becomes active after successful payment

### Session Management Flow

1. **For Students**:
   - GET `/api/student/me/schedule` to view upcoming sessions
   - Join Zoom session using provided link
   - View session recordings when available

2. **For Tutors**:
   - GET `/api/tutor/sessions` to view assigned sessions
   - PATCH `/api/sessions/:id` to update session status and attendance
   - Add tutor notes and homework assignments

### Assignment and Grading Flow

1. **For Tutors**:
   - POST `/api/assignments` to create assignments
   - POST `/api/grades` to create grades (pending approval)
   - Admin must approve grades before they're visible to students

2. **For Students**:
   - GET `/api/student/me/assignments` to view assignments
   - GET `/api/student/me/grades` to view approved grades
   - Complete assignments by due date

### Quiz Flow

1. **For Tutors**:
   - Create assignment with type "TEST"
   - POST `/api/quiz/assignments/:id/questions` to add quiz questions

2. **For Students**:
   - POST `/api/quiz/assignments/:id/quiz/start` to start quiz
   - POST `/api/quiz/quiz-attempts/:id/answer` to submit answers
   - PATCH `/api/quiz/quiz-attempts/:id/complete` to complete quiz
   - View results and feedback

### Notification System

1. GET `/api/notifications` to fetch user notifications
2. PATCH `/api/notifications/:id/read` to mark as read
3. Implement real-time updates (consider WebSocket integration)

### Messaging System

1. GET `/api/messages/threads` to view conversation list
2. GET `/api/messages/threads/:threadId` to view conversation
3. POST `/api/messages` to send new message
4. PATCH `/api/messages/threads/:threadId/read` to mark as read

---

## Security Considerations

1. **Always use HTTPS** in production
2. **Store tokens securely** (httpOnly cookies recommended)
3. **Validate all user inputs** on the frontend
4. **Implement proper error handling** without exposing sensitive information
5. **Use CORS headers** appropriately
6. **Rate limit API calls** from the frontend
7. **Implement proper logout** to clear tokens
8. **Validate user permissions** before showing/hiding UI elements

---

## Testing API Endpoints

You can test the API using:

1. **Swagger UI**: Visit `/api-docs` for interactive documentation
2. **Postman/Insomnia**: Import the API endpoints
3. **cURL**: Use command-line tools for testing

---

## Support

For issues or questions about the API:
- Check the Swagger documentation at `/api-docs`
- Review error messages for detailed information
- Contact the development team for backend issues

---

**Last Updated**: January 2024
**API Version**: 1.0.0