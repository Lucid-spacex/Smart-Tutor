import express, { Application } from 'express';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';
import { swaggerSpec } from './config/swagger';
import { errorHandler } from './middleware/error-handler.middleware';
import { config } from './config/env.config';
import prisma from './config/database';
import authRoutes from './modules/auth/auth.routes';
import parentRoutes from './modules/parent/parent.routes';
import studentRoutes from './modules/students/students.routes';
import studentFacingRoutes from './modules/student/student.routes';
import enrollmentRoutes from './modules/enrollments/enrollments.routes';
import sessionRoutes from './modules/sessions/sessions.routes';
import paymentRoutes from './modules/payments/payments.routes';
import progressReportRoutes from './modules/progress-reports/progress-reports.routes';
import tutorRoutes from './modules/tutor/tutor.routes';
import adminRoutes from './modules/admin/admin.routes';
import subjectsRoutes from './modules/subjects/subjects.routes';
import attendanceRoutes from './modules/attendance/attendance.routes';
import assignmentRoutes from './modules/assignments/assignments.routes';
import gradesRoutes from './modules/grades/grades.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import complaintsRoutes from './modules/complaints/complaints.routes';
import messagesRoutes from './modules/messages/messages.routes';
import webhooksRoutes from './modules/webhooks/webhooks.routes';
import quizRoutes from './modules/quiz/quiz.routes';
import { initializeScheduler } from './jobs/scheduler';
import { logger } from './config/logger';
import { generalRateLimit } from './middleware/rate-limit.middleware';

dotenv.config();

const app: Application = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply general rate limiting to all API routes (except health check and webhooks)
app.use('/api', (req, res, next) => {
  // Skip rate limiting for webhooks
  if (req.path.startsWith('/webhooks')) {
    return next();
  }
  generalRateLimit(req, res, next);
});

// CORS configuration
app.use((req, res, next) => {
  const allowedOrigins = config.NODE_ENV === 'production'
    ? (process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com'])
    : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'];

  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  // Handle OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Health check with database connectivity
app.get('/health', async (req, res) => {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: 'Database connection failed',
    });
  }
});

// API Documentation
app.use('/api-docs', swaggerUi.serve as any, swaggerUi.setup(swaggerSpec) as any);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/me', parentRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/student', studentFacingRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/progress-reports', progressReportRoutes);
app.use('/api/tutor', tutorRoutes);
app.use('/api/tutor-profile', tutorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/grades', gradesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/complaints', complaintsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/quiz', quizRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize scheduled background jobs
initializeScheduler();

const PORT = Number(config.PORT);

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📚 API Documentation available at http://localhost:${PORT}/api-docs`);
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);
    
    server.close(async () => {
      logger.info('HTTP server closed');
      
      try {
        await prisma.$disconnect();
        logger.info('Database connection closed');
        process.exit(0);
      } catch (error) {
        logger.error({ error }, 'Error during shutdown');
        process.exit(1);
      }
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

export default app;
