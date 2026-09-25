/**
 * @swagger
 * /sessions:
 *   get:
 *     summary: Get sessions (filtered by enrollment or status)
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: enrollmentId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by enrollment ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [SCHEDULED, COMPLETED, MISSED, CANCELLED]
 *         description: Filter by session status
 *     responses:
 *       200:
 *         description: List of sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Session'
 *       401:
 *         description: Not authenticated
 *
 * /sessions/tutor:
 *   get:
 *     summary: Get tutor's sessions
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of tutor's sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Session'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not a tutor
 */

/**
 * @swagger
 * /sessions/{id}:
 *   patch:
 *     summary: Update session (tutor only)
 *     tags: [Sessions]
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
 *               status:
 *                 type: string
 *                 enum: [COMPLETED, MISSED, CANCELLED]
 *               tutorNotes:
 *                 type: string
 *               homeworkAssigned:
 *                 type: string
 *     responses:
 *       200:
 *         description: Session updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Session'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Session not found
 *
 * /admin/sessions:
 *   post:
 *     summary: Create session with multiple participants (admin only)
 *     tags: [Sessions]
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
 *     tags: [Sessions]
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
