import type { RequestHandler } from 'express';
import { asyncHandler } from '../../shared/async-handler';
import { AppError } from '../../shared/http-error';
import { buildPagination, parseListQuery } from '../../shared/list-query';
import { sendPaginatedSuccess, sendSuccess } from '../../shared/response';
import {
  completeClsOrder,
  createClsOrder,
  getClsOrderById,
  getClsOrders,
  getClsOrdersByVisitId,
  getClsResultById,
  getClsResults,
  startClsOrder,
} from './cls.service';

const readId = (value: string | string[] | undefined, message: string) => {
  const id = typeof value === 'string' ? value : value?.[0];
  if (!id) {
    throw new AppError(message, 400);
  }

  return id;
};

export const listClsOrders: RequestHandler = asyncHandler(async (req, res) => {
  const query = parseListQuery(req.query as Record<string, unknown>, {
    defaultLimit: 10,
    defaultSort: 'desc',
  });

  const { items, total } = await getClsOrders(query);
  sendPaginatedSuccess(res, items, buildPagination(total, query.page, query.limit));
});

export const createClsOrderHandler: RequestHandler = asyncHandler(async (req, res) => {
  const body = req.body as Record<string, unknown>;

  const order = await createClsOrder({
    visitId: typeof body.visitId === 'string' ? body.visitId : '',
    orderedById: typeof body.orderedById === 'string' ? body.orderedById : '',
    serviceId: typeof body.serviceId === 'string' ? body.serviceId : '',
    roomId: typeof body.roomId === 'string' ? body.roomId : null,
    priority: body.priority === 'URGENT' ? 'URGENT' : 'ROUTINE',
    clinicalNote: typeof body.clinicalNote === 'string' ? body.clinicalNote : null,
    note: typeof body.note === 'string' ? body.note : null,
    updatedById: typeof body.updatedById === 'string' ? body.updatedById : null,
  });

  sendSuccess(res, order, 201);
});

export const getClsOrderDetail: RequestHandler = asyncHandler(async (req, res) => {
  const orderId = readId(req.params.id, 'CLS order id is required.');
  const order = await getClsOrderById(orderId);
  sendSuccess(res, order);
});

export const getVisitClsOrders: RequestHandler = asyncHandler(async (req, res) => {
  const visitId = readId(req.params.visitId, 'Visit id is required.');
  const orders = await getClsOrdersByVisitId(visitId);
  sendSuccess(res, orders);
});

export const startClsOrderHandler: RequestHandler = asyncHandler(async (req, res) => {
  const orderId = readId(req.params.id, 'CLS order id is required.');
  const body = req.body as Record<string, unknown>;

  const order = await startClsOrder(orderId, {
    updatedById: typeof body.updatedById === 'string' ? body.updatedById : null,
    note: typeof body.note === 'string' ? body.note : null,
  });

  sendSuccess(res, order);
});

export const completeClsOrderHandler: RequestHandler = asyncHandler(async (req, res) => {
  const orderId = readId(req.params.id, 'CLS order id is required.');
  const body = req.body as Record<string, unknown>;

  const order = await completeClsOrder(orderId, {
    updatedById: typeof body.updatedById === 'string' ? body.updatedById : null,
    note: typeof body.note === 'string' ? body.note : null,
    resultText: typeof body.resultText === 'string' ? body.resultText : null,
    resultFileUrl: typeof body.resultFileUrl === 'string' ? body.resultFileUrl : null,
    isAbnormal: typeof body.isAbnormal === 'boolean' ? body.isAbnormal : null,
    resultById: typeof body.resultById === 'string' ? body.resultById : null,
    resultDate: typeof body.resultDate === 'string' ? body.resultDate : null,
  });

  sendSuccess(res, order);
});

export const listClsResults: RequestHandler = asyncHandler(async (req, res) => {
  const query = parseListQuery(req.query as Record<string, unknown>, {
    defaultLimit: 10,
    defaultSort: 'desc',
  });

  const { items, total } = await getClsResults(query);
  sendPaginatedSuccess(res, items, buildPagination(total, query.page, query.limit));
});

export const getClsResultDetail: RequestHandler = asyncHandler(async (req, res) => {
  const resultId = readId(req.params.id, 'CLS result id is required.');
  const result = await getClsResultById(resultId);
  sendSuccess(res, result);
});
