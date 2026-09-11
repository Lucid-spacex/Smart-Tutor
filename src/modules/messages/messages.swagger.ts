/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: Messaging system with strict permission matrix enforcement
 */

/**
 * @swagger
 * /messages:
 *   post:
 *     summary: Send a message to an authorized recipient
 *     description: |
 *       Strict permissions enforced:
 *       - STUDENT <-> Assigned TUTOR (must have active enrollment together)
 *       - TUTOR <-> ADMIN
 *       - PARENT <-> ADMIN
 *       All other pairs (e.g. Student <-> Admin, Student <-> Parent, Parent <-> Tutor) return 403.
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipientId
 *               - body
 *             properties:
 *               recipientId:
 *                 type: string
 *                 format: uuid
 *               body:
 *                 type: string
 *                 maxLength: 2000
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Validation error or invalid recipient UUID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Messaging not permitted between these roles/users
 */

/**
 * @swagger
 * /messages/threads:
 *   get:
 *     summary: Get conversation threads for the authenticated user
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of conversation threads with previews and unread count
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /messages/threads/{threadId}:
 *   get:
 *     summary: Get all messages in a conversation thread
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Full message history for this thread
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied (user is not a participant in this thread)
 */

/**
 * @swagger
 * /messages/threads/{threadId}/read:
 *   patch:
 *     summary: Mark all messages in a thread as read
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Messages marked as read
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
