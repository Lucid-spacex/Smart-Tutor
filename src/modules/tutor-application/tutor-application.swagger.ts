/**
 * @swagger
 * /tutor-application:
 *   get:
 *     summary: Get draft tutor application
 *     description: |
 *       Retrieves the current draft application for the authenticated tutor.
 *       If no draft exists, returns an empty application structure.
 *       Available to tutors regardless of approval status.
 *     tags: [Tutor Application]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Draft application retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 userId:
 *                   type: string
 *                   format: uuid
 *                 status:
 *                   type: string
 *                   enum: [DRAFT, SUBMITTED, APPROVED, REJECTED]
 *                 birthDay:
 *                   type: integer
 *                   minimum: 1
 *                   maximum: 31
 *                 birthMonth:
 *                   type: integer
 *                   minimum: 1
 *                   maximum: 12
 *                 country:
 *                   type: string
 *                 city:
 *                   type: string
 *                 highestQualification:
 *                   type: string
 *                   enum: [SSCE_WAEC, OND_NCE, HND, BACHELORS, BED_PGDE, MASTERS, PHD, OTHER]
 *                 subjects:
 *                   type: array
 *                   items:
 *                     type: string
 *                     format: uuid
 *                 levels:
 *                   type: array
 *                   items:
 *                     type: string
 *                     enum: [PRESCHOOL_TO_G1, G2_TO_G4, G5_TO_G8, G9_TO_G12, EXAM_LEVELS]
 *                 yearsOfExperience:
 *                   type: integer
 *                   minimum: 0
 *                 whyTeach:
 *                   type: string
 *                 howHeard:
 *                   type: string
 *                   enum: [TEACHMENEST_TUTOR_OR_STAFF, PARENT_OR_FAMILY, FRIEND_OR_FAMILY, INSTAGRAM, FACEBOOK, LINKEDIN, WHATSAPP_GROUP, GOOGLE_SEARCH, JOB_BOARD, OTHER]
 *                 aboutYou:
 *                   type: array
 *                   items:
 *                     type: string
 *                     maxLength: 60
 *                   maxItems: 3
 *                 documents:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       mimeType:
 *                         type: string
 *                       sizeBytes:
 *                         type: integer
 *                       url:
 *                         type: string
 *                       expiresAt:
 *                         type: string
 *                         format: date-time
 *                 submittedAt:
 *                   type: string
 *                   format: date-time
 *                 reviewedAt:
 *                   type: string
 *                   format: date-time
 *                 reviewedBy:
 *                   type: string
 *                   format: uuid
 *                 rejectionReason:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not a tutor
 */

/**
 * @swagger
 * /tutor-application:
 *   patch:
 *     summary: Update draft tutor application (autosave)
 *     description: |
 *       Partially updates the draft tutor application with the provided fields.
 *       This is an autosave endpoint - only provided fields are updated, others remain unchanged.
 *       Available to tutors regardless of approval status.
 *     tags: [Tutor Application]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               birthDay:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 31
 *                 example: 15
 *               birthMonth:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 12
 *                 example: 6
 *               country:
 *                 type: string
 *                 example: "Nigeria"
 *               city:
 *                 type: string
 *                 example: "Lagos"
 *               highestQualification:
 *                 type: string
 *                 enum: [SSCE_WAEC, OND_NCE, HND, BACHELORS, BED_PGDE, MASTERS, PHD, OTHER]
 *                 example: "BACHELORS"
 *               subjects:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 example: ["550e8400-e29b-41d4-a716-446655440001", "550e8400-e29b-41d4-a716-446655440002"]
 *               levels:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [PRESCHOOL_TO_G1, G2_TO_G4, G5_TO_G8, G9_TO_G12, EXAM_LEVELS]
 *                 example: ["G5_TO_G8", "G9_TO_G12"]
 *               yearsOfExperience:
 *                 type: integer
 *                 minimum: 0
 *                 example: 5
 *               whyTeach:
 *                 type: string
 *                 example: "I love teaching and helping students achieve their goals"
 *               howHeard:
 *                 type: string
 *                 enum: [TEACHMENEST_TUTOR_OR_STAFF, PARENT_OR_FAMILY, FRIEND_OR_FAMILY, INSTAGRAM, FACEBOOK, LINKEDIN, WHATSAPP_GROUP, GOOGLE_SEARCH, JOB_BOARD, OTHER]
 *                 example: "GOOGLE_SEARCH"
 *               aboutYou:
 *                 type: array
 *                 items:
 *                   type: string
 *                   maxLength: 60
 *                 maxItems: 3
 *                 example: ["Passionate educator with 5 years experience", "Specialized in mathematics and science", "Patient and adaptable teaching style"]
 *     responses:
 *       200:
 *         description: Application updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 userId:
 *                   type: string
 *                   format: uuid
 *                 status:
 *                   type: string
 *                   enum: [DRAFT, SUBMITTED, APPROVED, REJECTED]
 *                 birthDay:
 *                   type: integer
 *                 birthMonth:
 *                   type: integer
 *                 country:
 *                   type: string
 *                 city:
 *                   type: string
 *                 highestQualification:
 *                   type: string
 *                 subjects:
 *                   type: array
 *                   items:
 *                     type: string
 *                 levels:
 *                   type: array
 *                   items:
 *                     type: string
 *                 yearsOfExperience:
 *                   type: integer
 *                 whyTeach:
 *                   type: string
 *                 howHeard:
 *                   type: string
 *                 aboutYou:
 *                   type: array
 *                   items:
 *                     type: string
 *                 documents:
 *                   type: array
 *                   items:
 *                     type: object
 *                 submittedAt:
 *                   type: string
 *                   format: date-time
 *                 reviewedAt:
 *                   type: string
 *                   format: date-time
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not a tutor
 */

