# Smart Tutor Backend - Complete Documentation

## 🎯 Project Overview

**Smart Tutor** is a comprehensive tutoring platform backend that connects parents, tutors, and students for personalized learning experiences. The system handles user authentication, enrollment management, session scheduling, payment processing, and progress tracking.

**Tech Stack:**
- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** JWT with role-based access control (RBAC)
- **Payment:** Paystack integration
- **Email:** Resend API
- **Video Conferencing:** Zoom integration
- **Documentation:** Swagger/OpenAPI 3.0.3
- **Background Jobs:** Node-cron for scheduled tasks

---

## 🔐 User Roles & Permissions

### 1. **PARENT**
- Register children/students
- Manage student profiles
- Create enrollments
- Make payments
- View student progress
- File complaints

### 2. **TUTOR**
- Complete profile and availability
- View assigned students
- Manage sessions
- Create assignments and grades
- Generate progress reports
- Create quiz questions

### 3. **STUDENT**
- Login with PIN + student code
- View schedule and assignments
- View grades and progress
- Take timed quizzes
- View notifications

### 4. **ADMIN**
- Manage pricing tiers
- Approve/reject tutors
- Assign tutors to enrollments
- Monitor exchange rates
- Approve/reject grades
- Resolve complaints
- Platform overview reports

---

## 📚 Complete API Endpoints

### 🔑 Authentication Module (`/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user (parent/tutor) | No |
| POST | `/auth/verify` | Verify email with OTP | No |
| POST | `/auth/login` | User login (email/password) | No |
| POST | `/auth/student-login` | Student login (PIN + student code) | No |
| POST | `/auth/refresh` | Refresh access token | No |
| POST | `/auth/logout` | Logout user | Yes |
| GET | `/auth/me` | Get current authenticated user | Yes |
| POST | `/auth/resend-otp` | Resend OTP for email verification | No |
| PATCH | `/auth/change-password` | Change user password | Yes |
| PATCH | `/auth/me/timezone` | Update user timezone | Yes |

**Rate Limiting:**
- Tier 1 (Strict): 7 req/15min for register, verify, login, student-login, resend-otp
- Tier 2 (Moderate): 60 req/min for refresh, logout, change-password

---

### 👨‍👩 Parent Module (`/me`, `/students`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/me` | Get parent profile | Yes (PARENT) |
| POST | `/students` | Create new student profile | Yes (PARENT) |
| GET | `/students` | Get all parent's students | Yes (PARENT) |
| GET | `/students/{id}` | Get specific student by ID | Yes (PARENT) |
| GET | `/students/{id}/activity` | Get student activity log | Yes (PARENT) |
| POST | `/students/{id}/regenerate-pin` | Regenerate student PIN | Yes (PARENT) |
| GET | `/students/{id}/attendance` | Get student attendance statistics | Yes (PARENT) |

---

### 🎓 Student Module (`/student`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/student/me` | Get student profile | Yes (STUDENT) |
| GET | `/student/me/schedule` | Get student's class schedule | Yes (STUDENT) |
| GET | `/student/me/assignments` | Get student's assignments | Yes (STUDENT) |
| GET | `/student/me/grades` | Get student's grades | Yes (STUDENT) |
| GET | `/student/me/progress-reports` | Get student's progress reports | Yes (STUDENT) |
| GET | `/student/me/notifications` | Get student's notifications | Yes (STUDENT) |
| GET | `/student/me/next-class` | Get student's next upcoming class | Yes (STUDENT) |
| GET | `/student/me/attendance` | Get student's attendance records | Yes (STUDENT) |

---

### 🧑‍🏫 Tutor Module (`/tutor-profile`, `/tutor`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/tutor-profile` | Complete tutor profile | Yes (TUTOR) |
| GET | `/tutor-profile` | Get tutor profile | Yes (TUTOR) |
| PATCH | `/tutor-profile` | Update tutor availability | Yes (TUTOR) |
| PATCH | `/tutor-profile/availability` | Update tutor availability | Yes (TUTOR) |
| GET | `/tutor/students` | Get assigned students | Yes (TUTOR) |
| GET | `/tutor/sessions` | Get tutor's schedule | Yes (TUTOR) |

