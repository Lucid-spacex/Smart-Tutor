/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: User notifications for deadlines, grade approvals, and complaints
 */

/**
 * @swagger
 * /notifications/unread-count:
 *   get:
 *     summary: Get unread notification count for authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count with breakdown by category
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 byCategory:
 *                   type: object
 *                   additionalProperties:
 *                     type: integer
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get notifications for authenticated user with filters
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [USERS, SESSIONS, MESSAGES, COMPLAINTS, ENROLLMENTS, PAYMENTS, GRADES, PRICING, SCHEDULE, QUIZZES, ASSIGNMENTS]
 *         description: Filter by category
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: boolean
 *         description: Filter by read status
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *         description: Filter by entity type
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
 *         description: List of notifications with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 total:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /notifications/{id}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
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
 *         description: Notification marked as read
 *       403:
 *         description: Access denied - notification belongs to another user
 *       404:
 *         description: Notification not found
 */

/**
 * @swagger
 * /notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read (optionally by category)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [USERS, SESSIONS, MESSAGES, COMPLAINTS, ENROLLMENTS, PAYMENTS, GRADES, PRICING, SCHEDULE, QUIZZES, ASSIGNMENTS]
 *         description: Optional category filter
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /notifications/read-by-entity:
 *   patch:
 *     summary: Mark notifications by entity as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entityType
 *               - entityId
 *             properties:
 *               entityType:
 *                 type: string
 *               entityId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Notifications for entity marked as read
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Invalid request body
 */

/**
 * @swagger
 * /notifications/stream-ticket:
 *   post:
 *     summary: Create a single-use stream ticket for SSE connection
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stream ticket created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ticket:
 *                   type: string
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /notifications/stream:
 *   get:
 *     summary: SSE endpoint for real-time notifications
 *     tags: [Notifications]
 *     parameters:
 *       - in: query
 *         name: ticket
 *         schema:
 *           type: string
 *         description: Stream ticket (single-use, 30s expiry) as alternative to Authorization header
 *     responses:
 *       200:
 *         description: SSE stream established
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *       401:
 *         description: Unauthorized or invalid/expired ticket
 *       429:
 *         description: Maximum connections exceeded (max 3 per user)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         type:
 *           type: string
 *           enum: [ASSIGNMENT_DUE_SOON, ASSIGNMENT_OVERDUE, GRADE_APPROVED, COMPLAINT_RESOLVED, GENERAL, PRICING_DRIFT_ALERT, TUTOR_ASSIGNED, STUDENT_ASSIGNED, ENROLLMENT_AWAITING_TUTOR, PAYMENT_SUCCESS, PAYMENT_FAILED, PAYMENT_EXPIRED, ENROLLMENT_ACTIVATED, SESSION_SCHEDULED, SESSION_RESCHEDULED, SESSION_CANCELLED, SESSION_REMINDER, ASSIGNMENT_POSTED, ASSIGNMENT_SUBMITTED, ASSIGNMENT_REVIEWED, GRADE_SUBMITTED, GRADE_REJECTED, NEW_TUTOR_APPLICATION, TUTOR_APPROVED, TUTOR_REJECTED, PRICE_UPDATED, TUTOR_UNAVAILABLE, NEW_MESSAGE, ACCOUNT_SUSPENDED, ACCOUNT_REACTIVATED, USER_REGISTERED, USER_VERIFIED, ENROLLMENT_CREATED, SESSION_CREATED, SESSION_MISSED, RECORDING_AVAILABLE, QUIZ_COMPLETED, ENROLLMENT_CHANGE_SUBMITTED, ENROLLMENT_CHANGE_APPROVED, ENROLLMENT_CHANGE_REJECTED]
 *         category:
 *           type: string
 *           enum: [USERS, SESSIONS, MESSAGES, COMPLAINTS, ENROLLMENTS, PAYMENTS, GRADES, PRICING, SCHEDULE, QUIZZES, ASSIGNMENTS]
 *         title:
 *           type: string
 *         body:
 *           type: string
 *         entityType:
 *           type: string
 *         entityId:
 *           type: string
 *         isRead:
 *           type: boolean
 *         readAt:
 *           type: string
 *           format: date-time
 *         dedupeKey:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 */
