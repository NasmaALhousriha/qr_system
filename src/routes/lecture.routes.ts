import { Router } from 'express';
import * as controller from '../controllers/lecture.controller';
import * as attendanceController from '../controllers/attendance.controller';

const router = Router();

router.post('/', controller.create);
router.get('/', controller.list);
router.get('/:id/attendance', attendanceController.listByLecture);

export default router;