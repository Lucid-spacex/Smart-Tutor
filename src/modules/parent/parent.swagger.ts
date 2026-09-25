/**
 * @swagger
 * /me:
 *   get:
 *     summary: Get current authenticated parent profile
 *     tags: [Parent]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Parent profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not a parent
 *       404:
 *         description: User not found
 */
