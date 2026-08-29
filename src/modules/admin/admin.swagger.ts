/**
 * @swagger
 * /admin/tutors/pending:
 *   get:
 *     summary: Get tutors pending vetting
 *     tags: [Admin]
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
 *                 type: object
 *                 properties:
 *                   user:
 *                     $ref: '#/components/schemas/User'
 *                   tutorProfile:
 *                     $ref: '#/components/schemas/TutorProfile'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */

/**
 * @swagger
 * /admin/tutors:
 *   get:
 *     summary: Get all tutors with full info (admin-facing)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [APPROVED, PENDING_VETTING, REJECTED, SUSPENDED]
 *         description: Filter by user status (defaults to APPROVED for assign-tutor use case)
 *     responses:
 *       200:
 *         description: List of tutors with user and profile info
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   user:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       fullName:
 *                         type: string
 *                       email:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [UNVERIFIED, ACTIVE, PENDING_VETTING, APPROVED, REJECTED, SUSPENDED]
 *                   tutorProfile:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       subjects:
 *                         type: array
 *                         items:
 *                           type: string
 *                       bio:
 *                         type: string
 *                       hourlyRate:
 *                         type: number
 *                         format: decimal
 *                       vettingStatus:
 *                         type: string
 *                         enum: [PENDING, APPROVED, REJECTED]
 *                       availability:
 *                         type: object
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */

/**
 * @swagger
 * /admin/tutors/{id}/vetting:
 *   patch:
 *     summary: Approve or reject tutor vetting
 *     tags: [Admin]
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
 *     responses:
 *       200:
 *         description: Tutor vetting status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TutorProfile'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Tutor not found
 */

/**
 * @swagger
 * /admin/enrollments/unmatched:
 *   get:
 *     summary: Get enrollments without assigned tutors
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
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
 *         description: Not authorized
 */

/**
 * @swagger
 * /admin/enrollments/{id}/assign-tutor:
 *   patch:
 *     summary: Assign a tutor to an enrollment
 *     tags: [Admin]
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
 *         description: Not authorized
 *       404:
 *         description: Enrollment or tutor not found
 */

/**
 * @swagger
 * /admin/payments/failed:
 *   get:
 *     summary: Get failed payments
 *     tags: [Admin]
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
 *                 $ref: '#/components/schemas/Payment'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */

/**
 * @swagger
 * /admin/reports/overview:
 *   get:
 *     summary: Get admin overview report
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overview statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activeStudents:
 *                   type: integer
 *                 activeTutors:
 *                   type: integer
 *                 revenueThisMonth:
 *                   type: number
 *                   format: decimal
 *                 totalEnrollments:
 *                   type: integer
 *                 pendingVetting:
 *                   type: integer
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */

/**
 * @swagger
 * /admin/students:
 *   get:
 *     summary: Get all students with info (admin-facing)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: parentId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter to one parent's children
 *     responses:
 *       200:
 *         description: List of students with parent info
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
 *                   parentId:
 *                     type: string
 *                     format: uuid
 *                   parentName:
 *                     type: string
 *                   fullName:
 *                     type: string
 *                   dateOfBirth:
 *                     type: string
 *                     format: date
 *                   gradeLevel:
 *                     type: string
 *                   school:
 *                     type: string
 *                   notes:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   parent:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       fullName:
 *                         type: string
 *                       email:
 *                         type: string
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
