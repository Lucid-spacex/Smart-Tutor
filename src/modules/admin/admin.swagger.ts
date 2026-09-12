/**
 * @swagger
 * /admin/pricing-tiers:
 *   get:
 *     summary: Get all pricing tiers with drift information
 *     tags: [Admin - Pricing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pricing tiers with drift analysis
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   gradeBandTier:
 *                     type: string
 *                     enum: [PRESCHOOL_TO_G1, G2_TO_G4, G5_TO_G8, G9_TO_G12]
 *                   yearlyPriceNGN:
 *                     type: number
 *                   yearlyPriceUSD:
 *                     type: number
 *                   impliedRate:
 *                     type: number
 *                   currentMarketRate:
 *                     type: number
 *                   driftPercentage:
 *                     type: number
 *                   needsReview:
 *                     type: boolean
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *   patch:
 *     summary: Update pricing tier
 *     tags: [Admin - Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: gradeBandTier
 *         required: true
 *         schema:
 *           type: string
 *           enum: [PRESCHOOL_TO_G1, G2_TO_G4, G5_TO_G8, G9_TO_G12]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               yearlyPriceNGN:
 *                 type: number
 *               yearlyPriceUSD:
 *                 type: number
 *     responses:
 *       200:
 *         description: Updated pricing tier
 */

/**
 * @swagger
 * /admin/enrollments/{id}/pricing:
 *   get:
 *     summary: Get enrollment pricing with effective price and source
 *     tags: [Admin - Pricing]
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
 *         description: Enrollment pricing details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 enrollmentId:
 *                   type: string
 *                 studentName:
 *                   type: string
 *                 studentCode:
 *                   type: string
 *                 subject:
 *                   type: string
 *                 gradeBandTier:
 *                   type: string
 *                 effectivePriceNGN:
 *                   type: number
 *                 effectivePriceUSD:
 *                   type: number
 *                 priceSource:
 *                   type: string
 *                   enum: [override, tier default]
 *                 overrideNGN:
 *                   type: number
 *                   nullable: true
 *                 overrideUSD:
 *                   type: number
 *                   nullable: true
 *                 billingFrequency:
 *                   type: string
 *   patch:
 *     summary: Set or clear enrollment pricing override
 *     tags: [Admin - Pricing]
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
 *             properties:
 *               yearlyPriceNGN:
 *                 type: number
 *                 nullable: true
 *               yearlyPriceUSD:
 *                 type: number
 *                 nullable: true
 *               billingFrequency:
 *                 type: string
 *                 enum: [WEEKLY, MONTHLY, YEARLY]
 *     responses:
 *       200:
 *         description: Updated enrollment
 */

/**
 * @swagger
 * /admin/exchange-rate/current:
 *   get:
 *     summary: Get current exchange rate
 *     tags: [Admin - Pricing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current exchange rate
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 fromCurrency:
 *                   type: string
 *                 toCurrency:
 *                   type: string
 *                 rate:
 *                   type: number
 *                 fetchedAt:
 *                   type: string
 *                   format: date-time
 */
