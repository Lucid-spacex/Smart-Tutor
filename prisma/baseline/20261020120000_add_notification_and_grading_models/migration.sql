-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PARENT', 'TUTOR', 'ADMIN', 'STUDENT');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('UNVERIFIED', 'ACTIVE', 'PENDING_VETTING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "VettingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SubjectCategory" AS ENUM ('CORE', 'ENRICHMENT', 'TEST_PREP');

-- CreateEnum
CREATE TYPE "GradeBandTier" AS ENUM ('PRESCHOOL_TO_G1', 'G2_TO_G4', 'G5_TO_G8', 'G9_TO_G12');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "ActualGrade" AS ENUM ('PRESCHOOL', 'KINDERGARTEN', 'GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5', 'GRADE_6', 'GRADE_7', 'GRADE_8', 'GRADE_9', 'GRADE_10', 'GRADE_11', 'GRADE_12');

-- CreateEnum
CREATE TYPE "SessionFrequency" AS ENUM ('TWICE_WEEKLY', 'THRICE_WEEKLY', 'FIVE_TIMES_WEEKLY');

-- CreateEnum
CREATE TYPE "BillingFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'MISSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RecordingStatus" AS ENUM ('NONE', 'PROCESSING', 'AVAILABLE', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('PAYSTACK', 'STRIPE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TutorAvailabilityStatus" AS ENUM ('AVAILABLE', 'LIMITED', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "TutorApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Qualification" AS ENUM ('SSCE_WAEC', 'OND_NCE', 'HND', 'BACHELORS', 'BED_PGDE', 'MASTERS', 'PHD', 'OTHER');

-- CreateEnum
CREATE TYPE "QualificationLevel" AS ENUM ('PRESCHOOL_TO_G1', 'G2_TO_G4', 'G5_TO_G8', 'G9_TO_G12', 'EXAM_LEVELS');

-- CreateEnum
CREATE TYPE "HowHeardSource" AS ENUM ('TEACHMENEST_TUTOR_OR_STAFF', 'PARENT_OR_FAMILY', 'FRIEND_OR_FAMILY', 'INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'WHATSAPP_GROUP', 'GOOGLE_SEARCH', 'JOB_BOARD', 'OTHER');

-- CreateEnum
CREATE TYPE "ThreadKind" AS ENUM ('ADMIN_SUPPORT');

-- CreateEnum
CREATE TYPE "AssignmentType" AS ENUM ('ASSIGNMENT', 'CLASSWORK', 'TEST', 'HOMEWORK', 'PROJECT', 'QUIZ');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('PENDING', 'SUBMITTED', 'COMPLETED', 'GRADED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GradeStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('USERS', 'SESSIONS', 'MESSAGES', 'COMPLAINTS', 'ENROLLMENTS', 'PAYMENTS', 'GRADES', 'PRICING', 'SCHEDULE', 'QUIZZES', 'ASSIGNMENTS');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ASSIGNMENT_DUE_SOON', 'ASSIGNMENT_OVERDUE', 'GRADE_APPROVED', 'COMPLAINT_RESOLVED', 'GENERAL', 'PRICING_DRIFT_ALERT', 'TUTOR_ASSIGNED', 'STUDENT_ASSIGNED', 'ENROLLMENT_AWAITING_TUTOR', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'PAYMENT_EXPIRED', 'ENROLLMENT_ACTIVATED', 'SESSION_SCHEDULED', 'SESSION_RESCHEDULED', 'SESSION_CANCELLED', 'SESSION_REMINDER', 'ASSIGNMENT_POSTED', 'ASSIGNMENT_SUBMITTED', 'ASSIGNMENT_REVIEWED', 'GRADE_SUBMITTED', 'GRADE_REJECTED', 'NEW_TUTOR_APPLICATION', 'TUTOR_APPROVED', 'TUTOR_REJECTED', 'PRICE_UPDATED', 'TUTOR_UNAVAILABLE', 'NEW_MESSAGE', 'ACCOUNT_SUSPENDED', 'ACCOUNT_REACTIVATED', 'USER_REGISTERED', 'USER_VERIFIED', 'ENROLLMENT_CREATED', 'SESSION_CREATED', 'SESSION_MISSED', 'RECORDING_AVAILABLE', 'QUIZ_COMPLETED', 'ENROLLMENT_CHANGE_SUBMITTED', 'ENROLLMENT_CHANGE_APPROVED', 'ENROLLMENT_CHANGE_REJECTED');

-- CreateEnum
CREATE TYPE "ComplaintAboutType" AS ENUM ('STUDENT', 'TUTOR', 'PARENT', 'GENERAL');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "QuizAttemptStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ScoredItemType" AS ENUM ('QUIZ', 'ASSIGNMENT', 'TEST', 'PARTICIPATION');

-- CreateEnum
CREATE TYPE "ChangeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "middleName" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "studentCode" TEXT,
    "parentId" TEXT,
    "timezone" TEXT,
    "profilePicture" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subjects" TEXT[],
    "bio" TEXT,
    "credentialsUrl" TEXT,
    "vettingStatus" "VettingStatus" NOT NULL DEFAULT 'PENDING',
    "hourlyRate" DECIMAL(10,2) NOT NULL,
    "availability" JSONB NOT NULL,
    "availabilityStatus" "TutorAvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "maxStudents" INTEGER,
    "statusNote" TEXT,
    "statusUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TutorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "TutorApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "birthDay" INTEGER NOT NULL,
    "birthMonth" INTEGER NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "highestQualification" "Qualification" NOT NULL,
    "levels" "QualificationLevel"[],
    "yearsOfExperience" INTEGER NOT NULL,
    "whyTeach" TEXT NOT NULL,
    "howHeard" "HowHeardSource" NOT NULL,
    "aboutYou" TEXT[],
    "lastSavedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "rejectionReason" TEXT,

    CONSTRAINT "TutorApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorApplicationSubject" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,

    CONSTRAINT "TutorApplicationSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorDocument" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TutorDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorSubject" (
    "id" TEXT NOT NULL,
    "tutorProfileId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TutorSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "actualGrade" "ActualGrade",
    "gradeLevel" TEXT NOT NULL,
    "gradeBandTier" "GradeBandTier" NOT NULL DEFAULT 'G5_TO_G8',
    "gender" "Gender",
    "email" TEXT,
    "preferredStartDate" TIMESTAMP(3),
    "school" TEXT,
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "SubjectCategory" NOT NULL,
    "gradeBand" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubjectPrice" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "gradeBandTier" "GradeBandTier" NOT NULL,
    "yearlyPriceNGN" DECIMAL(10,2) NOT NULL,
    "yearlyPriceUSD" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "SubjectPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceChangeLog" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "oldNGN" DECIMAL(10,2),
    "oldUSD" DECIMAL(10,2),
    "newNGN" DECIMAL(10,2),
    "newUSD" DECIMAL(10,2),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "enrollmentGroupId" UUID,
    "studentId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "tutorId" TEXT,
    "sessionFrequency" "SessionFrequency" NOT NULL,
    "availableDays" TEXT[],
    "preferredStartHour" INTEGER,
    "preferredEndHour" INTEGER,
    "billingFrequency" "BillingFrequency" NOT NULL DEFAULT 'YEARLY',
    "yearlyPrice" DECIMAL(10,2),
    "yearlyPriceNGN" DECIMAL(10,2),
    "yearlyPriceUSD" DECIMAL(10,2),
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "zoomLink" TEXT,
    "zoomMeetingId" TEXT,
    "googleEventId" TEXT,
    "googleMeetLink" TEXT,
    "googleDriveFileId" TEXT,
    "recordingUrl" TEXT,
    "recordingStatus" "RecordingStatus" NOT NULL DEFAULT 'NONE',
    "status" "SessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "tutorNotes" TEXT,
    "homeworkAssigned" TEXT,
    "needsReschedule" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionParticipant" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "attended" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "enrollmentId" TEXT,
    "enrollmentGroupId" UUID,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "provider" "PaymentProvider" NOT NULL,
    "providerReference" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressReport" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "strengths" TEXT NOT NULL,
    "areasToImprove" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Thread" (
    "id" TEXT NOT NULL,
    "kind" "ThreadKind" NOT NULL DEFAULT 'ADMIN_SUPPORT',
    "participantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Thread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "threadId" TEXT,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "AssignmentType" NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "attachmentUrl" TEXT,
    "attachmentName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentSubmission" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "textAnswer" TEXT,
    "attachmentUrl" TEXT,
    "attachmentName" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "feedbackText" TEXT,
    "feedbackAttachmentUrl" TEXT,
    "feedbackAttachmentName" TEXT,
    "gradedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssignmentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "gradedBy" TEXT NOT NULL,
    "score" DECIMAL(10,2),
    "maxScore" DECIMAL(10,2),
    "comments" TEXT,
    "attachmentUrl" TEXT,
    "attachmentName" TEXT,
    "status" "GradeStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "visibleToStudent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "computedScore" DECIMAL(10,2),
    "finalScore" DECIMAL(10,2),
    "overrideReason" TEXT,
    "tutorComment" TEXT,
    "rejectionReason" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "dedupeKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "filedBy" TEXT NOT NULL,
    "aboutType" "ComplaintAboutType" NOT NULL,
    "aboutId" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "adminReply" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenFamily" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Otp" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Otp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingTier" (
    "id" TEXT NOT NULL,
    "gradeBandTier" "GradeBandTier" NOT NULL,
    "yearlyPriceNGN" DECIMAL(10,2) NOT NULL,
    "yearlyPriceUSD" DECIMAL(10,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "PricingTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "rate" DECIMAL(10,6) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctOptionIndex" INTEGER NOT NULL,
    "points" DECIMAL(10,2) NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "QuizAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "totalScore" DECIMAL(10,2),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizResponse" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOptionIndex" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "timeTakenSeconds" INTEGER NOT NULL,
    "pointsAwarded" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminActionLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "GradeComponent" (
    "id" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    "weightPercent" INTEGER NOT NULL,
    "itemCount" INTEGER NOT NULL,
    "componentPercentage" DECIMAL(10,2) NOT NULL,
    "snapshot" JSONB NOT NULL,
    "scoredItemId" TEXT,
    "attendanceRate" DECIMAL(10,2),

    CONSTRAINT "GradeComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeEvent" (
    "id" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GradeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_studentCode_key" ON "User"("studentCode");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_studentCode_idx" ON "User"("studentCode");

-- CreateIndex
CREATE INDEX "User_parentId_idx" ON "User"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "TutorProfile_userId_key" ON "TutorProfile"("userId");

-- CreateIndex
CREATE INDEX "TutorProfile_vettingStatus_idx" ON "TutorProfile"("vettingStatus");

-- CreateIndex
CREATE INDEX "TutorProfile_availabilityStatus_idx" ON "TutorProfile"("availabilityStatus");

-- CreateIndex
CREATE UNIQUE INDEX "TutorApplication_userId_key" ON "TutorApplication"("userId");

-- CreateIndex
CREATE INDEX "TutorApplication_userId_idx" ON "TutorApplication"("userId");

-- CreateIndex
CREATE INDEX "TutorApplication_status_idx" ON "TutorApplication"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TutorApplicationSubject_applicationId_subjectId_key" ON "TutorApplicationSubject"("applicationId", "subjectId");

-- CreateIndex
CREATE INDEX "TutorDocument_applicationId_idx" ON "TutorDocument"("applicationId");

-- CreateIndex
CREATE INDEX "TutorSubject_tutorProfileId_idx" ON "TutorSubject"("tutorProfileId");

-- CreateIndex
CREATE INDEX "TutorSubject_subjectId_idx" ON "TutorSubject"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "TutorSubject_tutorProfileId_subjectId_key" ON "TutorSubject"("tutorProfileId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");

-- CreateIndex
CREATE INDEX "Student_parentId_idx" ON "Student"("parentId");

-- CreateIndex
CREATE INDEX "Student_userId_idx" ON "Student"("userId");

-- CreateIndex
CREATE INDEX "Student_deletedAt_idx" ON "Student"("deletedAt");

-- CreateIndex
CREATE INDEX "Student_gradeBandTier_idx" ON "Student"("gradeBandTier");

-- CreateIndex
CREATE INDEX "Student_actualGrade_idx" ON "Student"("actualGrade");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_name_key" ON "Subject"("name");

-- CreateIndex
CREATE INDEX "Subject_category_idx" ON "Subject"("category");

-- CreateIndex
CREATE INDEX "Subject_isActive_idx" ON "Subject"("isActive");

-- CreateIndex
CREATE INDEX "SubjectPrice_subjectId_idx" ON "SubjectPrice"("subjectId");

-- CreateIndex
CREATE INDEX "SubjectPrice_gradeBandTier_idx" ON "SubjectPrice"("gradeBandTier");

-- CreateIndex
CREATE INDEX "SubjectPrice_isActive_idx" ON "SubjectPrice"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SubjectPrice_subjectId_gradeBandTier_key" ON "SubjectPrice"("subjectId", "gradeBandTier");

-- CreateIndex
CREATE INDEX "PriceChangeLog_targetType_targetId_idx" ON "PriceChangeLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "PriceChangeLog_changedBy_idx" ON "PriceChangeLog"("changedBy");

-- CreateIndex
CREATE INDEX "PriceChangeLog_createdAt_idx" ON "PriceChangeLog"("createdAt");

-- CreateIndex
CREATE INDEX "Enrollment_studentId_idx" ON "Enrollment"("studentId");

-- CreateIndex
CREATE INDEX "Enrollment_subjectId_idx" ON "Enrollment"("subjectId");

-- CreateIndex
CREATE INDEX "Enrollment_tutorId_idx" ON "Enrollment"("tutorId");

-- CreateIndex
CREATE INDEX "Enrollment_status_idx" ON "Enrollment"("status");

-- CreateIndex
CREATE INDEX "Enrollment_deletedAt_idx" ON "Enrollment"("deletedAt");

-- CreateIndex
CREATE INDEX "Enrollment_enrollmentGroupId_idx" ON "Enrollment"("enrollmentGroupId");

-- CreateIndex
CREATE INDEX "Session_tutorId_idx" ON "Session"("tutorId");

-- CreateIndex
CREATE INDEX "Session_createdBy_idx" ON "Session"("createdBy");

-- CreateIndex
CREATE INDEX "Session_scheduledAt_idx" ON "Session"("scheduledAt");

-- CreateIndex
CREATE INDEX "Session_status_idx" ON "Session"("status");

-- CreateIndex
CREATE INDEX "Session_zoomMeetingId_idx" ON "Session"("zoomMeetingId");

-- CreateIndex
CREATE INDEX "Session_googleEventId_idx" ON "Session"("googleEventId");

-- CreateIndex
CREATE INDEX "Session_needsReschedule_idx" ON "Session"("needsReschedule");

-- CreateIndex
CREATE INDEX "SessionParticipant_sessionId_idx" ON "SessionParticipant"("sessionId");

-- CreateIndex
CREATE INDEX "SessionParticipant_enrollmentId_idx" ON "SessionParticipant"("enrollmentId");

-- CreateIndex
CREATE INDEX "Payment_parentId_idx" ON "Payment"("parentId");

-- CreateIndex
CREATE INDEX "Payment_enrollmentId_idx" ON "Payment"("enrollmentId");

-- CreateIndex
CREATE INDEX "Payment_enrollmentGroupId_idx" ON "Payment"("enrollmentGroupId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_provider_idx" ON "Payment"("provider");

-- CreateIndex
CREATE INDEX "Payment_deletedAt_idx" ON "Payment"("deletedAt");

-- CreateIndex
CREATE INDEX "ProgressReport_enrollmentId_idx" ON "ProgressReport"("enrollmentId");

-- CreateIndex
CREATE INDEX "ProgressReport_createdBy_idx" ON "ProgressReport"("createdBy");

-- CreateIndex
CREATE INDEX "Thread_participantId_idx" ON "Thread"("participantId");

-- CreateIndex
CREATE INDEX "Thread_kind_idx" ON "Thread"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "Thread_kind_participantId_key" ON "Thread"("kind", "participantId");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Message_recipientId_idx" ON "Message"("recipientId");

-- CreateIndex
CREATE INDEX "Message_threadId_idx" ON "Message"("threadId");

-- CreateIndex
CREATE INDEX "Assignment_enrollmentId_idx" ON "Assignment"("enrollmentId");

-- CreateIndex
CREATE INDEX "Assignment_createdBy_idx" ON "Assignment"("createdBy");

-- CreateIndex
CREATE INDEX "Assignment_dueDate_idx" ON "Assignment"("dueDate");

-- CreateIndex
CREATE INDEX "Assignment_status_idx" ON "Assignment"("status");

-- CreateIndex
CREATE INDEX "AssignmentSubmission_assignmentId_idx" ON "AssignmentSubmission"("assignmentId");

-- CreateIndex
CREATE INDEX "AssignmentSubmission_studentId_idx" ON "AssignmentSubmission"("studentId");

-- CreateIndex
CREATE INDEX "AssignmentSubmission_submittedAt_idx" ON "AssignmentSubmission"("submittedAt");

-- CreateIndex
CREATE INDEX "Grade_enrollmentId_idx" ON "Grade"("enrollmentId");

-- CreateIndex
CREATE INDEX "Grade_assignmentId_idx" ON "Grade"("assignmentId");

-- CreateIndex
CREATE INDEX "Grade_gradedBy_idx" ON "Grade"("gradedBy");

-- CreateIndex
CREATE INDEX "Grade_status_idx" ON "Grade"("status");

-- CreateIndex
CREATE INDEX "Grade_visibleToStudent_idx" ON "Grade"("visibleToStudent");

-- CreateIndex
CREATE INDEX "Grade_periodStart_periodEnd_idx" ON "Grade"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_category_idx" ON "Notification"("category");

-- CreateIndex
CREATE INDEX "Notification_entityType_entityId_idx" ON "Notification"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Notification_dedupeKey_idx" ON "Notification"("dedupeKey");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_userId_dedupeKey_key" ON "Notification"("userId", "dedupeKey");

-- CreateIndex
CREATE INDEX "Complaint_filedBy_idx" ON "Complaint"("filedBy");

-- CreateIndex
CREATE INDEX "Complaint_status_idx" ON "Complaint"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_tokenHash_idx" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_tokenFamily_idx" ON "RefreshToken"("tokenFamily");

-- CreateIndex
CREATE UNIQUE INDEX "Otp_otpHash_key" ON "Otp"("otpHash");

-- CreateIndex
CREATE INDEX "Otp_email_idx" ON "Otp"("email");

-- CreateIndex
CREATE INDEX "Otp_otpHash_idx" ON "Otp"("otpHash");

-- CreateIndex
CREATE INDEX "Otp_expiresAt_idx" ON "Otp"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PricingTier_gradeBandTier_key" ON "PricingTier"("gradeBandTier");

-- CreateIndex
CREATE INDEX "PricingTier_gradeBandTier_idx" ON "PricingTier"("gradeBandTier");

-- CreateIndex
CREATE INDEX "ExchangeRate_fromCurrency_idx" ON "ExchangeRate"("fromCurrency");

-- CreateIndex
CREATE INDEX "ExchangeRate_toCurrency_idx" ON "ExchangeRate"("toCurrency");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_fromCurrency_toCurrency_key" ON "ExchangeRate"("fromCurrency", "toCurrency");

-- CreateIndex
CREATE INDEX "QuizQuestion_assignmentId_idx" ON "QuizQuestion"("assignmentId");

-- CreateIndex
CREATE INDEX "QuizAttempt_assignmentId_idx" ON "QuizAttempt"("assignmentId");

-- CreateIndex
CREATE INDEX "QuizAttempt_studentId_idx" ON "QuizAttempt"("studentId");

-- CreateIndex
CREATE INDEX "QuizAttempt_status_idx" ON "QuizAttempt"("status");

-- CreateIndex
CREATE INDEX "QuizResponse_attemptId_idx" ON "QuizResponse"("attemptId");

-- CreateIndex
CREATE INDEX "QuizResponse_questionId_idx" ON "QuizResponse"("questionId");

-- CreateIndex
CREATE INDEX "AdminActionLog_adminId_idx" ON "AdminActionLog"("adminId");

-- CreateIndex
CREATE INDEX "AdminActionLog_action_idx" ON "AdminActionLog"("action");

-- CreateIndex
CREATE INDEX "AdminActionLog_targetType_targetId_idx" ON "AdminActionLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AdminActionLog_createdAt_idx" ON "AdminActionLog"("createdAt");

-- CreateIndex
CREATE INDEX "ScoredItem_tutorId_idx" ON "ScoredItem"("tutorId");

-- CreateIndex
CREATE INDEX "ScoredItem_studentId_idx" ON "ScoredItem"("studentId");

-- CreateIndex
CREATE INDEX "ScoredItem_enrollmentId_idx" ON "ScoredItem"("enrollmentId");

-- CreateIndex
CREATE INDEX "ScoredItem_gradeId_idx" ON "ScoredItem"("gradeId");

-- CreateIndex
CREATE INDEX "ScoredItem_type_idx" ON "ScoredItem"("type");

-- CreateIndex
CREATE INDEX "ScoredItem_sourceType_sourceId_idx" ON "ScoredItem"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "GradeComponent_gradeId_idx" ON "GradeComponent"("gradeId");

-- CreateIndex
CREATE INDEX "GradeComponent_scoredItemId_idx" ON "GradeComponent"("scoredItemId");

-- CreateIndex
CREATE INDEX "GradeEvent_gradeId_idx" ON "GradeEvent"("gradeId");

-- CreateIndex
CREATE INDEX "GradeEvent_action_idx" ON "GradeEvent"("action");

-- CreateIndex
CREATE INDEX "GradeEvent_createdAt_idx" ON "GradeEvent"("createdAt");

-- CreateIndex
CREATE INDEX "GradeEvent_userId_idx" ON "GradeEvent"("userId");

-- CreateIndex
CREATE INDEX "EnrollmentChangeRequest_enrollmentId_idx" ON "EnrollmentChangeRequest"("enrollmentId");

-- CreateIndex
CREATE INDEX "EnrollmentChangeRequest_requestedBy_idx" ON "EnrollmentChangeRequest"("requestedBy");

-- CreateIndex
CREATE INDEX "EnrollmentChangeRequest_status_idx" ON "EnrollmentChangeRequest"("status");

-- CreateIndex
CREATE INDEX "EnrollmentChangeRequest_createdAt_idx" ON "EnrollmentChangeRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorProfile" ADD CONSTRAINT "TutorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorApplication" ADD CONSTRAINT "TutorApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorApplicationSubject" ADD CONSTRAINT "TutorApplicationSubject_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "TutorApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorApplicationSubject" ADD CONSTRAINT "TutorApplicationSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorDocument" ADD CONSTRAINT "TutorDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "TutorApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorSubject" ADD CONSTRAINT "TutorSubject_tutorProfileId_fkey" FOREIGN KEY ("tutorProfileId") REFERENCES "TutorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorSubject" ADD CONSTRAINT "TutorSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectPrice" ADD CONSTRAINT "SubjectPrice_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectPrice" ADD CONSTRAINT "SubjectPrice_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionParticipant" ADD CONSTRAINT "SessionParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionParticipant" ADD CONSTRAINT "SessionParticipant_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressReport" ADD CONSTRAINT "ProgressReport_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressReport" ADD CONSTRAINT "ProgressReport_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_gradedBy_fkey" FOREIGN KEY ("gradedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_filedBy_fkey" FOREIGN KEY ("filedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingTier" ADD CONSTRAINT "PricingTier_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizResponse" ADD CONSTRAINT "QuizResponse_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizResponse" ADD CONSTRAINT "QuizResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoredItem" ADD CONSTRAINT "ScoredItem_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoredItem" ADD CONSTRAINT "ScoredItem_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoredItem" ADD CONSTRAINT "ScoredItem_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoredItem" ADD CONSTRAINT "ScoredItem_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeComponent" ADD CONSTRAINT "GradeComponent_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeComponent" ADD CONSTRAINT "GradeComponent_scoredItemId_fkey" FOREIGN KEY ("scoredItemId") REFERENCES "ScoredItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeEvent" ADD CONSTRAINT "GradeEvent_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeEvent" ADD CONSTRAINT "GradeEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentChangeRequest" ADD CONSTRAINT "EnrollmentChangeRequest_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentChangeRequest" ADD CONSTRAINT "EnrollmentChangeRequest_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentChangeRequest" ADD CONSTRAINT "EnrollmentChangeRequest_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

