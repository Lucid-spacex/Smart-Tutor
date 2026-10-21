const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load .env.test
const envPath = path.join(__dirname, '..', '.env.test');
const envContent = fs.readFileSync(envPath, 'utf8');

// Parse and set environment variables
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    const value = valueParts.join('=').replace(/^"|"$/g, '');
    process.env[key] = value;
  }
});

// Create NotificationType enum if it doesn't exist
const createEnumSQL = `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') THEN
    CREATE TYPE "NotificationType" AS ENUM (
      'ASSIGNMENT_DUE_SOON',
      'ASSIGNMENT_OVERDUE',
      'GRADE_APPROVED',
      'COMPLAINT_RESOLVED',
      'GENERAL',
      'PRICING_DRIFT_ALERT',
      'TUTOR_ASSIGNED',
      'STUDENT_ASSIGNED',
      'ENROLLMENT_AWAITING_TUTOR',
      'PAYMENT_SUCCESS',
      'PAYMENT_FAILED',
      'PAYMENT_EXPIRED',
      'ENROLLMENT_ACTIVATED',
      'SESSION_SCHEDULED',
      'SESSION_RESCHEDULED',
      'SESSION_CANCELLED',
      'SESSION_REMINDER',
      'ASSIGNMENT_POSTED',
      'ASSIGNMENT_SUBMITTED',
      'ASSIGNMENT_REVIEWED',
      'GRADE_SUBMITTED',
      'GRADE_REJECTED',
      'NEW_TUTOR_APPLICATION',
      'TUTOR_APPROVED',
      'TUTOR_REJECTED',
      'PRICE_UPDATED',
      'TUTOR_UNAVAILABLE',
      'NEW_MESSAGE',
      'ACCOUNT_SUSPENDED',
      'ACCOUNT_REACTIVATED',
      'USER_REGISTERED',
      'USER_VERIFIED',
      'ENROLLMENT_CREATED',
      'SESSION_CREATED',
      'SESSION_MISSED',
      'RECORDING_AVAILABLE',
      'QUIZ_COMPLETED',
      'ENROLLMENT_CHANGE_SUBMITTED',
      'ENROLLMENT_CHANGE_APPROVED',
      'ENROLLMENT_CHANGE_REJECTED'
    );
  END IF;
END $$;
`;

// Create GradeStatus enum with DRAFT if it doesn't exist
const createGradeStatusSQL = `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GradeStatus') THEN
    CREATE TYPE "GradeStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');
  ELSE
    -- Add DRAFT if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'DRAFT' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'GradeStatus')) THEN
      ALTER TYPE "GradeStatus" ADD VALUE 'DRAFT' BEFORE 'PENDING_APPROVAL';
    END IF;
  END IF;
END $$;
`;

// Create NotificationCategory enum if it doesn't exist
const createNotificationCategorySQL = `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationCategory') THEN
    CREATE TYPE "NotificationCategory" AS ENUM ('USERS', 'SESSIONS', 'MESSAGES', 'COMPLAINTS', 'ENROLLMENTS', 'PAYMENTS', 'GRADES', 'PRICING', 'SCHEDULE', 'QUIZZES', 'ASSIGNMENTS');
  END IF;
END $$;
`;

try {
  console.log('Creating NotificationType enum if it does not exist...');
  execSync(`npx prisma db execute --stdin`, {
    input: createEnumSQL,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: process.env.DIRECT_URL }
  });
  console.log('Enum created or already exists');

  console.log('Creating/Updating GradeStatus enum...');
  execSync(`npx prisma db execute --stdin`, {
    input: createGradeStatusSQL,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: process.env.DIRECT_URL }
  });
  console.log('GradeStatus enum created or updated');

  console.log('Creating NotificationCategory enum if it does not exist...');
  execSync(`npx prisma db execute --stdin`, {
    input: createNotificationCategorySQL,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: process.env.DIRECT_URL }
  });
  console.log('NotificationCategory enum created or already exists');
} catch (error) {
  console.error('Failed to create enum:', error.message);
  process.exit(1);
}
