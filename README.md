# Smart-Tutor Backend MVP

A production-quality backend for a tutoring organization platform. Parents create accounts and enroll their children with tutors for subjects; tutors apply, get vetted, and teach; admins manage the whole operation.

## Tech Stack

- **Runtime:** Node.js (LTS)
- **Framework:** Express.js
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Auth:** JWT (access + refresh token pattern)
- **Validation:** Zod
- **Password hashing:** bcrypt
- **Environment config:** dotenv
- **Language:** TypeScript
- **API Documentation:** Swagger/OpenAPI
- **Testing:** Jest + Supertest

## Features

### Authentication
- User registration (Parent/Tutor roles)
- Email/OTP verification
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)

### Parent Features
- Profile management
- Student management (create/view children)
- Enrollment management (create/view enrollments)
- Session tracking
- Payment initiation
- Progress report viewing

### Tutor Features
- Profile completion with subjects, bio, credentials
- Availability management
- Assigned student viewing
- Session scheduling and management
- Progress report submission

### Admin Features
- Tutor vetting (approve/reject)
- Enrollment management (assign tutors with suggested tutors feature)
- Payment monitoring with comprehensive transaction reports
- Overview reports with aggregate statistics
- **Pricing tier management** (grade-based pricing with per-student overrides)
- **Exchange rate monitoring** (drift alerts for pricing adjustments)
- **Subject management** (per-grade pricing, activation/deactivation)
- **Parent directory** (search, view detailed profiles, manage pricing overrides)
- **Transaction management** (filter payments, view details, revenue analytics)
- Zoom recording management

### Payment System
- Payment provider abstraction (Paystack implementation)
- Webhook processing with signature verification
- Payment status tracking
- **Per-grade pricing** (subject prices by grade band with per-student overrides)
- **Exchange rate monitoring** (daily drift alerts for pricing adjustments)

### Quiz Mode
- **Timed multiple-choice quizzes** for TEST-type assignments
- Server-side scoring with speed multiplier (30s max per question)
- Instant feedback per question
- Auto-graded with admin approval workflow

### Zoom Integration
- **Recording sync** via webhook (preferred) or polling (fallback)
- Recording URLs surfaced in session details
- Signature verification for webhook security

## Project Structure

```
Smart-Tutor/
├── src/
│   ├── modules/           # Feature-based modules
│   │   ├── auth/          # Authentication endpoints
│   │   ├── students/      # Student management
│   │   ├── enrollments/   # Enrollment management
│   │   ├── sessions/      # Session management
│   │   ├── payments/      # Payment processing
│   │   ├── progress-reports/ # Progress reports
│   │   ├── tutor/         # Tutor-specific endpoints
│   │   ├── admin/         # Admin-specific endpoints
│   │   ├── parent/        # Parent-specific endpoints
│   │   ├── quiz/          # Quiz mode for assignments
│   │   ├── webhooks/      # External webhook integrations
│   │   ├── assignments/   # Assignment management
│   │   ├── grades/        # Grade management
│   │   ├── notifications/ # Notification system
│   │   ├── complaints/    # Complaint management
│   │   ├── messages/      # Messaging system
│   │   ├── attendance/    # Attendance tracking
│   │   └── subjects/      # Subject management
│   ├── services/          # External service integrations
│   │   └── zoom.service.ts # Zoom API integration
│   ├── jobs/              # Scheduled background jobs
│   │   ├── inactivity-check.job.ts
│   │   ├── assignment-due.job.ts
│   │   ├── exchange-rate-check.job.ts
│   │   ├── zoom-recording-sync.job.ts
│   │   └── scheduler.ts
│   ├── middleware/        # Express middleware
│   ├── config/           # Configuration files
│   ├── utils/             # Utility functions
│   ├── types/             # TypeScript type definitions
│   └── app.ts             # Main application file
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Database seed script
├── tests/                 # Integration tests
├── .env.example           # Environment variables template
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── README.md              # This file
```

## Setup Instructions

### Prerequisites

