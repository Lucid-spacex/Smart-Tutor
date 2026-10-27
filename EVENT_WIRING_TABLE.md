# Notification Event Wiring Table

This table documents all notification events that fire through the centralized `notify()` function.

| Event Type | File | Function | Recipients | Notes |
|------------|------|----------|------------|-------|
| CLASS_NEEDS_SCHEDULING | class-reminders.service.ts | sendClassReminders() | Tutor (enrollment.tutor.userId) | 24h and 2h before slot if no session |
| CLASS_UNSCHEDULED | class-reminders.service.ts | sendClassReminders() | ADMIN (recipientRole) | 1h before slot if still unscheduled |
| CLASS_MISSED | class-reminders.service.ts | sendClassReminders() | ADMIN (recipientRole) | When slot has passed with no session |
| TUTOR_FAILED_TO_SCHEDULE | class-reminders.service.ts | sendClassReminders() | Tutor (enrollment.tutor.userId) | When slot has passed with no session (tutor notification) |
| CLASS_REMINDER | class-reminders.service.ts | sendClassReminders() | Tutor (enrollment.tutor.userId) | 30 min before session |
| CHANGE_REQUEST_SUBMITTED | enrollment-change-requests.service.ts | createChangeRequest() | ADMIN (recipientRole) | When parent submits change request |
| CHANGE_REQUEST_APPROVED | enrollment-change-requests.service.ts | approveChangeRequest() | Parent, Student, Tutor | After approval with re-validation |
| CHANGE_REQUEST_REJECTED | enrollment-change-requests.service.ts | rejectChangeRequest() | Parent (requestedBy) | With rejection reason |
| SESSION_CREATED | sessions.service.ts | createSession() | ADMIN (recipientRole) | When tutor creates session |
| SESSION_CREATED | sessions.service.ts | createSession() | ADMIN (recipientRole) | When admin creates session |
| SESSION_RESCHEDULED | sessions.service.ts | rescheduleSession() | Parent, Student, Tutor | Session participants |
| SESSION_RESCHEDULED | sessions.service.ts | rescheduleSession() | ADMIN (recipientRole) | Admin notification of reschedule |
| SESSION_CANCELLED | sessions.service.ts | deleteSession() | Parent, Student, Tutor | Session participants |
| SESSION_CANCELLED | sessions.service.ts | deleteSession() | ADMIN (recipientRole) | Admin notification of cancellation |
| GRADE_SUBMITTED | grades.service.ts | submitGrade() | ADMIN (recipientRole) | When tutor submits grade for approval |
| GRADE_APPROVED | grades.service.ts | approveGrade() | Student, Parent | After admin approval |
| GRADE_REJECTED | grades.service.ts | rejectGrade() | Tutor (gradedBy) | Only tutor, not student/parent |
| GENERAL | complaints.service.ts | fileComplaint() | ADMIN (recipientRole) | New complaint filed |
| COMPLAINT_RESOLVED | complaints.service.ts | resolveComplaint() | Complaint filer (filedBy) | When admin resolves complaint |
| QUIZ_COMPLETED | quiz.service.ts | completeQuiz() | Tutor (enrollment.tutorId) | When student completes quiz |
| NEW_MESSAGE | messages.service.ts | sendMessage() | Recipient (recipientId) | New message received |
| GENERAL | messages.service.ts | sendMessage() | Recipient (recipientId) | Admin reply to parent/tutor |
| TUTOR_UNAVAILABLE | tutor.service.ts | updateAvailability() | ADMIN (recipientRole) | When tutor sets unavailable with active students |
| PRICE_UPDATED | pricing.service.ts | updateEnrollmentPrice() | Parent (enrollment.student.parentId) | Enrollment price override updated |
| PRICING_DRIFT_ALERT | pricing.service.ts | checkPricingDrift() | ADMIN (recipientRole) | Tier pricing drifts beyond threshold |
| PRICING_DRIFT_ALERT | pricing.service.ts | checkSubjectPriceDrift() | ADMIN (recipientRole) | Subject pricing drifts beyond threshold |
| ASSIGNMENT_POSTED | assignments.service.ts | createAssignment() | Student, Parent | New assignment created |
| ASSIGNMENT_SUBMITTED | assignments.service.ts | submitAssignment() | Tutor (enrollment.tutorId) | Student submitted assignment |
| ENROLLMENT_CREATED | enrollments.service.ts | createEnrollment() | ADMIN (recipientRole) | New enrollment (payment pending) |
| PAYMENT_SUCCESS | payments.service.ts | handleWebhook() | Parent (payment.parentId) | Payment successful |
| PAYMENT_EXPIRED | payments.service.ts | handleWebhook() | ADMIN (recipientRole) | EXPIRED → SUCCESS transition |
| PAYMENT_FAILED | payments.service.ts | handleWebhook() | Parent (payment.parentId) | Payment failed |
| PAYMENT_FAILED | payments.service.ts | handleWebhook() | ADMIN (recipientRole) | Admin notification of failed payment |
| PAYMENT_SUCCESS | payments.service.ts | updatePaymentStatus() | Parent (payment.parentId) | Manual payment success |
| USER_REGISTERED | auth.service.ts | register() | ADMIN (recipientRole) | New user registration (includes role) |
| USER_VERIFIED | auth.service.ts | verifyEmail() | ADMIN (recipientRole) | User email verified (includes role) |
| ASSIGNMENT_DUE_SOON | assignment-due.job.ts | execute() | Student, Parent | Assignment due soon (job) |
| ASSIGNMENT_OVERDUE | assignment-due.job.ts | execute() | Student, Parent | Assignment overdue (job) |
| PRICING_DRIFT_ALERT | exchange-rate-check.job.ts | execute() | Admins | Tier pricing drift (job) |
| PRICING_DRIFT_ALERT | exchange-rate-check.job.ts | execute() | Admins | Enrollment pricing drift (job) |

