// هاد الملف مشان افحص التوكن (موجود / صحيح / ما انتهى)
import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from '../utils/AppError';
import { AuthUser, Role } from '../types/auth';

export const authenticate: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError('Authentication required', 401);
  }

  let user: AuthUser;
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret, {
      algorithms: ['HS256'],
    }) as jwt.JwtPayload;
    user = { id: Number(payload.sub), role: payload.role as Role };
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }

  req.user = user;
  next();
};