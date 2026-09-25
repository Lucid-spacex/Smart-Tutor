/**
 * @swagger
 * /enrollments:
 *   post:
 *     summary: Create multi-subject enrollment batch for a student
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
 *               - subjectIds
 *               - sessionFrequency
 *               - availableDays
 *               - preferredStartHour
 *               - preferredEndHour
 *               - startDate
 *             properties:
 *               studentId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               subjectIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *                 maxItems: 4
 *                 example: ["223e4567-e89b-12d3-a456-426614174000", "333e4567-e89b-12d3-a456-426614174000"]
 *               sessionFrequency:
 *                 type: string
 *                 enum: [TWICE_WEEKLY, THRICE_WEEKLY, FIVE_TIMES_WEEKLY]
 *                 example: "TWICE_WEEKLY"
 *               availableDays:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [MON, TUE, WED, THU, FRI, SAT, SUN]
 *                 description: "Days parent/student is available. Count must match sessionFrequency (2 for TWICE_WEEKLY, 3 for THRICE_WEEKLY, 5 for FIVE_TIMES_WEEKLY)"
 *                 example: ["MON", "THU"]
 *               preferredStartHour:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 23
 *                 description: "Preferred start hour in parent's local timezone (0-23)"
 *                 example: 16
 *               preferredEndHour:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 23
 *                 description: "Preferred end hour in parent's local timezone (0-23, must be > preferredStartHour)"
 *                 example: 18
 *               billingFrequency:
 *                 type: string
 *                 enum: [WEEKLY, MONTHLY, YEARLY]
 *                 default: YEARLY
 *                 example: "MONTHLY"
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-10-01"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: "2027-06-30"
 *     responses:
 *       201:
 *         description: Enrollment batch created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 enrollmentGroupId:
 *                   type: string
 *                   format: uuid
 *                 enrollments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Enrollment'
 *       400:
 *         description: Validation error or day count mismatch
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Student or subject not found
 *   get:
 *     summary: Get enrollments for authenticated user (parents see their children's enrollments, tutors see assigned enrollments)
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
 * /enrollments/group/{groupId}:
 *   get:
 *     summary: Get all enrollments belonging to an enrollment group
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Enrollment group details and subjects
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 enrollmentGroupId:
 *                   type: string
 *                   format: uuid
 *                 enrollments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Enrollment'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Enrollment group not found
 */

/**
 * @swagger
 * /enrollments/{id}:
 *   get:
 *     summary: Get a specific enrollment by ID
 *     tags: [Enrollments]
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
 *         description: Enrollment details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Enrollment'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Enrollment not found
 */