/**
 * @swagger
 * /tutor-application/documents:
 *   post:
 *     summary: Upload document for tutor application
 *     description: |
 *       Uploads a document (e.g., CV, certificates, credentials) to the tutor application.
 *       Files are stored in Cloudinary and a signed URL is returned.
 *       Maximum file size: 5MB. Supported formats: PDF, images, documents.
 *       Available to tutors regardless of approval status.
 *     tags: [Tutor Application]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Document file (max 5MB)
 *     responses:
 *       201:
 *         description: Document uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 name:
 *                   type: string
 *                   example: "my-certificate.pdf"
 *                 mimeType:
 *                   type: string
 *                   example: "application/pdf"
 *                 sizeBytes:
 *                   type: integer
 *                   example: 1048576
 *                 url:
 *                   type: string
 *                   format: uri
 *                   example: "https://res.cloudinary.com/..."
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: No file uploaded or file too large
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not a tutor
 *       503:
 *         description: Cloudinary not configured
 */

/**
 * @swagger
 * /tutor-application/documents/{id}:
 *   get:
 *     summary: Get signed URL for document download
 *     description: |
 *       Generates a signed URL for downloading a specific document.
 *       Available to authenticated users (tutors for their own documents, admins for all documents).
 *     tags: [Tutor Application]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the document
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Signed URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 name:
 *                   type: string
 *                 url:
 *                   type: string
 *                   format: uri
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user does not have access to this document
 *       404:
 *         description: Document not found
 */

/**
 * @swagger
 * /tutor-application/documents/{id}:
 *   delete:
 *     summary: Delete document from tutor application
 *     description: |
 *       Deletes a document from the tutor's application.
 *       The file is removed from Cloudinary storage.
 *       Available to tutors regardless of approval status.
 *     tags: [Tutor Application]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the document to delete
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Document deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Document deleted successfully"
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not a tutor
 *       404:
 *         description: Document not found
 */

/**
 * @swagger
 * /tutor-application/submit:
 *   post:
 *     summary: Submit tutor application for review
 *     description: |
 *       Submits the tutor application for admin review.
 *       All required fields must be completed before submission.
 *       Once submitted, the application cannot be modified until reviewed.
 *       Available to tutors regardless of approval status.
 *     tags: [Tutor Application]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - birthDay
 *               - birthMonth
 *               - country
 *               - city
 *               - highestQualification
 *               - subjects
 *               - levels
 *               - yearsOfExperience
 *               - whyTeach
 *               - howHeard
 *               - aboutYou
 *             properties:
 *               birthDay:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 31
 *                 example: 15
 *               birthMonth:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 12
 *                 example: 6
 *               country:
 *                 type: string
 *                 example: "Nigeria"
 *               city:
 *                 type: string
 *                 example: "Lagos"
 *               highestQualification:
 *                 type: string
 *                 enum: [SSCE_WAEC, OND_NCE, HND, BACHELORS, BED_PGDE, MASTERS, PHD, OTHER]
 *                 example: "BACHELORS"
 *               subjects:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *                 example: ["550e8400-e29b-41d4-a716-446655440001", "550e8400-e29b-41d4-a716-446655440002"]
 *               levels:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [PRESCHOOL_TO_G1, G2_TO_G4, G5_TO_G8, G9_TO_G12, EXAM_LEVELS]
 *                 minItems: 1
 *                 example: ["G5_TO_G8", "G9_TO_G12"]
 *               yearsOfExperience:
 *                 type: integer
 *                 minimum: 0
 *                 example: 5
 *               whyTeach:
 *                 type: string
 *                 minLength: 10
 *                 example: "I love teaching and helping students achieve their goals"
 *               howHeard:
 *                 type: string
 *                 enum: [TEACHMENEST_TUTOR_OR_STAFF, PARENT_OR_FAMILY, FRIEND_OR_FAMILY, INSTAGRAM, FACEBOOK, LINKEDIN, WHATSAPP_GROUP, GOOGLE_SEARCH, JOB_BOARD, OTHER]
 *                 example: "GOOGLE_SEARCH"
 *               aboutYou:
 *                 type: array
 *                 items:
 *                   type: string
 *                   maxLength: 60
 *                 minItems: 1
 *                 maxItems: 3
 *                 example: ["Passionate educator with 5 years experience", "Specialized in mathematics and science", "Patient and adaptable teaching style"]
 *     responses:
 *       200:
 *         description: Application submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 userId:
 *                   type: string
 *                   format: uuid
 *                 status:
 *                   type: string
 *                   enum: [DRAFT, SUBMITTED, APPROVED, REJECTED]
 *                   example: "SUBMITTED"
 *                 birthDay:
 *                   type: integer
 *                 birthMonth:
 *                   type: integer
 *                 country:
 *                   type: string
 *                 city:
 *                   type: string
 *                 highestQualification:
 *                   type: string
 *                 subjects:
 *                   type: array
 *                   items:
 *                     type: string
 *                 levels:
 *                   type: array
 *                   items:
 *                     type: string
 *                 yearsOfExperience:
 *                   type: integer
 *                 whyTeach:
 *                   type: string
 *                 howHeard:
 *                   type: string
 *                 aboutYou:
 *                   type: array
 *                   items:
 *                     type: string
 *                 documents:
 *                   type: array
 *                   items:
 *                     type: object
 *                 submittedAt:
 *                   type: string
 *                   format: date-time
 *                 reviewedAt:
 *                   type: string
 *                   format: date-time
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Validation error or incomplete application
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not a tutor
 *       409:
 *         description: Application already submitted
 */
