import type { RequestHandler } from 'express';
import { asyncHandler } from '../../shared/async-handler';
import { AppError } from '../../shared/http-error';
import { sendSuccess } from '../../shared/response';
import { getCurrentUser, login } from './auth.service';

const getBearerToken = (authorization: string | undefined) => {
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  return authorization.slice('Bearer '.length).trim();
};

export const loginHandler: RequestHandler = asyncHandler(async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const username = typeof body.username === 'string' ? body.username : '';
  const password = typeof body.password === 'string' ? body.password : '';

  const result = await login({ username, password });
  sendSuccess(res, result);
});

export const meHandler: RequestHandler = asyncHandler(async (req, res) => {
  const token = getBearerToken(req.headers.authorization);
  if (!token) {
    throw new AppError('Chưa đăng nhập.', 401);
  }

  const user = await getCurrentUser(token);
  sendSuccess(res, { user });
});

export const logoutHandler: RequestHandler = asyncHandler(async (_req, res) => {
  sendSuccess(res, { loggedOut: true });
});
