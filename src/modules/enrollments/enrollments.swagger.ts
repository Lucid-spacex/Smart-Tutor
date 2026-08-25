/**
 * @swagger
 * /enrollments:
 *   post:
 *     summary: Create a new enrollment
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - subjectId
 *               - frequency
 *               - startDate
 *             properties:
 *               studentId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               subjectId:
 *                 type: string
 *                 format: uuid
 *                 example: "223e4567-e89b-12d3-a456-426614174000"
 *               frequency:
 *                 type: string
 *                 enum: [WEEKLY, BI_WEEKLY, MONTHLY]
 *                 example: "WEEKLY"
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-15"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-06-15"
 *     responses:
 *       201:
 *         description: Enrollment created successfully
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
 *         description: Student or subject not found
 *   get:
 *     summary: Get enrollments for the authenticated parent
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, PAUSED, COMPLETED, CANCELLED]
 *         description: Filter by enrollment status
 *     responses:
 *       200:
 *         description: List of enrollments
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
 *         subjectId:
 *           type: string
 *           format: uuid
 *         tutorId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         frequency:
 *           type: string
 *           enum: [WEEKLY, BI_WEEKLY, MONTHLY]
 *         status:
 *           type: string
 *           enum: [ACTIVE, PAUSED, COMPLETED, CANCELLED]
 *         startDate:
 *           type: string
 *           format: date
 *         endDate:
 *           type: string
 *           format: date
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 */
