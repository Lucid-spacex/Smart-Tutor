/**
 * @swagger
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
 *
 * /admin/enrollments/{id}/suggested-tutors:
 *   get:
 *     summary: Get suggested tutors for an enrollment
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
 *         description: List of suggested tutors with ranking
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   tutorId:
 *                     type: string
 *                     format: uuid
 *                   fullName:
 *                     type: string
 *                   subjects:
 *                     type: array
 *                     items:
 *                       type: string
 *                   availabilityStatus:
 *                     type: string
 *                     enum: [AVAILABLE, LIMITED, UNAVAILABLE]
 *                   currentStudents:
 *                     type: integer
 *                   maxStudents:
 *                     type: integer
 *                   hasCapacity:
 *                     type: boolean
 *                   rankingScore:
 *                     type: number
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *       404:
 *         description: Enrollment not found
 *
 * /admin/parents:
 *   get:
 *     summary: Get paginated parent directory with search
 *     tags: [Admin - Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, or phone
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, SUSPENDED]
 *         description: Filter by status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Paginated list of parents
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 parents:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       fullName:
 *                         type: string
 *                       email:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       status:
 *                         type: string
 *                       childrenCount:
 *                         type: integer
 *                       activeEnrollments:
 *                         type: integer
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *
 * /admin/parents/{id}:
 *   get:
 *     summary: Get detailed parent profile
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
 *         description: Detailed parent profile with children, enrollments, payments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 parent:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     fullName:
 *                       type: string
 *                     email:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     status:
 *                       type: string
 *                 children:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       fullName:
 *                         type: string
 *                       studentCode:
 *                         type: string
 *                       gradeLevel:
 *                         type: string
 *                       gradeBandTier:
 *                         type: string
 *                 enrollments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       subject:
 *                         type: string
 *                       tutor:
 *                         type: string
 *                       status:
 *                         type: string
 *                       effectivePriceNGN:
 *                         type: number
 *                       effectivePriceUSD:
 *                         type: number
 *                       priceSource:
 *                         type: string
 *                 payments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       amount:
 *                         type: number
 *                       currency:
 *                         type: string
 *                       status:
 *                         type: string
 *                       paidAt:
 *                         type: string
 *                         format: date-time
 *                 metrics:
 *                   type: object
 *                   properties:
 *                     childrenCount:
 *                       type: integer
 *                     activeEnrollments:
 *                       type: integer
 *                     pendingPaymentCount:
 *                       type: integer
 *                     totalPaidNGN:
 *                       type: number
 *                     totalPaidUSD:
 *                       type: number
 *                     complaintCount:
 *                       type: integer
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *       404:
 *         description: Parent not found
 *
 * /admin/payments:
 *   get:
 *     summary: Get paginated payment list with filters
 *     tags: [Admin - Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, SUCCESS, FAILED, REFUNDED, EXPIRED]
 *         description: Filter by status
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *           enum: [NGN, USD]
 *         description: Filter by currency
 *       - in: query
 *         name: provider
 *         schema:
 *           type: string
 *           enum: [PAYSTACK, STRIPE]
 *         description: Filter by provider
 *       - in: query
 *         name: parentId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by parent
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by start date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by end date
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by reference, parent name, or email
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Paginated payment list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 payments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Payment'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *
 * /admin/payments/{id}:
 *   get:
 *     summary: Get payment details with timeline
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
 *         description: Payment details with timeline and NGN equivalent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 payment:
 *                   $ref: '#/components/schemas/Payment'
 *                 timeline:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       status:
 *                         type: string
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                 enrollment:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     student:
 *                       type: string
 *                     subject:
 *                       type: string
 *                 ngnEquivalent:
 *                   type: number
 *                   nullable: true
 *                   description: NGN equivalent for USD payments
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *       404:
 *         description: Payment not found
 *
 * /admin/payments/summary:
 *   get:
 *     summary: Get payment summary and analytics
 *     tags: [Admin - Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by start date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by end date
 *     responses:
 *       200:
 *         description: Payment summary with revenue analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalRevenueNGN:
 *                   type: number
 *                 totalRevenueUSD:
 *                   type: number
 *                 paymentCount:
 *                   type: integer
 *                 successCount:
 *                   type: integer
 *                 failedCount:
 *                   type: integer
 *                 successRate:
 *                   type: number
 *                 dailyRevenue:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                       revenueNGN:
 *                         type: number
 *                       revenueUSD:
 *                         type: number
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *
 * /admin/subjects:
 *   get:
 *     summary: Get all subjects with per-grade pricing
 *     tags: [Admin - Pricing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of subjects with per-grade pricing
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
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   category:
 *                     type: string
 *                     enum: [CORE, ENRICHMENT, TEST_PREP]
 *                   isActive:
 *                     type: boolean
 *                   prices:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         gradeBandTier:
 *                           type: string
 *                           enum: [PRESCHOOL_TO_G1, G2_TO_G4, G5_TO_G8, G9_TO_G12]
 *                         yearlyPriceNGN:
 *                           type: number
 *                         yearlyPriceUSD:
 *                           type: number
 *                         isActive:
 *                           type: boolean
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *   post:
 *     summary: Create subject with per-grade pricing
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
 *               - name
 *               - category
 *               - prices
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [CORE, ENRICHMENT, TEST_PREP]
 *               prices:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - gradeBandTier
 *                     - yearlyPriceNGN
 *                     - yearlyPriceUSD
 *                   properties:
 *                     gradeBandTier:
 *                       type: string
 *                       enum: [PRESCHOOL_TO_G1, G2_TO_G4, G5_TO_G8, G9_TO_G12]
 *                     yearlyPriceNGN:
 *                       type: number
 *                     yearlyPriceUSD:
 *                       type: number
 *     responses:
 *       201:
 *         description: Subject created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Subject'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *
 * /admin/subjects/{id}:
 *   patch:
 *     summary: Update subject metadata
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
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [CORE, ENRICHMENT, TEST_PREP]
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Subject updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Subject'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *       404:
 *         description: Subject not found
 *   delete:
 *     summary: Delete subject (soft delete if has enrollments)
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
 *         description: Subject deleted successfully
 *       400:
 *         description: Cannot delete subject with active enrollments
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *       404:
 *         description: Subject not found
 *
 * /admin/subjects/{id}/prices/{gradeBandTier}:
 *   put:
 *     summary: Upsert subject price for grade band
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
 *             required:
 *               - yearlyPriceNGN
 *               - yearlyPriceUSD
 *             properties:
 *               yearlyPriceNGN:
 *                 type: number
 *               yearlyPriceUSD:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Subject price upserted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 gradeBandTier:
 *                   type: string
 *                 yearlyPriceNGN:
 *                   type: number
 *                 yearlyPriceUSD:
 *                   type: number
 *                 isActive:
 *                   type: boolean
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *       404:
 *         description: Subject not found
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
