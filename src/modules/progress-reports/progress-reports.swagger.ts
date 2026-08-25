/**
 * @swagger
 * /progress-reports:
 *   post:
 *     summary: Create a progress report (tutor only)
 *     tags: [Progress Reports]
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
 *               - period
 *               - summary
 *               - strengths
 *               - areasToImprove
 *             properties:
 *               enrollmentId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               period:
 *                 type: string
 *                 example: "January 2024"
 *               summary:
 *                 type: string
 *                 example: "Student has shown great improvement in algebra."
 *               strengths:
 *                 type: string
 *                 example: "Strong problem-solving skills, good attendance."
 *               areasToImprove:
 *                 type: string
 *                 example: "Needs more practice with geometry concepts."
 *     responses:
 *       201:
 *         description: Progress report created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProgressReport'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *   get:
 *     summary: Get progress reports
 *     tags: [Progress Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: enrollmentId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by enrollment ID
 *     responses:
 *       200:
 *         description: List of progress reports
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ProgressReport'
 *       401:
 *         description: Not authenticated
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ProgressReport:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         enrollmentId:
 *           type: string
 *           format: uuid
 *         period:
 *           type: string
 *         summary:
 *           type: string
 *         strengths:
 *           type: string
 *         areasToImprove:
 *           type: string
 *         createdBy:
 *           type: string
 *           format: uuid
 *         createdAt:
 *           type: string
 *           format: date-time
 */
