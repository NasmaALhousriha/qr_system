import { Router } from 'express';
import * as controller from '../controllers/student.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import {
  importStudentsSchema,
  listStudentsSchema,
  studentIdParamSchema,
} from '../validation/student.schema';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/', validate(listStudentsSchema), controller.list);
router.post('/import', validate(importStudentsSchema), controller.importStudents);
router.post('/:id/activation-code', validate(studentIdParamSchema), controller.resetCode);

export default router;