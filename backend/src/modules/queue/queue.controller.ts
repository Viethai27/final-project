import type { RequestHandler } from 'express';
import { asyncHandler } from '../../shared/async-handler';
import { AppError } from '../../shared/http-error';
import { buildPagination, parseListQuery } from '../../shared/list-query';
import { sendPaginatedSuccess, sendSuccess } from '../../shared/response';
import {
  callQueueItem,
  cancelQueueItem,
  getQueueItemById,
  getQueueItems,
  startQueueItem,
  timeoutQueueItem,
} from './queue.service';

const readQueueItemId = (req: Parameters<RequestHandler>[0]) => {
  const queueItemId = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
  if (!queueItemId) {
    throw new AppError('Queue item id is required.', 400);
  }

  return queueItemId;
};

const readActionPayload = (body: Record<string, unknown>) => ({
  updatedById: typeof body.updatedById === 'string' ? body.updatedById : null,
  note: typeof body.note === 'string' ? body.note.trim() || null : null,
});

export const listQueue: RequestHandler = asyncHandler(async (req, res) => {
  const query = parseListQuery(req.query as Record<string, unknown>, {
    defaultLimit: 10,
    defaultSort: 'asc',
  });

  const lane = typeof req.query.lane === 'string' ? req.query.lane.trim() || undefined : undefined;
  const { items, total } = await getQueueItems({ ...query, lane });

  sendPaginatedSuccess(res, items, buildPagination(total, query.page, query.limit));
});

export const getQueueDetail: RequestHandler = asyncHandler(async (req, res) => {
  const queueItemId = readQueueItemId(req);
  const queueItem = await getQueueItemById(queueItemId);
  sendSuccess(res, queueItem);
});

export const callQueueItemHandler: RequestHandler = asyncHandler(async (req, res) => {
  const queueItem = await callQueueItem(readQueueItemId(req), readActionPayload(req.body as Record<string, unknown>));
  sendSuccess(res, queueItem);
});

export const startQueueItemHandler: RequestHandler = asyncHandler(async (req, res) => {
  const queueItem = await startQueueItem(readQueueItemId(req), readActionPayload(req.body as Record<string, unknown>));
  sendSuccess(res, queueItem);
});

export const timeoutQueueItemHandler: RequestHandler = asyncHandler(async (req, res) => {
  const queueItem = await timeoutQueueItem(readQueueItemId(req), readActionPayload(req.body as Record<string, unknown>));
  sendSuccess(res, queueItem);
});

export const cancelQueueItemHandler: RequestHandler = asyncHandler(async (req, res) => {
  const queueItem = await cancelQueueItem(readQueueItemId(req), readActionPayload(req.body as Record<string, unknown>));
  sendSuccess(res, queueItem);
});
