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
 *
 *   get:
 *     summary: Get tutor profile
 *     tags: [Tutor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tutor profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TutorProfile'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */

/**
 * @swagger
 * /tutor-profile/availability:
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
 * /students:
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
 * /sessions:
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
 * /students/{studentId}:
 *   get:
 *     summary: Get detailed student information (TUTOR only)
 *     description: Tutors can view comprehensive details about their assigned students, excluding parent contact/financial info and other tutors' notes. Authorization check ensures tutors can only view students they teach.
 *     tags: [Tutor]
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
 *     responses:
 *       200:
 *         description: Student details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 student:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     fullName:
 *                       type: string
 *                     dateOfBirth:
 *                       type: string
 *                       format: date
 *                     gender:
 *                       type: string
 *                     actualGrade:
 *                       type: string
 *                     gradeLevel:
 *                       type: string
 *                     gradeBandTier:
 *                       type: string
 *                     school:
 *                       type: string
 *                     notes:
 *                       type: string
 *                 enrollment:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     subject:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                     status:
 *                       type: string
 *                     sessionFrequency:
 *                       type: string
 *                     availableDays:
 *                       type: array
 *                       items:
 *                         type: string
 *                     startDate:
 *                       type: string
 *                       format: date
 *                     endDate:
 *                       type: string
 *                       format: date
 *                 upcomingSessions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Session'
 *                 pastSessions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Session'
 *                 assignments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Assignment'
 *                 gradesGiven:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Grade'
 *                 progressReports:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProgressReport'
 *                 attendance:
 *                   type: object
 *                   properties:
 *                     totalSessions:
 *                       type: integer
 *                     attended:
 *                       type: integer
 *                     missed:
 *                       type: integer
 *                     percentage:
 *                       type: integer
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - tutor not assigned to this student
 *       404:
 *         description: Student not found
 */
