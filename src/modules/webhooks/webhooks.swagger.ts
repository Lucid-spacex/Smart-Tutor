/**
 * @swagger
 * /webhooks/paystack:
 *   post:
 *     summary: Handle Paystack webhook events
 *     tags: [Webhooks]
 *     description: Processes Paystack payment webhook events for payment status updates.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event:
 *                 type: string
 *                 example: charge.success
 *               data:
 *                 type: object
 *                 properties:
 *                   reference:
 *                     type: string
 *                     description: Payment reference
 *                   status:
 *                     type: string
 *                     description: Payment status
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 */
