/**
 * @swagger
 * /payments/initiate:
 *   post:
 *     summary: Initiate a payment for a single enrollment or an enrollment group
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enrollmentId:
 *                 type: string
 *                 format: uuid
 *                 description: "ID of single enrollment (mutually exclusive with enrollmentGroupId)"
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               enrollmentGroupId:
 *                 type: string
 *                 format: uuid
 *                 description: "ID of multi-subject enrollment group (mutually exclusive with enrollmentId)"
 *                 example: "987e6543-e89b-12d3-a456-426614174000"
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
 *                 displayAmountUSD:
 *                   type: number
 *                 chargedAmountNGN:
 *                   type: number
 *                 breakdown:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       enrollmentId:
 *                         type: string
 *                       subjectName:
 *                         type: string
 *                       amountNGN:
 *                         type: number
 *                       amountUSD:
 *                         type: number
 *       400:
 *         description: Validation error (e.g. neither or both IDs provided)
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Enrollment or enrollment group not found
 */

/**
 * @swagger
 * /payments/webhook:
 *   post:
 *     summary: Process payment provider webhook (Paystack)
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully, enrollments activated atomically
 *       400:
 *         description: Invalid webhook signature or payload
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
 *           nullable: true
 *         enrollmentGroupId:
 *           type: string
 *           format: uuid
 *           nullable: true
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