---

### 📚 Subjects Module (`/subjects`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/subjects` | Get all subjects (filterable by category/grade band) | Yes (All authenticated) |

**Query Parameters:**
- `category`: CORE or ENRICHMENT
- `gradeBand`: Filter by grade band

---

### 📅 Sessions Module (`/sessions`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/sessions` | Get sessions (filterable by enrollment/status) | Yes |
| GET | `/sessions/tutor` | Get tutor's sessions | Yes (TUTOR) |
| PATCH | `/sessions/{id}` | Update session (tutor only) | Yes (TUTOR) |
| POST | `/admin/sessions` | Create session with multiple participants | Yes (ADMIN) |
| PATCH | `/admin/sessions/{id}/reschedule` | Reschedule session (admin only) | Yes (ADMIN) |

**Query Parameters:**
- `enrollmentId`: Filter by enrollment ID
- `status`: SCHEDULED, COMPLETED, MISSED, CANCELLED

---

### 📝 Enrollments Module (`/enrollments`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/enrollments` | Create multi-subject enrollment batch | Yes (PARENT) |
| GET | `/enrollments` | Get enrollments for authenticated user | Yes (PARENT, TUTOR) |
| GET | `/enrollments/group/{groupId}` | Get enrollments by group ID | Yes (PARENT, TUTOR, ADMIN) |
| GET | `/enrollments/{id}` | Get specific enrollment by ID | Yes (PARENT, TUTOR) |

**Multi-Subject Enrollment:**
- Supports batch enrollment for multiple subjects
- Group enrollments for simplified billing
- Flexible scheduling preferences

---

### 💳 Payments Module (`/payments`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/payments/initiate` | Initiate payment (single or group) | Yes (PARENT) |
| POST | `/payments/webhook` | Process Paystack webhook | No (signature verified) |
| GET | `/payments` | Get all parent's payments | Yes (PARENT) |
| GET | `/payments/verify/{reference}` | Verify payment by reference | No |

**Payment Features:**
- Support for both single enrollment and enrollment group payments
- Automatic enrollment activation on successful payment
- Multi-currency support (NGN, USD)
- Exchange rate integration for pricing

**Rate Limiting:**
- Tier 1 (Strict): 7 req/15min for payment initiation

---

### 📊 Progress Reports Module (`/progress-reports`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/progress-reports` | Create progress report | Yes (TUTOR) |
| GET | `/progress-reports` | Get progress reports (filterable) | Yes |

**Query Parameters:**
- `enrollmentId`: Filter by enrollment ID

---

### 📋 Assignments Module (`/assignments`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/assignments` | Create assignment/test | Yes (TUTOR) |
| GET | `/assignments` | List assignments (filtered by role) | Yes |
| PATCH | `/assignments/{id}` | Update assignment status | Yes (TUTOR) |

**Assignment Types:**
- ASSIGNMENT: Regular homework
- CLASSWORK: In-class work
- TEST: Timed assessments

---

### 🎯 Grades Module (`/grades`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/grades` | Submit grade (starts PENDING_APPROVAL) | Yes (TUTOR) |
| GET | `/grades` | List grades (filtered by role) | Yes |
| GET | `/admin/grades/pending` | Get pending grades for approval | Yes (ADMIN) |
| PATCH | `/admin/grades/{id}/approve` | Approve grade (visible to student) | Yes (ADMIN) |
| PATCH | `/admin/grades/{id}/reject` | Reject grade with reason | Yes (ADMIN) |

**Grade Approval Workflow:**
1. Tutor submits grade → PENDING_APPROVAL
2. Admin reviews and approves/rejects
3. Approved grades become visible to students

---

### 🔔 Notifications Module (`/notifications`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/notifications` | Get user's notifications | Yes |
| PATCH | `/notifications/{id}/read` | Mark notification as read | Yes |

**Notification Types:**
- Session reminders
- Grade approvals
- Assignment deadlines
- Complaint resolutions

---

