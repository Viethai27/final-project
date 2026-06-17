import type { RequestHandler } from 'express';
import { asyncHandler } from '../../shared/async-handler';
import { buildPagination, parseListQuery } from '../../shared/list-query';
import { sendPaginatedSuccess } from '../../shared/response';
import { getServices } from './service.service';

export const listServices: RequestHandler = asyncHandler(async (req, res) => {
  const query = parseListQuery(req.query as Record<string, unknown>, {
    defaultLimit: 10,
    defaultSort: 'desc',
  });

  const { items, total } = await getServices(query);

  sendPaginatedSuccess(res, items, buildPagination(total, query.page, query.limit));
});
