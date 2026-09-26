/**
 * @swagger
 * /student/me:
 *   get:
 *     summary: Get current authenticated student profile
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Student'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not a student
 *       404:
 *         description: Student not found
 *
 * /student/me/schedule:
 *   get:
 *     summary: Get student's class schedule
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student schedule retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Session'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not a student
 *
 * /student/me/assignments:
 *   get:
 *     summary: Get student's assignments
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student assignments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Assignment'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not a student
 *
 * /student/me/grades:
 *   get:
 *     summary: Get student's grades
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student grades retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Grade'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not a student
 *
 * /student/me/progress-reports:
 *   get:
 *     summary: Get student's progress reports
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student progress reports retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ProgressReport'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not a student
 *
 * /student/me/notifications:
 *   get:
 *     summary: Get student's notifications
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Notification'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not a student
 *
 * /student/me/next-class:
 *   get:
 *     summary: Get student's next upcoming class
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Next class retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Session'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not a student
 *       404:
 *         description: No upcoming class found
 *
 * /student/me/attendance:
 *   get:
 *     summary: Get student's attendance records
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student attendance retrieved successfully
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
 *                   sessionId:
 *                     type: string
 *                     format: uuid
 *                   studentId:
 *                     type: string
 *                     format: uuid
 *                   status:
 *                     type: string
 *                     enum: [PRESENT, ABSENT, LATE, EXCUSED]
 *                   notes:
 *                     type: string
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not a student
 *
 * /student/me/tutors:
 *   get:
 *     summary: Get student's assigned tutors
 *     description: Students can view their assigned tutors' profiles including bio, subjects, and assignment details. Contact details (email, phone) are excluded.
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of assigned tutors
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   tutorId:
 *                     type: string
 *                     format: uuid
 *                   fullName:
 *                     type: string
 *                   bio:
 *                     type: string
 *                     nullable: true
 *                   subjects:
 *                     type: array
 *                     items:
 *                       type: string
 *                   enrollmentSubject:
 *                     type: string
 *                     description: Subject this tutor teaches the student
 *                   assignedSince:
 *                     type: string
 *                     format: date
 *                     description: When this tutor was assigned
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not a student
 */
