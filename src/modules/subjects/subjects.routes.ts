import { Router } from 'express';
import { SubjectsController } from './subjects.controller';
import { validateQuery } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { getSubjectsQuerySchema } from './subjects.validation';

const router = Router();
const subjectsController = new SubjectsController();

router.get('/', authenticate, validateQuery(getSubjectsQuerySchema), subjectsController.getSubjects);

export default router;
