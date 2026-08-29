/**
 * @swagger
 * /subjects:
 *   get:
 *     summary: Get all subjects (available to all authenticated users)
 *     tags: [Subjects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [CORE, ENRICHMENT]
 *         description: Filter by subject category
 *       - in: query
 *         name: gradeBand
 *         schema:
 *           type: string
 *         description: Filter by grade band
 *     responses:
 *       200:
 *         description: List of subjects
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
 *                   gradeBand:
 *                     type: string
 *                   category:
 *                     type: string
 *                     enum: [CORE, ENRICHMENT]
 *       401:
 *         description: Not authenticated
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Subject:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         gradeBand:
 *           type: string
 *         category:
 *           type: string
 *           enum: [CORE, ENRICHMENT]
 *         createdAt:
 *           type: string
 *           format: date-time
 */
