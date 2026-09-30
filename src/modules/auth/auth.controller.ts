import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { RegisterData, VerifyData, LoginData, StudentLoginData, RefreshData, ChangePasswordData } from './types';
import { AuthRequest } from '../../types/express';

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

  studentLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: StudentLoginData = req.body;
      const result = await this.authService.studentLogin(data);
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

  logout = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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

  getCurrentUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const user = await this.authService.getCurrentUser(userId);
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const data: ChangePasswordData = req.body;
      const result = await this.authService.changePassword(userId, data);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  updateTimezone = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const { timezone } = req.body;
      const result = await this.authService.updateTimezone(userId, timezone);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  updateProfilePicture = async (req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      
      // Handle file upload (multer will add file to req.file)
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      // Convert file buffer to base64 for Cloudinary upload
      const fileBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      
      const result = await this.authService.updateProfilePicture(userId, fileBase64);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  deleteProfilePicture = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const result = await this.authService.deleteProfilePicture(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  resendOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body;
      const result = await this.authService.resendOtp(email);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
