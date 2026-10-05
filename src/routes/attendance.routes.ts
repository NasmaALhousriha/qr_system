import { Router } from 'express';
import * as controller from '../controllers/attendance.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { markAttendanceSchema } from '../validation/attendance.schema';

const router = Router();

router.use(authenticate, authorize('STUDENT'));

router.post('/', validate(markAttendanceSchema), controller.mark);
router.get('/me', controller.listMine);

export default router;