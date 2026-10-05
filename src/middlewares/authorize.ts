// فحص دور المستخدم
import { RequestHandler } from 'express';
import { AppError } from '../utils/AppError';
import { Role } from '../types/auth';

// لازم تجي بعد authenticate
export const authorize =
  (...roles: Role[]): RequestHandler =>
  (req, res, next) => {
    if (!req.user) throw new AppError('Authentication required', 401);
    if (!roles.includes(req.user.role)) {
      throw new AppError('You do not have permission to do this', 403);
    }
    next();
  };