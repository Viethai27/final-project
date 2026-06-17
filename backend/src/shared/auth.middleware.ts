import type { RequestHandler } from 'express';
import { getCurrentUser } from '../modules/auth/auth.service';
import { AppError } from './http-error';

export type AuthenticatedRequestUser = Awaited<ReturnType<typeof getCurrentUser>>;

const getBearerToken = (authorization: string | undefined) => {
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  return authorization.slice('Bearer '.length).trim();
};

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = getBearerToken(req.headers.authorization);
    if (!token) {
      throw new AppError('Chưa đăng nhập.', 401);
    }

    (req as typeof req & { user: AuthenticatedRequestUser }).user = await getCurrentUser(token);
    next();
  } catch (error) {
    next(error);
  }
};
