import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.config';
import { logger } from '../config/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
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
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
    }, 'Operational error');

    res.status(err.statusCode).json({
      error: err.message,
      ...(config.NODE_ENV === 'development' && { stack: err.stack }),
    });
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
    ...(config.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
