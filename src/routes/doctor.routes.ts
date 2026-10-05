import { Router } from 'express';
import * as controller from '../controllers/doctor.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { createDoctorSchema } from '../validation/doctor.schema';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.post('/', validate(createDoctorSchema), controller.create);
router.get('/', controller.list);

export default router;