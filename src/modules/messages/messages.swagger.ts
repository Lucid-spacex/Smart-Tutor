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
 *       - TUTOR <-> ADMIN (shared inbox - any admin can reply)
 *       - PARENT <-> ADMIN (shared inbox - any admin can reply)
 *       All other pairs (e.g. Student <-> Admin, Student <-> Parent, Parent <-> Tutor) return 403.
 *       
 *       Shared Admin Inbox (2026-09-30):
 *       - Parents and tutors message "Admin" as a shared team inbox
 *       - Any admin can reply to parent/tutor threads, not just the original recipient
 *       - Admins see all parent/tutor threads in their thread list
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

/**
 * @swagger
 * /messages/admin-contact:
 *   get:
 *     summary: Get admin contact info for messaging
 *     description: |
 *       Returns an active admin user's ID and name for parents and tutors to start a conversation.
 *       This provides a "Message Admin" entry point without requiring knowledge of specific admin IDs.
 *       
 *       Shared Admin Inbox (2026-09-30):
 *       - Returns any active admin (who specifically doesn't matter)
 *       - Parents and tutors use this to get a recipientId for new admin conversations
 *       - Existing admin threads are automatically visible in GET /messages/threads
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin contact info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 adminUserId:
 *                   type: string
 *                   format: uuid
 *                   description: ID of an active admin user
 *                 adminName:
 *                   type: string
 *                   description: Full name of the admin
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied (only PARENT and TUTOR roles allowed)
 *       404:
 *         description: No active admin user found
 */
