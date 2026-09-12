import { Router } from 'express';
import { QuizController } from './quiz.controller';
import { validate } from '../../middleware/validation.middleware';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { validateUUID } from '../../middleware/uuid-validation.middleware';
import { createQuizQuestionSchema, submitQuizAnswerSchema } from './quiz.validation';

const router = Router();
const quizController = new QuizController();

// Quiz Questions (TUTOR only)
router.post('/assignments/:id/questions', authenticate, requireRole('TUTOR'), validateUUID('id'), validate(createQuizQuestionSchema), quizController.createQuestion);
router.get('/assignments/:id/questions', authenticate, validateUUID('id'), quizController.getQuestions);

// Quiz Attempts (STUDENT only - explicit RBAC carve-out)
router.post('/assignments/:id/quiz/start', authenticate, requireRole('STUDENT'), validateUUID('id'), quizController.startQuiz);
router.post('/quiz-attempts/:id/answer', authenticate, requireRole('STUDENT'), validateUUID('id'), validate(submitQuizAnswerSchema), quizController.submitAnswer);
router.patch('/quiz-attempts/:id/complete', authenticate, requireRole('STUDENT'), validateUUID('id'), quizController.completeQuiz);

// Quiz Attempt Details (STUDENT for own, TUTOR for own assignments, ADMIN)
router.get('/quiz-attempts/:id', authenticate, validateUUID('id'), quizController.getAttempt);

export default router;
