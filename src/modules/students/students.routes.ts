import { Router } from 'express';
import { StudentsController } from './students.controller';
import { validate } from '../../middleware/validation.middleware';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { createStudentSchema } from './students.validation';

const router = Router();
const studentsController = new StudentsController();

router.post('/', authenticate, requireRole('PARENT'), validate(createStudentSchema), studentsController.createStudent);
router.get('/', authenticate, requireRole('PARENT'), studentsController.getStudents);
router.get('/:id', authenticate, requireRole('PARENT'), studentsController.getStudentById);

export default router;
