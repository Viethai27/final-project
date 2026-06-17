import type { RequestHandler } from 'express';
import type { UserRole } from '@prisma/client';
import { AppError } from './http-error';
import type { AuthenticatedRequestUser } from './auth.middleware';

export const requireRole = (roles: UserRole[]): RequestHandler => (req, _res, next) => {
  const user = (req as typeof req & { user?: AuthenticatedRequestUser }).user;

  if (!user) {
    next(new AppError('Chưa đăng nhập.', 401));
    return;
  }

  if (!roles.includes(user.role as UserRole)) {
    next(new AppError('Không có quyền truy cập.', 403));
    return;
  }

  next();
};
