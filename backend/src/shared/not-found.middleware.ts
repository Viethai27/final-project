import type { RequestHandler } from 'express';
import { AppError } from './http-error';

export const notFoundMiddleware: RequestHandler = (req, _res, next) => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
};
