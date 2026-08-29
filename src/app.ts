import express, { Application } from 'express';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';
import { swaggerSpec } from './config/swagger';
import { errorHandler } from './middleware/error-handler.middleware';
import authRoutes from './modules/auth/auth.routes';
import parentRoutes from './modules/parent/parent.routes';
import studentRoutes from './modules/students/students.routes';
import enrollmentRoutes from './modules/enrollments/enrollments.routes';
import sessionRoutes from './modules/sessions/sessions.routes';
import paymentRoutes from './modules/payments/payments.routes';
import progressReportRoutes from './modules/progress-reports/progress-reports.routes';
import tutorRoutes from './modules/tutor/tutor.routes';
import adminRoutes from './modules/admin/admin.routes';
import subjectsRoutes from './modules/subjects/subjects.routes';

dotenv.config();

const app: Application = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS (for development)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  // Use req.method to handle OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Documentation
app.use('/api-docs', swaggerUi.serve as any, swaggerUi.setup(swaggerSpec) as any);

// API Routes
app.use('/auth', authRoutes);
app.use('/me', parentRoutes);
app.use('/students', studentRoutes);
app.use('/enrollments', enrollmentRoutes);
app.use('/sessions', sessionRoutes);
app.use('/payments', paymentRoutes);
app.use('/progress-reports', progressReportRoutes);
app.use('/tutor', tutorRoutes);
app.use('/admin', adminRoutes);
app.use('/subjects', subjectsRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API Documentation available at http://localhost:${PORT}/api-docs`);
});

export default app;
