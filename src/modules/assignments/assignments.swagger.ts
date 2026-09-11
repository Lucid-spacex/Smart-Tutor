/**
 * @swagger
 * tags:
 *   name: Assignments
 *   description: Assignment creation and tracking for enrolled students
 */

/**
 * @swagger
 * /assignments:
 *   post:
 *     summary: Create an assignment/test (Tutor assigned to enrollment only)
 *     tags: [Assignments]
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
 *               - title
 *               - description
 *               - type
 *               - dueDate
 *             properties:
 *               enrollmentId:
 *                 type: string
 *                 format: uuid
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [ASSIGNMENT, CLASSWORK, TEST]
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Assignment created
 *       403:
 *         description: Not authorized for this enrollment
 *   get:
 *     summary: List assignments (filtered by user ownership/role)
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: enrollmentId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of assignments
 */

/**
 * @swagger
 * /assignments/{id}:
 *   patch:
 *     summary: Update assignment status (Tutor creator only)
 *     tags: [Assignments]
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [COMPLETED]
 *     responses:
 *       200:
 *         description: Assignment updated
 *       403:
 *         description: Not authorized
 */
