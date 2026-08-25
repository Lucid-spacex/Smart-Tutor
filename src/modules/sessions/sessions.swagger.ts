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
 */

/**
 * @swagger
 * components:
 *   schemas:
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
 */
