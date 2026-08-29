import { Request, Response, NextFunction } from 'express';
import { StudentsService } from './students.service';
import { CreateStudentInput } from './students.validation';

export class StudentsController {
  private studentsService: StudentsService;

  constructor() {
    this.studentsService = new StudentsService();
  }

  createStudent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parentId = (req as any).user?.userId;
      if (!parentId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const data: CreateStudentInput = req.body;
      const student = await this.studentsService.createStudent(parentId, data);
      res.status(201).json(student);
    } catch (error) {
      next(error);
    }
  };

  getStudents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parentId = (req as any).user?.userId;
      if (!parentId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const students = await this.studentsService.getStudentsByParent(parentId);
      res.status(200).json(students);
    } catch (error) {
      next(error);
    }
  };

  getStudentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parentId = (req as any).user?.userId;
      if (!parentId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const student = await this.studentsService.getStudentById(id, parentId);
      res.status(200).json(student);
    } catch (error) {
      next(error);
    }
  };
}
