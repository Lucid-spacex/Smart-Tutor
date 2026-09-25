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
 *
 * /payments:
 *   get:
 *     summary: Get all payments for authenticated parent
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of payments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Payment'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *
 * /payments/verify/{reference}:
 *   get:
 *     summary: Verify payment by reference
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reference
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment reference from provider
 *     responses:
 *       200:
 *         description: Payment verification result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Invalid reference
 *       404:
 *         description: Payment not found
 */
