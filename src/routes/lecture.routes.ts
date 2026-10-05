import { Router } from 'express';
import * as controller from '../controllers/lecture.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { createLectureSchema, lectureIdParamSchema } from '../validation/lecture.schema';
import * as attendanceController from '../controllers/attendance.controller';


const router = Router();

router.use(authenticate);

router.post('/', authorize('DOCTOR'), validate(createLectureSchema), controller.create);
router.get('/', authorize('DOCTOR', 'ADMIN'), controller.list);
router.get('/:id/qr', authorize('DOCTOR'), validate(lectureIdParamSchema), controller.getQr);
router.get(
  '/:id/attendance',
  authorize('DOCTOR', 'ADMIN'),
  validate(lectureIdParamSchema),
  attendanceController.listByLecture,
);

export default router;