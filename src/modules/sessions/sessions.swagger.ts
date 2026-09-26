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
 */

/**
 * @swagger
 * /tutor/sessions:
 *   post:
 *     summary: Create session for assigned student (TUTOR only)
 *     description: Tutors can create sessions for their own assigned students only. Single-student sessions only. Ownership check ensures tutors cannot create sessions for students they don't teach. Zoom meeting is auto-generated.
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
 *               - enrollmentId
 *               - scheduledAt
 *               - durationMinutes
 *             properties:
 *               enrollmentId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of enrollment belonging to this tutor's assigned student
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *                 description: When the session should occur
 *               durationMinutes:
 *                 type: integer
 *                 minimum: 15
 *                 maximum: 180
 *                 description: Session duration in minutes
 *     responses:
 *       201:
 *         description: Session created successfully with auto-generated Zoom meeting
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Session'
 *       400:
 *         description: Validation error or enrollment not assigned to this tutor
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not a tutor or enrollment not assigned to them
 */

/**
 * @swagger
 * /tutor/sessions/{id}/reschedule:
 *   patch:
 *     summary: Reschedule session (TUTOR only)
 *     description: Tutors can reschedule sessions they created. Ownership check ensures tutors cannot reschedule sessions created by others.
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
 *                 description: New scheduled time
 *     responses:
 *       200:
 *         description: Session rescheduled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Session'
 *       400:
 *         description: Validation error or session not in SCHEDULED status
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not a tutor or session not created by them
 *       404:
 *         description: Session not found
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
 *     description: Admins can create sessions with multiple participants (shared sessions). Zoom meeting is auto-generated if not provided.
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
 *               - tutorId
 *               - participantEnrollmentIds
 *               - scheduledAt
 *               - durationMinutes
 *             properties:
 *               tutorId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the tutor assigned to this session
 *               participantEnrollmentIds:
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
 *               zoomLink:
 *                 type: string
 *                 format: uri
 *                 description: Optional Zoom link (auto-generated if not provided)
 *               zoomMeetingId:
 *                 type: string
 *                 description: Optional Zoom meeting ID (auto-generated if not provided)
 *               sharedSessionConfirmed:
 *                 type: boolean
 *                 description: Confirmation that this is a shared session
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
