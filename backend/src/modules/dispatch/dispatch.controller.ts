import type { RequestHandler } from 'express';
import { asyncHandler } from '../../shared/async-handler';
import { AppError } from '../../shared/http-error';
import { buildPagination, parseListQuery } from '../../shared/list-query';
import { sendPaginatedSuccess, sendSuccess } from '../../shared/response';
import {
  createDispatchDecision,
  getDispatchDecisionById,
  getDispatchDecisions,
  getDispatchSuggestionByVisitId,
  getDispatchSuggestions,
} from './dispatch.service';

const readId = (value: string | string[] | undefined, message: string) => {
  const id = typeof value === 'string' ? value : value?.[0];
  if (!id) {
    throw new AppError(message, 400);
  }

  return id;
};

const readDecisionType = (value: unknown) => {
  if (value === 'SYSTEM_SUGGESTED' || value === 'MANUAL' || value === 'OVERRIDE') {
    return value;
  }

  if (value === undefined || value === null || value === '') {
    return 'SYSTEM_SUGGESTED';
  }

  throw new AppError('Invalid decision type.', 400);
};

export const listDispatchSuggestions: RequestHandler = asyncHandler(async (req, res) => {
  const query = parseListQuery(req.query as Record<string, unknown>, {
    defaultLimit: 10,
    defaultSort: 'desc',
  });

  const { items, total } = await getDispatchSuggestions(query);
  sendPaginatedSuccess(res, items, buildPagination(total, query.page, query.limit));
});

export const getDispatchSuggestionDetail: RequestHandler = asyncHandler(async (req, res) => {
  const visitId = readId(req.params.visitId, 'Visit id is required.');
  const suggestion = await getDispatchSuggestionByVisitId(visitId);
  sendSuccess(res, suggestion);
});

export const listDispatchDecisions: RequestHandler = asyncHandler(async (req, res) => {
  const query = parseListQuery(req.query as Record<string, unknown>, {
    defaultLimit: 10,
    defaultSort: 'desc',
  });

  const { items, total } = await getDispatchDecisions(query);
  sendPaginatedSuccess(res, items, buildPagination(total, query.page, query.limit));
});

export const getDispatchDecisionDetail: RequestHandler = asyncHandler(async (req, res) => {
  const decisionId = readId(req.params.id, 'Dispatch decision id is required.');
  const decision = await getDispatchDecisionById(decisionId);
  sendSuccess(res, decision);
});

export const createDispatchDecisionHandler: RequestHandler = asyncHandler(async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const visitId = readId(body.visitId as string | string[] | undefined, 'visitId is required.');

  const recommendations = Array.isArray(body.recommendations)
    ? body.recommendations
        .map(item => {
          if (!item || typeof item !== 'object') {
            return null;
          }

          const record = item as Record<string, unknown>;
          const roomId = typeof record.roomId === 'string' ? record.roomId : null;
          const rank = typeof record.rank === 'number' ? record.rank : Number.parseInt(String(record.rank ?? ''), 10);

          if (!roomId || !Number.isFinite(rank)) {
            return null;
          }

          return {
            rank,
            roomId,
            resourceScore: typeof record.resourceScore === 'number' ? record.resourceScore : null,
            queueLength: typeof record.queueLength === 'number' ? record.queueLength : null,
            utilizationRate: typeof record.utilizationRate === 'number' ? record.utilizationRate : null,
            estimatedWaitMinutes:
              typeof record.estimatedWaitMinutes === 'number' ? record.estimatedWaitMinutes : null,
            alertLevel: typeof record.alertLevel === 'string' ? record.alertLevel : null,
            reason: typeof record.reason === 'string' ? record.reason : null,
            wasSelected: typeof record.wasSelected === 'boolean' ? record.wasSelected : null,
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
    : undefined;

  const decision = await createDispatchDecision({
    visitId,
    queueItemId: typeof body.queueItemId === 'string' ? body.queueItemId : null,
    decisionById: typeof body.decisionById === 'string' ? body.decisionById : null,
    decisionType: readDecisionType(body.decisionType),
    outcomeRoomId: typeof body.outcomeRoomId === 'string' ? body.outcomeRoomId : null,
    outcomeDoctorId: typeof body.outcomeDoctorId === 'string' ? body.outcomeDoctorId : null,
    serviceId: typeof body.serviceId === 'string' ? body.serviceId : null,
    note: typeof body.note === 'string' ? body.note : null,
    recommendations,
    outcome:
      body.outcome && typeof body.outcome === 'object'
        ? {
            serviceId:
              typeof (body.outcome as Record<string, unknown>).serviceId === 'string'
                ? ((body.outcome as Record<string, unknown>).serviceId as string)
                : null,
            followedRecommendation:
              typeof (body.outcome as Record<string, unknown>).followedRecommendation === 'boolean'
                ? ((body.outcome as Record<string, unknown>).followedRecommendation as boolean)
                : null,
            actualWaitMinutes:
              typeof (body.outcome as Record<string, unknown>).actualWaitMinutes === 'number'
                ? ((body.outcome as Record<string, unknown>).actualWaitMinutes as number)
                : null,
            recommendedWaitEstimate:
              typeof (body.outcome as Record<string, unknown>).recommendedWaitEstimate === 'number'
                ? ((body.outcome as Record<string, unknown>).recommendedWaitEstimate as number)
                : null,
            waitDifference:
              typeof (body.outcome as Record<string, unknown>).waitDifference === 'number'
                ? ((body.outcome as Record<string, unknown>).waitDifference as number)
                : null,
            deviationNote:
              typeof (body.outcome as Record<string, unknown>).deviationNote === 'string'
                ? ((body.outcome as Record<string, unknown>).deviationNote as string)
                : null,
            deviationReason:
              typeof (body.outcome as Record<string, unknown>).deviationReason === 'string'
                ? ((body.outcome as Record<string, unknown>).deviationReason as string)
                : null,
          }
        : undefined,
  });

  sendSuccess(res, decision, 201);
});
