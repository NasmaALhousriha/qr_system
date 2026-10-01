import { Router } from 'express';
import * as controller from '../controllers/attendance.controller';

const router = Router();

router.post('/', controller.mark);

export default router;