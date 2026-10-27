/**
 * @swagger
 * tags:
 *   name: Grades
 *   description: Grading and admin approval workflow
 */

/**
 * @swagger
 * /grades:
 *   post:
 *     summary: Create a draft grade (TUTOR assigned to enrollment)
 *     description: Tutors can create draft grades for their assigned students. Draft grades are not visible to students/parents until submitted and approved.
 *     tags: [Grades]
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
 *               - components
 *             properties:
 *               enrollmentId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the enrollment
 *               components:
 *                 type: array
 *                 description: Grade components (quizzes, assignments, attendance)
 *                 items:
 *                   type: object
 *                   properties:
 *                     scoredItemId:
 *                       type: string
 *                       format: uuid
 *                       nullable: true
 *                     sourceType:
 *                       type: string
 *                       enum: [QUIZ, ASSIGNMENT, ATTENDANCE, PARTICIPATION]
 *                     sourceId:
 *                       type: string
 *                       format: uuid
 *                       nullable: true
 *                     weight:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 100
 *                       description: Weight percentage (must total 100)
 *                     score:
 *                       type: number
 *                       minimum: 0
 *                     maxScore:
 *                       type: number
 *                       minimum: 0
 *                       exclusiveMinimum: true
 *               attendanceRate:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Optional attendance rate percentage
 *               finalScore:
 *                 type: number
 *                 nullable: true
 *                 description: Optional manual override of computed score
 *               overrideReason:
 *                 type: string
 *                 nullable: true
 *                 minLength: 10
 *                 description: Required if finalScore is set
 *               comments:
 *                 type: string
 *                 description: Grade comments or feedback
 *     responses:
 *       201:
 *         description: Draft grade created successfully
 *       400:
 *         description: Validation error (weights must total 100, override requires reason)
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized for this enrollment
 *   get:
 *     summary: List grades (Parent/Student sees APPROVED visible grades only; Tutor sees own submissions; Admin sees all)
 *     tags: [Grades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: studentId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: enrollmentId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: includePending
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *         description: Include pending grades (tutor/admin only)
 *     responses:
 *       200:
 *         description: List of grades
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
 *                   computedScore:
 *                     type: number
 *                   finalScore:
 *                     type: number
 *                     nullable: true
 *                   comments:
 *                     type: string
 *                   status:
 *                     type: string
 *                   visibleToStudent:
 *                     type: boolean
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 */

/**
 * @swagger
 * /admin/grades/pending:
 *   get:
 *     summary: List grades pending admin approval (Admin only)
 *     description: Alias for GET /admin/grades?status=PENDING_APPROVAL
 *     tags: [Grades]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending grades
 *       403:
 *         description: Admin only
 */

/**
 * @swagger
 * /admin/grades/{id}/approve:
 *   patch:
 *     summary: Approve a grade (Admin only - flips visibleToStudent=true)
 *     tags: [Grades]
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
 *         description: Grade approved
 *       403:
 *         description: Admin only
 */

/**
 * @swagger
 * /admin/grades/{id}/reject:
 *   patch:
 *     summary: Reject a grade (Admin only)
 *     tags: [Grades]
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Grade rejected
 *       403:
 *         description: Admin only
 */

/**
 * @swagger
 * /grades/{id}:
 *   patch:
 *     summary: Update grade (TUTOR only - allowed while DRAFT or REJECTED)
 *     description: Tutors can update their own draft or rejected grades. Cannot update approved grades.
 *     tags: [Grades]
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
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               components:
 *                 type: array
 *                 description: Updated grade components
 *               attendanceRate:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               finalScore:
 *                 type: number
 *                 nullable: true
 *               overrideReason:
 *                 type: string
 *                 nullable: true
 *                 minLength: 10
*               comments:
 *                 type: string
 *     responses:
 *       200:
 *         description: Grade updated successfully
 *       400:
 *         description: Validation error or grade is not editable
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized or grade is approved (locked)
 *       404:
 *         description: Grade not found
 *   delete:
 *     summary: Delete grade (TUTOR only - allowed while DRAFT or REJECTED)
 *     description: Tutors can delete their own draft or rejected grades. Cannot delete approved grades.
 *     tags: [Grades]
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
 *         description: Grade deleted successfully
 *       400:
 *         description: Grade cannot be deleted (not DRAFT or REJECTED)
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized or grade is approved (locked)
 *       404:
 *         description: Grade not found
 */

/**
 * @swagger
 * /grades/{id}/submit:
 *   post:
 *     summary: Submit grade for approval (TUTOR only)
 *     description: Tutors can submit their draft grades for admin approval. Grade status changes to PENDING_APPROVAL and becomes non-editable.
 *     tags: [Grades]
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
 *         description: Grade submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 status:
 *                   type: string
 *                   enum: [PENDING_APPROVAL]
 *       400:
 *         description: Grade cannot be submitted (not DRAFT)
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - not the grade creator
 *       404:
 *         description: Grade not found
 */

