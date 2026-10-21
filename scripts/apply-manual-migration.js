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

// Manual migration SQL (without ALTER TYPE since enums already exist)
const migrationSQL = `
-- Recreate Notification table with new schema
ALTER TABLE "Notification" RENAME TO "Notification_old";

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "dedupeKey" TEXT UNIQUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");
CREATE INDEX "Notification_type_idx" ON "Notification"("type");
CREATE INDEX "Notification_category_idx" ON "Notification"("category");
CREATE INDEX "Notification_entityType_entityId_idx" ON "Notification"("entityType", "entityId");
CREATE INDEX "Notification_dedupeKey_idx" ON "Notification"("dedupeKey");
CREATE UNIQUE INDEX "Notification_userId_dedupeKey_key" ON "Notification"("userId", "dedupeKey") WHERE "dedupeKey" IS NOT NULL;

-- Migrate existing data
INSERT INTO "Notification" ("id", "userId", "type", "category", "title", "body", "entityType", "entityId", "isRead", "readAt", "createdAt")
SELECT
    "id",
    "userId",
    "type",
    CASE
        WHEN type IN ('TUTOR_ASSIGNED', 'STUDENT_ASSIGNED', 'USER_REGISTERED', 'USER_VERIFIED') THEN 'USERS'
        WHEN type LIKE 'SESSION_%' THEN 'SESSIONS'
        WHEN type = 'NEW_MESSAGE' THEN 'MESSAGES'
        WHEN type = 'COMPLAINT_RESOLVED' THEN 'COMPLAINTS'
        WHEN type LIKE 'ENROLLMENT_%' THEN 'ENROLLMENTS'
        WHEN type LIKE 'PAYMENT_%' THEN 'PAYMENTS'
        WHEN type LIKE 'GRADE_%' THEN 'GRADES'
        WHEN type = 'PRICE_UPDATED' OR type = 'PRICING_DRIFT_ALERT' THEN 'PRICING'
        WHEN type = 'TUTOR_UNAVAILABLE' THEN 'SCHEDULE'
        WHEN type LIKE 'ASSIGNMENT_%' THEN 'ASSIGNMENTS'
        ELSE 'GENERAL'
    END as category,
    "title",
    "message" as body,
    "relatedType" as entityType,
    "relatedId" as entityId,
    CASE WHEN "readAt" IS NULL THEN false ELSE true END as isRead,
    "readAt",
    "createdAt"
FROM "Notification_old";

DROP TABLE "Notification_old";

-- Add foreign key
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add ScoredItemType enum
CREATE TYPE "ScoredItemType" AS ENUM ('QUIZ', 'ASSIGNMENT', 'TEST', 'PARTICIPATION');

-- Create ScoredItem table
CREATE TABLE "ScoredItem" (
    "id" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "type" "ScoredItemType" NOT NULL,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "autoScore" DECIMAL(10,2),
    "score" DECIMAL(10,2) NOT NULL,
    "maxScore" DECIMAL(10,2) NOT NULL,
    "comment" TEXT,
    "scoredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gradeId" TEXT,

    CONSTRAINT "ScoredItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScoredItem_tutorId_idx" ON "ScoredItem"("tutorId");
CREATE INDEX "ScoredItem_studentId_idx" ON "ScoredItem"("studentId");
CREATE INDEX "ScoredItem_enrollmentId_idx" ON "ScoredItem"("enrollmentId");
CREATE INDEX "ScoredItem_gradeId_idx" ON "ScoredItem"("gradeId");
CREATE INDEX "ScoredItem_type_idx" ON "ScoredItem"("type");
CREATE INDEX "ScoredItem_sourceType_sourceId_idx" ON "ScoredItem"("sourceType", "sourceId");
CREATE UNIQUE INDEX "ScoredItem_source_unique" ON "ScoredItem"("sourceType", "sourceId") WHERE "sourceType" IN ('QuizAttempt', 'AssignmentSubmission');

ALTER TABLE "ScoredItem" ADD CONSTRAINT "ScoredItem_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScoredItem" ADD CONSTRAINT "ScoredItem_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScoredItem" ADD CONSTRAINT "ScoredItem_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScoredItem" ADD CONSTRAINT "ScoredItem_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create GradeComponent table
CREATE TABLE "GradeComponent" (
    "id" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "weightPercent" INTEGER NOT NULL,
    "itemCount" INTEGER NOT NULL,
    "componentPercentage" DECIMAL(10,2) NOT NULL,
    "snapshot" JSONB NOT NULL,

    CONSTRAINT "GradeComponent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GradeComponent_gradeId_idx" ON "GradeComponent"("gradeId");

ALTER TABLE "GradeComponent" ADD CONSTRAINT "GradeComponent_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create GradeEvent table
CREATE TABLE "GradeEvent" (
    "id" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GradeEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GradeEvent_gradeId_idx" ON "GradeEvent"("gradeId");
CREATE INDEX "GradeEvent_action_idx" ON "GradeEvent"("action");
CREATE INDEX "GradeEvent_createdAt_idx" ON "GradeEvent"("createdAt");
CREATE INDEX "GradeEvent_userId_idx" ON "GradeEvent"("userId");

ALTER TABLE "GradeEvent" ADD CONSTRAINT "GradeEvent_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GradeEvent" ADD CONSTRAINT "GradeEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add ChangeRequestStatus enum
CREATE TYPE "ChangeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- Create EnrollmentChangeRequest table
CREATE TABLE "EnrollmentChangeRequest" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "requestedValues" JSONB NOT NULL,
    "previousSnapshot" JSONB NOT NULL,
    "status" "ChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnrollmentChangeRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EnrollmentChangeRequest_one_pending" ON "EnrollmentChangeRequest"("enrollmentId") WHERE status = 'PENDING';
CREATE INDEX "EnrollmentChangeRequest_enrollmentId_idx" ON "EnrollmentChangeRequest"("enrollmentId");
CREATE INDEX "EnrollmentChangeRequest_requestedBy_idx" ON "EnrollmentChangeRequest"("requestedBy");
CREATE INDEX "EnrollmentChangeRequest_status_idx" ON "EnrollmentChangeRequest"("status");
CREATE INDEX "EnrollmentChangeRequest_createdAt_idx" ON "EnrollmentChangeRequest"("createdAt");

ALTER TABLE "EnrollmentChangeRequest" ADD CONSTRAINT "EnrollmentChangeRequest_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add new columns to Grade table
ALTER TABLE "Grade" ADD COLUMN IF NOT EXISTS "periodStart" TIMESTAMP(3);
ALTER TABLE "Grade" ADD COLUMN IF NOT EXISTS "periodEnd" TIMESTAMP(3);
ALTER TABLE "Grade" ADD COLUMN IF NOT EXISTS "computedScore" DECIMAL(10,2);
ALTER TABLE "Grade" ADD COLUMN IF NOT EXISTS "finalScore" DECIMAL(10,2);
ALTER TABLE "Grade" ADD COLUMN IF NOT EXISTS "overrideReason" TEXT;
ALTER TABLE "Grade" ADD COLUMN IF NOT EXISTS "tutorComment" TEXT;
ALTER TABLE "Grade" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
ALTER TABLE "Grade" ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3);
ALTER TABLE "Grade" ADD COLUMN IF NOT EXISTS "reviewedBy" TEXT;
ALTER TABLE "Grade" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);

-- Backfill defaults for existing Grade rows
UPDATE "Grade" SET "periodStart" = "createdAt" WHERE "periodStart" IS NULL;
UPDATE "Grade" SET "periodEnd" = "createdAt" + INTERVAL '30 days' WHERE "periodEnd" IS NULL;
UPDATE "Grade" SET "computedScore" = "score" WHERE "computedScore" IS NULL;
UPDATE "Grade" SET "finalScore" = "score" WHERE "finalScore" IS NULL;

-- Add new columns to Session table for Google Meet
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "googleEventId" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "googleMeetLink" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "googleDriveFileId" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "needsReschedule" BOOLEAN NOT NULL DEFAULT false;

-- Add indexes for Session
CREATE INDEX IF NOT EXISTS "Session_googleEventId_idx" ON "Session"("googleEventId");
CREATE INDEX IF NOT EXISTS "Session_needsReschedule_idx" ON "Session"("needsReschedule");

-- Add index for Grade
CREATE INDEX IF NOT EXISTS "Grade_periodStart_periodEnd_idx" ON "Grade"("periodStart", "periodEnd");
`;

try {
  console.log('Applying manual migration...');
  execSync(`npx prisma db execute --stdin`, {
    input: migrationSQL,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: process.env.DIRECT_URL }
  });
  console.log('Manual migration applied successfully');

  // Mark migration as applied
  console.log('Marking migration as applied...');
  execSync(`npx prisma migrate resolve --applied 20261020120000_add_notification_and_grading_models`, {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
  });
  console.log('Migration marked as applied');
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exit(1);
}
