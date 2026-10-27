/**
 * @swagger
 * tags:
 *   name: ScoredItems
 *   description: Tutor-managed scored items (quiz attempts, assignments, attendance, participation)
 */

/**
 * @swagger
 * /tutor/students/{studentId}/scored-items:
 *   get:
 *     summary: Get scored items for a student (TUTOR only)
 *     description: Tutors can view all scored items for their assigned students, including quiz attempts, assignment submissions, attendance, and participation records.
 *     tags: [ScoredItems]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the student
 *       - in: query
 *         name: itemType
 *         schema:
 *           type: string
 *           enum: [QUIZ, ASSIGNMENT, ATTENDANCE, PARTICIPATION]
 *         description: Filter by scored item type
 *     responses:
 *       200:
 *         description: List of scored items
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
 *                   enrollmentId:
 *                     type: string
 *                     format: uuid
 *                   itemType:
 *                     type: string
 *                     enum: [QUIZ, ASSIGNMENT, ATTENDANCE, PARTICIPATION]
 *                   sourceType:
 *                     type: string
 *                   sourceId:
 *                     type: string
 *                     format: uuid
 *                   score:
 *                     type: number
 *                   maxScore:
 *                     type: number
 *                   comment:
 *                     type: string
 *                   locked:
 *                     type: boolean
 *                   gradeId:
 *                     type: string
 *                     format: uuid
 *                     nullable: true
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - tutor not assigned to this student
 *       404:
 *         description: Student not found
 */

/**
 * @swagger
 * /tutor/scored-items:
 *   post:
 *     summary: Create a scored item (TUTOR only)
 *     description: Tutors can create scored items for their assigned students' enrollments. Used for attendance, participation, and manual scoring that doesn't come from quiz/assignment submission.
 *     tags: [ScoredItems]
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
 *               - type
 *               - score
 *               - maxScore
 *             properties:
 *               enrollmentId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the enrollment
 *               itemType:
 *                 type: string
 *                 enum: [QUIZ, ASSIGNMENT, ATTENDANCE, PARTICIPATION]
 *                 description: Type of scored item
 *               score:
 *                 type: number
 *                 minimum: 0
 *                 description: Score achieved
 *               maxScore:
 *                 type: number
 *                 minimum: 0
 *                 exclusiveMinimum: true
 *                 description: Maximum possible score
 *               comment:
 *                 type: string
 *                 description: Optional comment or feedback
 *     responses:
 *       201:
 *         description: Scored item created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                   enrollmentId:
 *                     type: string
 *                     format: uuid
 *                   itemType:
 *                     type: string
 *                   score:
 *                     type: number
 *                   maxScore:
 *                     type: number
 *                   comment:
 *                     type: string
 *                   locked:
 *                     type: boolean
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - tutor not assigned to this enrollment
 *       409:
 *         description: Duplicate scored item (enrollmentId, sourceType, sourceId must be unique)
 */

/**
 * @swagger
 * /tutor/scored-items/{id}:
 *   patch:
 *     summary: Update a scored item (TUTOR only)
 *     description: Tutors can update scored items they created. Cannot update if the item is locked to a grade.
 *     tags: [ScoredItems]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the scored item
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               score:
 *                 type: number
 *                 minimum: 0
 *               maxScore:
 *                 type: number
 *                 minimum: 0
 *                 exclusiveMinimum: true
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Scored item updated successfully
 *       400:
 *         description: Validation error or item is locked
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - tutor did not create this item
 *       404:
 *         description: Scored item not found
 *   delete:
 *     summary: Delete a scored item (TUTOR only)
 *     description: Tutors can delete scored items they created. Cannot delete if the item is locked to a grade.
 *     tags: [ScoredItems]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the scored item
 *     responses:
 *       200:
 *         description: Scored item deleted successfully
 *       400:
 *         description: Item is locked to a grade
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - tutor did not create this item
 *       404:
 *         description: Scored item not found
 */
