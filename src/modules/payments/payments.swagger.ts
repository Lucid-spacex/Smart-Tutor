/**
 * @swagger
 * /payments/initiate:
 *   post:
 *     summary: Initiate a payment for an enrollment
 *     tags: [Payments]
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
 *               - amount
 *             properties:
 *               enrollmentId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               amount:
 *                 type: number
 *                 example: 5000
 *               currency:
 *                 type: string
 *                 default: "USD"
 *                 example: "USD"
 *     responses:
 *       200:
 *         description: Payment initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 reference:
 *                   type: string
 *                 authorizationUrl:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Enrollment not found
 */

/**
 * @swagger
 * /payments/webhook:
 *   post:
 *     summary: Process payment provider webhook
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook data
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Payment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         parentId:
 *           type: string
 *           format: uuid
 *         enrollmentId:
 *           type: string
 *           format: uuid
 *         amount:
 *           type: number
 *           format: decimal
 *         currency:
 *           type: string
 *         provider:
 *           type: string
 *           enum: [PAYSTACK, STRIPE]
 *         providerReference:
 *           type: string
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [PENDING, SUCCESS, FAILED, REFUNDED]
 *         paidAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 */