### 📢 Complaints Module (`/complaints`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/complaints` | File a complaint | Yes (PARENT, TUTOR) |
| GET | `/complaints` | List complaints (filtered by role) | Yes |
| PATCH | `/admin/complaints/{id}/resolve` | Resolve complaint | Yes (ADMIN) |

**Complaint Types:**
- About: STUDENT, TUTOR, PARENT, GENERAL
- Status: OPEN, IN_PROGRESS, RESOLVED

---

### 💬 Messages Module (`/messages`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/messages` | Send message to authorized recipient | Yes |
| GET | `/messages/threads` | Get conversation threads | Yes |
| GET | `/messages/threads/{threadId}` | Get messages in a thread | Yes |
| PATCH | `/messages/threads/{threadId}/read` | Mark thread as read | Yes |

**Messaging Permissions Matrix:**
- STUDENT ↔ Assigned TUTOR (active enrollment required)
- TUTOR ↔ ADMIN
- PARENT ↔ ADMIN
- All other combinations return 403

---

### 🧩 Quiz Module (`/quiz`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/quiz/assignments/{id}/questions` | Create quiz question | Yes (TUTOR) |
| GET | `/quiz/assignments/{id}/questions` | Get quiz questions | Yes |
| POST | `/quiz/assignments/{id}/quiz/start` | Start quiz attempt | Yes (STUDENT) |
| POST | `/quiz/quiz-attempts/{id}/answer` | Submit quiz answer | Yes (STUDENT) |
| PATCH | `/quiz/quiz-attempts/{id}/complete` | Complete quiz | Yes (STUDENT) |
| GET | `/quiz/quiz-attempts/{id}` | Get quiz attempt details | Yes |

**Quiz Features:**
- Timed quiz mode for assignments
- Multiple choice questions with immediate feedback
- Automatic grade creation on completion
- Point-based scoring system

---

### 📈 Attendance Module (`/attendance`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/students/{id}/attendance` | Get student attendance statistics | Yes |
| GET | `/student/me/attendance` | Get student's own attendance | Yes (STUDENT) |

**Attendance Calculation:**
- Percentage based on COMPLETED and MISSED sessions only
- Accessible by: STUDENT (self), PARENT (own children), TUTOR (assigned students), ADMIN (all)

---

### 🎛️ Admin Module (`/admin`)

#### Pricing Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/admin/pricing-tiers` | Get all pricing tiers with drift info | Yes (ADMIN) |
| PATCH | `/admin/pricing-tiers/{gradeBandTier}` | Update pricing tier | Yes (ADMIN) |
| GET | `/admin/exchange-rate/current` | Get current exchange rate | Yes (ADMIN) |

#### Tutor Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/admin/tutors/pending` | Get pending tutor vetting requests | Yes (ADMIN) |
| GET | `/admin/tutors` | Get all tutors (filterable) | Yes (ADMIN) |
| PATCH | `/admin/tutors/{id}/vetting` | Update tutor vetting status | Yes (ADMIN) |

#### Enrollment Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/admin/enrollments/unmatched` | Get unmatched enrollments | Yes (ADMIN) |
| PATCH | `/admin/enrollments/{id}/assign-tutor` | Assign tutor to enrollment | Yes (ADMIN) |
| GET | `/admin/enrollments/{id}/pricing` | Get enrollment pricing details | Yes (ADMIN) |
| PATCH | `/admin/enrollments/{id}/pricing` | Set/clear pricing override | Yes (ADMIN) |

#### User Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/admin/students` | Get all students (filterable) | Yes (ADMIN) |
| PATCH | `/admin/students/{id}/regenerate-pin` | Regenerate student PIN | Yes (ADMIN) |
| GET | `/admin/users/suspended` | Get all suspended users | Yes (ADMIN) |
| PATCH | `/admin/users/{id}/reactivate` | Reactivate suspended user | Yes (ADMIN) |

#### Reports & Monitoring
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/admin/payments/failed` | Get failed payment transactions | Yes (ADMIN) |
| GET | `/admin/reports/overview` | Get platform overview report | Yes (ADMIN) |

#### Session Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/admin/sessions` | Create session with multiple participants | Yes (ADMIN) |
| PATCH | `/admin/sessions/{id}/reschedule` | Reschedule session | Yes (ADMIN) |