- Node.js (LTS version)
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Smart-Tutor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/smart_tutor?schema=public"

   # JWT
   JWT_ACCESS_SECRET="your-super-secret-access-token-key"
   JWT_REFRESH_SECRET="your-super-secret-refresh-token-key"
   JWT_ACCESS_EXPIRY="15m"
   JWT_REFRESH_EXPIRY="7d"

   # Paystack
   PAYSTACK_SECRET_KEY="your-paystack-secret-key"
   PAYSTACK_PUBLIC_KEY="your-paystack-public-key"

   # Frontend
   FRONTEND_URL="http://localhost:3001"

   # Server
   PORT=3000
   NODE_ENV="development"
   ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001"
   # For production: ALLOWED_ORIGINS="https://teachmenest.com"

   # Email (Resend API)
   RESEND_API_KEY="your-resend-api-key"
   EMAIL_FROM="Teachmenest <no-reply@teachmenest.com>"
   EMAIL_REPLY_TO="support@teachmenest.com"

   # Exchange Rate API (for pricing drift monitoring)
   EXCHANGERATE_API_KEY="your-exchangerate-api-key"
   PRICING_DRIFT_THRESHOLD_PERCENT="7"

   # Zoom (for recording sync)
   ZOOM_ACCOUNT_ID="your-zoom-account-id"
   ZOOM_CLIENT_ID="your-zoom-client-id"
   ZOOM_CLIENT_SECRET="your-zoom-client-secret"
   ZOOM_WEBHOOK_SECRET="your-zoom-webhook-secret"

   # Cloudinary (for file storage - profile pictures, attachments)
   CLOUDINARY_CLOUD_NAME="your-cloudinary-cloud-name"
   CLOUDINARY_API_KEY="your-cloudinary-api-key"
   CLOUDINARY_API_SECRET="your-cloudinary-api-secret"
   CLOUDINARY_UPLOAD_PRESET="your-unsigned-upload-preset"

   # Admin Seed (production only)
   ADMIN_SEED_EMAIL="admin@yourdomain.com"
   ADMIN_SEED_PASSWORD="your-strong-password-here"
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run prisma:generate

   # Run database migrations
   npm run prisma:migrate

   # Seed the database with demo data
   npm run prisma:seed
   ```

### Running the Application

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

The server will start on port 3000 (or the port specified in your `.env` file).

**API Documentation:**
Once the server is running, visit `http://localhost:3000/api-docs` to access the interactive Swagger documentation.

## Database Schema

The application uses the following main entities:

- **User** - Single table for all user types with role-based access
- **TutorProfile** - Extended profile information for tutors
- **Student** - Student profiles linked to parent accounts
- **Subject** - Available subjects for enrollment
- **Enrollment** - Links students to subjects and tutors
- **Session** - Individual tutoring sessions
- **Payment** - Payment records and status
- **ProgressReport** - Progress reports submitted by tutors
- **RefreshToken** - JWT refresh token storage

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/verify` - Verify email with OTP
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - User logout

### Parent
- `GET /me` - Get parent profile
- `POST /students` - Create student profile
- `GET /students` - List parent's students
- `GET /students/:id` - Get specific student
- `POST /enrollments` - Create enrollment
- `GET /enrollments` - List enrollments
- `GET /enrollments/:id` - Get specific enrollment
- `GET /sessions` - List sessions
- `POST /payments/initiate` - Initiate payment
- `POST /payments/webhook` - Payment webhook
- `GET /payments` - List payments
- `GET /progress-reports` - List progress reports
- `GET /pricing/quote` - Get pricing quote for student's subjects

### Tutor
- `POST /tutor/tutor-profile` - Complete tutor profile
- `PATCH /tutor/tutor-profile/availability` - Update availability
- `PATCH /tutor/tutor-profile/availability-status` - Update availability status and capacity
- `GET /tutor/tutor-profile` - Get tutor profile
- `GET /tutor/students` - Get assigned students
- `GET /tutor/sessions` - Get tutor's schedule
- `PATCH /sessions/:id` - Update session (log attendance/notes)

### Admin
- `GET /admin/tutors/pending` - Get pending tutors
- `PATCH /admin/tutors/:id/vetting` - Approve/reject tutor
- `GET /admin/tutors` - Get tutors with filters (availability, subject, capacity)
- `GET /admin/enrollments/unmatched` - Get unmatched enrollments
- `GET /admin/enrollments/:id/suggested-tutors` - Get suggested tutors for enrollment
- `PATCH /admin/enrollments/:id/assign-tutor` - Assign tutor to enrollment (with capacity check)
- `GET /admin/payments` - Get paginated payment list with filters
- `GET /admin/payments/:id` - Get payment details with timeline
- `GET /admin/payments/summary` - Get payment summary and analytics
- `GET /admin/reports/overview` - Get overview statistics
- `GET /admin/subjects` - Get all subjects with per-grade pricing
- `POST /admin/subjects` - Create subject with per-grade pricing
- `PATCH /admin/subjects/:id` - Update subject metadata
- `PUT /admin/subjects/:id/prices/:gradeBandTier` - Upsert subject price for grade band
- `DELETE /admin/subjects/:id` - Delete subject (soft delete if has enrollments)
- `GET /admin/enrollments/:id/pricing` - Get enrollment pricing details
- `PATCH /admin/enrollments/:id/pricing` - Set/clear enrollment pricing override
- `GET /admin/exchange-rate/current` - Get current exchange rate
- `GET /admin/parents` - Get paginated parent directory with search
- `GET /admin/parents/:id` - Get detailed parent profile

### Quiz Mode (STUDENT/TUTOR)
- `POST /quiz/assignments/:id/questions` - Create quiz question (TUTOR only)
- `GET /quiz/assignments/:id/questions` - Get quiz questions
- `POST /quiz/assignments/:id/quiz/start` - Start quiz attempt (STUDENT only)
- `POST /quiz/quiz-attempts/:id/answer` - Submit quiz answer (STUDENT only)
- `PATCH /quiz/quiz-attempts/:id/complete` - Complete quiz (STUDENT only)
- `GET /quiz/quiz-attempts/:id` - Get quiz attempt details

### Webhooks
- `POST /webhooks/zoom` - Handle Zoom webhook events

## Testing

Run the integration tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Generate coverage report:
```bash
npm run test:coverage
```

## Development Notes

### OTP Verification
OTP verification is fully implemented with SHA-256 hashing, 15-minute expiry, one-time use, and rate limiting. OTPs are sent via email using the Resend API.

### Payment Integration
Payment processing uses the real Paystack API with webhook signature verification. The callback URL is set to the production frontend (`https://teachmenest.com/payment/callback`).

