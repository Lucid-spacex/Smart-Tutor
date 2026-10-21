const fs = require('fs');
const path = require('path');

const migrationDir = path.join(__dirname, '..', 'prisma', 'migrations', '20261021_create_base_enums');
const migrationFile = path.join(migrationDir, 'migration.sql');

// Create directory if it doesn't exist
if (!fs.existsSync(migrationDir)) {
  fs.mkdirSync(migrationDir, { recursive: true });
}

const migrationSQL = `-- Add missing enum values before the notification/grading migration
-- This migration adds all the NotificationType and GradeStatus values that will be needed
-- Must run outside of ALTER TYPE transaction blocks

-- Add missing NotificationType values (one at a time, outside transaction)
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_EXPIRED' IF NOT EXISTS;
ALTER TYPE "NotificationType" ADD VALUE 'USER_REGISTERED' IF NOT EXISTS;
ALTER TYPE "NotificationType" ADD VALUE 'USER_VERIFIED' IF NOT EXISTS;
ALTER TYPE "NotificationType" ADD VALUE 'ENROLLMENT_CREATED' IF NOT EXISTS;
ALTER TYPE "NotificationType" ADD VALUE 'SESSION_CREATED' IF NOT EXISTS;
ALTER TYPE "NotificationType" ADD VALUE 'SESSION_MISSED' IF NOT EXISTS;
ALTER TYPE "NotificationType" ADD VALUE 'RECORDING_AVAILABLE' IF NOT EXISTS;
ALTER TYPE "NotificationType" ADD VALUE 'QUIZ_COMPLETED' IF NOT EXISTS;
ALTER TYPE "NotificationType" ADD VALUE 'ENROLLMENT_CHANGE_SUBMITTED' IF NOT EXISTS;
ALTER TYPE "NotificationType" ADD VALUE 'ENROLLMENT_CHANGE_APPROVED' IF NOT EXISTS;
ALTER TYPE "NotificationType" ADD VALUE 'ENROLLMENT_CHANGE_REJECTED' IF NOT EXISTS;

-- Add DRAFT to GradeStatus
ALTER TYPE "GradeStatus" ADD VALUE 'DRAFT' IF NOT EXISTS;
`;

fs.writeFileSync(migrationFile, migrationSQL);
console.log('Created migration file: 20261021_create_base_enums/migration.sql');