#### Grade Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/admin/grades/pending` | Get pending grades | Yes (ADMIN) |
| PATCH | `/admin/grades/{id}/approve` | Approve grade | Yes (ADMIN) |
| PATCH | `/admin/grades/{id}/reject` | Reject grade | Yes (ADMIN) |

#### Complaint Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| PATCH | `/admin/complaints/{id}/resolve` | Resolve complaint | Yes (ADMIN) |

---

### 🔗 Webhooks Module (`/webhooks`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/webhooks/zoom` | Handle Zoom webhook events | No (signature verified) |

**Webhook Features:**
- Zoom recording.completed event processing
- Automatic recording URL updates
- HMAC signature verification
- No rate limiting (must be always reachable)

---

## 🛡️ Security Features

### Authentication
- JWT-based authentication with access/refresh tokens
- Access token expiry: 15 minutes
- Refresh token expiry: 7 days
- OTP-based email verification
- PIN-based student login

### Authorization
- Role-based access control (RBAC)
- Permission matrix enforcement
- Resource ownership validation
- Admin-only endpoints protection

### Rate Limiting
- **Tier 1 (Strict):** 7 req/15min - Auth endpoints, payment initiation
- **Tier 2 (Moderate):** 60 req/min - General write operations
- **Tier 3 (Loose):** 300 req/15min - Read operations
- **Student Login:** 5 req/15min (stricter due to PIN search space)

### Data Protection
- Password hashing with bcrypt
- Environment variable validation
- Input validation with Zod schemas
- SQL injection prevention via Prisma ORM
- XSS protection via Express middleware

---

## 💰 Payment System

### Paystack Integration
- Multi-currency support (NGN, USD)
- Automatic enrollment activation
- Exchange rate monitoring
- Pricing drift detection (7% threshold)
- Group enrollment support

### Pricing Tiers
- PRESCHOOL_TO_G1
- G2_TO_G4
- G5_TO_G8
- G9_TO_G12

### Billing Frequencies
- Weekly
- Monthly
- Yearly

---

## 🎥 Video Integration

### Zoom Features
- Automatic meeting creation for sessions
- Recording synchronization
- Webhook-based recording URL updates
- Meeting ID and link management

---

## 📊 Background Jobs

### Scheduled Tasks
1. **Exchange Rate Check** - Monitor currency fluctuations
2. **Zoom Recording Sync** - Process completed recordings
3. **Inactivity Check** - Monitor user activity
4. **Assignment Due Reminders** - Notify upcoming deadlines

---

## 📧 Email System

### Resend Integration
- OTP email verification
- Password reset emails
- Account suspension notifications
- Session reminders
- Grade notifications

---

## 🗄️ Database Schema

### Core Entities
- **Users** - Parents, tutors, admins
- **Students** - Student profiles with PIN login
- **TutorProfiles** - Tutor information and availability
- **Subjects** - Available subjects by grade band
- **Enrollments** - Student subject enrollments
- **Sessions** - Tutoring sessions with Zoom integration
- **Payments** - Transaction records
- **Grades** - Student grades with approval workflow
- **Assignments** - Homework and tests
- **QuizQuestions** - Timed quiz questions
- **QuizAttempts** - Student quiz attempts
- **ProgressReports** - Student progress documentation
- **Notifications** - User notifications
- **Complaints** - Issue tracking
- **Messages** - Internal messaging system
- **Attendance** - Session attendance records

---

## 🎨 API Documentation

### Swagger UI
- **URL:** `http://localhost:3001/api-docs`
- **Raw Spec:** `http://localhost:3001/api-docs.json`
- **OpenAPI Version:** 3.0.3
- **Total Endpoints:** 67+

### Enhanced Features
- **Real-time search** with keyboard shortcuts (Ctrl/Cmd + K)
- **Tag-based filtering** with clickable buttons
- **API statistics** showing endpoint counts by method
- **Modern UI** with gradient backgrounds and animations
- **Responsive design** for mobile devices
- **Live result counts** for search queries

