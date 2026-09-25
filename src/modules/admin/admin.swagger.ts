/**
 * @swagger
 * /admin/pricing-tiers:
 *   get:
 *     summary: Get all pricing tiers with drift information
 *     tags: [Admin - Pricing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pricing tiers with drift analysis
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   gradeBandTier:
 *                     type: string
 *                     enum: [PRESCHOOL_TO_G1, G2_TO_G4, G5_TO_G8, G9_TO_G12]
 *                   yearlyPriceNGN:
 *                     type: number
 *                   yearlyPriceUSD:
 *                     type: number
 *                   impliedRate:
 *                     type: number
 *                   currentMarketRate:
 *                     type: number
 *                   driftPercentage:
 *                     type: number
 *                   needsReview:
 *                     type: boolean
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *   patch:
 *     summary: Update pricing tier
 *     tags: [Admin - Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: gradeBandTier
 *         required: true
 *         schema:
 *           type: string
 *           enum: [PRESCHOOL_TO_G1, G2_TO_G4, G5_TO_G8, G9_TO_G12]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               yearlyPriceNGN:
 *                 type: number
 *               yearlyPriceUSD:
 *                 type: number
 *     responses:
 *       200:
 *         description: Updated pricing tier
 *
 * /admin/tutors/pending:
 *   get:
 *     summary: Get pending tutor vetting requests
 *     tags: [Admin - Pricing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending tutors
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TutorProfile'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *
 * /admin/tutors:
 *   get:
 *     summary: Get all tutors with optional filters
 *     tags: [Admin - Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED]
 *         description: Filter by vetting status
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *         description: Filter by subject
 *     responses:
 *       200:
 *         description: List of tutors
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TutorProfile'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *
 * /admin/tutors/{id}/vetting:
 *   patch:
 *     summary: Update tutor vetting status
 *     tags: [Admin - Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vettingStatus
 *             properties:
 *               vettingStatus:
 *                 type: string
 *                 enum: [APPROVED, REJECTED]
 *               rejectionReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tutor vetting updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TutorProfile'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *       404:
 *         description: Tutor not found
 *
 * /admin/enrollments/unmatched:
 *   get:
 *     summary: Get unmatched enrollments awaiting tutor assignment
 *     tags: [Admin - Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: includeUnpaid
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include unpaid enrollments
 *     responses:
 *       200:
 *         description: List of unmatched enrollments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Enrollment'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *
 * /admin/enrollments/{id}/assign-tutor:
 *   patch:
 *     summary: Assign tutor to enrollment
 *     tags: [Admin - Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tutorId
 *             properties:
 *               tutorId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Tutor assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Enrollment'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *       404:
 *         description: Enrollment not found
 *
 * /admin/payments/failed:
 *   get:
 *     summary: Get failed payment transactions
 *     tags: [Admin - Pricing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of failed payments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   enrollmentId:
 *                     type: string
 *                     format: uuid
 *                   amount:
 *                     type: number
 *                   currency:
 *                     type: string
 *                   status:
 *                     type: string
 *                   failureReason:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *
 * /admin/reports/overview:
 *   get:
 *     summary: Get platform overview report
 *     tags: [Admin - Pricing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overview report data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalUsers:
 *                   type: integer
 *                 totalEnrollments:
 *                   type: integer
 *                 totalRevenue:
 *                   type: number
 *                 activeTutors:
 *                   type: integer
 *                 pendingVetting:
 *                   type: integer
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *
 * /admin/students:
 *   get:
 *     summary: Get all students with optional filters
 *     tags: [Admin - Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: gradeBand
 *         schema:
 *           type: string
 *         description: Filter by grade band
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of students
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Student'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *
 * /admin/students/{id}/regenerate-pin:
 *   patch:
 *     summary: Regenerate student login PIN
 *     tags: [Admin - Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: PIN regenerated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 studentId:
 *                   type: string
 *                 newPin:
 *                   type: string
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *       404:
 *         description: Student not found
 *
 * /admin/users/suspended:
 *   get:
 *     summary: Get all suspended users
 *     tags: [Admin - Pricing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of suspended users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *
 * /admin/users/{id}/reactivate:
 *   patch:
 *     summary: Reactivate suspended user
 *     tags: [Admin - Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User reactivated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *       404:
 *         description: User not found
 *
 * /admin/grades/pending:
 *   get:
 *     summary: Get pending grades awaiting approval
 *     tags: [Admin - Pricing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending grades
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Grade'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *
 * /admin/grades/{id}/approve:
 *   patch:
 *     summary: Approve pending grade
 *     tags: [Admin - Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Grade approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Grade'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *       404:
 *         description: Grade not found
 *
 * /admin/grades/{id}/reject:
 *   patch:
 *     summary: Reject pending grade
 *     tags: [Admin - Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Grade rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Grade'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *       404:
 *         description: Grade not found
 *
 * /admin/complaints/{id}/resolve:
 *   patch:
 *     summary: Resolve complaint
 *     tags: [Admin - Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reply
 *             properties:
 *               reply:
 *                 type: string
 *     responses:
 *       200:
 *         description: Complaint resolved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Complaint'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *       404:
 *         description: Complaint not found
 */

