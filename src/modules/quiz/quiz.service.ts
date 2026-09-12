import prisma from '../../config/database';
import { CreateQuizQuestionInput, SubmitQuizAnswerInput, StartQuizInput, CompleteQuizInput } from './quiz.validation';
import { logger } from '../../config/logger';

const MAX_TIME_SECONDS = 30; // Default max time per question
const SPEED_MULTIPLIER_FLOOR = 0.5; // Minimum multiplier even at max time

export class QuizService {
  /**
   * Create a quiz question for an assignment (TUTOR only)
   */
  async createQuestion(assignmentId: string, data: CreateQuizQuestionInput, tutorId: string) {
    // Verify assignment exists and is a TEST type
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        enrollment: true,
      },
    });

    if (!assignment) {
      throw new Error('Assignment not found');
    }

    if (assignment.type !== 'TEST') {
      throw new Error('Quiz questions can only be added to TEST type assignments');
    }

    // Verify tutor owns this assignment
    if (assignment.createdBy !== tutorId) {
      throw new Error('Not authorized to add questions to this assignment');
    }

    // Validate correctOptionIndex is within options array bounds
    if (data.correctOptionIndex >= data.options.length) {
      throw new Error('Correct option index must be within options array bounds');
    }

    return prisma.quizQuestion.create({
      data: {
        assignmentId,
        questionText: data.questionText,
        options: data.options,
        correctOptionIndex: data.correctOptionIndex,
        points: data.points,
        orderIndex: data.orderIndex,
      },
    });
  }

  /**
   * Get quiz questions for an assignment
   * - Tutors see everything including correctOptionIndex
   * - Students see everything EXCEPT correctOptionIndex
   */
  async getQuestions(assignmentId: string, userId: string, userRole: string) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new Error('Assignment not found');
    }

    const questions = await prisma.quizQuestion.findMany({
      where: { assignmentId },
      orderBy: { orderIndex: 'asc' },
    });

    // For students, exclude correctOptionIndex
    if (userRole === 'STUDENT') {
      return questions.map(q => ({
        id: q.id,
        questionText: q.questionText,
        options: q.options,
        points: q.points,
        orderIndex: q.orderIndex,
        // correctOptionIndex intentionally omitted
      }));
    }

    // For tutors and admins, include everything
    return questions;
  }

  /**
   * Start a quiz attempt (STUDENT only)
   */
  async startQuiz(assignmentId: string, studentId: string) {
    // Verify assignment exists and is a TEST type
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        enrollment: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new Error('Assignment not found');
    }

    if (assignment.type !== 'TEST') {
      throw new Error('Can only start quiz for TEST type assignments');
    }

    // Verify student is enrolled in this assignment
    if (assignment.enrollment.studentId !== studentId) {
      throw new Error('Not authorized to start this quiz');
    }

    // Check if student already has an in-progress attempt
    const existingAttempt = await prisma.quizAttempt.findFirst({
      where: {
        assignmentId,
        studentId,
        status: 'IN_PROGRESS',
      },
    });

    if (existingAttempt) {
      return existingAttempt; // Return existing attempt
    }

    // Check if student already completed this quiz
    const completedAttempt = await prisma.quizAttempt.findFirst({
      where: {
        assignmentId,
        studentId,
        status: 'COMPLETED',
      },
    });

    if (completedAttempt) {
      throw new Error('You have already completed this quiz');
    }

    // Create new attempt
    return prisma.quizAttempt.create({
      data: {
        assignmentId,
        studentId,
        status: 'IN_PROGRESS',
      },
    });
  }

  /**
   * Submit an answer to a quiz question (STUDENT only)
   * Server-side scoring - never trust client-provided correctness
   */
  async submitAnswer(attemptId: string, data: SubmitQuizAnswerInput, studentId: string) {
    // Verify attempt exists and belongs to student
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        assignment: true,
      },
    });

    if (!attempt) {
      throw new Error('Quiz attempt not found');
    }

    if (attempt.studentId !== studentId) {
      throw new Error('Not authorized to submit answers for this attempt');
    }

    if (attempt.status !== 'IN_PROGRESS') {
      throw new Error('Cannot submit answers for a completed quiz');
    }

    // Get the question with correct answer
    const question = await prisma.quizQuestion.findUnique({
      where: { id: data.questionId },
    });

    if (!question) {
      throw new Error('Question not found');
    }

    // Verify question belongs to this assignment
    if (question.assignmentId !== attempt.assignmentId) {
      throw new Error('Question does not belong to this quiz');
    }

    // Check if already answered this question
    const existingResponse = await prisma.quizResponse.findFirst({
      where: {
        attemptId,
        questionId: data.questionId,
      },
    });

    if (existingResponse) {
      throw new Error('You have already answered this question');
    }

    // Server-side correctness check
    const isCorrect = data.selectedOptionIndex === question.correctOptionIndex;

    // Calculate points with speed multiplier
    let pointsAwarded = 0;
    if (isCorrect) {
      const basePoints = Number(question.points);
      const timeRatio = Math.min(data.timeTakenSeconds / MAX_TIME_SECONDS, 1);
      const speedMultiplier = 1.0 - (timeRatio * (1.0 - SPEED_MULTIPLIER_FLOOR));
      pointsAwarded = basePoints * speedMultiplier;
      pointsAwarded = Math.round(pointsAwarded * 100) / 100; // Round to 2 decimal places
    }

    // Create response
    const response = await prisma.quizResponse.create({
      data: {
        attemptId,
        questionId: data.questionId,
        selectedOptionIndex: data.selectedOptionIndex,
        isCorrect,
        timeTakenSeconds: data.timeTakenSeconds,
        pointsAwarded,
      },
    });

    logger.info({
      attemptId,
      questionId: data.questionId,
      isCorrect,
      pointsAwarded,
    }, 'Quiz answer submitted');

    return {
      isCorrect,
      pointsAwarded,
    };
  }

  /**
   * Complete a quiz attempt (STUDENT only)
   * Creates a Grade record with PENDING_APPROVAL status
   */
  async completeQuiz(attemptId: string, studentId: string) {
    // Verify attempt exists and belongs to student
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        assignment: {
          include: {
            enrollment: true,
          },
        },
        responses: true,
      },
    });

    if (!attempt) {
      throw new Error('Quiz attempt not found');
    }

    if (attempt.studentId !== studentId) {
      throw new Error('Not authorized to complete this attempt');
    }

    if (attempt.status !== 'IN_PROGRESS') {
      throw new Error('Quiz is already completed');
    }

    // Calculate total score
    const totalScore = attempt.responses.reduce(
      (sum, response) => sum + Number(response.pointsAwarded),
      0
    );

    // Update attempt status
    const updatedAttempt = await prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'COMPLETED',
        totalScore,
        completedAt: new Date(),
      },
    });

    // Create Grade record with PENDING_APPROVAL status
    const grade = await prisma.grade.create({
      data: {
        enrollmentId: attempt.assignment.enrollmentId,
        assignmentId: attempt.assignmentId,
        gradedBy: studentId, // Self-graded, but needs admin approval
        score: totalScore,
        comments: 'Auto-graded quiz. Pending admin approval.',
        status: 'PENDING_APPROVAL',
        visibleToStudent: false, // Hidden until approved
      },
    });

    logger.info({
      attemptId,
      totalScore,
      gradeId: grade.id,
    }, 'Quiz completed and grade created');

    return {
      attempt: updatedAttempt,
      grade,
    };
  }

  /**
   * Get quiz attempt details
   */
  async getAttempt(attemptId: string, userId: string, userRole: string) {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        assignment: {
          include: {
            enrollment: {
              include: {
                student: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
        responses: {
          include: {
            question: true,
          },
        },
      },
    });

    if (!attempt) {
      throw new Error('Quiz attempt not found');
    }

    // Authorization check
    if (userRole === 'STUDENT' && attempt.studentId !== userId) {
      throw new Error('Not authorized to view this attempt');
    }

    // For students, hide correctOptionIndex in responses
    if (userRole === 'STUDENT') {
      const sanitizedResponses = attempt.responses.map(r => ({
        ...r,
        question: {
          ...r.question,
          correctOptionIndex: undefined, // Hide correct answer
        },
      }));

      return {
        ...attempt,
        responses: sanitizedResponses,
      };
    }

    return attempt;
  }
}
