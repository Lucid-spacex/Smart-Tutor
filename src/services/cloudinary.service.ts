import { v2 as cloudinary } from 'cloudinary';
import { logger } from '../config/logger';
import { AppError } from '../middleware/error-handler.middleware';

/**
 * Cloudinary Service
 * Handles file uploads to Cloudinary for profile pictures, attachments, etc.
 */
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
      api_key: process.env.CLOUDINARY_API_KEY || '',
      api_secret: process.env.CLOUDINARY_API_SECRET || '',
    });

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      logger.warn('Cloudinary credentials not configured, file uploads will be disabled');
    }
  }

  /**
   * Upload a file to Cloudinary
   * @param fileBase64 Base64 encoded file or file path
   * @param folder Folder to upload to (e.g., 'profile-pictures', 'assignments', 'grades')
   * @param resourceType Type of resource (image, raw, etc.)
   * @returns Promise with public URL and metadata
   */
  async uploadFile(
    fileBase64: string,
    folder: string,
    resourceType: 'image' | 'raw' = 'image'
  ): Promise<{ url: string; publicId: string; filename: string; size: number; type: string }> {
    try {
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        throw new AppError(503, 'Cloudinary is not configured. File uploads are disabled.');
      }

      const uploadOptions: any = {
        folder,
        resource_type: resourceType,
        allowed_formats: resourceType === 'image' ? ['jpg', 'jpeg', 'png', 'gif', 'webp'] : ['pdf'],
        max_file_size: 10 * 1024 * 1024, // 10MB limit
      };

      // Use upload preset if configured (for unsigned uploads)
      if (process.env.CLOUDINARY_UPLOAD_PRESET) {
        uploadOptions.upload_preset = process.env.CLOUDINARY_UPLOAD_PRESET;
      }

      logger.info({ folder, resourceType, hasPreset: !!uploadOptions.upload_preset }, 'Attempting Cloudinary upload');

      const result = await cloudinary.uploader.upload(fileBase64, uploadOptions);

      logger.info({ publicId: result.public_id, folder }, 'File uploaded to Cloudinary successfully');

      return {
        url: result.secure_url,
        publicId: result.public_id,
        filename: result.original_filename || 'file',
        size: result.bytes || 0,
        type: result.format || 'unknown',
      };
    } catch (error: any) {
      logger.error({
        error: error.message,
        httpCode: error.http_code,
        cloudinaryError: error,
        folder,
        resourceType,
      }, 'Failed to upload file to Cloudinary');

      if (error.http_code === 400) {
        throw new AppError(400, 'Invalid file type or file too large. Only images (jpg, jpeg, png, gif, webp) and PDFs up to 10MB are allowed.');
      }

      if (error.http_code === 403) {
        throw new AppError(403, 'Cloudinary authentication failed. Please check your API credentials or upload preset.');
      }

      throw new AppError(502, 'Failed to upload file. Please try again later.');
    }
  }

  /**
   * Delete a file from Cloudinary
   * @param publicId Cloudinary public ID of the file
   */
  async deleteFile(publicId: string): Promise<void> {
    try {
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        logger.warn('Cloudinary not configured, skipping file deletion');
        return;
      }

      await cloudinary.uploader.destroy(publicId);
      logger.info({ publicId }, 'File deleted from Cloudinary successfully');
    } catch (error) {
      logger.error({ error, publicId }, 'Failed to delete file from Cloudinary');
      // Don't throw error - deletion failures shouldn't block the main operation
    }
  }

  /**
   * Validate file before upload
   * @param file File object with mimetype and size
   * @param maxSizeMB Maximum file size in MB
   * @returns True if valid, throws error if invalid
   */
  validateFile(file: any, maxSizeMB: number = 10): boolean {
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const allowedPdfTypes = ['application/pdf'];
    const allowedTypes = [...allowedImageTypes, ...allowedPdfTypes];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new AppError(400, 'Invalid file type. Only images (jpg, jpeg, png, gif, webp) and PDFs are allowed.');
    }

    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new AppError(400, `File too large. Maximum size is ${maxSizeMB}MB.`);
    }

    return true;
  }

  /**
   * Convert buffer to base64 string for Cloudinary upload
   * @param buffer File buffer
   * @param mimetype File mimetype
   * @returns Base64 data URI
   */
  bufferToBase64(buffer: Buffer, mimetype: string): string {
    return `data:${mimetype};base64,${buffer.toString('base64')}`;
  }
}
