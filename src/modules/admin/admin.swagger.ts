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
 *     summary: Get all tutors with optional filters and pagination
 *     tags: [Admin - Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [APPROVED, PENDING_VETTING, REJECTED, SUSPENDED]
 *         description: Filter by user status
 *       - in: query
 *         name: applicationStatus
 *         schema:
 *           type: string
 *           enum: [DRAFT, SUBMITTED, APPROVED, REJECTED]
 *         description: Filter by application status
 *       - in: query
 *         name: vettingStatus
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED]
 *         description: Filter by vetting status
 *       - in: query
 *         name: availabilityStatus
 *         schema:
 *           type: string
 *           enum: [AVAILABLE, LIMITED, UNAVAILABLE]
 *         description: Filter by availability status
 *       - in: query
 *         name: subjectId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by subject
 *       - in: query
 *         name: hasCapacity
 *         schema:
 *           type: boolean
 *         description: Only return tutors with capacity
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
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
 *           default: 20
 *           maximum: 100
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Paginated list of tutors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *                       middleName:
 *                         type: string
 *                       fullName:
 *                         type: string
 *                       email:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       address:
 *                         type: string
 *                       status:
 *                         type: string
 *                       profilePicture:
 *                         type: string
 *                       timezone:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                       tutorProfile:
 *                         type: object
 *                         properties:
 *                           bio:
 *                             type: string
 *                           hourlyRate:
 *                             type: number
 *                           availability:
 *                             type: object
 *                           availabilityStatus:
 *                             type: string
 *                           maxStudents:
 *                             type: integer
 *                           vettingStatus:
 *                             type: string
 *                           tutorSubjects:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 subject:
 *                                   type: object
 *                                   properties:
 *                                     id:
 *                                       type: string
 *                                     name:
 *                                       type: string
 *                                     category:
 *                                       type: string
 *                       tutorApplication:
 *                         type: object
 *                         properties:
 *                           status:
 *                             type: string
 *                           submittedAt:
 *                             type: string
 *                           reviewedAt:
 *                             type: string
 *                       currentStudentCount:
 *                         type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 total:
 *                   type: integer
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *
 * /admin/tutors/{id}:
 *   get:
 *     summary: Get detailed tutor profile with full application, profile, and metrics
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
 *         description: Detailed tutor profile with full data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     middleName:
 *                       type: string
 *                     fullName:
 *                       type: string
 *                     email:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     address:
 *                       type: string
 *                     status:
 *                       type: string
 *                     profilePictureUrl:
 *                       type: string
 *                     timezone:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                 application:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     birthDay:
 *                       type: integer
 *                     birthMonth:
 *                       type: integer
 *                     country:
 *                       type: string
 *                     city:
 *                       type: string
 *                     highestQualification:
 *                       type: string
 *                     subjects:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           category:
 *                             type: string
 *                     levels:
 *                       type: array
 *                       items:
 *                         type: string
 *                     yearsOfExperience:
 *                       type: integer
 *                     whyTeach:
 *                       type: string
 *                     howHeard:
 *                       type: string
 *                     aboutYou:
 *                       type: array
 *                       items:
 *                         type: string
 *                     documents:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           mimeType:
 *                             type: string
 *                           sizeBytes:
 *                             type: integer
 *                           url:
 *                             type: string
 *                           expiresAt:
 *                             type: string
 *                     submittedAt:
 *                       type: string
 *                       format: date-time
 *                     reviewedAt:
 *                       type: string
 *                       format: date-time
 *                     reviewedBy:
 *                       type: string
 *                     rejectionReason:
 *                       type: string
 *                 profile:
 *                   type: object
 *                   properties:
 *                     bio:
 *                       type: string
 *                     hourlyRate:
 *                       type: number
 *                     availability:
 *                       type: object
 *                     availabilityStatus:
 *                       type: string
 *                     maxStudents:
 *                       type: integer
 *                     statusNote:
 *                       type: string
 *                     statusUpdatedAt:
 *                       type: string
 *                       format: date-time
 *                     currentStudentCount:
 *                       type: integer
 *                     vettingStatus:
 *                       type: string
 *                     subjects:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           category:
 *                             type: string
 *                 metrics:
 *                   type: object
 *                   properties:
 *                     studentsCount:
 *                       type: integer
 *                     sessionsCompleted:
 *                       type: integer
 *                     sessionsMissed:
 *                       type: integer
 *                     sessionsCancelled:
 *                       type: integer
 *                     avgStudentGradePercentage:
 *                       type: number
 *                     avgStudentAttendanceRate:
 *                       type: number
 *                     reportsSubmitted:
 *                       type: integer
 *                     assignmentsCreated:
 *                       type: integer
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *       404:
 *         description: Tutor not found
 *                   format: uuid
 *                 fullName:
 *                   type: string
 *                 email:
 *                   type: string
 *                 phone:
 *                   type: string
 *                 status:
 *                   type: string
 *                 tutorProfile:
 *                   type: object
 *                   properties:
 *                     bio:
 *                       type: string
 *                     hourlyRate:
 *                       type: number
 *                     credentialsUrl:
 *                       type: string
 *                     availability:
 *                       type: object
 *                     availabilityStatus:
 *                       type: string
 *                       enum: [AVAILABLE, LIMITED, UNAVAILABLE]
 *                     maxStudents:
 *                       type: integer
 *                     tutorSubjects:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           subject:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                 metrics:
 *                   type: object
 *                   properties:
 *                     studentsCount:
 *                       type: integer
 *                     sessionsCompleted:
 *                       type: integer
 *                     sessionsMissed:
 *                       type: integer
 *                     sessionsCancelled:
 *                       type: integer
 *                     avgStudentGradePercentage:
 *                       type: number
 *                     avgStudentAttendanceRate:
 *                       type: number
 *                     reportsSubmitted:
 *                       type: integer
 *                     assignmentsCreated:
 *                       type: integer
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *       404:
 *         description: Tutor not found
 *
 * /admin/tutors/{id}/students:
 *   get:
 *     summary: Get paginated list of tutor's students
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
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Paginated list of students
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       enrollmentId:
 *                         type: string
 *                         format: uuid
 *                       student:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           fullName:
 *                             type: string
 *                           gradeLevel:
 *                             type: string
 *                           gradeBandTier:
 *                             type: string
 *                       subject:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           name:
 *                             type: string
 *                       sessionFrequency:
 *                         type: string
 *                       startDate:
 *                         type: string
 *                         format: date
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 total:
 *                   type: integer
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *
 * /admin/tutors/{id}/sessions:
 *   get:
 *     summary: Get paginated list of tutor's sessions with filters
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [SCHEDULED, COMPLETED, MISSED, CANCELLED]
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Paginated list of sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Session'
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 total:
 *                   type: integer
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *
 * /admin/tutors/{id}/grades:
 *   get:
 *     summary: Get paginated list of tutor's grades
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING_APPROVAL, APPROVED, REJECTED]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Paginated list of grades
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Grade'
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 total:
 *                   type: integer
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *
 * /admin/tutors/{id}/progress-reports:
 *   get:
 *     summary: Get paginated list of tutor's progress reports
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
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Paginated list of progress reports
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProgressReport'
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 total:
 *                   type: integer
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *
 * /admin/tutors/{id}/vetting:
 *   patch:
 *     summary: Update tutor vetting status (approve or reject)
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
 *                 description: Vet status to set
 *               rejectionReason:
 *                 type: string
 *                 description: Required when vettingStatus is REJECTED
 *     responses:
 *       200:
 *         description: Tutor vetting updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 fullName:
 *                   type: string
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *                 status:
 *                   type: string
 *                 tutorProfile:
 *                   type: object
 *                   properties:
 *                     vettingStatus:
 *                       type: string
 *                       enum: [PENDING, APPROVED, REJECTED]
 *                 tutorApplication:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     rejectionReason:
 *                       type: string
 *       400:
 *         description: Validation error - rejectionReason required when rejecting
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
 *                 totalParents:
 *                   type: integer
 *                 totalStudents:
 *                   type: integer
 *                 totalTutors:
 *                   type: integer
 *                 pendingTutors:
 *                   type: integer
 *                 activeEnrollments:
 *                   type: integer
 *                 pendingPaymentEnrollments:
 *                   type: integer
 *                 unmatchedEnrollments:
 *                   type: integer
 *                 totalRevenueNGN:
 *                   type: number
 *                 revenueThisMonthNGN:
 *                   type: number
 *                 totalRevenue:
 *                   type: number
 *                   description: Deprecated alias of totalRevenueNGN
 *                 failedPayments:
 *                   type: integer
 *                 pendingGrades:
 *                   type: integer
 *                 openComplaints:
 *                   type: integer
 *                 suspendedUsers:
 *                   type: integer
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *
 * /admin/students:
 *   get:
 *     summary: Get paginated list of students with optional filters
 *     tags: [Admin - Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or student code
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [UNVERIFIED, ACTIVE, PENDING_VETTING, APPROVED, REJECTED, SUSPENDED]
 *         description: Filter by user status
 *       - in: query
 *         name: gradeBandTier
 *         schema:
 *           type: string
 *           enum: [PRESCHOOL_TO_G1, G2_TO_G4, G5_TO_G8, G9_TO_G12]
 *         description: Filter by grade band tier
 *       - in: query
 *         name: enrolled
 *         schema:
 *           type: boolean
 *         description: Filter by enrollment status
 *       - in: query
 *         name: assigned
 *         schema:
 *           type: boolean
 *         description: Filter by tutor assignment status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Paginated list of students
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       parentId:
 *                         type: string
 *                         format: uuid
 *                       parentName:
 *                         type: string
 *                       fullName:
 *                         type: string
 *                       dateOfBirth:
 *                         type: string
 *                         format: date
 *                       gradeLevel:
 *                         type: string
 *                       gradeBandTier:
 *                         type: string
 *                       school:
 *                         type: string
 *                       notes:
 *                         type: string
 *                       status:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 total:
 *                   type: integer
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *
 * /admin/students/{id}:
 *   get:
 *     summary: Get detailed student profile with full data
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
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, quarter, year, all]
 *           default: month
 *         description: Performance data period
 *     responses:
 *       200:
 *         description: Detailed student profile with all related data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 student:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     fullName:
 *                       type: string
 *                     dateOfBirth:
 *                       type: string
 *                       format: date
 *                     gender:
 *                       type: string
 *                     actualGrade:
 *                       type: string
 *                     gradeLevel:
 *                       type: string
 *                     gradeBandTier:
 *                       type: string
 *                     school:
 *                       type: string
 *                     notes:
 *                       type: string
 *                     email:
 *                       type: string
 *                     preferredStartDate:
 *                       type: string
 *                       format: date
 *                     timezone:
 *                       type: string
 *                     profilePictureUrl:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     status:
 *                       type: string
 *                 parent:
 *                   type: object
 *                   description: Parent info without contact details for security
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     fullName:
 *                       type: string
 *                     profilePictureUrl:
 *                       type: string
 *                 tutors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       fullName:
 *                         type: string
 *                       profilePicture:
 *                         type: string
 *                       subjects:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               format: uuid
 *                             name:
 *                               type: string
 *                             category:
 *                               type: string
 *                 enrollments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       subject:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                       status:
 *                         type: string
 *                       tutor:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           fullName:
 *                             type: string
 *                           profilePicture:
 *                             type: string
 *                           subjects:
 *                             type: array
 *                             items:
 *                               type: object
 *                       sessionFrequency:
 *                         type: string
 *                       availableDays:
 *                         type: array
 *                         items:
 *                           type: string
 *                       preferredStartHour:
 *                         type: integer
 *                       preferredEndHour:
 *                         type: integer
 *                       billingFrequency:
 *                         type: string
 *                       effectivePriceNGN:
 *                         type: number
 *                       effectivePriceUSD:
 *                         type: number
 *                       priceSource:
 *                         type: string
 *                       paymentStatus:
 *                         type: string
 *                 sessions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       scheduledAt:
 *                         type: string
 *                         format: date-time
 *                       durationMinutes:
 *                         type: integer
 *                       status:
 *                         type: string
 *                       zoomLink:
 *                         type: string
 *                       zoomMeetingId:
 *                         type: string
 *                       recordingUrl:
 *                         type: string
 *                       recordingStatus:
 *                         type: string
 *                       tutorNotes:
 *                         type: string
 *                       homeworkAssigned:
 *                         type: string
 *                       tutor:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           fullName:
 *                             type: string
 *                 attendance:
 *                   type: object
 *                   properties:
 *                     attended:
 *                       type: integer
 *                     missed:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     recent:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date-time
 *                           attended:
 *                             type: boolean
 *                           status:
 *                             type: string
 *                 grades:
 *                   type: object
 *                   properties:
 *                     averagePercentage:
 *                       type: number
 *                       nullable: true
 *                     approvedCount:
 *                       type: integer
 *                     pendingCount:
 *                       type: integer
 *                     recent:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           score:
 *                             type: number
 *                           maxScore:
 *                             type: number
 *                           percentage:
 *                             type: number
 *                           status:
 *                             type: string
 *                           subject:
 *                             type: string
 *                           assignmentTitle:
 *                             type: string
 *                           grader:
 *                             type: string
 *                           approvedAt:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                 assignments:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     completed:
 *                       type: integer
 *                     pending:
 *                       type: integer
 *                     recent:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           type:
 *                             type: string
 *                           dueDate:
 *                             type: string
 *                           status:
 *                             type: string
 *                           hasSubmission:
 *                             type: boolean
 *                           lastSubmittedAt:
 *                             type: string
 *                 progressReports:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProgressReport'
 *                 performance:
 *                   type: object
 *                   description: Performance metrics for the specified period
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *       404:
 *         description: Student not found
 *
 * /admin/students/{id}/enrollments:
 *   get:
 *     summary: Get paginated list of student's enrollments
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
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Paginated list of enrollments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Enrollment'
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 total:
 *                   type: integer
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *
 * /admin/students/{id}/grades:
 *   get:
 *     summary: Get paginated list of student's grades (includes pending)
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
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Paginated list of grades
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Grade'
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 total:
 *                   type: integer
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *
 * /admin/students/{id}/attendance:
 *   get:
 *     summary: Get paginated list of student's attendance records
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
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Paginated list of sessions with attendance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Session'
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 total:
 *                   type: integer
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *
 * /admin/students/{id}/sessions:
 *   get:
 *     summary: Get paginated list of student's sessions
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
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Paginated list of sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Session'
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 total:
 *                   type: integer
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *
 * /admin/students/{id}/assignments:
 *   get:
 *     summary: Get paginated list of student's assignments with submission status
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
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Paginated list of assignments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Assignment'
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 total:
 *                   type: integer
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *
 * /admin/students/{id}/progress-reports:
 *   get:
 *     summary: Get paginated list of student's progress reports
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
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Paginated list of progress reports
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProgressReport'
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 total:
 *                   type: integer
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
 *     summary: Get paginated list of suspended users
 *     tags: [Admin - Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Paginated list of suspended users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 total:
 *                   type: integer
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *
 * /admin/users/{id}/suspend:
 *   patch:
 *     summary: Suspend user account
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
 *                 description: Reason for suspension
 *     responses:
 *       200:
 *         description: User suspended successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 affectedEnrollments:
 *                   type: array
 *                   description: For tutors only - active enrollments that need reassignment
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       student:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           fullName:
 *                             type: string
 *                       subject:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *       404:
 *         description: User not found
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
 *                 data:
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
 *                       pendingPaymentCount:
 *                         type: integer
 *                       totalPaidNGN:
 *                         type: number
 *                       totalPaidUSD:
 *                         type: number
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 total:
 *                   type: integer
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
 *                         description: Calculated effective price in NGN
 *                       effectivePriceUSD:
 *                         type: number
 *                         description: Calculated effective price in USD
 *                       priceSource:
 *                         type: string
 *                         enum: [subject_price, custom_override, error]
 *                         description: Source of the pricing - subject_price (default), custom_override (enrollment-specific), or error (no pricing found)
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
 *           enum: [PAYSTACK]
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
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Payment'
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 total:
 *                   type: integer
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
 * /admin/payments/{id}/note:
 *   patch:
 *     summary: Add admin note to payment
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
 *               - note
 *             properties:
 *               note:
 *                 type: string
 *                 description: Admin-only note for internal tracking
 *     responses:
 *       200:
 *         description: Payment note added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *       404:
 *         description: Payment not found
 *
 * /admin/payments/{id}/reverify:
 *   post:
 *     summary: Reverify payment with Paystack API
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
 *         description: Payment verified and enrollment activated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Payment is not in PENDING status or has no provider reference
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Paystack API error or verification failed
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