/**
 * @swagger
 * /admin/enrollments/{id}/pricing:
 *   get:
 *     summary: Get enrollment pricing with effective price and source
 *     tags: [Admin - Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Enrollment pricing details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 enrollmentId:
 *                   type: string
 *                 studentName:
 *                   type: string
 *                 studentCode:
 *                   type: string
 *                 subject:
 *                   type: string
 *                 gradeBandTier:
 *                   type: string
 *                 effectivePriceNGN:
 *                   type: number
 *                 effectivePriceUSD:
 *                   type: number
 *                 priceSource:
 *                   type: string
 *                   enum: [override, tier default]
 *                 overrideNGN:
 *                   type: number
 *                   nullable: true
 *                 overrideUSD:
 *                   type: number
 *                   nullable: true
 *                 billingFrequency:
 *                   type: string
 *   patch:
 *     summary: Set or clear enrollment pricing override
 *     tags: [Admin - Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               yearlyPriceNGN:
 *                 type: number
 *                 nullable: true
 *               yearlyPriceUSD:
 *                 type: number
 *                 nullable: true
 *               billingFrequency:
 *                 type: string
 *                 enum: [WEEKLY, MONTHLY, YEARLY]
 *     responses:
 *       200:
 *         description: Updated enrollment
 */

/**
 * @swagger
 * /admin/exchange-rate/current:
 *   get:
 *     summary: Get current exchange rate
 *     tags: [Admin - Pricing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current exchange rate
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 fromCurrency:
 *                   type: string
 *                 toCurrency:
 *                   type: string
 *                 rate:
 *                   type: number
 *                 fetchedAt:
 *                   type: string
 *                   format: date-time
 *
 * /admin/sessions:
 *   post:
 *     summary: Create session with multiple participants (admin only)
 *     tags: [Admin - Pricing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - enrollmentIds
 *               - scheduledAt
 *               - durationMinutes
 *             properties:
 *               enrollmentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Array of enrollment IDs for participants
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *               durationMinutes:
 *                 type: integer
 *                 minimum: 15
 *                 maximum: 180
 *     responses:
 *       201:
 *         description: Session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Session'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *
 * /admin/sessions/{id}/reschedule:
 *   patch:
 *     summary: Reschedule session (admin only)
 *     tags: [Admin - Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - scheduledAt
 *             properties:
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *               notifyParticipants:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Session rescheduled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Session'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *       404:
 *         description: Session not found
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Enrollment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         studentId:
 *           type: string
 *           format: uuid
 *         tutorId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         subjectId:
 *           type: string
 *           format: uuid
 *         status:
 *           type: string
 *           enum: [PENDING, ACTIVE, PAUSED, COMPLETED]
 *         billingFrequency:
 *           type: string
 *           enum: [WEEKLY, MONTHLY, YEARLY]
 *         yearlyPriceNGN:
 *           type: number
 *         yearlyPriceUSD:
 *           type: number
 *         overrideNGN:
 *           type: number
 *           nullable: true
 *         overrideUSD:
 *           type: number
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     Session:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         enrollmentId:
 *           type: string
 *           format: uuid
 *         scheduledAt:
 *           type: string
 *           format: date-time
 *         durationMinutes:
 *           type: integer
 *         zoomLink:
 *           type: string
 *           nullable: true
 *         zoomMeetingId:
 *           type: string
 *           nullable: true
 *         recordingUrl:
 *           type: string
 *           nullable: true
 *         recordingStatus:
 *           type: string
 *           enum: [NONE, PROCESSING, AVAILABLE, FAILED]
 *         status:
 *           type: string
 *           enum: [SCHEDULED, COMPLETED, MISSED, CANCELLED]
 *         tutorNotes:
 *           type: string
 *           nullable: true
 *         homeworkAssigned:
 *           type: string
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *     Grade:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         studentId:
 *           type: string
 *           format: uuid
 *         assignmentId:
 *           type: string
 *           format: uuid
 *         tutorId:
 *           type: string
 *           format: uuid
 *         score:
 *           type: number
 *         maxScore:
 *           type: number
 *         feedback:
 *           type: string
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED]
 *         approvedBy:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         rejectionReason:
 *           type: string
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *     Complaint:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         userRole:
 *           type: string
 *           enum: [PARENT, TUTOR, STUDENT]
 *         subject:
 *           type: string
 *         description:
 *           type: string
 *         status:
 *           type: string
 *           enum: [OPEN, IN_PROGRESS, RESOLVED]
 *         reply:
 *           type: string
 *           nullable: true
 *         resolvedBy:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
