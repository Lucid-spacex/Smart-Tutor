/**
 * @swagger
 * tags:
 *   name: Class Reminders
 *   description: Class schedule views for tutors and admins (used by reminder job)
 */

/**
 * @swagger
 * /tutor/upcoming-classes:
 *   get:
 *     summary: Get tutor's upcoming classes (TUTOR only)
 *     description: Tutors can view their upcoming scheduled sessions within a date range. Used by the class reminder job to identify sessions needing reminders.
 *     tags: [Class Reminders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start of date range (UTC). If not provided, defaults to now.
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End of date range (UTC). If not provided, defaults to 7 days from now.
 *     responses:
 *       200:
 *         description: List of upcoming classes
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
 *                   tutorId:
 *                     type: string
 *                     format: uuid
 *                   scheduledAt:
 *                     type: string
 *                     format: date-time
 *                   durationMinutes:
 *                     type: integer
 *                   status:
 *                     type: string
 *                     enum: [SCHEDULED, COMPLETED, MISSED, CANCELLED]
 *                   participants:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         enrollmentId:
 *                           type: string
 *                           format: uuid
 *                         studentId:
 *                           type: string
 *                           format: uuid
 *                         studentName:
 *                           type: string
 *                         subjectName:
 *                           type: string
 *                   googleMeetLink:
 *                     type: string
 *                     format: uri
 *                     nullable: true
 *                     description: 'Google Meet link (replaces Zoom)'
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - tutor only
 */

/**
 * @swagger
 * /admin/class-schedule:
 *   get:
 *     summary: Get class schedule view (ADMIN only)
 *     description: Admins can view all scheduled sessions with optional filtering by tutor, status, and date range. Used to monitor class scheduling and identify unscheduled slots.
 *     tags: [Class Reminders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tutorId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by tutor ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [SCHEDULED, COMPLETED, MISSED, CANCELLED]
 *         description: Filter by session status
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start of date range (UTC)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End of date range (UTC)
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
 *         description: Paginated list of scheduled classes
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
 *                       tutorId:
 *                         type: string
 *                         format: uuid
 *                       tutor:
 *                         type: object
 *                         description: Tutor details
 *                       scheduledAt:
 *                         type: string
 *                         format: date-time
 *                       durationMinutes:
 *                         type: integer
 *                       status:
 *                         type: string
 *                       participants:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             enrollmentId:
 *                               type: string
 *                               format: uuid
 *                             studentId:
 *                               type: string
 *                               format: uuid
 *                             studentName:
 *                               type: string
 *                             subjectName:
 *                               type: string
 *                       googleMeetLink:
 *                         type: string
 *                         format: uri
 *                         nullable: true
 *                       createdBy:
 *                         type: string
 *                         format: uuid
 *                         description: User ID who created the session
 *                       createdAt:
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
