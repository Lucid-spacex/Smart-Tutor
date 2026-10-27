/**
 * @swagger
 * tags:
 *   name: Enrollment Change Requests
 *   description: Parent-initiated enrollment change requests with admin approval workflow
 */

/**
 * @swagger
 * /enrollments/{id}/change-requests:
 *   post:
 *     summary: Create an enrollment change request (PARENT only)
 *     description: Parents can request changes to enrollment settings (frequency, schedule, pricing). The request must be approved by an admin before taking effect.
 *     tags: [Enrollment Change Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the enrollment (used in URL, but enrollmentId also required in body)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - enrollmentId
 *               - requestedValues
 *             properties:
 *               enrollmentId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the enrollment to change
 *               requestedValues:
 *                 type: object
 *                 description: Proposed new values for enrollment fields
 *                 properties:
 *                   startDate:
 *                     type: string
 *                     format: date
 *                     description: New start date
 *                   endDate:
 *                     type: string
 *                     format: date
 *                     description: New end date
 *                   availableDays:
 *                     type: array
 *                     items:
 *                       type: string
 *                       enum: [MON, TUE, WED, THU, FRI, SAT, SUN]
 *                     description: New available days
 *                   preferredStartHour:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 23
 *                     description: New preferred start hour
 *                   preferredEndHour:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 23
 *                     description: New preferred end hour
 *                   sessionFrequency:
 *                     type: string
 *                     enum: [TWICE_WEEKLY, THRICE_WEEKLY, FIVE_TIMES_WEEKLY]
 *                     description: New session frequency
 *     responses:
 *       201:
 *         description: Change request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 enrollmentId:
 *                   type: string
 *                   format: uuid
 *                 parentId:
 *                   type: string
 *                   format: uuid
 *                 status:
 *                   type: string
 *                   enum: [PENDING, APPROVED, REJECTED, CANCELLED]
 *                 requestedValues:
 *                   type: object
 *                 previousSnapshot:
 *                   type: object
 *                   description: Original values before change
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Validation error or another PENDING request exists
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - not the parent of this enrollment
 *       404:
 *         description: Enrollment not found
 *   get:
 *     summary: List change requests for an enrollment (PARENT only)
 *     description: Parents can view all change requests for their child's enrollment.
 *     tags: [Enrollment Change Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the enrollment
 *     responses:
 *       200:
 *         description: List of change requests
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
 *                   status:
 *                     type: string
 *                   requestedValues:
 *                     type: object
 *                   previousSnapshot:
 *                     type: object
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */

/**
 * @swagger
 * /change-requests/{id}/cancel:
 *   patch:
 *     summary: Cancel a pending change request (PARENT only)
 *     description: Parents can cancel their own pending change requests. Cannot cancel approved or rejected requests.
 *     tags: [Enrollment Change Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the change request
 *     responses:
 *       200:
 *         description: Change request cancelled successfully
 *       400:
 *         description: Request cannot be cancelled (not PENDING)
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - not the request creator
 *       404:
 *         description: Change request not found
 */

/**
 * @swagger
 * /admin/change-requests:
 *   get:
 *     summary: List all change requests (ADMIN only)
 *     description: Admins can view all change requests with optional status filtering and pagination.
 *     tags: [Enrollment Change Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, CANCELLED]
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
 *           default: 20
 *           maximum: 100
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Paginated list of change requests
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
 *                       enrollmentId:
 *                         type: string
 *                         format: uuid
 *                       enrollment:
 *                         type: object
 *                         description: Enrollment details with student and subject info
 *                       parentId:
 *                         type: string
 *                         format: uuid
 *                       parent:
 *                         type: object
 *                         description: Parent details
 *                       status:
 *                         type: string
 *                       requestedValues:
 *                         type: object
 *                       previousSnapshot:
 *                         type: object
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
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
 *         description: Not authorized - admin only
 */

/**
 * @swagger
 * /admin/change-requests/{id}:
 *   get:
 *     summary: Get change request details (ADMIN only)
 *     description: Admins can view full details of a change request including enrollment and parent information.
 *     tags: [Enrollment Change Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the change request
 *     responses:
 *       200:
 *         description: Change request details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 enrollmentId:
 *                   type: string
 *                   format: uuid
 *                 enrollment:
 *                   type: object
 *                   description: Full enrollment details with student, subject, tutor
 *                 parentId:
 *                   type: string
 *                   format: uuid
 *                 parent:
 *                   type: object
 *                   description: Parent details
 *                 status:
 *                   type: string
 *                 requestedValues:
 *                   type: object
 *                 previousSnapshot:
 *                   type: object
 *                 rejectionReason:
 *                   type: string
 *                   nullable: true
 *                 approvedBy:
 *                   type: string
 *                   format: uuid
 *                   nullable: true
 *                 approvedAt:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - admin only
 *       404:
 *         description: Change request not found
 */

/**
 * @swagger
 * /admin/change-requests/{id}/approve:
 *   patch:
 *     summary: Approve a change request (ADMIN only)
 *     description: Admins can approve pending change requests. Approval applies the requested changes to the enrollment in a single transaction and flags affected sessions. Notifies parent, student, and tutor.
 *     tags: [Enrollment Change Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the change request
 *     responses:
 *       200:
 *         description: Change request approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 status:
 *                   type: string
 *                   enum: [APPROVED]
 *                 enrollment:
 *                   type: object
 *                   description: Updated enrollment with applied changes
 *                 approvedBy:
 *                   type: string
 *                   format: uuid
 *                 approvedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Request cannot be approved (not PENDING)
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - admin only
 *       404:
 *         description: Change request not found
 */

/**
 * @swagger
 * /admin/change-requests/{id}/reject:
 *   patch:
 *     summary: Reject a change request (ADMIN only)
 *     description: Admins can reject pending change requests with a reason. Notifies the parent only.
 *     tags: [Enrollment Change Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the change request
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
 *                 minLength: 10
 *                 description: Rejection reason (minimum 10 characters)
 *     responses:
 *       200:
 *         description: Change request rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 status:
 *                   type: string
 *                   enum: [REJECTED]
 *                 rejectionReason:
 *                   type: string
 *                 rejectedBy:
 *                   type: string
 *                   format: uuid
 *                 rejectedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Validation error or request cannot be rejected
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - admin only
 *       404:
 *         description: Change request not found
 */
