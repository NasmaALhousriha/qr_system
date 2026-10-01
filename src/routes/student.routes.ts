import { Router } from 'express';
import * as controller from '../controllers/student.controller';

const router = Router();

router.post('/', controller.create);
router.get('/', controller.list);
router.get('/:id/qr', controller.getQr);

export default router;