### Email Service
Email functionality is fully implemented using the Resend API. Emails are sent for OTP verification, student credentials, notifications, and account suspension.

### New Features (2026-10-12)

#### Per-Grade Subject Pricing
- Subjects now support per-grade-band pricing instead of a single gradeBand field
- Pricing resolution order: enrollment override → subject price → legacy tier
- Admin can manage subjects and prices via `/admin/subjects` endpoints
- Parents can get pricing quotes via `/pricing/quote` endpoint
- Price changes are logged and trigger notifications to parents

#### Tutor Availability & Subject Linking
- Tutors can set availability status (AVAILABLE/LIMITED/UNAVAILABLE) and max students
- Tutors are linked to subjects via structured relations instead of free text
- Admin can filter tutors by availability, subject, and capacity
- Suggested tutors endpoint helps admins find the best match for enrollments
- Capacity checks prevent over-assignment (can be overridden with `force: true`)

#### Admin Parent Directory
- Admin can search and view all parents with pagination
- Detailed parent view includes children, enrollments, payments, and metrics
- Effective pricing shown with source (override or subject_price)
- Pricing overrides can be set/cleared with change logging

#### Admin Transaction Management
- Comprehensive payment list with filters (status, currency, provider, date range, search)
- Payment details with timeline and NGN conversion for USD payments
- Payment summary with revenue analytics, success rate, and daily revenue chart

#### Notification System Enhancements
- Notifications now support title, relatedType, data, readAt, and deletedAt fields
- Many new notification types added (PAYMENT_SUCCESS, SESSION_SCHEDULED, etc.)
- Daily cleanup job deletes read notifications older than 90 days
- Price update notifications sent to parents when pricing changes

## Security Considerations

- JWT secrets should be strong and unique in production
- Enable HTTPS in production
- Rate limiting is implemented in three tiers (7 req/15min for auth, 60 req/min for writes, 300 req/15min for reads)
- Input validation handled by Zod schemas
- Error logging via Pino logger with sensitive data redaction
- CORS configured via ALLOWED_ORIGINS environment variable
- OTP verification with SHA-256 hashing, 15-minute expiry, and one-time use
- Paystack webhook signature verification via HMAC-SHA512
- No stack traces in production error responses

## Production Checklist

Before deploying to production:

1. **Environment Variables**
   - Set strong, unique JWT secrets (ACCESS_SECRET, REFRESH_SECRET)
   - Configure PAYSTACK_SECRET_KEY and PAYSTACK_PUBLIC_KEY
   - Set RESEND_API_KEY for email delivery
   - Configure EMAIL_FROM="Teachmenest <no-reply@teachmenest.com>"
   - Configure ALLOWED_ORIGINS to production frontend URL
   - Set CLOUDINARY credentials for file storage
   - Configure EXCHANGERATE_API_KEY for pricing drift monitoring
   - Set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD for initial admin account

2. **Database**
   - Ensure DATABASE_URL points to production PostgreSQL
   - Run migrations: `npm run prisma:migrate`
   - Seed only admin account: `FORCE_SEED=true ADMIN_SEED_EMAIL=... ADMIN_SEED_PASSWORD=... npm run prisma:seed`
   - Never use default demo credentials in production

3. **Security**
   - Verify NODE_ENV=production
   - Enable HTTPS
   - Configure proper CORS origins
   - Review rate limiting thresholds
   - Test webhook signature verification
   - Run `npm audit` to check for security vulnerabilities

4. **Services**
   - Configure Paystack webhook URL
   - Set up Zoom webhook for recording sync (to be replaced with Google Meet)
   - Verify email delivery via Resend
   - Test Cloudinary file uploads

5. **Monitoring**
   - Set up log aggregation
   - Configure error tracking
   - Monitor exchange rate drift alerts
   - Review failed payment webhooks

## Build Status

The project builds successfully with TypeScript compilation. Run `npm run build` to verify before deployment.

**Note:** npm audit may report vulnerabilities. Review and address as needed based on your security requirements.

## License

ISC

## Support

For issues and questions, please refer to the project repository or contact the development team.
