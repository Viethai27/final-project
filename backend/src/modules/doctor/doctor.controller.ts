import type { RequestHandler } from 'express';
import { asyncHandler } from '../../shared/async-handler';
import { buildPagination, parseListQuery } from '../../shared/list-query';
import { sendPaginatedSuccess } from '../../shared/response';
import { getDoctors } from './doctor.service';

export const listDoctors: RequestHandler = asyncHandler(async (req, res) => {
  const query = parseListQuery(req.query as Record<string, unknown>, {
    defaultLimit: 10,
    defaultSort: 'desc',
  });

  const departmentId =
    typeof req.query.departmentId === 'string'
      ? req.query.departmentId.trim() || undefined
      : undefined;

  const { items, total } = await getDoctors({
    ...query,
    departmentId,
  });

  sendPaginatedSuccess(res, items, buildPagination(total, query.page, query.limit));
});
