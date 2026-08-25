/**
 * @swagger
 * /tutor-profile:
 *   post:
 *     summary: Complete tutor profile
 *     tags: [Tutor]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subjects
 *               - bio
 *               - hourlyRate
 *               - availability
 *             properties:
 *               subjects:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Mathematics", "Physics"]
 *               bio:
 *                 type: string
 *                 example: "Experienced math teacher with 5 years of tutoring experience."
 *               credentialsUrl:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/credentials.pdf"
 *               hourlyRate:
 *                 type: number
 *                 example: 50
 *               availability:
 *                 type: object
 *                 example: {"monday": ["9:00-12:00", "14:00-17:00"]}
 *     responses:
 *       201:
 *         description: Tutor profile created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TutorProfile'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *
 *   patch:
 *     summary: Update tutor availability
 *     tags: [Tutor]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - availability
 *             properties:
 *               availability:
 *                 type: object
 *                 example: {"monday": ["9:00-12:00", "14:00-17:00"]}
 *     responses:
 *       200:
 *         description: Availability updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TutorProfile'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */

/**
 * @swagger
 * /tutor/students:
 *   get:
 *     summary: Get assigned students
 *     tags: [Tutor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of assigned students
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   student:
 *                     $ref: '#/components/schemas/Student'
 *                   enrollment:
 *                     $ref: '#/components/schemas/Enrollment'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */

/**
 * @swagger
 * /tutor/sessions:
 *   get:
 *     summary: Get tutor's schedule
 *     tags: [Tutor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of tutor's sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Session'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     TutorProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         subjects:
 *           type: array
 *           items:
 *             type: string
 *         bio:
 *           type: string
 *         credentialsUrl:
 *           type: string
 *           format: uri
 *           nullable: true
 *         vettingStatus:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED]
 *         hourlyRate:
 *           type: number
 *           format: decimal
 *         availability:
 *           type: object
 *         createdAt:
 *           type: string
 *           format: date-time
 */
