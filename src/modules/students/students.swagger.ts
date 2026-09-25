/**
 * @swagger
 * /students:
 *   post:
 *     summary: Create a new student profile
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - dateOfBirth
 *               - gradeLevel
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "Jane Doe"
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 example: "2015-05-15"
 *               gradeLevel:
 *                 type: string
 *                 example: "5th Grade"
 *               gender:
 *                 type: string
 *                 enum: [MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY]
 *                 example: "FEMALE"
 *               actualGrade:
 *                 type: string
 *                 enum: [PRESCHOOL, KINDERGARTEN, GRADE_1, GRADE_2, GRADE_3, GRADE_4, GRADE_5, GRADE_6, GRADE_7, GRADE_8, GRADE_9, GRADE_10, GRADE_11, GRADE_12]
 *                 example: "GRADE_5"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: "Notification and contact email only — not used for login"
 *                 example: "jane.student@example.com"
 *               preferredStartDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-10-01"
 *               school:
 *                 type: string
 *                 example: "Lincoln Elementary"
 *               notes:
 *                 type: string
 *                 example: "Loves math, needs help with reading"
 *     responses:
 *       201:
 *         description: Student created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Student'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *   get:
 *     summary: Get all students for the authenticated parent
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of students
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Student'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */

/**
 * @swagger
 * /students/{id}:
 *   get:
 *     summary: Get a specific student by ID
 *     tags: [Students]
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
 *         description: Student details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Student'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Student not found
 */

/**
 * @swagger
 * /students/{id}/activity:
 *   get:
 *     summary: Get student activity log
 *     tags: [Students]
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
 *         description: Student activity log
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   activityType:
 *                     type: string
 *                   description:
 *                     type: string
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Student not found
 */

/**
 * @swagger
 * /students/{id}/regenerate-pin:
 *   post:
 *     summary: Regenerate student login PIN
 *     tags: [Students]
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
 *         description: PIN regenerated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 studentId:
 *                   type: string
 *                 newPin:
 *                   type: string
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Student not found
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
 *     tags: [Students]
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
 * components:
 *   schemas:
 *     Student:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         parentId:
 *           type: string
 *           format: uuid
 *         fullName:
 *           type: string
 *         dateOfBirth:
 *           type: string
 *           format: date
 *         gradeLevel:
 *           type: string
 *         actualGrade:
 *           type: string
 *           enum: [PRESCHOOL, KINDERGARTEN, GRADE_1, GRADE_2, GRADE_3, GRADE_4, GRADE_5, GRADE_6, GRADE_7, GRADE_8, GRADE_9, GRADE_10, GRADE_11, GRADE_12]
 *         gender:
 *           type: string
 *           enum: [MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY]
 *         email:
 *           type: string
 *           format: email
 *         preferredStartDate:
 *           type: string
 *           format: date-time
 *         gradeBandTier:
 *           type: string
 *           enum: [PRESCHOOL_TO_G1, G2_TO_G4, G5_TO_G8, G9_TO_G12]
 *         studentCode:
 *           type: string
 *         school:
 *           type: string
 *         notes:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 */
