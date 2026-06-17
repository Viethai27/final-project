import type { RequestHandler } from 'express';
import { asyncHandler } from '../../shared/async-handler';
import { AppError } from '../../shared/http-error';
import { buildPagination, parseListQuery } from '../../shared/list-query';
import { sendPaginatedSuccess, sendSuccess } from '../../shared/response';
import { completeTurn, getTurnById, getTurns, getTurnsByVisitId, startTurn } from './turn.service';

const readId = (value: string | string[] | undefined, message: string) => {
  const id = typeof value === 'string' ? value : value?.[0];
  if (!id) {
    throw new AppError(message, 400);
  }

  return id;
};

export const listTurns: RequestHandler = asyncHandler(async (req, res) => {
  const query = parseListQuery(req.query as Record<string, unknown>, {
    defaultLimit: 10,
    defaultSort: 'desc',
  });

  const { items, total } = await getTurns(query);

  sendPaginatedSuccess(res, items, buildPagination(total, query.page, query.limit));
});

export const getTurnDetail: RequestHandler = asyncHandler(async (req, res) => {
  const turnId = readId(req.params.id, 'Turn id is required.');
  const turn = await getTurnById(turnId);
  sendSuccess(res, turn);
});

export const getVisitTurns: RequestHandler = asyncHandler(async (req, res) => {
  const visitId = readId(req.params.visitId, 'Visit id is required.');
  const turns = await getTurnsByVisitId(visitId);
  sendSuccess(res, turns);
});

export const startTurnHandler: RequestHandler = asyncHandler(async (req, res) => {
  const turnId = readId(req.params.id, 'Turn id is required.');
  const body = req.body as Record<string, unknown>;

  const turn = await startTurn(turnId, {
    updatedById: typeof body.updatedById === 'string' ? body.updatedById : null,
    note: typeof body.note === 'string' ? body.note : null,
  });

  sendSuccess(res, turn);
});

export const completeTurnHandler: RequestHandler = asyncHandler(async (req, res) => {
  const turnId = readId(req.params.id, 'Turn id is required.');
  const body = req.body as Record<string, unknown>;

  const turn = await completeTurn(turnId, {
    updatedById: typeof body.updatedById === 'string' ? body.updatedById : null,
    note: typeof body.note === 'string' ? body.note : null,
  });

  sendSuccess(res, turn);
});
