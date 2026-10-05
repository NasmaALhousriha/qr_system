import { Router } from 'express';
import * as controller from '../controllers/auth.controller';
import { authenticate } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import { activateSchema, loginSchema } from '../validation/auth.schema';

const router = Router();

router.post('/login', validate(loginSchema), controller.login);
router.post('/activate', validate(activateSchema), controller.activate);
router.get('/me', authenticate, controller.me);

export default router;