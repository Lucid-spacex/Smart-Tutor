import prisma from '../../config/database';
import { logger } from '../../config/logger';
import { v2 as cloudinary } from 'cloudinary';
import { config } from '../../config/env.config';
import { NotificationsService } from '../notifications/notifications.service';
import { sendNotificationEmail } from '../../utils/email.util';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
});

export class TutorApplicationService {
  private notificationsService: NotificationsService;

  constructor() {
    this.notificationsService = new NotificationsService();
  }

  /**
   * Create an empty application draft for a newly registered tutor
   */
  async createDraftApplication(userId: string) {
    try {
      const application = await prisma.tutorApplication.create({
        data: {
          userId,
          status: 'DRAFT',
          birthDay: 1,
          birthMonth: 1,
          country: '',
          city: '',
          highestQualification: 'OTHER',
          levels: [],
          yearsOfExperience: 0,
          whyTeach: '',
          howHeard: 'OTHER',
          aboutYou: [],
        },
      });

      logger.info({ userId, applicationId: application.id }, 'Created tutor application draft');
      return application;
    } catch (error) {
      logger.error({ userId, error }, 'Failed to create tutor application draft');
      throw error;
    }
  }

  /**
   * Get tutor's application draft
   */
  async getApplication(userId: string) {
    const application = await prisma.tutorApplication.findUnique({
      where: { userId },
      include: {
        subjects: {
          include: {
            subject: true,
          },
        },
        documents: true,
      },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    // Calculate missing fields for submit validation
    const missingFields: string[] = [];
    if (!application.birthDay || !application.birthMonth) missingFields.push('birthDate');
    if (!application.country) missingFields.push('country');
    if (!application.city) missingFields.push('city');
    if (!application.highestQualification) missingFields.push('highestQualification');
    if (application.subjects.length === 0) missingFields.push('subjects');
    if (application.levels.length === 0) missingFields.push('levels');
    if (application.yearsOfExperience === undefined || application.yearsOfExperience === null) missingFields.push('yearsOfExperience');
    if (!application.whyTeach) missingFields.push('whyTeach');
    if (!application.howHeard) missingFields.push('howHeard');
    if (!application.aboutYou || application.aboutYou.length === 0) missingFields.push('aboutYou');
    if (application.documents.length === 0) missingFields.push('documents');

    // Check if user has profile picture
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profilePicture: true },
    });
    if (!user?.profilePicture) missingFields.push('profilePicture');