/**
 * @swagger
 * /grades/{id}/withdraw:
 *   post:
 *     summary: Withdraw grade to draft (TUTOR only)
 *     description: Tutors can withdraw pending grades back to draft status to make edits.
 *     tags: [Grades]
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
 *         description: Grade withdrawn to draft successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 status:
 *                   type: string
 *                   enum: [DRAFT]
 *       400:
 *         description: Grade cannot be withdrawn (not PENDING_APPROVAL)
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - not the grade creator
 *       404:
 *         description: Grade not found
 */

/**
 * @swagger
 * /grades/{id}/preview:
 *   get:
 *     summary: Preview grade details (TUTOR only)
 *     description: Tutors can preview a grade's full details including computed score before submission.
 *     tags: [Grades]
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
 *         description: Grade preview with computed score
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 enrollmentId:
 *                   type: string
 *                   format: uuid
 *                 components:
 *                   type: array
 *                 attendanceRate:
 *                   type: number
 *                 computedScore:
 *                   type: number
 *                   description: Server-calculated score from components
 *                 finalScore:
 *                   type: number
 *                   nullable: true
 *                 overrideReason:
 *                   type: string
 *                   nullable: true
 *                 comments:
 *                   type: string
 *                 status:
 *                   type: string
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - not the grade creator
 *       404:
 *         description: Grade not found
 */

/**
 * @swagger
 * /admin/grades:
 *   get:
 *     summary: List all grades (ADMIN only)
 *     description: Admins can view all grades with optional filtering by status, tutor, student, or subject.
 *     tags: [Grades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, PENDING_APPROVAL, APPROVED, REJECTED]
 *         description: Filter by grade status
 *       - in: query
 *         name: tutorId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by tutor ID
 *       - in: query
 *         name: studentId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by student ID
 *       - in: query
 *         name: subjectId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by subject ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Paginated list of grades
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       enrollmentId:
 *                         type: string
 *                         format: uuid
 *                       enrollment:
 *                         type: object
 *                         description: Enrollment details (without studentCode)
 *                       tutorId:
 *                         type: string
 *                         format: uuid
 *                       tutor:
 *                         type: object
 *                         description: Tutor details
 *                       status:
 *                         type: string
 *                       computedScore:
 *                         type: number
 *                       finalScore:
 *                         type: number
 *                         nullable: true
 *                       overrideReason:
 *                         type: string
 *                         nullable: true
 *                       comments:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - admin only
 */

/**
 * @swagger
 * /admin/grades/{id}:
 *   get:
 *     summary: Get grade details (ADMIN only)
 *     description: Admins can view full grade details including all components. Student code is explicitly excluded from the response.
 *     tags: [Grades]
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
 *         description: Grade details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 enrollmentId:
 *                   type: string
 *                   format: uuid
 *                 enrollment:
 *                   type: object
 *                   description: Enrollment details (student without studentCode)
 *                 tutorId:
 *                   type: string
 *                   format: uuid
 *                 tutor:
 *                   type: object
 *                 components:
 *                   type: array
 *                   description: Grade components with scored item details
 *                 attendanceRate:
 *                   type: number
 *                 computedScore:
 *                   type: number
 *                 finalScore:
 *                   type: number
 *                   nullable: true
 *                 overrideReason:
 *                   type: string
 *                   nullable: true
 *                 comments:
 *                   type: string
 *                 status:
 *                   type: string
 *                 visibleToStudent:
 *                   type: boolean
 *                 submittedBy:
 *                   type: string
 *                   format: uuid
 *                 submittedAt:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                 approvedBy:
 *                   type: string
 *                   format: uuid
 *                   nullable: true
 *                 approvedAt:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                 rejectionReason:
 *                   type: string
 *                   nullable: true
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - admin only
 *       404:
 *         description: Grade not found
 */

/**
 * @swagger
 * /admin/grades/bulk-approve:
 *   post:
 *     summary: Bulk approve grades (ADMIN only)
 *     description: Admins can approve multiple pending grades in a single request.
 *     tags: [Grades]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - gradeIds
 *             properties:
 *               gradeIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Array of grade IDs to approve
 *     responses:
 *       200:
 *         description: Bulk approval result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 approved:
 *                   type: array
 *                   items:
 *                     type: string
 *                     format: uuid
 *                   description: Successfully approved grade IDs
 *                 failed:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       gradeId:
 *                         type: string
 *                         format: uuid
 *                       error:
 *                         type: string
 *                   description: Failed approvals with reasons
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - admin only
 */