---

## 🔧 Development Setup

### Prerequisites
- Node.js (v18+)
- PostgreSQL database
- Paystack API keys
- Resend API key
- Zoom API credentials

### Installation
```bash
npm install
```

### Environment Variables
```env
DATABASE_URL="postgresql://..."
JWT_ACCESS_SECRET="minimum-32-characters"
JWT_REFRESH_SECRET="minimum-32-characters"
PAYSTACK_SECRET_KEY="..."
PAYSTACK_PUBLIC_KEY="..."
RESEND_API_KEY="..."
ZOOM_ACCOUNT_ID="..."
ZOOM_CLIENT_ID="..."
ZOOM_CLIENT_SECRET="..."
ZOOM_WEBHOOK_SECRET="..."
```

### Running the Server
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### Database Operations
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database
npm run prisma:seed
```

### Testing
```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

---

## 📈 Project Statistics

- **Total API Endpoints:** 67+
- **Authentication Endpoints:** 9
- **Admin Endpoints:** 16
- **Student Endpoints:** 8
- **Tutor Endpoints:** 4
- **Payment Endpoints:** 4
- **Messaging Endpoints:** 4
- **Quiz Endpoints:** 5
- **Support Modules:** 17

---

## 🚀 Deployment Considerations

### Environment Variables
- All sensitive data in environment variables
- Separate configs for development/production
- Strong JWT secrets (minimum 32 characters)

### Database
- PostgreSQL connection pooling
- Prisma migrations for schema management
- Seed data for initial setup

### Security
- HTTPS in production
- CORS configuration
- Rate limiting on all endpoints
- Webhook signature verification

### Monitoring
- Structured logging with Pino
- Error tracking middleware
- Health check endpoint (`/health`)

---

## 📝 Key Features Implemented

### ✅ User Management
- Multi-role authentication (Parent, Tutor, Student, Admin)
- Email verification with OTP
- PIN-based student login
- Profile management
- Timezone support

### ✅ Enrollment System
- Multi-subject batch enrollment
- Group enrollment for simplified billing
- Flexible scheduling preferences
- Tutor assignment workflow
- Pricing override support

### ✅ Session Management
- Automated session scheduling
- Zoom integration for video calls
- Recording synchronization
- Session status tracking
- Tutor notes and homework assignment

### ✅ Payment Processing
- Paystack integration
- Multi-currency support
- Automatic enrollment activation
- Exchange rate monitoring
- Failed payment tracking

### ✅ Academic Management
- Assignment creation and tracking
- Grade submission with approval workflow
- Timed quiz system
- Progress report generation
- Attendance tracking

### ✅ Communication
- Internal messaging system
- Permission-based messaging
- Thread-based conversations
- Read status tracking

### ✅ Admin Tools
- Pricing tier management
- Exchange rate monitoring
- Tutor vetting workflow
- Grade approval system
- Platform overview reports
- User suspension/reactivation

### ✅ Enhanced API Documentation
- Comprehensive Swagger UI
- Real-time search functionality
- Tag-based filtering
- API statistics dashboard
- Mobile-responsive design

---

## 🎯 Next Steps & Enhancements

### Potential Improvements
- Real-time notifications with WebSockets
- Advanced analytics dashboard
- File upload for assignments
- Video call recording management
- Mobile app API optimization
- Advanced search and filtering
- Bulk operations for admin
- Integration with calendar systems
- Automated payment reminders
- Parent portal UI integration

---

## 📞 Support & Maintenance

### Health Check
- **Endpoint:** `/health`
- **Returns:** Server status, database connectivity, timestamp

### Error Handling
- Global error middleware
- Structured error responses
- Logging with Pino
- Graceful shutdown handling

### Monitoring
- Background job status
- Payment webhook processing
- Zoom webhook handling
- Exchange rate updates

---

**Generated:** September 26, 2026  
**Version:** 1.0.0  
**Status:** Production Ready  
**Documentation:** OpenAPI 3.0.3 compliant