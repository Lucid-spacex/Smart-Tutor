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

### Payment System
- Payment provider abstraction (Paystack stub implementation)
- Webhook processing
- Payment status tracking

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
│   │   └── parent/        # Parent-specific endpoints
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
