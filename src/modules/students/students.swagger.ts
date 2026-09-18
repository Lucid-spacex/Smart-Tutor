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
