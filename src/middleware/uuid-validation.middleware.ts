import { Request, Response, NextFunction } from 'express';

/**
 * Validate UUID format for route parameters
 * Prevents malformed UUIDs from reaching the database
 */
export const validateUUID = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const paramValue = req.params[paramName];

    if (!paramValue) {
      res.status(400).json({ error: `Missing ${paramName} parameter` });
      return;
    }

    // UUID v4 regex pattern
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(paramValue)) {
      res.status(400).json({ error: `Invalid ${paramName} format` });
      return;
    }

    next();
  };
};
