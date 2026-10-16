/**
 * @swagger
 * /pricing/quote:
 *   get:
 *     summary: Get pricing quote for a student's subjects
 *     description: |
 *       Returns a pricing quote for selected subjects for a specific student.
 *       The quote includes individual subject prices and totals based on the student's grade band tier.
 *       Only available to authenticated parents for their own students.
 *     tags: [Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the student (must belong to the authenticated parent)
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *       - in: query
 *         name: subjectIds
 *         required: true
 *         schema:
 *           type: string
 *         description: Comma-separated list of subject IDs to get pricing for
 *         example: "550e8400-e29b-41d4-a716-446655440001,550e8400-e29b-41d4-a716-446655440002"
 *     responses:
 *       200:
 *         description: Pricing quote generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 studentId:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440000"
 *                 studentName:
 *                   type: string
 *                   example: "John Doe"
 *                 gradeBandTier:
 *                   type: string
 *                   enum: [PRESCHOOL_TO_G1, G2_TO_G4, G5_TO_G8, G9_TO_G12]
 *                   example: "G5_TO_G8"
 *                 quotes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       subjectId:
 *                         type: string
 *                         format: uuid
 *                       subjectName:
 *                         type: string
 *                       category:
 *                         type: string
 *                         enum: [CORE, ENRICHMENT, TEST_PREP]
 *                       yearlyPriceNGN:
 *                         type: number
 *                       yearlyPriceUSD:
 *                         type: number
 *                       source:
 *                         type: string
 *                         example: "subject_price"
 *                 totals:
 *                   type: object
 *                   properties:
 *                     yearlyPriceNGN:
 *                       type: number
 *                     yearlyPriceUSD:
 *                       type: number
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not a parent
 *       404:
 *         description: Student not found or not owned by parent, or no price configured
 */
