/**
 * @swagger
 * /student/me/performance:
 *   get:
 *     summary: Get authenticated student's own performance overview
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, quarter, year, all]
 *           default: month
 *         description: Time period for performance data
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Override period start date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Override period end date
 *       - in: query
 *         name: subjectId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by specific subject
 *     responses:
 *       200:
 *         description: Performance overview data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 period:
 *                   type: object
 *                   properties:
 *                     from:
 *                       type: string
 *                       format: date-time
 *                     to:
 *                       type: string
 *                       format: date-time
 *                     label:
 *                       type: string
 *                 averageGrade:
 *                   type: object
 *                   properties:
 *                     percentage:
 *                       type: number
 *                     gradedCount:
 *                       type: integer
 *                     trend:
 *                       type: number
 *                       nullable: true
 *                 gradesBySubject:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       subjectId:
 *                         type: string
 *                         format: uuid
 *                       subjectName:
 *                         type: string
 *                       averagePercentage:
 *                         type: number
 *                       gradedCount:
 *                         type: integer
 *                 gradeTimeline:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       bucketStart:
 *                         type: string
 *                         format: date
 *                       averagePercentage:
 *                         type: number
 *                       gradedCount:
 *                         type: integer
 *                 attendance:
 *                   type: object
 *                   properties:
 *                     rate:
 *                       type: number
 *                       nullable: true
 *                     attended:
 *                       type: integer
 *                     missed:
 *                       type: integer
 *                     trend:
 *                       type: number
 *                       nullable: true
 *                     timeline:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           bucketStart:
 *                             type: string
 *                             format: date
 *                           rate:
 *                             type: number
 *                           sessionCount:
 *                             type: integer
 *                 assignments:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     completed:
 *                       type: integer
 *                     pending:
 *                       type: integer
 *                     overdue:
 *                       type: integer
 *                     submittedLate:
 *                       type: integer
 *                     completionRate:
 *                       type: number
 *                 quizzes:
 *                   type: object
 *                   properties:
 *                     attempts:
 *                       type: integer
 *                     averagePercentage:
 *                       type: number
 *                 recentGrades:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       score:
 *                         type: number
 *                       maxScore:
 *                         type: number
 *                       percentage:
 *                         type: number
 *                       subjectName:
 *                         type: string
 *                       assignmentTitle:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not a student
 *
 * /students/{id}/performance:
 *   get:
 *     summary: Get student's performance overview (parent access)
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Student ID
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, quarter, year, all]
 *           default: month
 *         description: Time period for performance data
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Override period start date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Override period end date
 *       - in: query
 *         name: subjectId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by specific subject
 *     responses:
 *       200:
 *         description: Performance overview data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PerformanceOverview'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - parent does not own this student
 *       404:
 *         description: Student not found
 *
 * /tutor/students/{studentId}/performance:
 *   get:
 *     summary: Get assigned student's performance overview (tutor access)
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Student ID
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, quarter, year, all]
 *           default: month
 *         description: Time period for performance data
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Override period start date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Override period end date
 *       - in: query
 *         name: subjectId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by specific subject
 *     responses:
 *       200:
 *         description: Performance overview data with pending grades count
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PerformanceOverview'
 *                 - type: object
 *                   properties:
 *                     pendingGradesCount:
 *                       type: integer
 *                       description: Count of pending grades for this tutor's enrollments
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - tutor is not assigned to this student
 *       404:
 *         description: Student not found
 *
 * /admin/students/{id}/performance:
 *   get:
 *     summary: Get student's performance overview (admin access)
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Student ID
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, quarter, year, all]
 *           default: month
 *         description: Time period for performance data
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Override period start date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Override period end date
 *       - in: query
 *         name: subjectId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by specific subject
 *       - in: query
 *         name: includePending
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include pending grades in calculations
 *     responses:
 *       200:
 *         description: Performance overview data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PerformanceOverview'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an admin
 *       404:
 *         description: Student not found
 */
