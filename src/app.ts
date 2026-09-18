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
import { tier2WriteRateLimit, tier3ReadRateLimit } from './middleware/rate-limit.middleware';

dotenv.config();

const app: Application = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Tiered rate limiting applied centrally.
//
// Tier 1 (Strict / 7 req per 15 min) is applied at the route level for:
//   POST /auth/login|register|verify|resend-otp|student-login
//   POST /payments/initiate
//
// Tier 2 (Moderate / 60 req per min) covers all other mutating operations
// here. The Tier 1 routes will be reached first by their own limiter before
// this block runs, so there's no double-counting.
//
// Tier 3 (Loose / 300 req per 15 min) covers all GET requests.
app.use((req, res, next) => {
  // Webhooks must always be reachable by Paystack / Zoom — skip entirely.
  if (req.path.startsWith('/webhooks') || req.path.startsWith('/api/webhooks')) {
    return next();
  }
  // Swagger docs and health checks skip rate limiting
  if (req.path.startsWith('/api-docs') || req.path === '/health') {
    return next();
  }
  // GET requests → Tier 3 (loose read limit).
  if (req.method === 'GET') {
    return tier3ReadRateLimit(req, res, next);
  }
  // All other methods (POST, PATCH, PUT, DELETE) → Tier 2 (moderate write limit).
  return tier2WriteRateLimit(req, res, next);
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

// API Routes mounted at both /api and root for backwards compatibility with tests and clients
const mountRoutes = (prefix: string = '') => {
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/me`, parentRoutes);
  app.use(`${prefix}/students`, studentRoutes);
  app.use(`${prefix}/student`, studentFacingRoutes);
  app.use(`${prefix}/enrollments`, enrollmentRoutes);
  app.use(`${prefix}/sessions`, sessionRoutes);
  app.use(`${prefix}/payments`, paymentRoutes);
  app.use(`${prefix}/progress-reports`, progressReportRoutes);
  app.use(`${prefix}/tutor`, tutorRoutes);
  app.use(`${prefix}/tutor-profile`, tutorRoutes);
  app.use(`${prefix}/admin`, adminRoutes);
  app.use(`${prefix}/subjects`, subjectsRoutes);
  app.use(`${prefix}/attendance`, attendanceRoutes);
  app.use(`${prefix}/assignments`, assignmentRoutes);
  app.use(`${prefix}/grades`, gradesRoutes);
  app.use(`${prefix}/notifications`, notificationsRoutes);
  app.use(`${prefix}/complaints`, complaintsRoutes);
  app.use(`${prefix}/messages`, messagesRoutes);
  app.use(`${prefix}/webhooks`, webhooksRoutes);
  app.use(`${prefix}/quiz`, quizRoutes);
};

mountRoutes('/api');
mountRoutes('');

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
