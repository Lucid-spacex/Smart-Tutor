import { Request, Response, NextFunction } from 'express';
import { SubjectsService } from './subjects.service';
import { GetSubjectsQuery } from './subjects.validation';

export class SubjectsController {
  private subjectsService: SubjectsService;

  constructor() {
    this.subjectsService = new SubjectsService();
  }

  getSubjects = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query: GetSubjectsQuery = req.query as any;
      const subjects = await this.subjectsService.getSubjects(query);
      res.status(200).json(subjects);
    } catch (error) {
      next(error);
    }
  };
}
