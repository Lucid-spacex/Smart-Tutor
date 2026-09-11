/**
 * @swagger
 * tags:
 *   name: Grades
 *   description: Grading and admin approval workflow
 */

/**
 * @swagger
 * /grades:
 *   post:
 *     summary: Submit a grade (Tutor assigned to enrollment) - starts PENDING_APPROVAL
 *     tags: [Grades]
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
 *               - score
 *               - comments
 *             properties:
 *               enrollmentId:
 *                 type: string
 *                 format: uuid
 *               assignmentId:
 *                 type: string
 *                 format: uuid
 *               score:
 *                 type: number
 *               comments:
 *                 type: string
 *     responses:
 *       201:
 *         description: Grade submitted (pending admin approval)
 *       403:
 *         description: Not authorized for this enrollment
 *   get:
 *     summary: List grades (Parent/Student sees APPROVED visible grades only; Tutor sees own submissions; Admin sees all)
 *     tags: [Grades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: studentId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: enrollmentId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of grades
 */

/**
 * @swagger
 * /admin/grades/pending:
 *   get:
 *     summary: List grades pending admin approval (Admin only)
 *     tags: [Grades]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending grades
 *       403:
 *         description: Admin only
 */

/**
 * @swagger
 * /admin/grades/{id}/approve:
 *   patch:
 *     summary: Approve a grade (Admin only - flips visibleToStudent=true)
 *     tags: [Grades]
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
 *         description: Grade approved
 *       403:
 *         description: Admin only
 */

/**
 * @swagger
 * /admin/grades/{id}/reject:
 *   patch:
 *     summary: Reject a grade (Admin only)
 *     tags: [Grades]
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Grade rejected
 *       403:
 *         description: Admin only
 */
