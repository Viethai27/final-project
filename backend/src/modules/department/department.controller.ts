import type { RequestHandler } from 'express';
import { asyncHandler } from '../../shared/async-handler';
import { buildPagination, parseListQuery } from '../../shared/list-query';
import { sendPaginatedSuccess } from '../../shared/response';
import { getDepartments } from './department.service';

export const listDepartments: RequestHandler = asyncHandler(async (req, res) => {
  const query = parseListQuery(req.query as Record<string, unknown>, {
    defaultLimit: 10,
    defaultSort: 'desc',
  });

  const { items, total } = await getDepartments(query);

  sendPaginatedSuccess(res, items, buildPagination(total, query.page, query.limit));
});
