import { Request } from 'express';

declare module 'express' {
  interface Request {
    user?: {
      userId: string;
      role: string;
      status: string;
    };
  }
}

export interface AuthRequest extends Omit<Request, 'user'> {
  user?: {
    userId: string;
    role: string;
    status: string;
  };
}
