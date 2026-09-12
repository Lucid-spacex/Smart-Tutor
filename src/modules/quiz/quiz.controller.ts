import { Request, Response, NextFunction } from 'express';
import { QuizService } from './quiz.service';
import { CreateQuizQuestionInput, SubmitQuizAnswerInput, StartQuizInput, CompleteQuizInput } from './quiz.validation';
import { AuthRequest } from '../../middleware/auth.middleware';

export class QuizController {
  private quizService: QuizService;

  constructor() {
    this.quizService = new QuizService();
  }

  createQuestion = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tutorId = req.user?.userId;
      if (!tutorId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id: assignmentId } = req.params;
      const data: CreateQuizQuestionInput = req.body;
      const question = await this.quizService.createQuestion(assignmentId, data, tutorId);
      res.status(201).json(question);
    } catch (error) {
      next(error);
    }
  };

  getQuestions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      if (!userId || !userRole) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id: assignmentId } = req.params;
      const questions = await this.quizService.getQuestions(assignmentId, userId, userRole);
      res.status(200).json(questions);
    } catch (error) {
      next(error);
    }
  };

  startQuiz = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.user?.userId;
      if (!studentId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      if (req.user?.role !== 'STUDENT') {
        res.status(403).json({ error: 'Only students can start quizzes' });
        return;
      }

      const { id: assignmentId } = req.params;
      const attempt = await this.quizService.startQuiz(assignmentId, studentId);
      res.status(201).json(attempt);
    } catch (error) {
      next(error);
    }
  };

  submitAnswer = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.user?.userId;
      if (!studentId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      if (req.user?.role !== 'STUDENT') {
        res.status(403).json({ error: 'Only students can submit quiz answers' });
        return;
      }

      const { id: attemptId } = req.params;
      const data: SubmitQuizAnswerInput = req.body;
      const result = await this.quizService.submitAnswer(attemptId, data, studentId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  completeQuiz = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.user?.userId;
      if (!studentId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      if (req.user?.role !== 'STUDENT') {
        res.status(403).json({ error: 'Only students can complete quizzes' });
        return;
      }

      const { id: attemptId } = req.params;
      const result = await this.quizService.completeQuiz(attemptId, studentId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getAttempt = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      if (!userId || !userRole) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id: attemptId } = req.params;
      const attempt = await this.quizService.getAttempt(attemptId, userId, userRole);
      res.status(200).json(attempt);
    } catch (error) {
      next(error);
    }
  };
}