    return {
      ...application,
      missingFields,
    };
  }

  /**
   * Partial update (autosave) - validates types but not required fields
   */
  async updateApplication(userId: string, data: any) {
    const application = await prisma.tutorApplication.findUnique({
      where: { userId },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    if (application.status !== 'DRAFT') {
      throw new Error('Cannot update submitted application');
    }

    // Handle subjects update
    let subjectsUpdate = {};
    if (data.subjects !== undefined) {
      // Delete existing subjects
      await prisma.tutorApplicationSubject.deleteMany({
        where: { applicationId: application.id },
      });

      // Create new subjects
      if (data.subjects.length > 0) {
        await prisma.tutorApplicationSubject.createMany({
          data: data.subjects.map((subjectId: string) => ({
            applicationId: application.id,
            subjectId,
          })),
        });
      }
      delete data.subjects;
    }

    const updated = await prisma.tutorApplication.update({
      where: { userId },
      data: {
        ...data,
        lastSavedAt: new Date(),
      },
      include: {
        subjects: {
          include: {
            subject: true,
          },
        },
      },
    });

    logger.info({ userId, applicationId: application.id }, 'Updated tutor application draft');
    return updated;
  }

  /**
   * Upload document to Cloudinary (private/authenticated)
   */
  async uploadDocument(userId: string, file: Express.Multer.File) {
    const application = await prisma.tutorApplication.findUnique({
      where: { userId },
      include: { documents: true },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    if (application.status !== 'DRAFT') {
      throw new Error('Cannot upload documents for submitted application');
    }

    if (application.documents.length >= 5) {
      throw new Error('Maximum 5 documents allowed');
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type. Allowed: PDF, DOC, DOCX, JPG, PNG');
    }

    // Validate file size (5 MB max)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size exceeds 5 MB limit');
    }

    // Upload to Cloudinary as private/authenticated
    const result = await cloudinary.uploader.upload(file.path, {
      resource_type: 'auto',
      type: 'private', // Authenticated access only
      folder: 'tutor-applications',
      public_id: `${userId}-${Date.now()}`,
    });

    // Save document record
    const document = await prisma.tutorDocument.create({
      data: {
        applicationId: application.id,
        publicId: result.public_id,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
    });

    logger.info({ userId, documentId: document.id }, 'Uploaded tutor application document');
    return document;
  }

  /**
   * Generate short-lived signed URL for document download (10 minutes)
   */
  async getDocumentSignedUrl(documentId: string, requestorId: string, requestorRole: string) {
    const document = await prisma.tutorDocument.findUnique({
      where: { id: documentId },
      include: { application: true },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Authorization: only the tutor themselves or admins can access
    if (requestorRole !== 'ADMIN' && document.application.userId !== requestorId) {
      throw new Error('Not authorized to access this document');
    }

    // Generate signed URL with 10-minute expiry
    const signedUrl = cloudinary.url(document.publicId, {
      type: 'private',
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + 600, // 10 minutes
    });

    return {
      id: document.id,
      originalName: document.originalName,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      url: signedUrl,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    };
  }

  /**
   * Delete document and Cloudinary asset
   */
  async deleteDocument(documentId: string, userId: string) {
    const document = await prisma.tutorDocument.findUnique({
      where: { id: documentId },
      include: { application: true },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    if (document.application.userId !== userId) {
      throw new Error('Not authorized to delete this document');
    }

    if (document.application.status !== 'DRAFT') {
      throw new Error('Cannot delete documents from submitted application');
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(document.publicId, {
      resource_type: 'auto',
      type: 'private',
    });

    // Delete from database
    await prisma.tutorDocument.delete({
      where: { id: documentId },
    });

    logger.info({ userId, documentId }, 'Deleted tutor application document');
    return { message: 'Document deleted successfully' };
  }

  /**
   * Submit application with full validation
   */
  async submitApplication(userId: string) {
    const application = await prisma.tutorApplication.findUnique({
      where: { userId },
      include: {
        subjects: true,
        documents: true,
        user: true,
      },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    if (application.status !== 'DRAFT') {
      throw new Error('Application has already been submitted');
    }

    // Full validation
    const missingFields: string[] = [];
    if (!application.birthDay || !application.birthMonth) missingFields.push('birthDate');
    if (!application.country) missingFields.push('country');
    if (!application.city) missingFields.push('city');
    if (!application.highestQualification) missingFields.push('highestQualification');
    if (application.subjects.length === 0) missingFields.push('subjects');
    if (application.levels.length === 0) missingFields.push('levels');
    if (application.yearsOfExperience === undefined || application.yearsOfExperience === null) missingFields.push('yearsOfExperience');
    if (!application.whyTeach) missingFields.push('whyTeach');
    if (!application.howHeard) missingFields.push('howHeard');
    if (!application.aboutYou || application.aboutYou.length === 0) missingFields.push('aboutYou');
    if (application.documents.length === 0) missingFields.push('documents');
    if (!application.user.profilePicture) missingFields.push('profilePicture');

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Update status to SUBMITTED
    const updated = await prisma.tutorApplication.update({
      where: { userId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    // Notify all admins
    await this.notificationsService.notifyAdmins('NEW_TUTOR_APPLICATION', {
      title: 'New Tutor Application',
      message: `A new tutor application has been submitted by ${application.user.fullName}`,
      relatedType: 'TUTOR_APPLICATION',
      relatedId: application.id,
    });

    // Send confirmation email to applicant
    await sendNotificationEmail(
      application.user.email!,
      application.user.fullName,
      'Application Submitted',
      'Your tutor application has been submitted successfully. We will review it and get back to you soon.'
    );

    logger.info({ userId, applicationId: application.id }, 'Submitted tutor application');
    return updated;
  }

  /**
   * Admin: Approve or reject application
   */
  async reviewApplication(userId: string, adminId: string, vettingStatus: 'APPROVED' | 'REJECTED', reason?: string) {
    const application = await prisma.tutorApplication.findUnique({
      where: { userId },
      include: {
        user: true,
        subjects: {
          include: {
            subject: true,
          },
        },
      },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    if (application.status !== 'SUBMITTED') {
      throw new Error('Can only review submitted applications');
    }

    if (vettingStatus === 'REJECTED' && !reason) {
      throw new Error('Rejection reason is required');
    }

    if (vettingStatus === 'APPROVED') {
      // Update user status to APPROVED
      await prisma.user.update({
        where: { id: userId },
        data: { status: 'APPROVED' },
      });

      // Create or update TutorProfile from application
      const existingProfile = await prisma.tutorProfile.findUnique({
        where: { userId },
      });

      const bio = application.aboutYou.join('\n\n');

      if (existingProfile) {
        await prisma.tutorProfile.update({
          where: { userId },
          data: {
            bio,
            // subjects are already in TutorSubject from the application
          },
        });
      } else {
        await prisma.tutorProfile.create({
          data: {
            userId,
            bio,
            hourlyRate: 0, // Admin will set this later
            availability: '{}',
            vettingStatus: 'APPROVED',
          },
        });
      }

      // Copy subjects to TutorSubject
      await prisma.tutorSubject.deleteMany({
        where: { tutorProfileId: existingProfile?.id || '' },
      });

      if (existingProfile) {
        await prisma.tutorSubject.createMany({
          data: application.subjects.map(ts => ({
            tutorProfileId: existingProfile.id,
            subjectId: ts.subjectId,
          })),
        });
      }

      // Notify tutor
      await this.notificationsService.createNotification(
        userId,
        'TUTOR_APPROVED',
        {
          title: 'Application Approved',
          message: 'Congratulations! Your tutor application has been approved. You can now set your availability and start tutoring.',
          relatedType: 'USER',
          relatedId: userId,
        }
      );

      await sendNotificationEmail(
        application.user.email!,
        application.user.fullName,
        'Application Approved',
        'Congratulations! Your tutor application has been approved. You can now set your availability and start tutoring.'
      );

      logger.info({ userId, adminId }, 'Approved tutor application');
    } else {
      // REJECTED
      await prisma.user.update({
        where: { id: userId },
        data: { status: 'REJECTED' },
      });

      // Notify tutor
      await this.notificationsService.createNotification(
        userId,
        'TUTOR_REJECTED',
        {
          title: 'Application Rejected',
          message: `Your tutor application was not approved. Reason: ${reason}`,
          relatedType: 'USER',
          relatedId: userId,
        }
      );

      await sendNotificationEmail(
        application.user.email!,
        application.user.fullName,
        'Application Rejected',
        `Your tutor application was not approved. Reason: ${reason}`
      );

      logger.info({ userId, adminId, reason }, 'Rejected tutor application');
    }

    // Update application
    const updated = await prisma.tutorApplication.update({
      where: { userId },
      data: {
        status: vettingStatus === 'APPROVED' ? 'APPROVED' : 'REJECTED',
        reviewedAt: new Date(),
        reviewedBy: adminId,
        rejectionReason: reason,
      },
    });

    return updated;
  }
}
