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
 *         school:
 *           type: string
 *         notes:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 */
