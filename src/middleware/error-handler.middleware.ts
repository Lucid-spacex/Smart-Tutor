import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.config';
import { logger } from '../config/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public errorCode?: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    // Operational errors (expected: validation failures, not-found, unauthorized)
    logger.info({
      error: err.message,
      errorCode: err.errorCode,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
      ...(config.NODE_ENV === 'development' && { stack: err.stack }),
    }, 'Operational error');

    const response: any = {
      error: err.message,
    };

    // Include errorCode if available for better frontend handling
    if (err.errorCode) {
      response.errorCode = err.errorCode;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Programmer errors (unexpected: null pointer, type errors)
  logger.error({
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  }, 'Unexpected error');

  res.status(500).json({
    error: 'Internal server error',
  });
};
