import type { RequestHandler } from 'express';
import { asyncHandler } from '../../shared/async-handler';
import { sendSuccess } from '../../shared/response';
import { getDashboardOverview } from './dashboard.service';

export const getOverview: RequestHandler = asyncHandler(async (_req, res) => {
  const overview = await getDashboardOverview();
  sendSuccess(res, overview);
});
