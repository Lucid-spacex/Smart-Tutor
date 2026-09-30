import multer from 'multer';
import path from 'path';
import { Request, Response, NextFunction } from 'express';

// Configure memory storage for Cloudinary uploads (files stored in memory as buffers)
const memoryStorage = multer.memoryStorage();

// File filter to only accept images (for profile pictures)
const imageFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)'));
  }
};

// File filter to accept images and PDFs (for assignments)
const assignmentFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only image and PDF files are allowed (JPEG, PNG, GIF, WebP, PDF)'));
  }
};

// Configure multer for profile pictures (images only, 5MB, memory storage for Cloudinary)
const profilePictureUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: imageFileFilter,
});

// Configure multer for assignments (images + PDF, 10MB, memory storage for Cloudinary)
const assignmentUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: assignmentFileFilter,
});

// Error handling middleware for multer
export const handleUploadError = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'File size exceeds limit' });
      return;
    }
    res.status(400).json({ error: err.message });
    return;
  }
  if (err.message.includes('Only image files are allowed') || err.message.includes('Only image and PDF files are allowed')) {
    res.status(400).json({ error: err.message });
    return;
  }
  next(err);
};

export const uploadProfilePicture = profilePictureUpload.single('profilePicture');
export const uploadAttachment = assignmentUpload.single('attachment');