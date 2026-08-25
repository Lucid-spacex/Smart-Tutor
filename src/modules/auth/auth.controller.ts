import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { RegisterData, VerifyData, LoginData, RefreshData } from './types';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: RegisterData = req.body;
      const result = await this.authService.register(data);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  verify = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: VerifyData = req.body;
      const result = await this.authService.verify(data);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: LoginData = req.body;
      const result = await this.authService.login(data);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: RefreshData = req.body;
      const result = await this.authService.refresh(data);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const result = await this.authService.logout(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
