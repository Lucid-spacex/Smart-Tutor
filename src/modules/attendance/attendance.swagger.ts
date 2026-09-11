/**
 * @swagger
 * tags:
 *   name: Attendance
 *   description: Attendance statistics and tracking
 */

/**
 * @swagger
 * /students/{id}/attendance:
 *   get:
 *     summary: Get student attendance statistics and breakdown
 *     description: |
 *       Accessible by:
 *       - STUDENT (self only)
 *       - PARENT (must own student)
 *       - TUTOR (must be assigned to at least one enrollment of this student)
 *       - ADMIN (any)
 *       Calculates attendance percentage only over COMPLETED and MISSED sessions.
 *     tags: [Attendance]
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
 *         description: Attendance statistics and breakdown
 *       403:
 *         description: Access denied
 *       404:
 *         description: Student not found
 */

/**
 * @swagger
 * /student/me/attendance:
 *   get:
 *     summary: Shorthand for student to retrieve their own attendance (Student only)
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student's own attendance statistics and breakdown
 *       403:
 *         description: Students only
 */
