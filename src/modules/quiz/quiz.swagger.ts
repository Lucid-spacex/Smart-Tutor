/**
 * @swagger
 * /quiz/assignments/{id}/questions:
 *   post:
 *     summary: Create a quiz question (TUTOR only)
 *     tags: [Quiz]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - questionText
 *               - options
 *               - correctOptionIndex
 *             properties:
 *               questionText:
 *                 type: string
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 2
 *                 maxItems: 6
 *               correctOptionIndex:
 *                 type: integer
 *                 minimum: 0
 *               points:
 *                 type: number
 *                 default: 10
 *               orderIndex:
 *                 type: integer
 *                 minimum: 0
 *     responses:
 *       201:
 *         description: Created quiz question
 *   get:
 *     summary: Get quiz questions for an assignment
 *     tags: [Quiz]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of quiz questions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   questionText:
 *                     type: string
 *                   options:
 *                     type: array
 *                     items:
 *                       type: string
 *                   points:
 *                     type: number
 *                   orderIndex:
 *                     type: integer
 *                   correctOptionIndex:
 *                     type: integer
 *                     description: Only included for TUTOR and ADMIN, excluded for STUDENT
 */

/**
 * @swagger
 * /quiz/assignments/{id}/quiz/start:
 *   post:
 *     summary: Start a quiz attempt (STUDENT only)
 *     tags: [Quiz]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Quiz attempt created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 assignmentId:
 *                   type: string
 *                 studentId:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [IN_PROGRESS, COMPLETED]
 *                 startedAt:
 *                   type: string
 *                   format: date-time
 */

/**
 * @swagger
 * /quiz/quiz-attempts/{id}/answer:
 *   post:
 *     summary: Submit an answer to a quiz question (STUDENT only)
 *     tags: [Quiz]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - questionId
 *               - selectedOptionIndex
 *               - timeTakenSeconds
 *             properties:
 *               questionId:
 *                 type: string
 *               selectedOptionIndex:
 *                 type: integer
 *                 minimum: 0
 *               timeTakenSeconds:
 *                 type: integer
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Answer submitted with immediate feedback
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isCorrect:
 *                   type: boolean
 *                 pointsAwarded:
 *                   type: number
 */

/**
 * @swagger
 * /quiz/quiz-attempts/{id}/complete:
 *   patch:
 *     summary: Complete a quiz attempt (STUDENT only)
 *     tags: [Quiz]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quiz completed, grade created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 attempt:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [COMPLETED]
 *                     totalScore:
 *                       type: number
 *                     completedAt:
 *                       type: string
 *                       format: date-time
 *                 grade:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     score:
 *                       type: number
 *                     status:
 *                       type: string
 *                       enum: [PENDING_APPROVAL]
 */

/**
 * @swagger
 * /quiz/quiz-attempts/{id}:
 *   get:
 *     summary: Get quiz attempt details
 *     tags: [Quiz]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quiz attempt with responses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 assignmentId:
 *                   type: string
 *                 studentId:
 *                   type: string
 *                 status:
 *                   type: string
 *                 totalScore:
 *                   type: number
 *                 startedAt:
 *                   type: string
 *                   format: date-time
 *                 completedAt:
 *                   type: string
 *                   format: date-time
 *                 responses:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       questionId:
 *                         type: string
 *                       selectedOptionIndex:
 *                         type: integer
 *                       isCorrect:
 *                         type: boolean
 *                       timeTakenSeconds:
 *                         type: integer
 *                       pointsAwarded:
 *                         type: number
 *                       question:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           questionText:
 *                             type: string
 *                           options:
 *                             type: array
 *                             items:
 *                               type: string
 *                           correctOptionIndex:
 *                             type: integer
 *                             description: Only included for TUTOR and ADMIN, excluded for STUDENT
 */
