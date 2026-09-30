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
 *     summary: File a complaint (Parent only)
 *     description: |
 *       Parents can file complaints about tutors, students, or general issues.
 *       Tutors no longer file complaints - they use messaging to contact admin.
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
 *         description: Only parents can file complaints (tutors use messaging)
 *   get:
 *     summary: List complaints (Admin sees all, Parent sees own filed complaints, Tutor sees empty list)
 *     description: |
 *       Admins see all complaints.
 *       Parents see only their own filed complaints.
 *       Tutors no longer have access to complaints (they use messaging).
 *     tags: [Complaints]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of complaints (empty list for tutors)
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
