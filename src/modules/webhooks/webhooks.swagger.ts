/**
 * @swagger
 * /webhooks/zoom:
 *   post:
 *     summary: Handle Zoom webhook events
 *     tags: [Webhooks]
 *     description: Processes Zoom webhook events, primarily recording.completed events. Signature verified via HMAC.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event:
 *                 type: string
 *                 example: recording.completed
 *               object:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: Zoom meeting ID
 *                   download_url:
 *                     type: string
 *                     description: Recording download URL
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       401:
 *         description: Invalid webhook signature
 */
