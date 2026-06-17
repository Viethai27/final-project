import type { RequestHandler } from 'express';
import { asyncHandler } from '../../shared/async-handler';
import { AppError } from '../../shared/http-error';
import { buildPagination, parseListQuery } from '../../shared/list-query';
import { sendPaginatedSuccess, sendSuccess } from '../../shared/response';
import { getQueueItemById, getQueueItems } from './queue.service';

export const listQueue: RequestHandler = asyncHandler(async (req, res) => {
  const query = parseListQuery(req.query as Record<string, unknown>, {
    defaultLimit: 10,
    defaultSort: 'asc',
  });

  const { items, total } = await getQueueItems(query);

  sendPaginatedSuccess(res, items, buildPagination(total, query.page, query.limit));
});

export const getQueueDetail: RequestHandler = asyncHandler(async (req, res) => {
  const queueItemId = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];

  if (!queueItemId) {
    throw new AppError('Queue item id is required.', 400);
  }

  const queueItem = await getQueueItemById(queueItemId);
  sendSuccess(res, queueItem);
});