## Legacy notify() calls in notifications.service.ts

The following methods in `notifications.service.ts` still call the old `notify()` method which wraps `notificationCore.notify()`:
- notifyTutorAssigned() → TUTOR_ASSIGNED
- notifyStudentAssigned() → STUDENT_ASSIGNED
- notifyGradeApproved() → GRADE_APPROVED
- notifyGradeRejected() → GRADE_REJECTED
- notifyComplaintResolved() → COMPLAINT_RESOLVED
- notifySessionChange() → SESSION_CREATED, SESSION_RESCHEDULED, SESSION_CANCELLED
- notifySessionReminder() → SESSION_REMINDER
- notifyAssignmentPosted() → ASSIGNMENT_POSTED
- notifyAssignmentSubmitted() → ASSIGNMENT_SUBMITTED
- notifyAssignmentReviewed() → ASSIGNMENT_REVIEWED
- notifyGradeSubmitted() → GRADE_SUBMITTED
- notifyTutorApplication() → NEW_TUTOR_APPLICATION
- notifyTutorApproved() → TUTOR_APPROVED
- notifyTutorRejected() → TUTOR_REJECTED
- notifyPriceUpdated() → PRICE_UPDATED
- notifyPricingDriftAlert() → PRICING_DRIFT_ALERT
- notifyTutorUnavailable() → TUTOR_UNAVAILABLE
- notifyNewComplaint() → GENERAL
- notifyNewMessage() → NEW_MESSAGE
- notifyAccountSuspended() → ACCOUNT_SUSPENDED, ACCOUNT_REACTIVATED
- notifyPaymentSuccess() → PAYMENT_SUCCESS
- notifyPaymentFailed() → PAYMENT_FAILED
- notifyEnrollmentActivated() → ENROLLMENT_ACTIVATED
- notifyEnrollmentAwaitingTutor() → ENROLLMENT_AWAITING_TUTOR

**Note:** These legacy methods should be refactored to use `notificationCore.notify()` directly in future updates.
