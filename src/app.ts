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

dotenv.config();

const app: Application = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Raw body parser for webhook signature verification
app.use('/payments/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
  (req as any).rawBody = req.body;
  req.body = JSON.parse(req.body.toString());
  next();
});

app.use('/webhooks/zoom', express.raw({ type: 'application/json' }), (req, res, next) => {
  (req as any).rawBody = req.body;
  req.body = JSON.parse(req.body.toString());
  next();
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
app.use('/auth', authRoutes);
app.use('/me', parentRoutes);
app.use('/students', studentRoutes);
app.use('/student', studentFacingRoutes);
app.use('/enrollments', enrollmentRoutes);
app.use('/sessions', sessionRoutes);
app.use('/payments', paymentRoutes);
app.use('/progress-reports', progressReportRoutes);
app.use('/tutor', tutorRoutes);
app.use('/tutor-profile', tutorRoutes);
app.use('/admin', adminRoutes);
app.use('/subjects', subjectsRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/assignments', assignmentRoutes);
app.use('/grades', gradesRoutes);
app.use('/notifications', notificationsRoutes);
app.use('/complaints', complaintsRoutes);
app.use('/messages', messagesRoutes);
app.use('/webhooks', webhooksRoutes);
app.use('/quiz', quizRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize scheduled background jobs
initializeScheduler();

const PORT = Number(config.PORT);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📚 API Documentation available at http://localhost:${PORT}/api-docs`);
  });
}

export default app;
