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
- Enrollment management (assign tutors)
- Payment monitoring
- Overview reports with aggregate statistics
- **Pricing tier management** (grade-based pricing with per-student overrides)
- **Exchange rate monitoring** (drift alerts for pricing adjustments)
- Zoom recording management

### Payment System
- Payment provider abstraction (Paystack stub implementation)
- Webhook processing
- Payment status tracking
- **Tiered pricing** (grade-based default prices with per-student overrides)
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

   # Email (Resend)
   RESEND_API_KEY="your-resend-api-key"
   EMAIL_FROM="Smart-Tutor <noreply@smarttutor.com>"

   # Exchange Rate API (for pricing drift monitoring)
   EXCHANGERATE_API_KEY="your-exchangerate-api-key"
   PRICING_DRIFT_THRESHOLD_PERCENT="7"

   # Zoom (for recording sync)
   ZOOM_ACCOUNT_ID="your-zoom-account-id"
   ZOOM_CLIENT_ID="your-zoom-client-id"
   ZOOM_CLIENT_SECRET="your-zoom-client-secret"
   ZOOM_WEBHOOK_SECRET="your-zoom-webhook-secret"

   # Server
   PORT=3000
   NODE_ENV="development"
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

### Tutor
- `POST /tutor/tutor-profile` - Complete tutor profile
- `PATCH /tutor/tutor-profile/availability` - Update availability
- `GET /tutor/tutor-profile` - Get tutor profile
- `GET /tutor/students` - Get assigned students
- `GET /tutor/sessions` - Get tutor's schedule
- `PATCH /sessions/:id` - Update session (log attendance/notes)

### Admin
- `GET /admin/tutors/pending` - Get pending tutors
- `PATCH /admin/tutors/:id/vetting` - Approve/reject tutor
- `GET /admin/enrollments/unmatched` - Get unmatched enrollments
- `PATCH /admin/enrollments/:id/assign-tutor` - Assign tutor to enrollment
- `GET /admin/payments/failed` - Get failed payments
- `GET /admin/reports/overview` - Get overview statistics
- `GET /admin/pricing-tiers` - Get pricing tiers with drift information
- `PATCH /admin/pricing-tiers/:gradeBandTier` - Update pricing tier
- `GET /admin/enrollments/:id/pricing` - Get enrollment pricing details
- `PATCH /admin/enrollments/:id/pricing` - Set/clear enrollment pricing override
- `GET /admin/exchange-rate/current` - Get current exchange rate

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

## Demo Credentials

After running the seed script, you can use these credentials for testing:

- **Admin:** `admin@smarttutor.com` / `admin123`
- **Parent:** `parent@smarttutor.com` / `parent123`
- **Tutor:** `tutor@smarttutor.com` / `tutor123`

## Development Notes

### OTP Verification
In this MVP, the OTP system is stubbed. Any 6-digit OTP will be accepted for verification. In production, implement proper OTP generation and validation with email/SMS delivery.

### Payment Integration
The payment system uses a Paystack stub. Replace the implementation in `src/modules/payments/providers/paystack.provider.ts` with actual Paystack API calls for production.

### Email Service
Email functionality is currently stubbed. Implement actual email sending in `src/utils/email.util.ts` for production.

## Security Considerations

- JWT secrets should be strong and unique in production
- Enable HTTPS in production
- Implement rate limiting for API endpoints
- Add proper input sanitization (Zod handles validation)
- Implement proper error logging and monitoring
- Add CORS configuration for production domains

## License

ISC

## Support

For issues and questions, please refer to the project repository or contact the development team.
