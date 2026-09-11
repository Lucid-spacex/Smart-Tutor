/**
 * @swagger
 * tags:
 *   name: Complaints
 *   description: Filing and resolution of complaints (one-shot tickets)
 */

/**
 * @swagger
 * /complaints:
 *   post:
 *     summary: File a complaint (Parent or Tutor)
 *     tags: [Complaints]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - aboutType
 *               - subject
 *               - description
 *             properties:
 *               aboutType:
 *                 type: string
 *                 enum: [STUDENT, TUTOR, PARENT, GENERAL]
 *               aboutId:
 *                 type: string
 *                 format: uuid
 *               subject:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Complaint filed successfully
 *       403:
 *         description: Only parents and tutors can file complaints
 *   get:
 *     summary: List complaints (Admin sees all, Parent/Tutor sees own filed complaints)
 *     tags: [Complaints]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of complaints
 *       403:
 *         description: Forbidden
 */

/**
 * @swagger
 * /admin/complaints/{id}/resolve:
 *   patch:
 *     summary: Resolve a complaint (Admin only)
 *     tags: [Complaints]
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
 *               - reply
 *             properties:
 *               reply:
 *                 type: string
 *     responses:
 *       200:
 *         description: Complaint resolved successfully
 *       403:
 *         description: Admin only
 *       404:
 *         description: Complaint not found
 */
